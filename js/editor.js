/* ===== Editor logic (Tasks 7–10) ===== */
const editor=$('#editor');
const previewWrap=$('#previewWrap');
const edTabs=$('#edTabs');
const edClose=$('#edClose');
const zoom=$('#zoom');
const txtLabel=$('#txtLabel');
const txtLine1=$('#txtLine1');
const txtLine2=$('#txtLine2');
const txtSize=$('#txtSize');
const txtSize2=$('#txtSize2');
const txtAlignX=$('#txtAlignX');
const txtAlignY=$('#txtAlignY');
const contentX=$('#contentX');
const contentY=$('#contentY');
const snapInner=$('#snapInner');
const rowSingle=$('#row-single');
const rowDual=$('#row-dual');
const padX=$('#padX');

function getTextHost(el){ return el.querySelector('.txtHost') || el.querySelector('.label') || el; }
function getScoreHosts(el){ const line1 = el.querySelector('#hudStageLabel'); const line2 = el.querySelector('.scoreBottom'); return line1 && line2 ? {line1, line2} : null; }
function setSafeMultilineText(host, value){ host.textContent=''; const parts=String(value).split('\n'); parts.forEach((p,i)=>{ host.appendChild(document.createTextNode(p)); if(i<parts.length-1){ host.appendChild(document.createElement('br')); } }); }
function autoFit(host){ host.classList.add('hasFS'); let size=parseInt(getComputedStyle(host).fontSize)||12; const min=8; const container=host.closest('.block')||host; const fits=()=> host.scrollWidth<=container.clientWidth && host.scrollHeight<=container.clientHeight; let guard=40; while(!fits() && size>min && guard-->0){ size-=1; host.style.setProperty('--fs-override', size+'px'); } }
function applyAlign(block, xAlign, yAlign){ const host=getTextHost(block); host.style.textAlign=xAlign; const map={top:'flex-start',center:'center',bottom:'flex-end'}; block.style.alignItems=map[yAlign]||'center'; const jmap={left:'flex-start',center:'center',right:'flex-end'}; block.style.justifyContent=jmap[xAlign]||'center'; }

function openEditor(el){
  if(!el) return;
  try { _lastFocus = document.activeElement; } catch {}
  select(el);
  ensureInnerHost(el);
  buildPreviewFrom(el);
  editor.style.display = 'grid';
  editor.setAttribute('aria-hidden', 'false');
  try { $('#edClose') && $('#edClose').focus(); } catch {}
  lockScroll();
  if(appRoot) appRoot.setAttribute('aria-hidden','true');
  const panel = document.querySelector('#editor .edCard');
  trapFocus(panel);
  if(panel) panel.setAttribute('aria-describedby','previewWrap');
  const tabs = getTabbables(panel);
  if(!tabs.length){ const c = document.getElementById('edClose'); if(c) c.focus(); }
  syncLayoutFields(el);
  preloadTextControls(el);
  preloadInnerControls(el);
}

function closeEditor(){
  editor.style.display = 'none';
  editor.setAttribute('aria-hidden', 'true');
  const panel = document.querySelector('#editor .edCard'); releaseFocus(panel);
  unlockScroll();
  if(appRoot) appRoot.removeAttribute('aria-hidden');
  previewWrap.innerHTML = '';
  try { if(_lastFocus && typeof _lastFocus.focus === 'function') _lastFocus.focus(); } catch {}
}

