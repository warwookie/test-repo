window.snapState = window.snapState || {
  enabled: true,
  step: 1,
  showGuides: true,
  thresholdPx: 6
};

const pHeadTitle = document.querySelector('.pHead > div');
if (pHeadTitle) pHeadTitle.textContent = 'Live UI — Palette 5';

const snapTiles = window.snapTiles || document.getElementById('snapTiles');

const snapToggleEl = $('#snapToggle');
if (snapToggleEl){
  snapToggleEl.checked = snapState.enabled !== false;
  snapState.enabled = snapToggleEl.checked;
  if (snapTiles) snapTiles.checked = snapToggleEl.checked;
  snapToggleEl.onchange = () => {
    snapState.enabled = snapToggleEl.checked;
    if (snapTiles) snapTiles.checked = snapState.enabled;
    if (!snapState.enabled && typeof window.clearGuides === 'function') window.clearGuides();
  };
}

const snapStepEl = $('#snapStep');
if (snapStepEl){
  const initial = parseFloat(snapStepEl.value) || snapState.step || 1;
  snapState.step = initial;
  snapStepEl.value = String(initial);
  snapStepEl.onchange = () => {
    snapState.step = parseFloat(snapStepEl.value) || 1;
  };
}

const guideToggle = document.getElementById('guideToggle');
const guidesHost = document.getElementById('guides');
if (guideToggle && guidesHost){
  guideToggle.checked = snapState.showGuides !== false;
  const syncGuidesVisibility = () => {
    const on = guideToggle.checked;
    snapState.showGuides = on;
    guidesHost.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (!on && typeof window.clearGuides === 'function') window.clearGuides();
  };
  guideToggle.addEventListener('change', syncGuidesVisibility);
  syncGuidesVisibility();
}

(function(){
  const resetBtn = document.getElementById('reset');
  if (!resetBtn) return;

  resetBtn.classList.remove('hidden');
  resetBtn.removeAttribute('aria-hidden');

  resetBtn.addEventListener('click', () => {
    if (typeof window.resetToStrictDefault === 'function') {
      window.resetToStrictDefault();
    } else {
      console.warn('resetToStrictDefault() not found');
    }
  });
})();

