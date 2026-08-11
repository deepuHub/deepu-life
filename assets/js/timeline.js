/* ══════════════════════════════════════════════════════════════════
   deepu-life — Cinematic Timeline engine (Knight Lab–style)
   Shared by index.html (Run/Read/Cycle tabs) and half-marathon.html.
   Pairs with assets/css/timeline.css.

   Usage: tlBuild(tabId, items, cfg) where cfg is:
     { color, icon, getDate(item), getBarH(item), makeMarkerVal(item),
       getTeaserTitle(item), makeSlide(item), startIdx? }
   startIdx (optional) picks which item opens by default — defaults
   to the last item. Pass a specific index (e.g. the next upcoming
   session) to open there instead.
═══════════════════════════════════════════════════════════════════ */
const TL = { activeTab: null };

const tlMO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function tlFmtDate(d) {
  if (!d) return '—';
  const p = String(d).split('-');
  return `${tlMO[+p[1]-1]} ${+p[2]}`;
}

function tlSetActiveTab(tab) { TL.activeTab = tab; }

function tlBuild(tab, items, cfg) {
  const container = document.getElementById(`${tab}-tv`);
  container.innerHTML = '';
  const state = TL[tab] = { idx: 0, items, cfg, dragging: false, mounted: new Map() };
  if (!items.length) {
    container.innerHTML = `<div class="tl-shell" style="--ac:${cfg.color}"><div class="tl-empty"><div class="tl-empty-ico">${cfg.icon}</div><div>Nothing here yet — add a row in Google Sheets!</div></div></div>`;
    return;
  }
  container.innerHTML = `
  <div class="tl-shell" id="${tab}-shell" style="--ac:${cfg.color}">
    <div class="tl-glow" style="--ac:${cfg.color}"></div>
    <div class="tl-stage" id="${tab}-stage">
      <div class="tl-counter" id="${tab}-counter"></div>
      <div class="tl-prev-teaser" id="${tab}-prev-t" onclick="tlPrev('${tab}')">
        <div class="teaser-arrow">←</div>
        <div class="teaser-date" id="${tab}-prev-date"></div>
        <div class="teaser-title" id="${tab}-prev-title"></div>
      </div>
      <div class="tl-next-teaser" id="${tab}-next-t" onclick="tlNext('${tab}')">
        <div class="teaser-arrow" style="text-align:right">→</div>
        <div class="teaser-date" id="${tab}-next-date"></div>
        <div class="teaser-title" id="${tab}-next-title"></div>
      </div>
    </div>
    <div class="tl-nav" id="${tab}-nav">
      <div class="tl-progress" id="${tab}-prog"></div>
      <div class="tl-axis"></div>
      <div class="tl-track-outer" id="${tab}-to"><div class="tl-track" id="${tab}-track"></div></div>
      <button class="tl-btn-prev" id="${tab}-prev" onclick="tlPrev('${tab}')">←</button>
      <button class="tl-btn-next" id="${tab}-next" onclick="tlNext('${tab}')">→</button>
      <div class="tl-keyhint"><span class="key">←</span><span class="key">→</span> navigate · drag track</div>
    </div>
  </div>`;

  const maxVal = Math.max(...items.map(cfg.getBarH), 1);

  const track  = document.getElementById(`${tab}-track`);
  const NAV_H  = parseInt(getComputedStyle(document.getElementById(`${tab}-nav`)).height) || 160;
  const BAR_MAX = NAV_H - 80;
  let lastYear = null;
  items.forEach((item, i) => {
    const itemYear = String(cfg.getDate(item)).split('-')[0];
    if (itemYear && itemYear !== lastYear) {
      const ym = document.createElement('div');
      ym.className = 'tl-year-marker';
      ym.innerHTML = `<div class="tl-year-stem"></div><div class="tl-year-label">${itemYear}</div>`;
      track.appendChild(ym);
      lastYear = itemYear;
    }
    const marker = document.createElement('div');
    marker.className = 'tl-marker'; marker.dataset.idx = i; marker.onclick = () => tlGoTo(tab, i);
    const barH = Math.max(4, Math.round((cfg.getBarH(item)/maxVal)*BAR_MAX));
    marker.innerHTML = `<div class="tl-bar" style="height:${barH}px"></div><div class="tl-dot"></div><div class="tl-mlabel">${tlFmtDate(cfg.getDate(item))}</div><div class="tl-mval">${cfg.makeMarkerVal(item)}</div>`;
    track.appendChild(marker);
  });

  tlInitDrag(tab); tlInitSwipe(tab);
  const startIdx = cfg.startIdx != null ? cfg.startIdx : items.length - 1;
  requestAnimationFrame(() => tlGoTo(tab, startIdx, true));
}

