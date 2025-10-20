window.TILE_PX = window.TILE_PX || 16;

let editing=true; let selected=null;
Object.defineProperty(window, 'editing', { get: () => editing, set: v => { editing = v; } });
Object.defineProperty(window, 'selected', { get: () => selected, set: v => { selected = v; } });

(function(){
  if (typeof window.TILE_PX !== 'number' || Number.isNaN(window.TILE_PX)){
    window.TILE_PX = 16;
  }

  if (typeof window.tilesToPx !== 'function'){
    window.tilesToPx = (t) => Math.round(t * window.TILE_PX);
  }

  if (typeof window.pxToTiles !== 'function'){
    window.pxToTiles = (px) => Math.round((px / window.TILE_PX) * 2) / 2;
  }

  const snapControl = (typeof window.snapTiles === 'object' && window.snapTiles !== null && 'checked' in window.snapTiles)
    ? window.snapTiles
    : null;

  if (snapControl && !window.snapTilesControl) window.snapTilesControl = snapControl;

  const withControlBridge = (fn) => {
    if (!snapControl) return fn;
    try {
      Object.defineProperty(fn, 'checked', {
        configurable: true,
        enumerable: false,
        get(){ return snapControl.checked; },
        set(v){ snapControl.checked = v; }
      });
    } catch {}
    if (typeof snapControl.addEventListener === 'function' && typeof fn.addEventListener !== 'function'){
      fn.addEventListener = snapControl.addEventListener.bind(snapControl);
    }
    if (typeof snapControl.removeEventListener === 'function' && typeof fn.removeEventListener !== 'function'){
      fn.removeEventListener = snapControl.removeEventListener.bind(snapControl);
    }
    fn.control = snapControl;
    return fn;
  };

  if (typeof window.snapTiles !== 'function'){
    const snapFn = (t, stepPx) => {
      const stepTiles = stepPx ? (stepPx / window.TILE_PX) : 1;
      if (!stepTiles) return t;
      return Math.round(t / stepTiles) * stepTiles;
    };
    window.snapTiles = withControlBridge(snapFn);
  } else if (!('control' in window.snapTiles) && snapControl){
    withControlBridge(window.snapTiles);
  }
})();

// Remove orphan .block nodes and stale cache refs BEFORE any import/apply.
window.purgePreImport = function(source = 'startup'){
  const removedEls = [];

  // 1) Remove DOM orphans: missing id OR missing data-kind
  document.querySelectorAll('.block').forEach(el => {
    const id = el.id?.trim();
    const kind = el.dataset?.kind;
    if (!id || !kind) {
      removedEls.push({ id: id || '(no-id)', kind: kind || '(no-kind)' });
      el.remove();
    }
  });

  // 2) Scrub localStorage caches that may rehydrate ghosts
  const ls = window.localStorage;
  const keys = ['liveLayoutCache', 'liveLayoutPreset', 'layout:last'];
  const scrubbed = [];
  keys.forEach(k => {
    const raw = ls.getItem(k);
    if (!raw) return;
    try {
      const json = JSON.parse(raw);
      if (json && Array.isArray(json.layout)) {
        const before = json.layout.length;
        json.layout = json.layout.filter(it => it && it.id && it.kind && typeof it.x === 'number' && typeof it.y === 'number');
        if (json.layout.length !== before) {
          ls.setItem(k, JSON.stringify(json));
          scrubbed.push({ key: k, removed: before - json.layout.length });
        }
      }
    } catch (_) {}
  });

  // UI feedback
  if (typeof window.inspStatus === 'function') {
    const r = removedEls.length;
    const s = scrubbed.reduce((a, b) => a + b.removed, 0);
    window.inspStatus(`Pre-import purge: domRemoved=${r}, cacheRemoved=${s}`);
  }
  try {
    window.dispatchEvent(new CustomEvent('layout:changed', {
      detail: { source: `purge:${source}`, removedEls, scrubbed }
    }));
  } catch (_) {}
  return { removedEls, scrubbed };
};

