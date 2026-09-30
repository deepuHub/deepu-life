/* ══════════════════════════════════════════════════════════════════
   deepu-life — shared data + helpers for index.html and the activity
   pages (run.html, read.html, cycle.html). Everything comes from the
   one "deepu-life" Google Sheet via the AppScript.gs web app; there is
   no hardcoded fallback data — if the fetch fails the page says so.
═══════════════════════════════════════════════════════════════════ */
const GS_URL      = 'https://script.google.com/macros/s/AKfycbyJyCwv2hh4m5RHbVgaTOiInv8kgoyIppYlFlrqoYgOzF8hGBNEH6gyqtK7CI1ngm4eVQ/exec';
const GS_SHEET_ID = '1IqAAGq7i0MUtz1wwv23qfjjNGiIMIwigbpvK2zssUxE';

const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtS = d => { if(!d) return '—'; const p=String(d).split('-'); return `${MO[+p[1]-1]} ${+p[2]}`; };
const fmtF = d => { if(!d) return '—'; const p=String(d).split('-'); return `${MO[+p[1]-1]} ${+p[2]}, ${p[0]}`; };
const chips = arr => arr.map(c => `<div class="summary-chip"><span class="chip-lbl">${c.l}</span><span class="chip-val ${c.cls||''}">${c.v}</span></div>`).join('');
const parseQuotes = q => !q||typeof q!=='string' ? [] : q.split('|').map(s=>s.trim()).filter(Boolean).map(s=>({content:s}));
function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showLoader(msg='Loading from Google Sheets…') {
  let el = document.getElementById('gs-loader');
  if (el) { document.getElementById('gs-loader-msg').textContent = msg; return; }
  el = document.createElement('div');
  el.id = 'gs-loader';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,15,13,0.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.9rem;font-family:Epilogue,sans-serif;color:#6b7d6e;font-size:0.88rem;letter-spacing:0.06em;backdrop-filter:blur(8px)';
  el.innerHTML = `
    <svg viewBox="0 0 100 100" width="76" height="76" fill="none" stroke="#c8f04a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
      <g class="gs-scene gs-scene-run">
        <g class="gs-run-bob">
          <circle class="gs-frame-a" cx="62" cy="16" r="7"/>
          <path class="gs-frame-a" d="M60,23 Q54,37 48,52 M56,28 L44,26 L36,36 M56,28 L66,36 L72,50 M48,52 L38,58 L42,74 M48,52 L60,64 L74,68"/>
          <circle class="gs-frame-b" cx="62" cy="16" r="7"/>
          <path class="gs-frame-b" d="M60,23 Q54,37 48,52 M56,28 L68,24 L76,32 M56,28 L46,38 L38,50 M48,52 L60,56 L66,72 M48,52 L36,62 L20,64"/>
        </g>
      </g>
      <g class="gs-scene gs-scene-cycle">
        <circle cx="18" cy="80" r="13" stroke-width="3.5"/>
        <circle cx="72" cy="80" r="13" stroke-width="3.5"/>
        <path d="M18,80 L44,72 L72,80 M44,72 L36,46 M36,46 L60,48 L72,80" stroke-width="3.5"/>
        <circle cx="50" cy="20" r="7"/>
        <path d="M47,27 L38,46 M42,31 L60,48"/>
        <g class="gs-pedal-a"><path d="M44,72 L30,60 L23,70"/></g>
        <g class="gs-pedal-b"><path d="M44,72 L30,60 L23,70"/></g>
      </g>
      <g class="gs-scene gs-scene-swim">
        <path d="M6,72 Q13,66 20,72 T34,72" stroke-width="3" opacity="0.45"/>
        <path d="M42,80 Q49,74 56,80 T70,80" stroke-width="3" opacity="0.45"/>
        <circle cx="20" cy="38" r="7"/>
        <path d="M27,40 L70,46"/>
        <path class="gs-frame-a" d="M29,39 L44,20 L58,14 M29,40 L24,54 L14,64 M70,46 L84,38 L96,30"/>
        <path class="gs-frame-b" d="M29,40 L24,54 L14,64 M29,39 L44,20 L58,14 M70,46 L84,54 L96,66"/>
      </g>
    </svg>
    <div id="gs-loader-msg">${msg}</div>`;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes gs-swap{0%,45%{opacity:1}50%,95%{opacity:0}100%{opacity:1}}
    @keyframes gs-bob{from{transform:translateY(0)}to{transform:translateY(-3px)}}
    @keyframes gs-pedal{to{transform:rotate(360deg)}}
    @keyframes gs-scene-run-k{0%,32%{opacity:1}33%,100%{opacity:0}}
    @keyframes gs-scene-cycle-k{0%,32%{opacity:0}33%,65%{opacity:1}66%,100%{opacity:0}}
    @keyframes gs-scene-swim-k{0%,65%{opacity:0}66%,99%{opacity:1}100%{opacity:0}}
    .gs-scene{opacity:0}
    .gs-scene-run{animation:gs-scene-run-k 6s steps(1) infinite}
    .gs-scene-cycle{animation:gs-scene-cycle-k 6s steps(1) infinite}
    .gs-scene-swim{animation:gs-scene-swim-k 6s steps(1) infinite}
    .gs-frame-a{animation:gs-swap 0.7s steps(1) infinite}
    .gs-frame-b{opacity:0;animation:gs-swap 0.7s steps(1) infinite reverse}
    .gs-run-bob{animation:gs-bob 0.35s ease-in-out infinite alternate}
    .gs-pedal-a,.gs-pedal-b{transform-origin:45px 70px;animation:gs-pedal 1s linear infinite}
    .gs-pedal-b{animation-delay:-0.5s}`;
  document.head.appendChild(s);
  document.body.appendChild(el);
}
function hideLoader() { document.getElementById('gs-loader')?.remove(); }

function showBanner(msg, type='error') {
  document.getElementById('gs-banner')?.remove();
  const colors = { error:'#ff8080', info:'#4acfa8' };
  const bgs    = { error:'#2e0a0a', info:'#0a2e26' };
  const c = colors[type] || colors.info;
  const el = document.createElement('div');
  el.id = 'gs-banner';
  el.style.cssText = `position:fixed;top:var(--nav-h,60px);left:0;right:0;z-index:400;padding:0.7rem 1.5rem;font-size:0.82rem;font-family:Epilogue,sans-serif;display:flex;justify-content:space-between;align-items:center;gap:1rem;background:${bgs[type]||bgs.info};color:${c};border-bottom:1px solid ${c}33`;
  el.innerHTML = `<span>${escHtml(msg)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:${c};font-size:1.1rem;line-height:1">×</button>`;
  document.body.appendChild(el);
  if (type !== 'error') setTimeout(() => el.remove(), 4000);
}

function setSyncBadge(state, timeStr) {
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  const dot   = badge.querySelector('.sync-dot');
  const label = badge.querySelector('.sync-label');
  if (state === 'ok')      { dot.className = 'sync-dot ok';  label.textContent = `Synced ${timeStr}`; }
  if (state === 'err')     { dot.className = 'sync-dot err'; label.textContent = 'Sync failed'; }
  if (state === 'loading') { dot.className = 'sync-dot';     label.textContent = 'Loading…'; }
}

/* Points the page's "Add in Sheets" button at its own tab. AppScript.gs
   returns each tab's gid; until that version is deployed, the button
   opens the spreadsheet on whatever tab was last used. */
function setSheetLink(el, tabName, gids) {
  if (!el) return;
  const gid = gids && gids[tabName];
  el.href = `https://docs.google.com/spreadsheets/d/${GS_SHEET_ID}/edit${gid != null ? `#gid=${gid}` : ''}`;
}

/* The Apps Script web app takes 10–20s to answer, so the last response
   is kept in localStorage: pages render it instantly and refresh in the
   background. The full-screen loader only shows when nothing is cached. */
const TRACKER_CACHE_KEY = 'deepu-tracker-cache';
const fmtTime = t => new Date(t).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});

function readTrackerCache() {
  try { return JSON.parse(localStorage.getItem(TRACKER_CACHE_KEY)); } catch (e) { return null; }
}

async function loadTracker(render) {
  const cached = readTrackerCache();
  if (cached && cached.data) {
    render(cached.data);
    setSyncBadge('loading');
    document.querySelector('#sync-badge .sync-label')?.replaceChildren(`Saved ${fmtTime(cached.at)} · refreshing…`);
  } else {
    setSyncBadge('loading');
    showLoader();
  }
  try {
    const res = await fetch(GS_URL + '?action=getAll', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const at = Date.now();
    try { localStorage.setItem(TRACKER_CACHE_KEY, JSON.stringify({ at, data })); } catch (e) {}
    hideLoader();
    setSyncBadge('ok', `at ${fmtTime(at)}`);
    if (!cached || JSON.stringify(cached.data) !== JSON.stringify(data)) render(data);
  } catch (e) {
    hideLoader();
    setSyncBadge('err');
    if (cached) document.querySelector('#sync-badge .sync-label')?.replaceChildren(`Refresh failed — showing data from ${fmtTime(cached.at)}`);
    showBanner(`Could not load from Google Sheets: ${e.message}`, 'error');
  }
}