/* Only the active slide and its immediate neighbors are ever mounted —
   with 70+ items (e.g. the Half Marathon plan) building every slide's
   full markup up front pinned dozens of full-viewport, filtered
   elements in memory/GPU layers at once, enough to crash some mobile
   browsers. Off-active slides were always invisible (opacity:0) either
   way, so windowing to ±1 is visually identical and far cheaper. */
function tlMountSlide(tab, i) {
  const state = TL[tab];
  if (state.mounted.has(i)) return state.mounted.get(i);
  const stage  = document.getElementById(`${tab}-stage`);
  const anchor = document.getElementById(`${tab}-prev-t`);
  const slide = document.createElement('div');
  slide.className = 'tl-slide'; slide.id = `${tab}-slide-${i}`;
  slide.style.cssText = 'opacity:0;transform:translateX(60px)';
  slide.innerHTML = state.cfg.makeSlide(state.items[i]);
  stage.insertBefore(slide, anchor);
  state.mounted.set(i, slide);
  return slide;
}
function tlUnmountSlide(tab, i) {
  const state = TL[tab];
  const el = state.mounted.get(i);
  if (el) { el.remove(); state.mounted.delete(i); }
}

function tlGoTo(tab, newIdx, initial=false) {
  const state = TL[tab]; if (!state || newIdx<0 || newIdx>=state.items.length) return;
  const items = state.items; const n = items.length;
  const keep = new Set([newIdx-1, newIdx, newIdx+1].filter(i => i>=0 && i<n));
  keep.forEach(i => tlMountSlide(tab, i));
  state.idx = newIdx;
  state.mounted.forEach((el, i) => {
    if (i===newIdx) { el.style.transition=initial?'opacity 0.7s':'opacity 0.55s cubic-bezier(0.4,0,0.2,1),transform 0.55s cubic-bezier(0.4,0,0.2,1)'; el.style.opacity='1'; el.style.transform='translateX(0)'; el.style.zIndex='2'; el.classList.add('active'); }
    else { const off=i<newIdx?-60:60; el.style.transition=initial?'none':'opacity 0.4s,transform 0.4s'; el.style.opacity='0'; el.style.transform=`translateX(${off}px)`; el.style.zIndex='1'; el.classList.remove('active'); }
  });
  [...state.mounted.keys()].forEach(i => { if (!keep.has(i)) tlUnmountSlide(tab, i); });
  document.querySelectorAll(`#${tab}-track .tl-marker`).forEach((m,i) => m.classList.toggle('active', i===newIdx));
  const pct = n>1 ? ((newIdx/(n-1))*100) : 100;
  document.getElementById(`${tab}-prog`).style.width = pct + '%';
  document.getElementById(`${tab}-counter`).textContent = `${String(newIdx+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}`;
  document.getElementById(`${tab}-prev`).disabled = newIdx===0;
  document.getElementById(`${tab}-next`).disabled = newIdx===n-1;
  const pt = document.getElementById(`${tab}-prev-t`);
  const nt = document.getElementById(`${tab}-next-t`);
  if (newIdx>0) { pt.style.opacity='0.6'; document.getElementById(`${tab}-prev-date`).textContent=tlFmtDate(state.cfg.getDate(items[newIdx-1])); document.getElementById(`${tab}-prev-title`).textContent=state.cfg.getTeaserTitle(items[newIdx-1]); }
  else pt.style.opacity='0';
  if (newIdx<n-1) { nt.style.opacity='0.6'; document.getElementById(`${tab}-next-date`).textContent=tlFmtDate(state.cfg.getDate(items[newIdx+1])); document.getElementById(`${tab}-next-title`).textContent=state.cfg.getTeaserTitle(items[newIdx+1]); }
  else nt.style.opacity='0';
  tlScrollToActive(tab);
}
function tlScrollToActive(tab) {
  const state = TL[tab]; if (!state) return;
  const track = document.getElementById(`${tab}-track`); if (!track) return;
  const outer = document.getElementById(`${tab}-to`);
  const markers = [...track.querySelectorAll('.tl-marker')];
  const active = markers[state.idx]; if (!active) return;
  const outerW = outer.offsetWidth;
  const markerMid = active.offsetLeft + active.offsetWidth/2;
  const clampedLeft = Math.min(0, Math.max(-(track.scrollWidth-outerW), outerW/2-markerMid));
  if (!state.dragging) { track.classList.remove('no-transition'); track.style.left = clampedLeft + 'px'; }
}
function tlPrev(tab) { const s=TL[tab]; if(s) tlGoTo(tab,s.idx-1); }
function tlNext(tab) { const s=TL[tab]; if(s) tlGoTo(tab,s.idx+1); }

