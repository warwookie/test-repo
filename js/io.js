function getTabbables(scope){
  if(!scope) return [];
  return [...scope.querySelectorAll('a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null);
}

function trapFocus(container){
  if(!container) return;
  function onKey(e){
    if(e.key !== 'Tab') return;
    const tabbables = getTabbables(container);
    if(!tabbables.length) { e.preventDefault(); return; }
    const first = tabbables[0];
    const last  = tabbables[tabbables.length - 1];
    const active = document.activeElement;
    if(e.shiftKey){
      if(active === first || !container.contains(active)){
        e.preventDefault(); last.focus();
      }
    }else{
      if(active === last || !container.contains(active)){
        e.preventDefault(); first.focus();
      }
    }
  }
  container.__trapFocusHandler = onKey;
  document.addEventListener('keydown', onKey, true);
}

function releaseFocus(container){
  const h = container && container.__trapFocusHandler;
  if(h){ document.removeEventListener('keydown', h, true); delete container.__trapFocusHandler; }
}

function lockScroll(){ try{ document.body.dataset._preOverflow = document.body.style.overflow || ''; document.body.style.overflow = 'hidden'; }catch{} }
function unlockScroll(){ try{ document.body.style.overflow = document.body.dataset._preOverflow || ''; delete document.body.dataset._preOverflow; }catch{} }

const modal=$('#modal'), io=$('#io');
let _lastFocus = null;
Object.defineProperty(window, '_lastFocus', { get: () => _lastFocus, set: v => { _lastFocus = v; } });

const SAVED_KEY = 'SQ_SAVED_LAYOUTS_V1';

function readSavedLayouts(){
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}') || {}; }
  catch { return {}; }
}

function writeSavedLayouts(map){
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(map)); } catch {}
}

function refreshLayoutSelect(){
  const sel = document.getElementById('layoutSel'); if(!sel) return;
  const map = readSavedLayouts();
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- none --</option>' +
    Object.keys(map).sort().map(n=>`<option value="${n}">${n}</option>`).join('');
  if (cur && map[cur]) sel.value = cur;
}

function openModal(txt){
  try { _lastFocus = document.activeElement; } catch {}
  io.value = txt || '';
  modal.style.display = 'grid';
  modal.setAttribute('aria-hidden', 'false');
  modal.setAttribute('aria-describedby', 'io');
  try { io.focus(); io.select(); } catch {}
  lockScroll();
  if(appRoot) appRoot.setAttribute('aria-hidden','true');
  const card = modal.querySelector('.card');
  trapFocus(card);
  const tabs = getTabbables(card);
  if(!tabs.length){ const closeBtn = document.getElementById('close'); if(closeBtn) closeBtn.focus(); }
}

function closeModal(){
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  const card = modal.querySelector('.card'); releaseFocus(card);
  unlockScroll();
  if(appRoot) appRoot.removeAttribute('aria-hidden');
  try { if(_lastFocus && typeof _lastFocus.focus === 'function') _lastFocus.focus(); } catch {}
}

function buildExportPayload(){
  const version=EXPORT_VERSION;
  const theme=getTheme();
  const themeName=String(theme || '').replace(/^theme-/, '');
  const exportedAt=new Date().toISOString();
  const layout=collect();
  let metaPerBlock=null;
  try{
    const saved=loadMeta()||{};
    metaPerBlock={};
    Object.keys(layout).forEach(id=>{
      const el=document.getElementById(id);
      const m=saved[id]||{};
      const cx=(m.cx||(el&&el.style.getPropertyValue('--cx'))||'').trim();
      const cy=(m.cy||(el&&el.style.getPropertyValue('--cy'))||'').trim();
      const padx=(m.padx||(el&&el.style.getPropertyValue('--padx'))||'').trim();
      const entry={};
      if(cx) entry.cx=cx;
      if(cy) entry.cy=cy;
      if(padx) entry.padx=padx;
      if(Object.keys(entry).length) metaPerBlock[id]=entry;
    });
    if(Object.keys(metaPerBlock).length===0) metaPerBlock=null;
  }catch{ metaPerBlock=null; }
  const coords={};
  const rr=root.getBoundingClientRect();
  Object.keys(layout).forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const r=el.getBoundingClientRect();
    coords[id]={
      pxX:Math.round(r.left-rr.left),
      pxY:Math.round(r.top-rr.top),
      pxW:Math.round(r.width),
      pxH:Math.round(r.height)
    };
  });
  return {
    version,
    meta:{ exportedAt, theme: themeName, source:'sq-ui-editor' },
    layout,
    metaPerBlock:metaPerBlock||undefined,
    coords
  };
}

function buildSavePayload(){
  const p = buildExportPayload();
  const themeName = (p.meta && String(p.meta.theme || '')).replace(/^theme-/, '');
  return {
    version: p.version,
    savedAt: new Date().toISOString(),
    theme: themeName,
    layout: p.layout,
    metaPerBlock: p.metaPerBlock || undefined
  };
}