// Remove any visual preview/ghost artifacts that slipped into the stage.
// Heuristics:
//  - node has data-preview="1", OR
//  - .block with no id or no data-kind, OR
//  - .block whose .labelHost text matches the common ghost label ("SNEAKER" or "ST") AND missing data-kind.
window.postLoadVisualPurge = function(source='post-load'){
  const doomed = [];

  // 1) Any explicitly tagged preview nodes
  document.querySelectorAll('.be-preview-node, .block[data-preview="1"]').forEach(n => {
    doomed.push({ why: 'tagged-preview', node: n });
  });

  // 2) Blocks missing id or kind
  document.querySelectorAll('#stage .block').forEach(el=>{
    const id = el.id?.trim();
    const kind = el.dataset?.kind;
    if (!id || !kind) {
      // Optional: if it clearly looks like a ghost label (SNEAKER/ST), we can cull confidently.
      const label = el.querySelector('.labelHost');
      const txt = (label?.textContent || '').trim().replace(/\s+/g,' ');
      const looksLikeGhost = /(^SNEAKER\b|^ST$)/i.test(txt);
      doomed.push({ why: (!id||!kind) ? 'no-id-or-kind' : 'ghost-text', node: el, txt, looksLikeGhost });
    }
  });

  doomed.forEach(d => { try { d.node.remove(); } catch(_){} });

  if (typeof window.inspStatus === 'function'){
    window.inspStatus(`Visual purge (${source}): removed ${doomed.length} node(s)`);
  }
  return doomed.length;
};


// Ensure the game board exists, is locked, and is bottom-most.
// Uses tile geometry (defaults align with prior JSON: x:2,y:5,w:24,h:21 tiles).
window.ensureBoardLayer = function(){
  const TILE = window.TILE_PX || 16;
  const stage = document.getElementById('stage');
  if (!stage) return;

  let board = document.getElementById('board');
  if (!board) {
    board = document.createElement('div');
    board.id = 'board';
    board.className = 'block';
    board.dataset.kind = '_board';
    stage.appendChild(board);
    if (typeof window.normalizeBlockContent === 'function') window.normalizeBlockContent(board);
  }

  // Default geometry in tiles if none set
  if (!board.dataset.x) board.dataset.x = String(2 * TILE);
  if (!board.dataset.y) board.dataset.y = String(5 * TILE);
  if (!board.style.width)  board.style.width  = String(24 * TILE) + 'px';
  if (!board.style.height) board.style.height = String(21 * TILE) + 'px';

  // Lock and send behind everything
  board.classList.add('locked');
  board.style.zIndex = '1';
  document.querySelectorAll('#stage .block').forEach(b=>{
    if (b !== board) b.style.zIndex = '2';
  });

  // Skin hint for CSS to paint the board white
  board.classList.add('board-layer');
};

let seq=0; const uid=p=>`${p}_${++seq}`;
function ensureInnerHost(el){ if(el.querySelector('.innerHost')) return; const wrap=document.createElement('div'); wrap.className='innerHost';
  [...el.childNodes].forEach(n=>{ if(n.classList && n.classList.contains('handle')) return; if(n.classList && n.classList.contains('grid')) return; wrap.appendChild(n); });
  el.insertBefore(wrap, el.querySelector('.handle')||null);
  if(!el.style.getPropertyValue('--cx')) el.style.setProperty('--cx','50%');
  if(!el.style.getPropertyValue('--cy')) el.style.setProperty('--cy','50%');
}

