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

function getSnapState(){
  if(!window.snapState){
    window.snapState={ enabled:true, step:1, showGuides:true, thresholdPx:6 };
  }
  return window.snapState;
}
function tileSize(){ return TILE(); }
window.tileSize = tileSize;
function snapValuePx(px, ev){
  const state=getSnapState();
  if(ev && ev.altKey) return px;
  if(!state.enabled) return px;
  const stepPx=tileSize()*(state.step||1);
  if(!stepPx) return px;
  return Math.round(px/stepPx)*stepPx;
}
function computeGuides(){
  const rr=root.getBoundingClientRect();
  const blocks=$$('.block');
  const xs=new Set();
  const ys=new Set();
  xs.add(0); xs.add(rr.width/2); xs.add(rr.width);
  ys.add(0); ys.add(rr.height/2); ys.add(rr.height);
  blocks.forEach(b=>{
    const r=b.getBoundingClientRect();
    const x=r.left-rr.left;
    const y=r.top-rr.top;
    const w=r.width;
    const h=r.height;
    xs.add(x); xs.add(x+w/2); xs.add(x+w);
    ys.add(y); ys.add(y+h/2); ys.add(y+h);
  });
  return { xs:[...xs], ys:[...ys] };
}
function snapToGuides(x,y,w,h, ev, guides){
  const state=getSnapState();
  let X=x;
  let Y=y;
  const clear=typeof clearGuides==='function'?clearGuides:null;
  if(clear) clear();
  if(!state.enabled) return {x:X,y:Y};
  if(!state.showGuides) return {x:X,y:Y};
  if(!guides || !guides.xs || !guides.ys) return {x:X,y:Y};
  if(ev && ev.altKey) return {x:X,y:Y};
  const useEdges=!snapEdges || snapEdges.checked;
  const useCenters=!snapCenters || snapCenters.checked;
  if(!useEdges && !useCenters) return {x:X,y:Y};
  const threshold=typeof state.thresholdPx==='number'?state.thresholdPx:6;
  const candX=[];
  const candY=[];
  if(useEdges){ candX.push(X, X+w); candY.push(Y, Y+h); }
  if(useCenters){ candX.push(X+w/2); candY.push(Y+h/2); }
  if(!candX.length && !candY.length) return {x:X,y:Y};
  let bestDx=Infinity;
  let snapX=null;
  guides.xs.forEach(gx=>{
    candX.forEach(cx=>{
      const d=Math.abs(cx-gx);
      if(d<bestDx && d<=threshold){
        bestDx=d;
        snapX=X+(gx-cx);
      }
    });
  });
  if(snapX!==null){
    X=snapX;
    if(state.showGuides && typeof drawGuideLine==='function'){
      drawGuideLine('v', X);
      drawGuideLine('v', X+w);
    }
  }
  let bestDy=Infinity;
  let snapY=null;
  guides.ys.forEach(gy=>{
    candY.forEach(cy=>{
      const d=Math.abs(cy-gy);
      if(d<bestDy && d<=threshold){
        bestDy=d;
        snapY=Y+(gy-cy);
      }
    });
  });
  if(snapY!==null){
    Y=snapY;
    if(state.showGuides && typeof drawGuideLine==='function'){
      drawGuideLine('h', Y);
      drawGuideLine('h', Y+h);
    }
  }
  return {x:X,y:Y};
}

