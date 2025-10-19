window.getPaletteVersion = function(){
  return window.__paletteVersion ?? null;
};

window.setPaletteVersion = function(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return;

  if (typeof window.__paletteVersion === 'number' && n <= window.__paletteVersion) {
    console.debug('[palette] ignore version', n, 'existing', window.__paletteVersion);
    return;
  }

  window.__paletteVersion = n;

  const el =
    document.querySelector('#paletteHeader') ||
    document.querySelector('.pHead .title') ||
    document.querySelector('.pHead');

  if (el) el.textContent = `Live UI — Palette ${n}`;

  if (document.body && document.body.dataset) {
    document.body.dataset.paletteVersion = String(n);
  }

  console.info('[palette] now', n);
};

window.snapState = window.snapState || {
  enabled: true,
  step: 1,
  showGuides: true,
  thresholdPx: 6
};

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

(function(){
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInp = document.getElementById('uploadJson');

  if (fileInp) {
    fileInp.setAttribute('disabled', 'true');
    fileInp.style.display = 'none';
  }

  if (uploadBtn && !uploadBtn.__boundTextApply) {
    uploadBtn.__boundTextApply = true;
    uploadBtn.textContent = 'Apply (from text)';
    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.applyJsonFromTextarea === 'function') {
        window.applyJsonFromTextarea();
      }
    });
  }
})();

addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='g'){ toggleGrid(); }
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='z'){
    e.preventDefault();
    const s=hist.undo();
    if(s){
      applyStrict(s,true);
      if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    }
    updateHistCounter();
    return;
  }
  if(((e.metaKey||e.ctrlKey) && (e.key.toLowerCase()==='y' || (e.shiftKey && e.key.toLowerCase()==='z')))){
    e.preventDefault();
    const s=hist.redo();
    if(s){
      applyStrict(s,true);
      if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    }
    updateHistCounter();
    return;
  }
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
  const dd = document.getElementById('layoutSel');
  const saveBtn = document.getElementById('layoutSave');
  const loadBtn = document.getElementById('layoutLoad');
  const delBtn  = document.getElementById('layoutDelete');
  if (!dd || !saveBtn || !loadBtn || !delBtn) return;

  function refreshLayoutDropdown(){
    if (!dd) return;
    const map = window.loadSavedLayouts ? window.loadSavedLayouts() : {};
    const current = dd.value;
    dd.innerHTML = '<option value="">-- none --</option>';
    Object.keys(map).sort().forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      dd.appendChild(opt);
    });
    if (current && map[current]) dd.value = current;
  }

  window.refreshLayoutDropdown = refreshLayoutDropdown;
  window.refreshLayoutSelect = refreshLayoutDropdown;

  saveBtn.addEventListener('click', () => {
    const name = prompt('Save layout as (name):');
    if (!name) return;
    if (typeof window.exportLayoutClean !== 'function') return;
    const json = window.exportLayoutClean();
    window.saveLayoutNamed(name, json);
    refreshLayoutDropdown();
    dd.value = name;
    if (typeof window.inspStatus === 'function') window.inspStatus(`Saved "${name}"`);
  });

  loadBtn.addEventListener('click', () => {
    const name = dd?.value || '';
    if (!name) return;
    const map = window.loadSavedLayouts ? window.loadSavedLayouts() : {};
    const json = map[name];
    if (!json) return;

    if (typeof window.applyImportedLayout === 'function') {
      window.applyImportedLayout(json);
    } else if (typeof window.loadLayoutJSON === 'function') {
      window.loadLayoutJSON(json);
    } else if (typeof window.validateLayoutPayload === 'function' && typeof window.applyStrict === 'function') {
      try {
        const res = window.validateLayoutPayload(json);
        if (res && res.ok && res.layout) {
          const layout = (typeof window.reconcileLayout === 'function') ? window.reconcileLayout(res.layout) : res.layout;
          window.applyStrict(layout, true);
        }
      } catch (err) {
        console.warn('Failed to load layout', err);
      }
    }

    if (typeof window.inspStatus === 'function') window.inspStatus(`Loaded "${name}"`);
    try { window.dispatchEvent(new CustomEvent('layout:changed', { detail:{source:'load-named', name} })); } catch(_){ }
  });

  delBtn.addEventListener('click', () => {
    const name = dd?.value || '';
    if (!name) return;
    if (!confirm(`Delete saved layout "${name}"?`)) return;
    window.deleteLayoutNamed(name);
    refreshLayoutDropdown();
    dd.value = '';
    if (typeof window.inspStatus === 'function') window.inspStatus(`Deleted "${name}"`);
  });

  refreshLayoutDropdown();
})();

$('#undo').onclick=()=>{ const s=hist.undo(); if(s){ applyStrict(s,true); if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI(); updateHistCounter(); } };
$('#redo').onclick=()=>{ const s=hist.redo(); if(s){ applyStrict(s,true); if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI(); updateHistCounter(); } };
$('#delete').onclick=()=>{ if(deleteSelection()) snapshot(); };
$('#reset').onclick=()=>{ localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(META_KEY); applyStrict(STRICT_LAYOUT,true); if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI(); select(null); hist.stack=[]; hist.cursor=-1; snapshot(); };
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

const alignSel = document.getElementById('alignSel');
const alignApply = document.getElementById('alignApply');
if (alignApply){
  alignApply.onclick = () => {
    const mode = alignSel ? alignSel.value : '';
    if (!mode){ alert('Select an align mode.'); return; }
    const blocks = (typeof window.getSelectionBlocks === 'function') ? window.getSelectionBlocks() : getSelection().filter(b=>!b.classList.contains('locked'));
    if (!blocks || blocks.length < 2){ alert('Select at least two unlocked blocks to align.'); return; }
    if (typeof window.alignSelected === 'function') window.alignSelected(mode);
  };
}

const distSel = document.getElementById('distSel');
const distApply = document.getElementById('distApply');
if (distSel && distApply) {
  distApply.addEventListener('click', () => {
    const v = distSel.value;
    if (!v) return;
    if (typeof window.distributeSelected === 'function') window.distributeSelected(v);
  });
}

window.setGridUI = setGridUI;
window.toggleGrid = toggleGrid;

if (typeof window.bindDownloadButtons === 'function') window.bindDownloadButtons();

const PALETTE_VERSION = 17;
if (typeof window.setPaletteVersion === 'function') window.setPaletteVersion(PALETTE_VERSION);