// Keep only one innerHost/labelHost/iconsHost per block.
// Create missing hosts. Remove duplicates. Optionally set text and icon count.
function normalizeBlockContent(blockEl, opts = {}) {
  if (!blockEl) return;

  // 1) innerHost
  let inner = blockEl.querySelector(':scope > .innerHost');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'innerHost';
    blockEl.appendChild(inner);
  }
  // remove extra innerHosts (keep the first)
  for (const dup of blockEl.querySelectorAll(':scope > .innerHost:not(:first-child)')) {
    dup.remove();
  }

  // 2) labelHost
  let label = inner.querySelector(':scope > .labelHost');
  if (!label) {
    label = document.createElement('div');
    label.className = 'labelHost';
    inner.appendChild(label);
  }
  // remove duplicate labels
  for (const dup of inner.querySelectorAll(':scope > .labelHost:not(:first-child)')) {
    if (!label.textContent && dup.textContent) label.textContent = dup.textContent;
    dup.remove();
  }

  // 3) iconsHost
  let icons = inner.querySelector(':scope > .iconsHost');
  if (!icons) {
    icons = document.createElement('div');
    icons.className = 'iconsHost';
    inner.appendChild(icons);
  }
  // remove duplicate iconsHost
  for (const dup of inner.querySelectorAll(':scope > .iconsHost:not(:first-child)')) dup.remove();

  // 4) apply optional updates
  if (typeof opts.text === 'string') {
    const rawText = String(opts.text).replace(/\r\n/g, '\n');
    const parts = rawText.split(/\n|\\n/g);
    label.textContent = '';
    for (const line of parts) {
      const span = document.createElement('span');
      span.className = 'labelLine';
      span.textContent = line;
      label.appendChild(span);
    }
  }
  if (typeof opts.iconCount === 'number') {
    icons.innerHTML = '';
    for (let i = 0; i < opts.iconCount; i++) {
      const dot = document.createElement('i');
      dot.className = 'iconToken';
      icons.appendChild(dot);
    }
  }

  // 5) whitelist keepers: handle, grid, innerHost
  for (const child of Array.from(blockEl.children)) {
    if (child === inner) continue;
    if (child.classList?.contains('handle')) continue;
    if (child.classList?.contains('grid')) continue;
    child.remove();
  }
}

window.renderLabelForBlock = function(el, meta = {}, opts = {}) {
  if (!el) return;
  const isPreview = !!(opts && opts.preview);
  if (isPreview && el && typeof window.attachPreviewTag === 'function') {
    window.attachPreviewTag(el);
  }
  if (typeof window.normalizeBlockContent === 'function') window.normalizeBlockContent(el);

  const inner = el.querySelector(':scope > .innerHost');
  const label = inner?.querySelector(':scope > .labelHost');
  if (!label) return;

  const setDS = (k, v) => { if (v !== undefined && v !== null) el.dataset[k] = String(v); };
  setDS('labelText',  meta.text);
  setDS('labelFontPx', meta.fontPx);
  setDS('labelAlignH', meta.alignH);
  setDS('labelAlignV', meta.alignV);
  setDS('labelPadX',   meta.padX);
  setDS('labelTx',     meta.tx);
  setDS('labelTy',     meta.ty);
  setDS('contentCx',   meta.cx);
  setDS('contentCy',   meta.cy);

  const text   = el.dataset.labelText ?? '';
  const fontPx = Number(el.dataset.labelFontPx ?? 15);
  const alignH = el.dataset.labelAlignH || 'left';
  const alignV = el.dataset.labelAlignV || 'center';
  const padX   = Number(el.dataset.labelPadX ?? 0);

  const cx  = Number(el.dataset.contentCx ?? 0);
  const cy  = Number(el.dataset.contentCy ?? 0);
  const tx  = Number(el.dataset.labelTx   ?? 0);
  const ty  = Number(el.dataset.labelTy   ?? 0);

  label.innerHTML = '';
  const lines = String(text).split('\n');
  lines.forEach((ln, i) => {
    const span = document.createElement('span');
    span.className = 'labelLine';
    span.textContent = ln;
    label.appendChild(span);
    if (i < lines.length - 1) label.appendChild(document.createElement('br'));
  });

  label.style.fontSize = fontPx + 'px';
  label.style.padding   = '0 ' + Math.max(0, padX) + 'px';
  label.style.display   = 'flex';
  label.style.flexDirection = 'column';
  label.style.justifyContent = (alignV === 'top') ? 'flex-start' : (alignV === 'bottom' ? 'flex-end' : 'center');
  label.style.textAlign = (alignH === 'center') ? 'center' : (alignH === 'right' ? 'right' : 'left');
  label.style.alignItems = (alignH === 'center') ? 'center' : (alignH === 'right' ? 'flex-end' : 'flex-start');

  const host = inner;
  const w = host.clientWidth  || el.offsetWidth;
  const h = host.clientHeight || el.offsetHeight;

  const gx = Math.round((cx / 100) * w);
  const gy = Math.round((cy / 100) * h);
  const fx = Math.round((tx / 100) * w);
  const fy = Math.round((ty / 100) * h);

  label.style.transform = `translate(${gx + fx}px, ${gy + fy}px)`;

  if (!isPreview && typeof window.renderLayout === 'function') window.renderLayout();
};