function tlInitDrag(tab) {
  const outer = document.getElementById(`${tab}-to`);
  const track = document.getElementById(`${tab}-track`);
  const state = TL[tab]; let startX=0, startLeft=0;
  const getLeft = () => parseInt(track.style.left||'0');
  const onDown = e => { state.dragging=true; outer.classList.add('dragging'); track.classList.add('no-transition'); startX=(e.touches?e.touches[0]:e).clientX; startLeft=getLeft(); e.preventDefault(); };
  const onMove = e => { if(!state.dragging) return; const x=(e.touches?e.touches[0]:e).clientX; const dx=x-startX; const outerW=outer.offsetWidth; const maxRight=-(track.scrollWidth-outerW); track.style.left=Math.min(0,Math.max(maxRight,startLeft+dx))+'px'; };
  const onUp = () => { if(!state.dragging) return; state.dragging=false; outer.classList.remove('dragging'); track.classList.remove('no-transition'); const outerW=outer.offsetWidth; const currentLeft=parseInt(track.style.left||'0'); const markers=[...track.querySelectorAll('.tl-marker')]; let closest=0,minDist=Infinity; markers.forEach((m,i)=>{const c=m.offsetLeft+m.offsetWidth/2+currentLeft; const d=Math.abs(c-outerW/2); if(d<minDist){minDist=d;closest=i;}}); tlGoTo(tab,closest); };
  outer.addEventListener('mousedown',onDown); outer.addEventListener('mousemove',onMove); outer.addEventListener('mouseup',onUp); outer.addEventListener('mouseleave',onUp);
  outer.addEventListener('touchstart',onDown,{passive:false}); outer.addEventListener('touchmove',onMove,{passive:true}); outer.addEventListener('touchend',onUp);
}
function tlInitSwipe(tab) {
  const stage = document.getElementById(`${tab}-stage`); let sx=0, sy=0;
  stage.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
  stage.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx;const dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>44){dx<0?tlNext(tab):tlPrev(tab);}});
}
document.addEventListener('keydown', e => {
  if (!TL.activeTab) return;
  if (e.key === 'ArrowLeft')  tlPrev(TL.activeTab);
  if (e.key === 'ArrowRight') tlNext(TL.activeTab);
});