function select(el){ setSingleSelection(el); selected=el||null; }
function focusAndFlash(el){ select(el); el.scrollIntoView({block:'nearest',inline:'nearest'}); el.animate([{outlineColor:'transparent'},{outlineColor:'var(--sel)'}],{duration:300,iterations:2}); }
function wire(el){
  let lastTap=0;
  el.addEventListener('dblclick',()=>openEditor(el));
  el.addEventListener('pointerdown',ev=>{ const now=Date.now(); if(now-lastTap<300){ openEditor(el); ev.preventDefault(); return; } lastTap=now; });
  el.addEventListener('pointerdown',e=>{
    // --- selection handling ---
    const toggle=(e.ctrlKey||e.metaKey)===true;
    if(toggle){
      if(window.selSet && window.selSet.has(el.id)) removeFromSelection(el);
      else addToSelection(el);
    } else {
      setSingleSelection(el);
    }
    e.__handledSelection=true;
    const selList=getSelection();
    selected=selList.length?selList[selList.length-1]:null;
    if(!editing) return;
    if(el.classList.contains('locked')) return;
    const handle=e.target.classList.contains('handle'); const mode=handle?'resize':'move';
    const rr=root.getBoundingClientRect(), r=el.getBoundingClientRect();
    const start={x:e.clientX,y:e.clientY,l:r.left-rr.left,t:r.top-rr.top,w:r.width,h:r.height};
    const targets=(window.selSet && window.selSet.size>0)?getSelection():[el];
    start.map={};
    targets.forEach(t=>{
      const tr=t.getBoundingClientRect();
      start.map[t.id]={l:tr.left-rr.left,t:tr.top-rr.top};
    });
    const refs=[root.getBoundingClientRect(), board.getBoundingClientRect(), ctrl.getBoundingClientRect()];
    const EV=refs.flatMap(R=>[R.left,R.right]), EH=refs.flatMap(R=>[R.top,R.bottom]);
    const CV=refs.map(R=>(R.left+R.right)/2), CH=refs.map(R=>(R.top+R.bottom)/2);
    const guides=(mode==='move')?computeGuides():null;
    let moved=false;
    const move=ev=>{
      moved=true;
      if(mode==='move'){
        const dx=(ev.clientX-start.x);
        const dy=(ev.clientY-start.y);
        const base=start.map[el.id]||{l:start.l,t:start.t};
        let baseL=base.l+dx;
        let baseT=base.t+dy;
        const shell=root.getBoundingClientRect();
        const W=start.w;
        const H=start.h;
        if(snapTiles && snapTiles.checked){
          baseL=snapValuePx(baseL, ev);
          baseT=snapValuePx(baseT, ev);
        }
        let snapped={x:baseL,y:baseT};
        if(guides && ((snapEdges && snapEdges.checked) || (snapCenters && snapCenters.checked))){
          snapped=snapToGuides(baseL, baseT, W, H, ev, guides);
        } else if(typeof clearGuides==='function'){ try{ clearGuides(); }catch{} }
        let nx=snapped.x;
        let ny=snapped.y;
        nx=clamp(nx,0,shell.width-W);
        ny=clamp(ny,0,shell.height-H);
        const deltaX=nx-base.l;
        const deltaY=ny-base.t;
        const movingTargets=getSelection().length?getSelection():[el];
        movingTargets.forEach(t=>{
          if(t.classList.contains('locked')) return;
          const info=start.map[t.id];
          if(!info) return;
          const tr=t.getBoundingClientRect();
          const tw=tr.width;
          const th=tr.height;
          let L=info.l+deltaX;
          let T=info.t+deltaY;
          L=clamp(L,0,shell.width-tw);
          T=clamp(T,0,shell.height-th);
          t.style.left=Math.round(L)+'px';
          t.style.top=Math.round(T)+'px';
        });
      } else {
        if(typeof clearGuides==='function'){ try{ clearGuides(); }catch{} }
        let L=start.l+(ev.clientX-start.x);
        let T=start.t+(ev.clientY-start.y);
        let W=Math.max(TILE(),start.w+(ev.clientX-start.x));
        let H=Math.max(TILE(),start.h+(ev.clientY-start.y));
        if(snapTiles.checked && !ev.altKey){ L=Math.round(L/TILE())*TILE(); T=Math.round(T/TILE())*TILE(); W=Math.round(W/TILE())*TILE(); H=Math.round(H/TILE())*TILE(); }
        const cur={left:rr.left+L,top:rr.top+T,right:rr.left+L+W,bottom:rr.top+T+H,cx:rr.left+L+W/2,cy:rr.top+T+H/2};
        const thr=TILE()/2;
        if(snapEdges.checked && !ev.altKey){ EV.forEach(x=>{ if(Math.abs(cur.left-x)<thr) L=x-rr.left; if(Math.abs(cur.right-x)<thr) L=x-rr.left-W;}); EH.forEach(y=>{ if(Math.abs(cur.top-y)<thr) T=y-rr.top; if(Math.abs(cur.bottom-y)<thr) T=y-rr.top-H;}); }
        if(snapCenters.checked && !ev.altKey){ CV.forEach(x=>{ if(Math.abs(cur.cx-x)<thr) L=x-rr.left-W/2;}); CH.forEach(y=>{ if(Math.abs(cur.cy-y)<thr) T=y-rr.top-H/2;}); }
        const shell=root.getBoundingClientRect();
        L=clamp(L,0,shell.width-W);
        T=clamp(T,0,shell.height-H);
        W=clamp(W,TILE(),shell.width-L);
        H=clamp(H,TILE(),shell.height-T);
        el.style.left=px(L);
        el.style.top=px(T);
        el.style.width=px(W);
        el.style.height=px(H);
      }
    };
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up); try{ if(typeof clearGuides==='function') clearGuides(); }catch{} if(moved) snapshot(); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); e.preventDefault();
  });
}

function pruneToRequired(){ $$('.block').forEach(el=>{ if(!REQUIRED_IDS.includes(el.id)) el.remove(); }); }
function ensureBlock(id, kind){ let el=document.getElementById(id); if(!el){ el=makeBlock(kind,id);} el.dataset.kind=kind; ensureInnerHost(el); return el; }
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
window.makeBlock = makeBlock;
window.place = place;
window.select = select;
window.focusAndFlash = focusAndFlash;
window.wire = wire;
window.pruneToRequired = pruneToRequired;
window.ensureBlock = ensureBlock;
window.applyStrict = applyStrict;
window.reconcileLayout = reconcileLayout;

