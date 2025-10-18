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
  const h=document.createElement('div'); h.className='handle'; el.appendChild(h); ensureInnerHost(el); wire(el); root.appendChild(el); return el;
}

function place(el,tx,ty,tw,th){ const rr=root.getBoundingClientRect(); const w=(tw||6)*TILE(), h=(th||2)*TILE(); const x=(typeof tx==='number')?tx*TILE():(rr.width-w)/2, y=(typeof ty==='number')?ty*TILE():(rr.height-h)/2; el.style.left=px(x); el.style.top=px(y); el.style.width=px(w); el.style.height=px(h); }

const snapTiles=$('#snapTiles'), snapEdges=$('#snapEdges'), snapCenters=$('#snapCenters');
function select(el){ if(selected) selected.classList.remove('sel'); selected=el||null; if(selected) selected.classList.add('sel'); }
function focusAndFlash(el){ select(el); el.scrollIntoView({block:'nearest',inline:'nearest'}); el.animate([{outlineColor:'transparent'},{outlineColor:'var(--sel)'}],{duration:300,iterations:2}); }
function wire(el){
  let lastTap=0;
  el.addEventListener('dblclick',()=>openEditor(el));
  el.addEventListener('pointerdown',ev=>{ const now=Date.now(); if(now-lastTap<300){ openEditor(el); ev.preventDefault(); return; } lastTap=now; });
  el.addEventListener('pointerdown',e=>{
    if(!editing) return; select(el);
    const handle=e.target.classList.contains('handle'); const mode=handle?'resize':'move';
    const rr=root.getBoundingClientRect(), r=el.getBoundingClientRect();
    const start={x:e.clientX,y:e.clientY,l:r.left-rr.left,t:r.top-rr.top,w:r.width,h:r.height};
    const refs=[root.getBoundingClientRect(), board.getBoundingClientRect(), ctrl.getBoundingClientRect()];
    const EV=refs.flatMap(R=>[R.left,R.right]), EH=refs.flatMap(R=>[R.top,R.bottom]);
    const CV=refs.map(R=>(R.left+R.right)/2), CH=refs.map(R=>(R.top+R.bottom)/2);
    let moved=false;
    const move=ev=>{
      moved=true;
      let L=start.l+(ev.clientX-start.x), T=start.t+(ev.clientY-start.y), W=start.w, H=start.h;
      if(mode==='resize'){ W=Math.max(TILE(),start.w+(ev.clientX-start.x)); H=Math.max(TILE(),start.h+(ev.clientY-start.y)); }
      if(snapTiles.checked && !ev.altKey){ L=Math.round(L/TILE())*TILE(); T=Math.round(T/TILE())*TILE(); W=Math.round(W/TILE())*TILE(); H=Math.round(H/TILE())*TILE(); }
      const cur={left:rr.left+L,top:rr.top+T,right:rr.left+L+W,bottom:rr.top+T+H,cx:rr.left+L+W/2,cy:rr.top+T+H/2}, thr=TILE()/2;
      if(snapEdges.checked && !ev.altKey){ EV.forEach(x=>{ if(Math.abs(cur.left-x)<thr) L=x-rr.left; if(Math.abs(cur.right-x)<thr) L=x-rr.left-W;}); EH.forEach(y=>{ if(Math.abs(cur.top-y)<thr) T=y-rr.top; if(Math.abs(cur.bottom-y)<thr) T=y-rr.top-H;}); }
      if(snapCenters.checked && !ev.altKey){ CV.forEach(x=>{ if(Math.abs(cur.cx-x)<thr) L=x-rr.left-W/2;}); CH.forEach(y=>{ if(Math.abs(cur.cy-y)<thr) T=y-rr.top-H/2;}); }
      const shell=root.getBoundingClientRect(); L=clamp(L,0,shell.width-W); T=clamp(T,0,shell.height-H); if(mode==='resize'){ W=clamp(W,TILE(),shell.width-L); H=clamp(H,TILE(),shell.height-T); }
      el.style.left=px(L); el.style.top=px(T); if(mode==='resize'){ el.style.width=px(W); el.style.height=px(H); }
    };
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up); if(moved) snapshot(); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); e.preventDefault();
  });
}

function pruneToRequired(){ $$('.block').forEach(el=>{ if(!REQUIRED_IDS.includes(el.id)) el.remove(); }); }
function ensureBlock(id, kind){ let el=document.getElementById(id); if(!el){ el=makeBlock(kind,id);} el.dataset.kind=kind; ensureInnerHost(el); return el; }
function applyStrict(layout, prune){ if(prune) pruneToRequired(); Object.entries(layout).forEach(([id, v])=>{ const el=ensureBlock(id, v.k); el.style.left=px(v.x*TILE()); el.style.top=px(v.y*TILE()); el.style.width=px(v.w*TILE()); el.style.height=px(v.h*TILE()); }); $$('.block').forEach(el=>{ if(!layout[el.id] && REQUIRED_IDS.includes(el.id)){ el.remove(); } });
  const meta=loadMeta(); Object.entries(meta).forEach(([id,m])=>{ const el=document.getElementById(id); if(el){ if(m.cx) el.style.setProperty('--cx', m.cx); if(m.cy) el.style.setProperty('--cy', m.cy); if(m.padx) el.style.setProperty('--padx', m.padx); }});
  editing=true; $('#toggleEdit').textContent='Edit: ON'; document.getElementById('overlay').style.display='block'; persist(layout); }
function reconcileLayout(candidate){ const out={...candidate}; REQUIRED_IDS.forEach(id=>{ if(!out[id]) out[id]={...STRICT_LAYOUT[id]}; }); return out; }

window.ensureInnerHost = ensureInnerHost;
window.makeBlock = makeBlock;
window.place = place;
window.select = select;
window.focusAndFlash = focusAndFlash;
window.wire = wire;
window.pruneToRequired = pruneToRequired;
window.ensureBlock = ensureBlock;
window.applyStrict = applyStrict;
window.reconcileLayout = reconcileLayout;