function buildPreviewFrom(el){
  previewWrap.innerHTML='';
  const clone=el.cloneNode(true);
  const rect=el.getBoundingClientRect();
  const W=Math.round(rect.width);
  const H=Math.round(rect.height);
  const stage=previewWrap;
  stage.style.width=W+'px';
  stage.style.height=H+'px';
  stage.style.boxSizing='content-box';
  stage.style.padding='0';
  stage.style.margin='0';
  const frame=stage.parentElement||stage;
  if(frame){ frame.style.padding=frame.style.padding||'0'; }
  clone.removeAttribute('id');
  clone.classList.remove('sel');
  clone.style.position='static';
  clone.style.left='0';
  clone.style.top='0';
  clone.style.margin='0';
  clone.style.width='100%';
  clone.style.height='100%';
  const ih=clone.querySelector('.innerHost'); if(!ih){ const wrap=document.createElement('div'); wrap.className='innerHost'; [...clone.childNodes].forEach(n=>{ if(n.classList && n.classList.contains('handle')) return; if(n.classList && n.classList.contains('grid')) return; wrap.appendChild(n); }); clone.appendChild(wrap); }
  previewWrap.appendChild(clone);
  enablePreviewInnerDrag(clone);
  applyZoom();
}
function applyZoom(){ const z = (parseInt(zoom.value)||100)/100; previewWrap.style.transformOrigin='top left'; previewWrap.style.transform=`scale(${z})`; }
zoom.addEventListener('input', applyZoom);

edTabs.addEventListener('click', e=>{ const t=e.target.closest('.tab'); if(!t) return; $$('.tab').forEach(n=>n.classList.remove('active')); t.classList.add('active'); const key=t.dataset.tab; $$('.pane').forEach(p=>p.classList.remove('active')); const pane=$(`#pane-${key}`); if(pane) pane.classList.add('active'); });
edClose.onclick=closeEditor;
editor.addEventListener('click',e=>{ if(e.target===editor) closeEditor(); });

function syncLayoutFields(el){ const rr=root.getBoundingClientRect(), r=el.getBoundingClientRect(); $('#layX').value=Math.round((r.left-rr.left)/TILE()); $('#layY').value=Math.round((r.top-rr.top)/TILE()); $('#layW').value=Math.round(r.width/TILE()); $('#layH').value=Math.round(r.height/TILE()); }

function preloadTextControls(el){
  const score = getScoreHosts(el);
  if(score){
    rowSingle.style.display='none';
    rowDual.style.display='flex';
    txtLine1.value=(score.line1.innerText||'').trim();
    txtLine2.value=(score.line2.innerText||'').trim();
    const fs2=parseInt(getComputedStyle(score.line2).fontSize)||12; txtSize2.value=fs2;
  } else {
    rowSingle.style.display='flex';
    rowDual.style.display='none';
    const host=getTextHost(el);
    txtLabel.value=(host.innerText||'').trim();
  }
  const host=getTextHost(el);
  const fs=parseInt(getComputedStyle(host).fontSize)||12; txtSize.value=fs;
  const ta=(getComputedStyle(host).textAlign)||'center';
  txtAlignX.value=(ta==='start'?'left':ta);
  const ai=getComputedStyle(el).alignItems; txtAlignY.value= ai.includes('start')?'top':ai.includes('end')?'bottom':'center';
}
function preloadInnerControls(el){ const cx = (el.style.getPropertyValue('--cx')||'50%').replace('%',''); const cy=(el.style.getPropertyValue('--cy')||'50%').replace('%',''); const pxv=(el.style.getPropertyValue('--padx')||'0px').replace('px',''); contentX.value=parseFloat(cx)||50; contentY.value=parseFloat(cy)||50; padX.value=parseInt(pxv)||0; snapInner.checked=(localStorage.getItem(SNAP_INNER_KEY)||'1')==='1'; }

function liveApplyText(){ if(!selected) return; const score=getScoreHosts(selected); if(score){ score.line1.textContent=txtLine1.value; score.line2.textContent=txtLine2.value; autoFit(score.line1); autoFit(score.line2); } else { const host=getTextHost(selected); setSafeMultilineText(host, txtLabel.value); autoFit(host);} snapshot(); buildPreviewFrom(selected); }
function liveApplySize(){ if(!selected) return; const score=getScoreHosts(selected); if(score){ score.line1.classList.add('hasFS'); score.line2.classList.add('hasFS'); score.line1.style.setProperty('--fs-override', (parseInt(txtSize.value)||12)+'px'); score.line2.style.setProperty('--fs-override', (parseInt(txtSize2.value)||12)+'px'); autoFit(score.line1); autoFit(score.line2); } else { const host=getTextHost(selected); host.classList.add('hasFS'); host.style.setProperty('--fs-override', (parseInt(txtSize.value)||12)+'px'); autoFit(host);} snapshot(); buildPreviewFrom(selected); }
function liveApplyAlign(){ if(!selected) return; applyAlign(selected, txtAlignX.value, txtAlignY.value); snapshot(); buildPreviewFrom(selected); }