function validateLayoutPayload(input) {
  const out = { ok: false, layout: null, meta: null, errors: [] };

  const root = (input && typeof input === 'object') ? input : null;
  if (!root) { out.errors.push('Top-level is not an object.'); return out; }

  const layout = (root.layout && typeof root.layout === 'object') ? root.layout
                : (!root.layout ? root : null);
  if (!layout || typeof layout !== 'object') {
    out.errors.push('Missing or invalid "layout" object.');
    return out;
  }

  const allowedKinds = new Set(
    Object.values(MAKE_TO_ID).map(id => KIND_FOR[id]).filter(Boolean)
      .concat(['_board','_ctrl','title','snkr','power','life','score','timer','bombbar','joystick','stat','pause'])
  );

  const clean = {};
  const idSeen = new Set();
  const idOk = id => typeof id === 'string' && id.length > 0 && /^[A-Za-z0-9_-]{1,64}$/.test(id);

  const clampInt = (v,min,max,name,id) => {
    if (!Number.isFinite(v)) return `Field "${name}" for "${id}" is not a finite number.`;
    if ((v|0) !== v) return `Field "${name}" for "${id}" must be an integer.`;
    if (v < min || v > max) return `Field "${name}" for "${id}" out of range [${min}, ${max}].`;
    return null;
  };

  for (const [idRaw, v] of Object.entries(layout)) {
    if (!idOk(idRaw)) { out.errors.push(`Invalid element id "${idRaw}". Use A–Z, a–z, 0–9, _ or -, max 64 chars.`); continue; }
    if (idSeen.has(idRaw)) { out.errors.push(`Duplicate element id "${idRaw}".`); continue; }
    idSeen.add(idRaw);

    if (!v || typeof v !== 'object') { out.errors.push(`Entry for "${idRaw}" is not an object.`); continue; }

    const { k, x, y, w, h } = v;

    if (typeof k !== 'string' || !allowedKinds.has(k)) {
      out.errors.push(`"${idRaw}": invalid kind "${k}".`);
      continue;
    }

    const ex = clampInt(x, 0, 17, 'x', idRaw);
    const ey = clampInt(y, 0, 31, 'y', idRaw);
    const ew = clampInt(w, 1, 18, 'w', idRaw);
    const eh = clampInt(h, 1, 32, 'h', idRaw);
    if (ex) out.errors.push(ex);
    if (ey) out.errors.push(ey);
    if (ew) out.errors.push(ew);
    if (eh) out.errors.push(eh);
    if (ex || ey || ew || eh) continue;

    clean[idRaw] = { k, x, y, w, h };
  }

  if (out.errors.length) return out;

  const meta = (root.meta && typeof root.meta === 'object') ? root.meta : null;

  out.ok = true;
  out.layout = clean;
  out.meta = meta || null;
  return out;
}