(function(){
  const btn = document.getElementById('helpBtn');
  const modal = document.getElementById('helpOverlay');
  const close = document.getElementById('helpClose');
  if (!btn || !modal || !close) return;

  let lastFocus = null;

  function openHelp(){
    lastFocus = document.activeElement;
    modal.style.display = 'grid';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    if (typeof lockScroll==='function') lockScroll();
    const card = modal.querySelector('.card');
    if (typeof trapFocus==='function') trapFocus(card);
    (close || card).focus();
  }
  function closeHelp(){
    const card = modal.querySelector('.card');
    if (typeof releaseFocus==='function') releaseFocus(card);
    if (typeof unlockScroll==='function') unlockScroll();
    modal.style.display = 'none';
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.onclick = openHelp;
  close.onclick = closeHelp;

  document.addEventListener('keydown', (e)=>{
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeHelp();
  }, true);
})();

(function(){
  const sel = document.getElementById('themeSel');
  if (!sel) return;
  try {
    const cur = getTheme();
    const name = (cur || '').replace(/^theme-/, '');
    if ([...sel.options].some(o => o.value === name)) sel.value = name;
  } catch {}

  sel.onchange = () => {
    const name = sel.value;
    const cls = (window.THEME_PRESETS && window.THEME_PRESETS[name]) || ('theme-' + name);
    const token = String(cls || '').replace(/^theme-/, '') || name;
    setTheme(token);
    applyTheme(token);
  };
})();

addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='g'){ toggleGrid(); }
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); const s=hist.undo(); if(s) applyStrict(s,true); updateHistCounter(); return; }
  if(((e.metaKey||e.ctrlKey) && (e.key.toLowerCase()==='y' || (e.shiftKey && e.key.toLowerCase()==='z')))){
    e.preventDefault(); const s=hist.redo(); if(s) applyStrict(s,true); updateHistCounter(); return; }
  if(e.key==='Escape'){ closeEditor(); }
  if(!editing) return;
  const selList=getSelection();
  if((e.key==='Delete'||e.key==='Backspace') && selList.length){
    e.preventDefault();
    if(deleteSelection()) snapshot();
    return;
  }
  if(!selList.length) return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    const base=typeof tileSize==='function'?tileSize():TILE();
    const step=e.shiftKey?base*0.5:base;
    const rr=root.getBoundingClientRect();
    if(e.ctrlKey||e.metaKey){
      e.preventDefault();
      const target=(selected && !selected.classList.contains('locked'))?selected:selList.find(el=>!el.classList.contains('locked'));
      if(!target) return;
      const r=target.getBoundingClientRect();
      let L=r.left-rr.left,T=r.top-rr.top,W=r.width,H=r.height;
      if(e.key==='ArrowRight') W+=step;
      if(e.key==='ArrowLeft') W-=step;
      if(e.key==='ArrowDown') H+=step;
      if(e.key==='ArrowUp') H-=step;
      W=Math.max(TILE(),W);
      H=Math.max(TILE(),H);
      const shell=root.getBoundingClientRect();
      W=clamp(W,TILE(),shell.width-L);
      H=clamp(H,TILE(),shell.height-T);
      target.style.width=px(W);
      target.style.height=px(H);
      snapshot();
    } else {
      e.preventDefault();
      const dx=e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0;
      const dy=e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0;
      if(!dx && !dy) return;
      const shell=root.getBoundingClientRect();
      const movers=selList.filter(el=>!el.classList.contains('locked'));
      if(!movers.length) return;
      let didMove=false;
      movers.forEach(el=>{
        const r=el.getBoundingClientRect();
        let L=r.left-rr.left+dx;
        let T=r.top-rr.top+dy;
        L=clamp(L,0,shell.width-r.width);
        T=clamp(T,0,shell.height-r.height);
        if(Math.round(L)!==Math.round(r.left-rr.left)||Math.round(T)!==Math.round(r.top-rr.top)) didMove=true;
        el.style.left=px(L);
        el.style.top=px(T);
      });
      if(didMove) snapshot();
    }
  }
});

document.addEventListener('pointerdown',event=>{
  if(event && event.button!==0) return;
  if(event && event.__handledSelection) return;
  const t=event?event.target:null;
  if((event.ctrlKey||event.metaKey) && t && t.closest && t.closest('.block')) return;
  if(t && t.closest && t.closest('.block')) return;
  const stage=typeof root!=='undefined'?root:document.getElementById('root');
  if(stage && t && stage.contains(t)){
    if(typeof select==='function') select(null);
    else if(typeof clearSelection==='function'){ clearSelection(); if(typeof window!=='undefined') window.selected=null; }
  }
});

function deleteSelection(){
  const selList=getSelection();
  if(!selList.length) return false;
  const removable=selList.filter(el=>el && el.id!=='board' && el.id!=='ctrlZone');
  if(!removable.length) return false;
  const removeSet=new Set(removable);
  const anchor=removable[removable.length-1];
  const findSibling=(start, dir)=>{
    let node=start;
    while(node){
      node=node[dir];
      if(!node) return null;
      if(node.classList && node.classList.contains('block') && !removeSet.has(node)) return node;
    }
    return null;
  };
  const focusTarget=findSibling(anchor,'nextElementSibling')||findSibling(anchor,'previousElementSibling');
  removable.forEach(el=>{ el.remove(); });
  if(focusTarget){ select(focusTarget); }
  else { select(null); }
  return true;
}

const overlayEl=document.getElementById('overlay');
const toggleEditEl=document.getElementById('toggleEdit');
if(toggleEditEl){
  const applyEditState=checked=>{
    editing=checked!==false;
    if(toggleEditEl.checked!==editing) toggleEditEl.checked=editing;
    if(overlayEl) overlayEl.style.display=editing?'block':'none';
  };
  applyEditState(toggleEditEl.checked || editing);
  toggleEditEl.addEventListener('change',()=>{ applyEditState(toggleEditEl.checked); });
}

