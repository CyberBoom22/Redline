/**
 * Cloudflare Access JWT verification.
 *
 * Access authenticates users at the edge and forwards a signed JWT in
 * `Cf-Access-Jwt-Assertion` (and the `CF_Authorization` cookie). Trusting the
 * `Cf-Access-Authenticated-User-Email` header alone is not enough: that header
 * is only meaningful if the request actually passed through Access, and the
 * Worker has no way to know that from the header itself. Verifying the JWT
 * signature against the team's public keys is what makes the check real.
 *
 * The Worker fails closed. If Access is not configured, requests are rejected
 * rather than served — so a deploy that happens before the Access policy exists
 * is locked, not wide open.
 */

export interface AccessIdentity {
  email: string | null;
  subject: string | null;
}

export interface AccessConfig {
  teamDomain: string;
  aud: string;
}

interface Jwk {
  kid: string;
  kty: string;
  alg?: string;
  n: string;
  e: string;
}

/** JWKS changes rarely; re-fetching per request would be a needless round trip. */
const JWKS_TTL_MS = 60 * 60 * 1000;
const keyCache = new Map<string, { fetchedAt: number; keys: Map<string, CryptoKey> }>();

export class AccessError extends Error {
  constructor(message: string, readonly status = 401) {
    super(message);
    this.name = 'AccessError';
  }
}

/**
 * Verify the Access JWT on a request. Throws AccessError when the request is
 * not a valid, unexpired, correctly-scoped Access session.
 */
export async function verifyAccess(request: Request, config: AccessConfig): Promise<AccessIdentity> {
  const token = readToken(request);
  if (!token) throw new AccessError('No Cloudflare Access token on this request');

  const parts = token.split('.');
  if (parts.length !== 3) throw new AccessError('Malformed Access token');

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeJson<{ alg?: string; kid?: string }>(headerB64);
  if (header.alg !== 'RS256') throw new AccessError(`Unexpected token algorithm: ${header.alg}`);
  if (!header.kid) throw new AccessError('Access token has no key id');

  const key = await publicKey(config.teamDomain, header.kid);
  if (!key) throw new AccessError('Access token signed by an unknown key');

  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(signatureB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  );
  if (!verified) throw new AccessError('Access token signature is not valid');

  const payload = decodeJson<{
    aud?: string | string[];
    email?: string;
    sub?: string;
    exp?: number;
    nbf?: number;
    iss?: string;
  }>(payloadB64);

  // The audience tag scopes a token to one Access application. Without this
  // check, a token minted for any other app on the same team would be accepted.
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (!audiences.includes(config.aud)) throw new AccessError('Access token is for a different application');

  const expectedIssuer = `https://${config.teamDomain}`;
  if (payload.iss && payload.iss !== expectedIssuer) throw new AccessError('Access token issuer mismatch');

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) throw new AccessError('Access token has expired');
  if (typeof payload.nbf === 'number' && payload.nbf > now + 60) throw new AccessError('Access token is not yet valid');

  return { email: payload.email ?? null, subject: payload.sub ?? null };
}

function readToken(request: Request): string | null {
  const header = request.headers.get('Cf-Access-Jwt-Assertion');
  if (header) return header;

  // Browsers navigating directly carry the token as a cookie instead.
  const cookies = request.headers.get('cookie') ?? '';
  const match = cookies.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function publicKey(teamDomain: string, kid: string): Promise<CryptoKey | null> {
  const cached = keyCache.get(teamDomain);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    const hit = cached.keys.get(kid);
    if (hit) return hit;
  }

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new AccessError('Could not reach Cloudflare Access to verify the token', 503);

  const { keys } = (await res.json()) as { keys: Jwk[] };
  const imported = new Map<string, CryptoKey>();
  for (const jwk of keys ?? []) {
    if (jwk.kty !== 'RSA') continue;
    imported.set(
      jwk.kid,
      await crypto.subtle.importKey(
        'jwk',
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    );
  }

  keyCache.set(teamDomain, { fetchedAt: Date.now(), keys: imported });
  return imported.get(kid) ?? null;
}

function decodeJson<T>(segment: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
  } catch {
    throw new AccessError('Access token is not readable');
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