const __origRenderLabel = window.renderLabelForBlock;
window.renderLabelForBlock = function(el, meta = {}, opts = {}){
  return __origRenderLabel ? __origRenderLabel(el, meta, opts) : undefined;
};

function makeBlock(kind, forceId){
  const el=document.createElement('div'); el.className='block'; el.dataset.kind=kind; el.id=forceId||uid(kind); el.tabIndex=0;
  if(kind==='title'){ el.classList.add('titlePlaque'); const th=document.createElement('div'); th.className='txtHost'; th.textContent='S N E A K E R Q U E S T'; el.appendChild(th); }
  if(kind==='snkr'){ el.classList.add('badge'); if(!forceId) el.id='hudSneakers'; el.innerHTML='<span class="label txtHost">SNEAKERS</span> <span class="shoeSlot"></span><span class="shoeSlot"></span><span class="shoeSlot"></span><span class="shoeSlot"></span><span class="shoeSlot"></span>'; }
  if(kind==='power'){ el.classList.add('badge'); if(!forceId) el.id='hudPowerups'; el.innerHTML='<span class="label txtHost">POWER-UPS</span> <span class="circSlot"></span><span class="circSlot"></span><span class="circSlot"></span>'; }
  if(kind==='life'){ el.classList.add('badge'); if(!forceId) el.id='hudLife'; el.innerHTML='<span class="label txtHost">LIFE</span> <span class="heart"></span><span class="heart"></span><span class="heart"></span>'; }
  if(kind==='score'){ el.classList.add('badge','column'); if(!forceId) el.id='hudScore'; el.innerHTML='<div id="hudStageLabel" class="stageTop txtHost">STAGE — ONE</div><div class="scoreBottom">SCORE 000000</div>'; }
  if(kind==='timer'){ el.classList.add('badge','timerBadge'); if(!forceId) el.id='hudTimer'; el.innerHTML='<span class="timerDigits txtHost"><span class="mm">02</span>:<span class="ss">00</span>:<span class="cs">00</span>:<span class="ms">0</span></span>'; }
  if(kind==='bombbar'){ el.classList.add('badge'); if(!forceId) el.id='btnBombBar'; el.innerHTML='<div class="bombBar txtHost">BOMB</div>'; }
  if(kind==='joystick'){ el.classList.add('badge'); if(!forceId) el.id='joyStick'; el.innerHTML='<div class="joy"><div class="outer"><div class="nub"></div></div></div>'; }
  if(kind==='stat'){ el.classList.add('badge'); const label=(forceId==='statFires')?'FIRES':(forceId==='statBoxes')?'BOXES':'STAT'; const pipClass=(forceId==='statFires')?'pipFlame':'pipSq'; el.innerHTML=`<div class="statBox"><span class="label txtHost">${label}</span><div class="pips">`+`<span class="${pipClass}"></span><span class="${pipClass}"></span><span class="${pipClass}"></span><span class="${pipClass}"></span><span class="${pipClass}"></span><span class="${pipClass}"></span>`+`</div></div>`; }
  if(kind==='pause'){ el.classList.add('badge'); if(!forceId) el.id='btnPause'; el.innerHTML='<div class="pauseBtn"><div class="pauseIcon"></div></div>'; }
  const h=document.createElement('div'); h.className='handle'; el.appendChild(h); ensureInnerHost(el); normalizeBlockContent(el); wire(el); root.appendChild(el); return el;
}