function setInner(el, pX, pY){ el.style.setProperty('--cx', clamp(pX,0,100)+'%'); el.style.setProperty('--cy', clamp(pY,0,100)+'%'); persistMeta(); }
function liveApplyInner(){ if(!selected) return; setInner(selected, parseFloat(contentX.value)||50, parseFloat(contentY.value)||50); snapshot(); buildPreviewFrom(selected); }
contentX.addEventListener('input', liveApplyInner);
contentY.addEventListener('input', liveApplyInner);
snapInner.addEventListener('change',()=>{ try{ localStorage.setItem(SNAP_INNER_KEY, snapInner.checked?'1':'0'); }catch{} });
padX && padX.addEventListener('input', ()=>{ if(!selected) return; selected.style.setProperty('--padx',(parseInt(padX.value)||0)+'px'); persistMeta(); snapshot(); buildPreviewFrom(selected); });

txtLabel && txtLabel.addEventListener('input', liveApplyText);
txtLine1 && txtLine1.addEventListener('input', liveApplyText);
txtLine2 && txtLine2.addEventListener('input', liveApplyText);
txtSize && txtSize.addEventListener('input', liveApplySize);
txtSize2 && txtSize2.addEventListener('input', liveApplySize);
txtAlignX && txtAlignX.addEventListener('change', liveApplyAlign);
txtAlignY && txtAlignY.addEventListener('change', liveApplyAlign);

function enablePreviewInnerDrag(blockClone){
  const ih = blockClone.querySelector('.innerHost'); if(!ih) return;
  let dragging=false;
  blockClone.addEventListener('pointerdown',e=>{
    if(!(e.target===ih || ih.contains(e.target))) return;
    dragging=true; ih.setPointerCapture(e.pointerId); e.preventDefault();
  });
  blockClone.addEventListener('pointermove',e=>{
    if(!dragging||!selected) return;
    const rect=blockClone.getBoundingClientRect();
    let px = ((e.clientX-rect.left)/rect.width)*100;
    let py = ((e.clientY-rect.top)/rect.height)*100;
    const snapOn = (localStorage.getItem(SNAP_INNER_KEY)||'1')==='1';
    if(snapOn){ px=Math.round(px/10)*10; py=Math.round(py/10)*10; }
    setInner(selected, px, py);
    contentX.value=Math.round(px);
    contentY.value=Math.round(py);
    blockClone.style.setProperty('--cx', clamp(px,0,100)+'%');
    blockClone.style.setProperty('--cy', clamp(py,0,100)+'%');
  });
  blockClone.addEventListener('pointerup',e=>{ if(!dragging) return; dragging=false; try{ ih.releasePointerCapture(e.pointerId); }catch{} snapshot(); });
}

window.getTextHost = getTextHost;
window.getScoreHosts = getScoreHosts;
window.setSafeMultilineText = setSafeMultilineText;
window.autoFit = autoFit;
window.applyAlign = applyAlign;
window.openEditor = openEditor;
window.closeEditor = closeEditor;
window.buildPreviewFrom = buildPreviewFrom;
window.syncLayoutFields = syncLayoutFields;
window.preloadTextControls = preloadTextControls;
window.preloadInnerControls = preloadInnerControls;
window.liveApplyText = liveApplyText;
window.liveApplySize = liveApplySize;
window.liveApplyAlign = liveApplyAlign;
window.setInner = setInner;
window.liveApplyInner = liveApplyInner;
window.enablePreviewInnerDrag = enablePreviewInnerDrag;

