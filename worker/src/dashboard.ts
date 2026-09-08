/**
 * The dashboard page. Vanilla HTML/CSS/JS served inline by the Worker — no
 * build step and no CDN, so the page loads even when everything else is down.
 * Styled to match the Stage0 app: slate-950 ground, red accents, mono labels.
 *
 * The page renders scraped, third-party-controlled strings. Every value goes
 * through `esc()` before it reaches markup, and every URL goes through
 * `safeHref()` so a `javascript:` URL scraped from a vendor page can never
 * become a working link. The inline script carries a per-request CSP nonce.
 */
export function dashboardHtml(nonce: string): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stage0 · Scan Reports</title>
<style>
  :root {
    --bg:#020617; --panel:#0f172a; --panel-2:#1e293b; --line:#1e293b;
    --text:#e2e8f0; --muted:#94a3b8; --dim:#64748b;
    --red:#dc2626; --red-dim:#7f1d1d; --green:#16a34a; --amber:#d97706;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif; }
  code, .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  a { color:inherit; }

  header { border-bottom:1px solid var(--line); padding:14px 20px;
           display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .brand { font-weight:800; letter-spacing:.14em; text-transform:uppercase;
           font-family:ui-monospace,monospace; font-size:15px; }
  .brand span { color:var(--red); }
  .who { margin-left:auto; color:var(--dim); font-size:12px; font-family:ui-monospace,monospace; }

  main { max-width:1180px; margin:0 auto; padding:20px; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:22px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
  .card .label { font-size:10px; letter-spacing:.12em; text-transform:uppercase;
                 color:var(--dim); font-family:ui-monospace,monospace; }
  .card .value { font-size:26px; font-weight:700; margin-top:4px; font-family:ui-monospace,monospace; }
  .card .sub { font-size:11px; color:var(--muted); margin-top:2px; }

  .tabs { display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap; }
  .tab { background:var(--panel); border:1px solid var(--line); color:var(--muted);
         padding:7px 14px; border-radius:9px; cursor:pointer; font-size:12px;
         font-family:ui-monospace,monospace; font-weight:700; }
  .tab[aria-selected="true"] { background:var(--red); border-color:var(--red); color:#fff; }

  .layout { display:grid; grid-template-columns:270px 1fr; gap:16px; align-items:start; }
  @media (max-width:820px) { .layout { grid-template-columns:1fr; } }

  .panel { background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .panel h2 { margin:0; padding:12px 16px; font-size:11px; letter-spacing:.12em;
              text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--line);
              font-family:ui-monospace,monospace; }
  .panel .body { padding:14px 16px; }

  .runlist { max-height:520px; overflow:auto; }
  .run { padding:10px 16px; border-bottom:1px solid var(--line); cursor:pointer; }
  .run:hover { background:var(--panel-2); }
  .run[aria-current="true"] { background:var(--red-dim); }
  .run .d { font-family:ui-monospace,monospace; font-size:12px; font-weight:700; }
  .run .m { font-size:11px; color:var(--muted); margin-top:2px; }

  .pill { display:inline-block; padding:1px 7px; border-radius:999px; font-size:10px;
          font-weight:800; font-family:ui-monospace,monospace; }
  .pill.add { background:#052e16; color:#4ade80; }
  .pill.chg { background:#422006; color:#fbbf24; }
  .pill.rem { background:#450a0a; color:#f87171; }

  .change { padding:11px 16px; border-bottom:1px solid var(--line); }
  .change:last-child { border-bottom:0; }
  .change .top { display:flex; gap:9px; align-items:baseline; flex-wrap:wrap; }
  .change .name { font-weight:600; }
  .change .meta { font-size:11px; color:var(--dim); font-family:ui-monospace,monospace; }
  .diff { margin-top:6px; font-size:12px; font-family:ui-monospace,monospace; color:var(--muted); }
  .diff .f { color:var(--dim); }
  .from { color:#f87171; } .to { color:#4ade80; }

  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; font-size:10px; letter-spacing:.1em; text-transform:uppercase;
       color:var(--dim); padding:8px 16px; border-bottom:1px solid var(--line);
       font-family:ui-monospace,monospace; position:sticky; top:0; background:var(--panel); }
  td { padding:9px 16px; border-bottom:1px solid var(--line); vertical-align:top; }
  tr:hover td { background:var(--panel-2); }
  .num { text-align:right; font-family:ui-monospace,monospace; }

  input, select { background:var(--bg); border:1px solid var(--line); color:var(--text);
                  padding:7px 10px; border-radius:8px; font-size:13px; }
  .filters { display:flex; gap:8px; padding:12px 16px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .empty { padding:28px 16px; text-align:center; color:var(--dim); font-size:13px; }
  .hide { display:none !important; }
</style></head><body>

<header>
  <div class="brand">RED<span>LINE</span> · SCAN REPORTS</div>
  <div class="who mono" id="who"></div>
</header>

<main>
  <div class="cards" id="cards"></div>

  <div class="tabs" role="tablist">
    <button class="tab" role="tab" aria-selected="true" data-view="runs">Scan reports</button>
    <button class="tab" role="tab" aria-selected="false" data-view="parts">Catalog</button>
  </div>

  <section id="view-runs" class="layout">
    <div class="panel">
      <h2>Scans</h2>
      <div class="runlist" id="runs"><div class="empty">Loading…</div></div>
    </div>
    <div class="panel">
      <h2 id="detail-title">Select a scan</h2>
      <div id="detail"><div class="empty">Pick a scan on the left.</div></div>
    </div>
  </section>

  <section id="view-parts" class="panel hide">
    <h2>Catalog</h2>
    <div class="filters">
      <input id="q" placeholder="Search name, brand or SKU…" style="flex:1;min-width:200px">
      <select id="vendor">
        <option value="">All vendors</option>
        <option value="ecs">ECS Tuning</option>
        <option value="fcp">FCP Euro</option>
        <option value="z1">Z1 Motorsports</option>
      </select>
      <select id="engine">
        <option value="">All engines</option>
        <option value="b58_gen1">B58 Gen 1</option>
        <option value="b58_gen2">B58 Gen 2</option>
        <option value="vr30_redsport">VR30 Red Sport</option>
        <option value="vr30_luxe">VR30 Luxe</option>
        <option value="vq37vhr">VQ37VHR</option>
      </select>
    </div>
    <div style="max-height:640px;overflow:auto"><table id="parts"></table></div>
  </section>
</main>

<script nonce="${nonce}">
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
const money = (n) => (n === null || n === undefined) ? '—' : '$' + Number(n).toFixed(2);
// Only http(s) may become an href. Scraped URLs are third-party input, so a
// javascript: or data: value must never survive into the DOM as a link.
const safeHref = (u) => {
  try {
    const p = new URL(String(u), location.origin);
    return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : null;
  } catch { return null; }
};
const link = (u, label) => {
  const href = safeHref(u);
  return href
    ? '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>'
    : esc(label);
};
const get = (path) => fetch(path).then((r) => r.json());

let currentRun = null;

async function boot() {
  get('/api/whoami').then((d) => {
    $('who').textContent = d.email ? 'signed in as ' + d.email : 'no Access identity (local dev)';
  }).catch(() => {});

  const s = await get('/api/summary').catch(() => null);
  const latest = s?.latest;
  $('cards').innerHTML = [
    card('Parts tracked', s?.parts?.total ?? 0, (s?.parts?.priced ?? 0) + ' with a price'),
    card('Last scan', latest ? latest.date : '—',
         latest ? latest.requests + '/' + latest.request_limit + ' requests' : 'no scans yet'),
    card('Last changes', latest ? (latest.added_count + latest.changed_count + latest.removed_count) : 0,
         latest ? '+' + latest.added_count + ' / ~' + latest.changed_count + ' / -' + latest.removed_count : ''),
    card('Queued next', latest ? latest.queued_next : 0, 'pages due on the next run'),
  ].join('');

  const { runs } = await get('/api/runs?limit=60');
  $('runs').innerHTML = runs.length
    ? runs.map((r) => \`<div class="run" data-id="\${esc(r.run_id)}">
         <div class="d">\${esc(r.date)}</div>
         <div class="m">\${r.scanned} scanned ·
           <span class="pill add">+\${r.added_count}</span>
           <span class="pill chg">~\${r.changed_count}</span>
           <span class="pill rem">-\${r.removed_count}</span>
           \${r.error_count ? ' · ' + r.error_count + ' err' : ''}</div></div>\`).join('')
    : '<div class="empty">No scans recorded yet.</div>';

  $('runs').querySelectorAll('.run').forEach((el) =>
    el.addEventListener('click', () => showRun(el.dataset.id)));
  if (runs.length) showRun(runs[0].run_id);
}

function card(label, value, sub) {
  return \`<div class="card"><div class="label">\${esc(label)}</div>
    <div class="value">\${esc(value)}</div><div class="sub">\${esc(sub)}</div></div>\`;
}

async function showRun(runId) {
  currentRun = runId;
  $('runs').querySelectorAll('.run').forEach((el) =>
    el.setAttribute('aria-current', String(el.dataset.id === runId)));

  const data = await get('/api/runs/' + encodeURIComponent(runId));
  if (data.error) { $('detail').innerHTML = '<div class="empty">' + esc(data.error) + '</div>'; return; }

  const r = data.run;
  const mins = (r.duration_ms / 60000).toFixed(1);
  $('detail-title').textContent = 'Scan ' + r.run_id;

  const head = \`<div class="body" style="border-bottom:1px solid var(--line)">
    <div class="mono" style="font-size:12px;color:var(--muted)">
      \${r.requests}/\${r.request_limit} requests · \${r.scanned} pages scanned ·
      \${r.unchanged} unchanged · \${mins} min · stopped: \${esc(r.stopped_reason ?? '—')}<br>
      \${r.queued_next} page(s) queued for the next run
    </div></div>\`;

  const rows = data.changes.map((c) => {
    const pill = c.kind === 'added' ? 'add' : c.kind === 'changed' ? 'chg' : 'rem';
    const mark = c.kind === 'added' ? '+' : c.kind === 'changed' ? '~' : '−';
    const diffs = (c.fields ?? []).map((f) =>
      \`<div><span class="f">\${esc(f.field)}</span>
        <span class="from">\${esc(fmt(f.from))}</span> → <span class="to">\${esc(fmt(f.to))}</span></div>\`).join('');
    return \`<div class="change">
      <div class="top"><span class="pill \${pill}">\${mark}</span>
        <span class="name">\${link(c.url, c.name)}</span>
        <span class="meta">\${esc(c.vendor_name ?? c.vendor_id)}\${c.sku ? ' · ' + esc(c.sku) : ''} · \${money(c.price)}</span></div>
      \${diffs ? '<div class="diff">' + diffs + '</div>' : ''}
    </div>\`;
  }).join('');

  const errs = data.errors.length
    ? \`<div class="body" style="border-top:1px solid var(--line)">
        <div class="label mono" style="font-size:10px;color:var(--dim);text-transform:uppercase">Errors</div>
        \${data.errors.map((e) => \`<div class="mono" style="font-size:12px;color:#f87171;margin-top:5px">
          \${esc(e.reason)} — \${esc(e.url)}</div>\`).join('')}</div>\`
    : '';

  $('detail').innerHTML = head + (rows || '<div class="empty">Nothing changed in this scan.</div>') + errs;
}

function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.join('/') || '—';
  const s = String(v);
  return s.length > 70 ? s.slice(0, 67) + '…' : s;
}

async function loadParts() {
  const params = new URLSearchParams();
  if ($('q').value) params.set('q', $('q').value);
  if ($('vendor').value) params.set('vendor', $('vendor').value);
  if ($('engine').value) params.set('engine', $('engine').value);

  const { parts } = await get('/api/parts?' + params);
  $('parts').innerHTML = parts.length
    ? '<thead><tr><th>Part</th><th>Vendor</th><th>SKU</th><th>Fits</th>' +
      '<th class="num">Price</th><th>Stock</th><th>Changed</th></tr></thead><tbody>' +
      parts.map((p) => \`<tr>
        <td>\${link(p.url, p.name)}
          \${p.brand ? '<div class="meta mono" style="font-size:11px;color:var(--dim)">' + esc(p.brand) + '</div>' : ''}</td>
        <td class="mono" style="font-size:12px">\${esc(p.vendor_id)}</td>
        <td class="mono" style="font-size:12px">\${esc(p.sku ?? '—')}</td>
        <td class="mono" style="font-size:11px;color:var(--muted)">\${esc((p.engine_ids ?? []).join(', ') || '—')}</td>
        <td class="num">\${money(p.price)}</td>
        <td class="mono" style="font-size:11px">\${esc(p.availability ?? '—')}</td>
        <td class="mono" style="font-size:11px;color:var(--dim)">\${esc((p.last_changed_at ?? '').slice(0, 10))}</td>
      </tr>\`).join('') + '</tbody>'
    : '<tbody><tr><td class="empty">No parts match.</td></tr></tbody>';
}

let debounce;
['q', 'vendor', 'engine'].forEach((id) =>
  $(id).addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(loadParts, 220); }));

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
  const parts = tab.dataset.view === 'parts';
  $('view-runs').classList.toggle('hide', parts);
  $('view-parts').classList.toggle('hide', !parts);
  if (parts && !$('parts').innerHTML) loadParts();
}));

boot();
</script></body></html>`;
}