function place(el,tx,ty,tw,th){ const rr=root.getBoundingClientRect(); const w=(tw||6)*TILE(), h=(th||2)*TILE(); const x=(typeof tx==='number')?tx*TILE():(rr.width-w)/2, y=(typeof ty==='number')?ty*TILE():(rr.height-h)/2; el.style.left=px(x); el.style.top=px(y); el.style.width=px(w); el.style.height=px(h); }

function select(el){ setSingleSelection(el); selected=el||null; }
function focusAndFlash(el){ select(el); el.scrollIntoView({block:'nearest',inline:'nearest'}); el.animate([{outlineColor:'transparent'},{outlineColor:'var(--sel)'}],{duration:300,iterations:2}); }

function pruneToRequired(){ $$('.block').forEach(el=>{ if(!REQUIRED_IDS.includes(el.id)) el.remove(); }); }
function ensureBlock(id, kind){ let el=document.getElementById(id); if(!el){ el=makeBlock(kind,id);} el.dataset.kind=kind; ensureInnerHost(el); normalizeBlockContent(el); return el; }
function applyStrict(layout, prune){ if(prune) pruneToRequired(); Object.entries(layout).forEach(([id, v])=>{ const el=ensureBlock(id, v.k); el.style.left=px(v.x*TILE()); el.style.top=px(v.y*TILE()); el.style.width=px(v.w*TILE()); el.style.height=px(v.h*TILE()); }); $$('.block').forEach(el=>{ if(!layout[el.id] && REQUIRED_IDS.includes(el.id)){ el.remove(); } });
  const meta=loadMeta(); Object.entries(meta).forEach(([id,m])=>{ const el=document.getElementById(id); if(el){ if(m.cx) el.style.setProperty('--cx', m.cx); if(m.cy) el.style.setProperty('--cy', m.cy); if(m.padx) el.style.setProperty('--padx', m.padx); }});
  editing=true;
  const toggle=document.getElementById('toggleEdit');
  if(toggle) toggle.checked=true;
  const overlay=document.getElementById('overlay');
  if(overlay) overlay.style.display='block';
  persist(layout);
}
function reconcileLayout(candidate){ const out={...candidate}; REQUIRED_IDS.forEach(id=>{ if(!out[id]) out[id]={...STRICT_LAYOUT[id]}; }); return out; }

window.ensureInnerHost = ensureInnerHost;
window.normalizeBlockContent = normalizeBlockContent;
window.makeBlock = makeBlock;
window.place = place;
window.select = select;
window.focusAndFlash = focusAndFlash;
window.pruneToRequired = pruneToRequired;
window.ensureBlock = ensureBlock;
window.applyStrict = applyStrict;
window.reconcileLayout = reconcileLayout;

window.isKnownKind = window.isKnownKind || function(kind){
  if (!kind || typeof kind !== 'string') return false;
  if (window.KIND_REGISTRY && Object.prototype.hasOwnProperty.call(window.KIND_REGISTRY, kind)) return true;
  const inDom = document.querySelector(`[data-kind="${kind}"]`);
  return !!inDom;
};

window.getBlockXY = window.getBlockXY || function(el){
  const x = Number(el.style.left?.replace('px','') || el.dataset.x || 0);
  const y = Number(el.style.top?.replace('px','') || el.dataset.y || 0);
  return { x, y };
};

window.setBlockPos = window.setBlockPos || function(el, x, y){
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.dataset.x = String(x);
  el.dataset.y = String(y);
};

