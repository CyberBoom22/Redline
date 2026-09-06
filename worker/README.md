# Redline scan dashboard

A private admin dashboard for the daily parts scan: what was scanned, what was
added, what changed field by field, and what disappeared. Cloudflare Worker +
D1, with login handled by Cloudflare Access.

Nothing here is public. Access sits in front of the whole hostname, so a viewer
is authenticated before the Worker runs; the Worker reads the verified identity
from `Cf-Access-Authenticated-User-Email`.

Deployed at **https://redline.xavierboone.us**.

## What's already done

- D1 database **`redline-catalog`** is created (`8d625631-ff7d-4ddf-bf16-f3875a4f8e8c`)
  and its schema is applied to the remote database.
- The Worker, dashboard, ingest endpoint and push script are written and tested
  end to end against a local D1.
- `wrangler.toml` already carries the `redline.xavierboone.us` custom-domain
  route, so `wrangler deploy` creates the DNS record itself.

## Security posture

Reads are gated on a **verified Cloudflare Access JWT**, not on the identity
header alone. The Worker fetches the team's public keys, checks the signature,
the audience tag, the issuer and the expiry, and refuses anything that does not
verify.

It **fails closed**: if `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are unset, reads
return 503 rather than content — so the window between `wrangler deploy` and the
Access policy existing is locked, not public.

`npm run test:security` covers this with 16 cases against a live Worker,
including a forged identity header, an unsigned JWT, an `alg: none` token,
oversized payloads, SQL metacharacters in search, and a `javascript:` URL
reaching the database. Run it before every deploy.

## Preview it locally

```bash
cd worker
npm install
npm run preview      # seeds sample data, serves http://127.0.0.1:8787
```

Dev mode turns Access enforcement off so the pages can be clicked through
without a login. It is local-only — never set `DEV_ALLOW_UNAUTHENTICATED` on a
deployed Worker.

## Setup — three steps

### 1. Deploy the Worker

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put INGEST_SECRET   # paste a long random string; save it
npm run deploy
```

Generate the secret with `openssl rand -hex 32`. Deploy attaches the custom domain from `wrangler.toml`, so the dashboard comes
up at `https://redline.xavierboone.us` (the `xavierboone.us` zone has to be in
this Cloudflare account).

### 2. Put Cloudflare Access in front of it

In the Cloudflare dashboard → **Zero Trust → Access → Applications → Add a
self-hosted application**:

- **Domain**: `redline.xavierboone.us`.
- **Policy**: *Allow* → include **Emails** → your address (add teammates here).
- Free for up to 50 users. Login options include Google, GitHub and a one-time
  email code, so there is no password to manage.

Then add a second policy on the same application so CI can post reports:

- **Policy name**: `ingest`, action **Bypass**, path `/api/ingest`, include
  **Everyone**.
- The endpoint is still protected — it requires the bearer `INGEST_SECRET`, and
  rejects with 401 without it. The bypass only stops Access from redirecting a
  machine POST to a login page.

Prefer no bypass at all? Use an Access **service token** instead and send
`CF-Access-Client-Id` / `CF-Access-Client-Secret` from CI.

### 2b. Tell the Worker which Access app to trust

Copy the **Application Audience (AUD) tag** from the Access application you just
created, then fill both values in `wrangler.toml` and redeploy:

```toml
[vars]
ACCESS_TEAM_DOMAIN = "<your-team>.cloudflareaccess.com"
ACCESS_AUD = "<the AUD tag>"
```

Until these are set the dashboard returns 503 by design. Confirm with
`curl -s -o /dev/null -w '%{http_code}' https://redline.xavierboone.us/api/summary`
— an unauthenticated request must return 401 or 403, never 200.

### 3. Point the daily scan at it

In the GitHub repo → **Settings → Secrets and variables → Actions**:

- **Variable** `REDLINE_DASHBOARD_URL` = `https://redline.xavierboone.us`.
- **Secret** `REDLINE_INGEST_SECRET` = the same string you gave `wrangler secret put`.

That's it. The scan workflow already has the push step, and it skips itself
when the variable is unset — so nothing breaks if you defer this.

## Verifying it

```bash
npm run scrape                 # in the repo root — produces a report
npm run scrape:push -- --url=https://… --secret=…
```

Then open the Worker URL. You should be asked to log in, then see the scan.

## Local development

```bash
cd worker
npx wrangler d1 execute redline-catalog --local --file schema.sql
npx wrangler dev --local --var INGEST_SECRET:test-secret
```

Access is not in the loop locally, so `/api/whoami` returns `null` and the
header reads "no Access identity (local dev)". Post a report with
`curl -X POST localhost:8787/api/ingest -H 'authorization: Bearer test-secret' -d @payload.json`.

## API

| Route | Purpose |
| --- | --- |
| `GET /` | Dashboard page |
| `GET /api/summary` | Totals, latest run, per-vendor counts |
| `GET /api/runs?limit=` | Recent scans, newest first |
| `GET /api/runs/:runId` | One scan with its changes and errors |
| `GET /api/parts?vendor=&engine=&q=&limit=` | Catalog, filtered |
| `GET /api/history/:partId` | Price points for one part |
| `GET /api/whoami` | The Access-verified viewer |
| `POST /api/ingest` | Write a scan report (bearer `INGEST_SECRET`) |

## Notes

- **Ingest is idempotent.** Re-posting the same `runId` replaces that run's rows
  rather than duplicating them, so a retried CI job is safe.
- **Writes are batched** 100 statements at a time, within D1's batch limits.
- **The secret compare is constant-time**, so it can't be probed a character at
  a time.
- **Cost**: comfortably inside the free tier. One scan writes a few hundred
  rows a day against a 5 GB / 5M-reads-per-day allowance.
