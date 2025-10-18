addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='g'){ toggleGrid(); }
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); const s=hist.undo(); if(s) applyStrict(s,true); updateHistCounter(); return; }
  if(((e.metaKey||e.ctrlKey) && (e.key.toLowerCase()==='y' || (e.shiftKey && e.key.toLowerCase()==='z')))){
    e.preventDefault(); const s=hist.redo(); if(s) applyStrict(s,true); updateHistCounter(); return; }
  if(e.key==='Escape'){ closeEditor(); }
  if(!editing) return;
  if((e.key==='Delete'||e.key==='Backspace')&&selected){ e.preventDefault(); if(selected.id==='board'||selected.id==='ctrlZone') return; const nxt=selected.nextElementSibling||selected.previousElementSibling; selected.remove(); select(nxt&&nxt.classList.contains('block')?nxt:null); snapshot(); return; }
  if(!selected) return;
  const step=(e.shiftKey?5:1)*TILE(), rr=root.getBoundingClientRect(), r=selected.getBoundingClientRect();
  let L=r.left-rr.left,T=r.top-rr.top,W=r.width,H=r.height;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();
    if(e.ctrlKey||e.metaKey){ if(e.key==='ArrowRight') W+=step; if(e.key==='ArrowLeft') W-=step; if(e.key==='ArrowDown') H+=step; if(e.key==='ArrowUp') H-=step; W=Math.max(TILE(),W); H=Math.max(TILE(),H); const shell=root.getBoundingClientRect(); W=clamp(W,TILE(),shell.width-L); H=clamp(H,TILE(),shell.height-T); selected.style.width=px(W); selected.style.height=px(H); }
    else{ if(e.key==='ArrowRight') L+=step; if(e.key==='ArrowLeft') L-=step; if(e.key==='ArrowDown') T+=step; if(e.key==='ArrowUp') T-=step; L=clamp(L,0,rr.width-W); T=clamp(T,0,rr.height-H); selected.style.left=px(L); selected.style.top=px(T); }
    snapshot();
  }
});

$('#toggleEdit').onclick=e=>{editing=!editing; e.target.textContent='Edit: '+(editing?'ON':'OFF'); document.getElementById('overlay').style.display=editing?'block':'none';};
$('#toggleGrid').onclick=()=>toggleGrid();
function setGridUI(on){ gridEl.classList.toggle('show', on); $('#toggleGrid').textContent='Grid: '+(on?'ON':'OFF'); }
function toggleGrid(){ const on=!gridEl.classList.contains('show'); setGridUI(on); try{ localStorage.setItem(GRID_KEY, on? '1':'0'); }catch{} }

$('#undo').onclick=()=>{ const s=hist.undo(); if(s){ applyStrict(s,true); updateHistCounter(); } };
$('#redo').onclick=()=>{ const s=hist.redo(); if(s){ applyStrict(s,true); updateHistCounter(); } };
$('#delete').onclick=()=>{ if(!selected) return; if(selected.id==='board'||selected.id==='ctrlZone') return; const nxt=selected.nextElementSibling||selected.previousElementSibling; selected.remove(); select(nxt&&nxt.classList.contains('block')?nxt:null); snapshot(); };
$('#reset').onclick=()=>{ localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(META_KEY); applyStrict(STRICT_LAYOUT,true); select(null); hist.stack=[]; hist.cursor=-1; snapshot(); };
$('#openEditor').onclick=()=>{ if(!selected){ const first=$$('#root .block').find(b=>b.id!=='board'&&b.id!=='ctrlZone')||$('#board'); select(first);} openEditor(selected); };

$('#palette').addEventListener('click', e=>{ const item=e.target.closest('.pItem'); if(!item) return; const key=item.dataset.make; const id=MAKE_TO_ID[key]||key; const def=STRICT_LAYOUT[id]; let el=document.getElementById(id); if(el){ focusAndFlash(el); return; } el=makeBlock(KIND_FOR[id], id); place(el, def.x, def.y, def.w, def.h); focusAndFlash(el); snapshot(); });

$('#burnToggle').onclick=()=>{ const h=$('#hudLife .heart'); if(h) h.classList.toggle('burn'); };

window.setGridUI = setGridUI;
window.toggleGrid = toggleGrid;