const toggleGridInput=document.getElementById('toggleGrid');
function setGridUI(on){
  const enabled=!!on;
  if(gridEl) gridEl.classList.toggle('show', enabled);
  if(toggleGridInput) toggleGridInput.checked=enabled;
}
function toggleGrid(force){
  const next=typeof force==='boolean'?force:!(gridEl&&gridEl.classList.contains('show'));
  setGridUI(next);
  try{ localStorage.setItem(GRID_KEY, next? '1':'0'); }catch{}
  return next;
}
if(toggleGridInput){
  toggleGridInput.addEventListener('change',()=>{ toggleGrid(toggleGridInput.checked); });
}

(function(){
  const sel = document.getElementById('layoutSel');
  const btnSave = document.getElementById('layoutSave');
  const btnLoad = document.getElementById('layoutLoad');
  const btnDel  = document.getElementById('layoutDelete');
  if (!sel || !btnSave || !btnLoad || !btnDel) return;

  refreshLayoutSelect();

  btnSave.onclick = () => {
    const name = prompt('Save layout as name:');
    if (!name) return;
    const trimmed = name.trim().slice(0,64);
    if (!trimmed) return;

    const map = readSavedLayouts();
    if (map[trimmed] && !confirm('Name exists. Overwrite?')) return;

    const payload = buildSavePayload();
    map[trimmed] = payload;
    writeSavedLayouts(map);
    refreshLayoutSelect();
    sel.value = trimmed;
    alert('Layout saved as "' + trimmed + '".');
  };

  btnLoad.onclick = () => {
    const key = sel.value;
    if (!key) { alert('Choose a saved layout.'); return; }
    const map = readSavedLayouts();
    const data = map[key];
    if (!data) { alert('Not found.'); return; }

    if (data.theme){
      const name = String(data.theme).replace(/^theme-/, '');
      setTheme(name); applyTheme(name);
    }

    const res = validateLayoutPayload({ layout: data.layout, meta: data.metaPerBlock || undefined });
    if (!res.ok) { alert('Saved layout failed validation:\n\n' + res.errors.join('\n')); return; }

    applyStrict(reconcileLayout(res.layout), true);

    if (res.meta && typeof res.meta === 'object') {
      try { localStorage.setItem(META_KEY, JSON.stringify(res.meta)); } catch {}
      Object.entries(res.meta).forEach(([id, m]) => {
        const el = document.getElementById(id);
        if (el && m) {
          if (m.cx) el.style.setProperty('--cx', m.cx);
          if (m.cy) el.style.setProperty('--cy', m.cy);
          if (m.padx) el.style.setProperty('--padx', m.padx);
        }
      });
    }

    snapshot();
    alert('Layout "' + key + '" loaded.');
  };

  btnDel.onclick = () => {
    const key = sel.value;
    if (!key) { alert('Choose a saved layout.'); return; }
    if (!confirm('Delete "' + key + '"?')) return;
    const map = readSavedLayouts();
    delete map[key];
    writeSavedLayouts(map);
    refreshLayoutSelect();
    sel.value = '';
    alert('Deleted.');
  };
})();

$('#undo').onclick=()=>{ const s=hist.undo(); if(s){ applyStrict(s,true); updateHistCounter(); } };
$('#redo').onclick=()=>{ const s=hist.redo(); if(s){ applyStrict(s,true); updateHistCounter(); } };
$('#delete').onclick=()=>{ if(deleteSelection()) snapshot(); };
$('#reset').onclick=()=>{ localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(META_KEY); applyStrict(STRICT_LAYOUT,true); select(null); hist.stack=[]; hist.cursor=-1; snapshot(); };
$('#openEditor').onclick=()=>{
  let target=selected;
  if(!target){
    const selList=getSelection();
    if(selList.length) target=selList[selList.length-1];
  }
  if(!target){
    target=$$('#root .block').find(b=>b.id!=='board'&&b.id!=='ctrlZone')||$('#board');
  }
  if(target){ select(target); openEditor(target); }
};

$('#palette').addEventListener('click', e=>{ const item=e.target.closest('.pItem'); if(!item) return; const key=item.dataset.make; const id=MAKE_TO_ID[key]||key; const def=STRICT_LAYOUT[id]; let el=document.getElementById(id); if(el){ focusAndFlash(el); return; } el=makeBlock(KIND_FOR[id], id); place(el, def.x, def.y, def.w, def.h); focusAndFlash(el); snapshot(); });