window.renderIconsForBlock = function(el, meta = {}) {
  if (!el) return;
  if (typeof window.normalizeBlockContent === 'function') {
    try { window.normalizeBlockContent(el); } catch(_){}
  }

  const inner = el.querySelector(':scope > .innerHost');
  const host = inner?.querySelector(':scope > .iconsHost');
  if (!host) return;

  const typeRaw  = meta.iconType  || el.dataset.iconType  || 'dot';
  const countRaw = Number(meta.iconCount ?? el.dataset.iconCount ?? 0) | 0;
  const sizeRaw  = Number(meta.iconSize  ?? el.dataset.iconSize  ?? 12) | 0;
  const gapRaw   = Number(meta.iconGap   ?? el.dataset.iconGap   ?? 4)  | 0;
  const alignRaw = meta.iconAlign || el.dataset.iconAlign || 'start';

  const type  = String(typeRaw || 'dot');
  const count = Math.max(0, countRaw);
  const size  = Math.max(6, sizeRaw);
  const gap   = Math.max(0, gapRaw);
  const align = String(alignRaw || 'start');

  el.dataset.iconType  = type;
  el.dataset.iconCount = String(count);
  el.dataset.iconSize  = String(size);
  el.dataset.iconGap   = String(gap);
  el.dataset.iconAlign = align;

  host.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const iEl = document.createElement('i');
    iEl.className = `iconToken icon-${type}`;
    iEl.style.width = size + 'px';
    iEl.style.height = size + 'px';
    if (i > 0) iEl.style.marginLeft = gap + 'px';
    host.appendChild(iEl);
  }

  host.style.display = 'flex';
  host.style.alignItems = 'center';
  host.style.justifyContent = (align === 'center') ? 'center' : (align === 'end' ? 'flex-end' : 'flex-start');

  if (typeof window.renderLayout === 'function') window.renderLayout();
};

window.getSelectionBlocks = function(){
  const ids = (window.getSelectionSet && window.getSelectionSet()) || window.selSet;
  if (!ids || !ids.size) return [];
  const arr = [];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.classList && !el.classList.contains('locked')) arr.push(el);
  });
  return arr;
};

