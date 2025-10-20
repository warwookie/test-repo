// Helpers to get active element and safe number
function beActiveBlock(){
  const sel = (window.getSelectionSet && window.getSelectionSet()) || window.selSet;
  if (!sel || !sel.size) return null;
  return document.getElementById(Array.from(sel)[0]);
}
function num(v, d=0){ const n = Number(v); return Number.isFinite(n) ? n : d; }

// Resolve controls (use existing IDs if present; otherwise create these IDs in markup)
const beTxt    = document.getElementById('beLabelText')  || document.getElementById('labelText');
const beFont   = document.getElementById('beFontPx')     || document.getElementById('fontPx');
const beAlignH = document.getElementById('beAlignH')     || document.getElementById('hAlign');
const beAlignV = document.getElementById('beAlignV')     || document.getElementById('vAlign');
const bePadX   = document.getElementById('bePadX')       || document.getElementById('padX');

const beCx = document.getElementById('beContentX') || document.getElementById('contentX');
const beCy = document.getElementById('beContentY') || document.getElementById('contentY');
const beTx = document.getElementById('beTextX')    || document.getElementById('textX');
const beTy = document.getElementById('beTextY')    || document.getElementById('textY');

// Debounced live apply
let beTextDeb=0;
function beTextSchedule(){ clearTimeout(beTextDeb); beTextDeb = setTimeout(beTextApply, 60); }

function beTextApply(){
  const el = beActiveBlock();
  if (!el || el.classList.contains('locked')) return;

  const meta = {
    text:   beTxt   ? beTxt.value : (el.dataset.labelText || ''),
    fontPx: beFont  ? num(beFont.value, 15) : num(el.dataset.labelFontPx || 15, 15),
    alignH: beAlignH? beAlignH.value : (el.dataset.labelAlignH || 'left'),
    alignV: beAlignV? beAlignV.value : (el.dataset.labelAlignV || 'center'),
    padX:   bePadX  ? num(bePadX.value, 0) : num(el.dataset.labelPadX || 0, 0),

    // percent offsets (0..100)
    cx: beCx ? num(beCx.value, 0) : num(el.dataset.contentCx || 0, 0),
    cy: beCy ? num(beCy.value, 0) : num(el.dataset.contentCy || 0, 0),
    tx: beTx ? num(beTx.value, 0) : num(el.dataset.labelTx   || 0, 0),
    ty: beTy ? num(beTy.value, 0) : num(el.dataset.labelTy   || 0, 0),
  };

  if (typeof window.renderLabelForBlock === 'function') window.renderLabelForBlock(el, meta);

  // UI + history
  if (typeof window.updateInspector === 'function') window.updateInspector(null);
  if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
  try { window.dispatchEvent(new CustomEvent('layout:changed', { detail:{source:'blockEditor-text'} })); } catch(_){ }
  if (typeof window.historyPush === 'function') window.historyPush({ type:'edit', note:'Block Editor Text' });
}

// Bind input events
[beTxt, beFont, beAlignH, beAlignV, bePadX, beCx, beCy, beTx, beTy].forEach(el=>{
  if (!el) return;
  el.addEventListener('input', beTextSchedule);
  el.addEventListener('change', beTextSchedule);
});

// Populate fields when opening the editor or changing selection
window.populateTextForm = function(){
  const el = beActiveBlock();
  if (!el) return;
  if (beTxt)    beTxt.value    = el.dataset.labelText   || '';
  if (beFont)   beFont.value   = el.dataset.labelFontPx || 15;
  if (beAlignH) beAlignH.value = el.dataset.labelAlignH || 'left';
  if (beAlignV) beAlignV.value = el.dataset.labelAlignV || 'center';
  if (bePadX)   bePadX.value   = el.dataset.labelPadX   || 0;

  if (beCx) beCx.value = el.dataset.contentCx || 0;
  if (beCy) beCy.value = el.dataset.contentCy || 0;
  if (beTx) beTx.value = el.dataset.labelTx   || 0;
  if (beTy) beTy.value = el.dataset.labelTy   || 0;
};
if (!window.__textTabBound){
  window.__textTabBound = true;
  window.addEventListener('selection:changed', window.populateTextForm);
  window.addEventListener('layout:changed',    window.populateTextForm);
}

// Ensure we have a single preview root in the modal, never the stage.
window.getBePreviewRoot = function(){
  let root = document.getElementById('bePreviewRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'bePreviewRoot';
    root.style.position = 'relative';
    // The modal code should append this into the Block Editor preview column.
    // If your markup already creates the preview area, just ensure the ID exists.
  }
  return root;
};

// Remove any preview artifacts that accidentally got appended to stage.
window.cleanupPreviewArtifacts = function(){
  // Anything we mark as preview: .be-preview-node OR [data-preview="1"]
  document.querySelectorAll('.be-preview-node, .block[data-preview="1"]').forEach(n => n.remove());
};

// Wrap any preview node creation to ALWAYS tag them and keep off-stage.
window.attachPreviewTag = function(node){
  try {
    node.classList && node.classList.add('be-preview-node');
    node.setAttribute && node.setAttribute('data-preview','1');
  } catch(_){ }
  return node;
};

// Call cleanup when the Block Editor opens/closes or switches tabs
if (!window.__bePreviewHooks){
  window.__bePreviewHooks = true;
  window.addEventListener('blockEditor:open',  ()=>window.cleanupPreviewArtifacts());
  window.addEventListener('blockEditor:close', ()=>window.cleanupPreviewArtifacts());
  window.addEventListener('blockEditor:tab',   ()=>window.cleanupPreviewArtifacts());
}