$('#export').onclick=()=>{ const payload=buildExportPayload(); openModal('// Export schema: version, meta, layout, metaPerBlock, coords\n'+JSON.stringify(payload,null,2)); };
$('#import').onclick=()=>{ openModal('Paste JSON here, then press Apply. Supports {version,theme,layout} or layout-only.'); };
$('#copy').onclick=()=>{ navigator.clipboard.writeText(io.value).catch(()=>{}); };
$('#pasteApply').onclick=()=>{
  try {
    const raw = io.value;
    const obj = JSON.parse(raw);

    if (obj && obj.theme) {
      const name = String(obj.theme).replace(/^theme-/, '');
      setTheme(name);
      applyTheme(name);
    }

    const res = validateLayoutPayload(obj);
    if (!res.ok) {
      alert('Import failed\n\n' + res.errors.join('\n'));
      return;
    }

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
    refreshLayoutSelect();
    alert('Layout import succeeded.');
    closeModal();
  } catch (e) {
    alert('Invalid JSON. Parse error.');
  }
};
['downloadJson','downloadJsonModal'].forEach(id=>{
  const btn=document.getElementById(id);
  if(!btn) return;
  btn.onclick=()=>{
    const data=io.value&&(()=>{ try{ return JSON.parse(io.value); }catch{ return null; } })();
    const payload=data||buildExportPayload();
    const ts=((payload.meta&&payload.meta.exportedAt)||new Date().toISOString()).replace(/[:]/g,'');
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='sq-ui-layout-'+ts+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
});
$('#close').onclick=closeModal;

(function(){
  window.applyPresetById = window.applyPresetById || function(presetId, options){
    const id = String(presetId || '');
    if (!id) return false;

    const presets = (typeof window.PRESETS === 'object' && window.PRESETS) || {};
    const presetFn = presets[id];
    if (typeof presetFn !== 'function') {
      alert('Preset unavailable.');
      return false;
    }

    let layout;
    try {
      layout = presetFn();
    } catch (err) {
      console.warn('Failed to build preset', id, err);
      alert('Preset unavailable.');
      return false;
    }

    if (!layout || typeof layout !== 'object') {
      alert('Preset unavailable.');
      return false;
    }

    const payload = {
      version: EXPORT_VERSION,
      meta: { exportedAt: new Date().toISOString(), theme: getTheme(), source: 'sq-ui-editor' },
      layout
    };

    try { io.value = JSON.stringify(payload, null, 2); } catch {}

    const res = validateLayoutPayload(payload);
    if (!res.ok) {
      alert('Preset validation failed:\n\n' + res.errors.join('\n'));
      return false;
    }

    applyStrict(reconcileLayout(res.layout), true);
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    snapshot();
    refreshLayoutSelect();

    if (typeof window.updateInspector === 'function') window.updateInspector(null);
    if (typeof window.renderLayout === 'function') window.renderLayout();
    if (typeof window.updateLayoutUI === 'function') window.updateLayoutUI();
    if (typeof window.updateHistoryUI === 'function') {
      const label = options && options.historyLabel ? options.historyLabel : `Applied preset: ${id}`;
      window.updateHistoryUI(label);
    }

    try {
      window.dispatchEvent(new CustomEvent('layout:changed', { detail: { source: 'io' } }));
    } catch {}

    return true;
  };

  window.resetToStrictDefault = function() {
    // 1) Apply the strict default preset using the shared path
    if (typeof window.applyPresetById === 'function') {
      window.applyPresetById('strictDefault');
    } else {
      console.warn('applyPresetById() not found');
    }

    // 2) Clear selection safely
    if (window.selection && typeof window.selection.clear === 'function') {
      window.selection.clear();
    } else if (typeof window.clearSelection === 'function') {
      window.clearSelection();
    } else {
      document.querySelectorAll('.block.sel').forEach(el => el.classList.remove('sel'));
    }

    // 3) Refresh inspector/UI (call whatever exists)
    if (typeof window.updateInspector === 'function') window.updateInspector(null);
    if (typeof window.renderLayout === 'function') window.renderLayout();
    if (typeof window.updateLayoutUI === 'function') window.updateLayoutUI();

    // 4) Record history + update the history UI if available
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();

    if (typeof window.historyPush === 'function') {
      window.historyPush({ type: 'reset', note: 'Reset to strict default' });
    } else if (typeof window.pushHistory === 'function') {
      window.pushHistory('reset', { preset: 'strictDefault' });
    }
    if (typeof window.updateHistoryUI === 'function') window.updateHistoryUI('Reset');

    // 5) Notify any listeners
    try {
      window.dispatchEvent(new CustomEvent('layout:changed', { detail: { source: 'reset' }}));
    } catch (e) {}
  };
})();

(function(){
  const fileInput = document.getElementById('uploadJson');
  const uploadBtn = document.getElementById('uploadBtn');
  if (!fileInput || !uploadBtn) return;

  uploadBtn.onclick = () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) { alert('Choose a .json file first.'); return; }
    const reader = new FileReader();
    reader.onerror = () => alert('Failed to read file.');
    reader.onload = () => {
      try {
        const txt = String(reader.result || '');
        const obj = JSON.parse(txt);
        if (obj && obj.theme) {
          const name = String(obj.theme).replace(/^theme-/, '');
          setTheme(name);
          applyTheme(name);
        }
        try { io.value = JSON.stringify(obj, null, 2); } catch {}
        const res = validateLayoutPayload(obj);
        if (!res.ok) {
          alert('Upload parse/validate failed:\n\n' + res.errors.join('\n'));
          return;
        }
        if (confirm('Valid layout. Apply it now?')) {
          applyStrict(reconcileLayout(res.layout), true);
          if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
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
          refreshLayoutSelect();
          alert('Layout import succeeded.');
          closeModal();
          try {
            window.dispatchEvent(new CustomEvent('layout:changed', { detail: { source: 'io' } }));
          } catch {}
        } else {
          alert('Layout validated. Review the JSON in the textarea, then click Apply if desired.');
        }
      } catch {
        alert('Invalid JSON in file.');
      }
    };
    reader.readAsText(f);
  };
})();

document.getElementById('applyPreset')?.addEventListener('click', () => {
  const sel = document.getElementById('presetSel');
  const id = sel ? sel.value : '';
  if (!id) {
    alert('Choose a preset.');
    return;
  }
  window.applyPresetById(id);
});

window.getTabbables = getTabbables;
window.trapFocus = trapFocus;
window.releaseFocus = releaseFocus;
window.lockScroll = lockScroll;
window.unlockScroll = unlockScroll;
window.openModal = openModal;
window.closeModal = closeModal;
window.buildExportPayload = buildExportPayload;
window.buildSavePayload = buildSavePayload;
window.validateLayoutPayload = validateLayoutPayload;
window.readSavedLayouts = readSavedLayouts;
window.writeSavedLayouts = writeSavedLayouts;
window.refreshLayoutSelect = refreshLayoutSelect;