$('#burnToggle').onclick=()=>{ const h=$('#hudLife .heart'); if(h) h.classList.toggle('burn'); };

function getBBoxRelative(el){
  const rr=root.getBoundingClientRect();
  const r=el.getBoundingClientRect();
  return { x:r.left-rr.left, y:r.top-rr.top, w:r.width, h:r.height };
}
function setPos(el,x,y){ el.style.left=Math.round(x)+'px'; el.style.top=Math.round(y)+'px'; }

$('#lockSel').onclick=()=>{
  const list=getSelection();
  if(!list.length){ alert('Select at least one block.'); return; }
  const allLocked=list.every(b=>b.classList.contains('locked'));
  list.forEach(b=>{
    if(allLocked){ b.classList.remove('locked'); b.dataset.locked='0'; }
    else { b.classList.add('locked'); b.dataset.locked='1'; }
  });
  snapshot();
};

$('#alignApply').onclick=()=>{
  const mode=$('#alignSel').value;
  const list=getSelection().filter(b=>!b.classList.contains('locked'));
  if(!mode || list.length<2){ alert('Select 2+ blocks and an align mode.'); return; }
  const boxes=list.map(getBBoxRelative);
  const minX=Math.min(...boxes.map(b=>b.x));
  const maxX=Math.max(...boxes.map(b=>b.x+b.w));
  const midX=(minX+maxX)/2;
  const minY=Math.min(...boxes.map(b=>b.y));
  const maxY=Math.max(...boxes.map(b=>b.y+b.h));
  const midY=(minY+maxY)/2;
  list.forEach((el,i)=>{
    const b=boxes[i];
    let x=b.x,y=b.y;
    if(mode==='left') x=minX;
    if(mode==='right') x=maxX-b.w;
    if(mode==='centerX') x=Math.round(midX-b.w/2);
    if(mode==='top') y=minY;
    if(mode==='bottom') y=maxY-b.h;
    if(mode==='middleY') y=Math.round(midY-b.h/2);
    if(snapState.enabled){ x=Math.round(x/TILE())*TILE(); y=Math.round(y/TILE())*TILE(); }
    setPos(el,x,y);
  });
  snapshot();
};

$('#distApply').onclick=()=>{
  const mode=$('#distSel').value;
  const list=getSelection().filter(b=>!b.classList.contains('locked'));
  if(!mode || list.length<3){ alert('Select 3+ blocks and a distribute mode.'); return; }
  const items=list.map(el=>({el,b:getBBoxRelative(el)}));
  if(mode==='h') items.sort((a,b)=>a.b.x-b.b.x);
  if(mode==='v') items.sort((a,b)=>a.b.y-b.b.y);
  const first=items[0].b;
  const last=items[items.length-1].b;
  if(mode==='h'){
    const inner=(last.x-(first.x+first.w));
    const totalW=items.slice(1,-1).reduce((s,it)=>s+it.b.w,0);
    const gaps=items.length-1-1;
    const gap=gaps>0?Math.max(0,Math.round((inner-totalW)/gaps)):0;
    let cursor=first.x+first.w;
    for(let i=1;i<items.length-1;i++){
      const it=items[i]; cursor+=gap;
      let x=cursor;
      if(snapState.enabled) x=Math.round(x/TILE())*TILE();
      setPos(it.el,x,it.b.y);
      cursor+=it.b.w;
    }
  } else if(mode==='v'){
    const inner=(last.y-(first.y+first.h));
    const totalH=items.slice(1,-1).reduce((s,it)=>s+it.b.h,0);
    const gaps=items.length-1-1;
    const gap=gaps>0?Math.max(0,Math.round((inner-totalH)/gaps)):0;
    let cursor=first.y+first.h;
    for(let i=1;i<items.length-1;i++){
      const it=items[i]; cursor+=gap;
      let y=cursor;
      if(snapState.enabled) y=Math.round(y/TILE())*TILE();
      setPos(it.el,it.b.x,y);
      cursor+=it.b.h;
    }
  }
  snapshot();
};

window.setGridUI = setGridUI;
window.toggleGrid = toggleGrid;