window.getSelectionBounds = function(blocks){
  if (!blocks.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of blocks){
    const { x, y } = window.getBlockXY(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return { x:minX, y:minY, w:maxX - minX, h:maxY - minY };
};

window.alignSelected = function(kind){
  const blocks = window.getSelectionBlocks();
  if (blocks.length < 2) return;

  const snap = (typeof getSnapStep === 'function') ? getSnapStep() : 16;

  const box = window.getSelectionBounds(blocks);
  if (!box) return;

  const stageClamp = (typeof clampToStage === 'function') ? clampToStage : (x,y,w,h)=>({x,y});

  for (const el of blocks){
    const { x, y } = window.getBlockXY(el);
    const w = el.offsetWidth, h = el.offsetHeight;

    let nx = x, ny = y;

    switch(kind){
      case 'left':    nx = box.x; break;
      case 'centerX': nx = Math.round((box.x + (box.w - w)/2) / snap) * snap; break;
      case 'right':   nx = box.x + box.w - w; break;

      case 'top':     ny = box.y; break;
      case 'middleY': ny = Math.round((box.y + (box.h - h)/2) / snap) * snap; break;
      case 'bottom':  ny = box.y + box.h - h; break;
    }

    if (['left','right'].includes(kind))  nx = Math.round(nx / snap) * snap;
    if (['top','bottom'].includes(kind))  ny = Math.round(ny / snap) * snap;

    const c = stageClamp(nx, ny, w, h) || { x: nx, y: ny };
    window.setBlockPos(el, c.x, c.y);
  }

  if (typeof window.renderLayout   === 'function') window.renderLayout();
  if (typeof window.updateInspector=== 'function') window.updateInspector(null);
  if (typeof window.historyPush    === 'function') window.historyPush({type:'align', note:kind});
  else if (typeof window.pushHistory=== 'function') window.pushHistory('align-'+kind);
  if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
  try { window.dispatchEvent(new CustomEvent('layout:changed', { detail:{source:'align', kind} })); } catch(_){ }
};

window.distributeSelected = function(mode){
  const blocks = (window.getSelectionBlocks && window.getSelectionBlocks()) ? window.getSelectionBlocks() : [];
  if (!blocks || blocks.length < 3) return;

  const snap = (typeof getSnapStep === 'function') ? getSnapStep() : 16;
  const clamp = (typeof clampToStage === 'function') ? clampToStage : (x,y,w,h)=>({x,y});
  const bounds = window.getSelectionBounds(blocks);
  if (!bounds) return;

  const items = blocks.map(el => {
    const pos = window.getBlockXY ? window.getBlockXY(el) : { x: Number(el.style.left.replace('px','')||0), y: Number(el.style.top.replace('px','')||0) };
    return { el, x: pos.x, y: pos.y, w: el.offsetWidth, h: el.offsetHeight };
  });

  if (mode === 'h') {
    items.sort((a,b)=> a.x - b.x);

    const totalW = items.reduce((sum,i)=> sum + i.w, 0);
    const span   = bounds.w;
    const gaps   = items.length - 1;
    const gapW   = (span - totalW) / gaps;

    let cursor = bounds.x;
    for (let i=0;i<items.length;i++){
      const it = items[i];
      let nx = Math.round(cursor / snap) * snap;
      let ny = it.y;
      const c = clamp(nx, ny, it.w, it.h) || { x: nx, y: ny };
      window.setBlockPos(it.el, c.x, c.y);
      cursor += it.w + gapW;
    }
  } else if (mode === 'v') {
    items.sort((a,b)=> a.y - b.y);

    const totalH = items.reduce((sum,i)=> sum + i.h, 0);
    const span   = bounds.h;
    const gaps   = items.length - 1;
    const gapH   = (span - totalH) / gaps;

    let cursor = bounds.y;
    for (let i=0;i<items.length;i++){
      const it = items[i];
      let nx = it.x;
      let ny = Math.round(cursor / snap) * snap;
      const c = clamp(nx, ny, it.w, it.h) || { x: nx, y: ny };
      window.setBlockPos(it.el, c.x, c.y);
      cursor += it.h + gapH;
    }
  }

  if (typeof window.renderLayout    === 'function') window.renderLayout();
  if (typeof window.updateInspector === 'function') window.updateInspector(null);
  if (typeof window.historyPush     === 'function') window.historyPush({ type:'distribute', mode });
  else if (typeof window.pushHistory=== 'function') window.pushHistory('distribute-'+mode);
  if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
  try { window.dispatchEvent(new CustomEvent('layout:changed', { detail:{ source:'distribute', mode } })); } catch(_){ }
};

window.pruneGhostBlocks = function(){
  const removed = [];
  document.querySelectorAll('.block').forEach(el => {
    const kind = el.dataset?.kind;
    const id = el.id;
    if (!id || !kind) {
      removed.push({ id: id || '(no-id)', kind: kind || '(no-kind)' });
      el.remove();
    }
  });
  return removed;
};

window.ensureUniqueBlockIds = function(){
  const seen = new Map();
  const renamed = [];
  document.querySelectorAll('.block[id]').forEach(el => {
    const id = el.id.trim();
    if (!id) return;

    if (!seen.has(id)) {
      seen.set(id, 1);
      return;
    }

    const nth = seen.get(id) + 1;
    seen.set(id, nth);
    const newId = `${id}-${nth}`;
    const oldId = el.id;

    el.id = newId;
    renamed.push({ from: oldId, to: newId });

    if (window.selSet && window.selSet.has(oldId)) {
      window.selSet.delete(oldId);
      window.selSet.add(newId);
    }
  });
  return renamed;
};

window.sanitizeLayoutOnce = function(source = 'startup'){
  const removed = window.pruneGhostBlocks();
  const renamed = window.ensureUniqueBlockIds();

  if (removed.length || renamed.length) {
    if (typeof window.inspStatus === 'function') {
      window.inspStatus(`Sanitized: removed ${removed.length} ghost(s), renamed ${renamed.length} duplicate id(s)`);
    }
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    if (typeof window.updateInspector === 'function') window.updateInspector(null);
    try {
      window.dispatchEvent(new CustomEvent('layout:changed', { detail:{ source: `sanitize:${source}`, removed, renamed } }));
    } catch(_){ }
    if (typeof window.historyPush === 'function') window.historyPush({ type:'sanitize', source, removed, renamed });
  }
  return { removed, renamed };
};

