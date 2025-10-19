let editing=true; let selected=null;
Object.defineProperty(window, 'editing', { get: () => editing, set: v => { editing = v; } });
Object.defineProperty(window, 'selected', { get: () => selected, set: v => { selected = v; } });

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

