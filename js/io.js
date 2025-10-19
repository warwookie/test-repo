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

const EXPORT_SCHEMA_VERSION = 1;
const BASE_TILE_PX = 16; // 1× tile in pixels (matches snap base)

function readXY(el){
  return {
    x: Number(el.style.left?.replace('px','') || el.dataset.x || 0),
    y: Number(el.style.top?.replace('px','') || el.dataset.y || 0),
  };
}

window.exportLayoutClean = function(){
  // Collect ONLY real HUD blocks that declare a kind
  const allEls = Array.from(document.querySelectorAll('.block[data-kind]'));
  const snap   = (typeof getSnapStep === 'function') ? getSnapStep() : BASE_TILE_PX;

  let skipped = 0;
  const items = allEls.map(el => {
    const kind = (el.dataset && typeof el.dataset.kind === 'string') ? el.dataset.kind.trim() : '';
    if (!kind) { skipped++; return null; }

    const id = el.id || '';
    const { x, y } = readXY(el);
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    // snap/clamp
    let nx = Math.round(x / snap) * snap;
    let ny = Math.round(y / snap) * snap;
    if (typeof clampToStage === 'function'){
      const c = clampToStage(nx, ny, w, h);
      nx = c.x; ny = c.y;
    }

    // convert to tiles (allow halves)
    const toTiles = (px) => Math.round((px / BASE_TILE_PX) * 2) / 2;

    // minimal optional meta
    const inner = el.querySelector(':scope > .innerHost');
    const label = inner?.querySelector(':scope > .labelHost');
    const icons = inner?.querySelector(':scope > .iconsHost');

    const meta = {};
    if (label){
      meta.text = Array.from(label.querySelectorAll('.labelLine')).map(n=>n.textContent).join('\n') || label.textContent || '';
    }
    if (icons){
      meta.iconCount = icons.children.length || 0;
    }

    return {
      id,
      kind,
      x: toTiles(nx),
      y: toTiles(ny),
      w: toTiles(w),
      h: toTiles(h),
      locked: el.classList.contains('locked') || false,
      meta
    };
  }).filter(Boolean);

  if (skipped && typeof window.inspStatus === 'function') {
    window.inspStatus(`Export: skipped ${skipped} non-HUD node(s)`);
  }

  const themeSel = document.getElementById('themeSel');
  const theme = themeSel ? themeSel.value : 'midnight';
  const paletteVersion = (typeof window.setPaletteVersion === 'function') ?
    (document.querySelector('.pHead > div')?.textContent?.match(/Palette\s+(\d+)/)?.[1] || null) : null;

  const out = {
    version: EXPORT_SCHEMA_VERSION,
    meta: {
      theme,
      paletteVersion: paletteVersion ? Number(paletteVersion) : undefined
    },
    layout: items
  };

  if (out.meta.paletteVersion === undefined) delete out.meta.paletteVersion;

  return out;
};

function lockScroll(){ try{ document.body.dataset._preOverflow = document.body.style.overflow || ''; document.body.style.overflow = 'hidden'; }catch{} }
function unlockScroll(){ try{ document.body.style.overflow = document.body.dataset._preOverflow || ''; delete document.body.dataset._preOverflow; }catch{} }

const modal=$('#modal'), io=$('#io');
let _lastFocus = null;
Object.defineProperty(window, '_lastFocus', { get: () => _lastFocus, set: v => { _lastFocus = v; } });

window.layoutsKey = 'hudLayouts:v1';

window.loadSavedLayouts = function(){
  try {
    return JSON.parse(localStorage.getItem(window.layoutsKey) || '{}') || {};
  } catch {
    return {};
  }
};

window.saveLayouts = function(map){
  try {
    localStorage.setItem(window.layoutsKey, JSON.stringify(map));
  } catch (err) {
    console.warn('saveLayouts: failed to persist layouts', err);
  }
};

window.parseAndValidateLayoutText = function(text){
  const errs = [];
  let obj = null;

  try { obj = JSON.parse(text); }
  catch (e) { errs.push('JSON parse error'); }

  if (!obj || typeof obj !== 'object') errs.push('Root must be an object');
  if (!('layout' in (obj || {})) || !Array.isArray(obj?.layout)) errs.push('Missing "layout" array');

  if (Array.isArray(obj?.layout)){
    obj.layout.forEach((it, idx) => {
      if (typeof it?.kind !== 'string' || !it.kind.trim()) errs.push(`${idx}: invalid kind`);
      ['x','y','w','h'].forEach(k => {
        if (typeof it[k] !== 'number') errs.push(`${idx}: ${k} must be number (tiles)`);
      });
    });
  }

  if (errs.length) {
    const msg = 'Upload parse/validate failed:\n' + errs.map(e => `- ${e}`).join('\n');
    throw new Error(msg);
  }
  return obj;
};

window.saveLayoutNamed = function(name, json){
  const map = window.loadSavedLayouts();
  map[name] = json;
  window.saveLayouts(map);
};

window.deleteLayoutNamed = function(name){
  const map = window.loadSavedLayouts();
  delete map[name];
  window.saveLayouts(map);
};

function applyTileLayoutPayload(data){
  const TILE = 16;
  const dup = JSON.parse(JSON.stringify(data));

  dup.layout.forEach(it => {
    if (!it || typeof it !== 'object') return;
    it.x = Math.round(it.x * TILE);
    it.y = Math.round(it.y * TILE);
    it.w = Math.round(it.w * TILE);
    it.h = Math.round(it.h * TILE);
  });

  if (typeof window.loadLayoutJSON === 'function') {
    window.loadLayoutJSON(dup);
    try { window.dispatchEvent(new CustomEvent('layout:changed', { detail:{ source:'import' } })); } catch(_){ }
    if (typeof window.updateInspector === 'function') window.updateInspector(null);
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    if (typeof window.historyPush === 'function') window.historyPush({ type:'import' });
    return true;
  }

  return dup;
}

window.applyImportedLayout = window.applyImportedLayout || function(payload){
  if (!payload) return;

  let data = payload;
  if (typeof payload === 'string') {
    try {
      data = JSON.parse(payload);
    } catch (err) {
      console.warn('applyImportedLayout: invalid JSON payload', err);
      return;
    }
  }

  if (!data || typeof data !== 'object') return;

  if (Array.isArray(data.layout) && data.layout.every(it => it && typeof it === 'object' && typeof it.kind === 'string')) {
    const tileResult = applyTileLayoutPayload(data);
    if (tileResult === true) return;
    if (tileResult && typeof tileResult === 'object') {
      data = tileResult;
    } else {
      return;
    }
  }

  const layoutEntries = Array.isArray(data.layout) ? data.layout : [];
  const layoutMap = {};
  const metaMap = {};
  const lockedIds = new Set();

  const toNumber = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  layoutEntries.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return;
    const rawId = typeof entry.id === 'string' ? entry.id.trim() : '';
    const id = rawId || `item_${idx}`;
    const kind = typeof entry.kind === 'string' && entry.kind ? entry.kind : (typeof entry.k === 'string' ? entry.k : '');
    if (!kind) return;

    layoutMap[id] = {
      k: kind,
      x: toNumber(entry.x, 0),
      y: toNumber(entry.y, 0),
      w: toNumber(entry.w, 1),
      h: toNumber(entry.h, 1)
    };

    if (entry.locked) lockedIds.add(id);
    if (entry.meta && typeof entry.meta === 'object') metaMap[id] = entry.meta;
  });

  if (!Object.keys(layoutMap).length) return;

  if (data.meta && typeof data.meta === 'object') {
    if (data.meta.theme) {
      const themeName = String(data.meta.theme).replace(/^theme-/, '');
      if (typeof window.setTheme === 'function') window.setTheme(themeName);
      if (typeof window.applyTheme === 'function') window.applyTheme(themeName);
    }
    if (data.meta.paletteVersion && typeof window.setPaletteVersion === 'function') {
      const pv = Number(data.meta.paletteVersion);
      if (Number.isFinite(pv)) window.setPaletteVersion(pv);
    }
  }

  if (typeof window.reconcileLayout === 'function' && typeof window.applyStrict === 'function') {
    try {
      const reconciled = window.reconcileLayout(layoutMap);
      window.applyStrict(reconciled, true);
    } catch (err) {
      console.warn('applyImportedLayout: failed to apply layout', err);
      return;
    }
  }

  const blocks = document.querySelectorAll('.block');
  blocks.forEach(el => {
    if (!el || !el.id) return;
    if (lockedIds.has(el.id)) {
      el.classList.add('locked');
      el.dataset.locked = '1';
    } else {
      el.classList.remove('locked');
      delete el.dataset.locked;
    }
  });

  const ensureHosts = (el) => {
    if (typeof window.normalizeBlockContent === 'function') {
      try { window.normalizeBlockContent(el); } catch {}
    }
    return el.querySelector(':scope > .innerHost') || el;
  };

  Object.entries(metaMap).forEach(([id, meta]) => {
    const el = document.getElementById(id);
    if (!el || !meta || typeof meta !== 'object') return;
    const inner = ensureHosts(el);

    if (typeof meta.text === 'string') {
      let label = inner.querySelector(':scope > .labelHost');
      if (!label) {
        if (typeof window.normalizeBlockContent === 'function') {
          try { window.normalizeBlockContent(el); } catch {}
        }
        label = inner.querySelector(':scope > .labelHost');
      }
      if (label) {
        label.innerHTML = '';
        const lines = meta.text.split(/\r?\n/);
        lines.forEach(line => {
          const span = document.createElement('span');
          span.className = 'labelLine';
          span.textContent = line;
          label.appendChild(span);
        });
      }
    }

    if (typeof meta.iconCount === 'number') {
      let icons = inner.querySelector(':scope > .iconsHost');
      if (!icons) {
        if (typeof window.normalizeBlockContent === 'function') {
          try { window.normalizeBlockContent(el); } catch {}
        }
        icons = inner.querySelector(':scope > .iconsHost');
      }
      if (icons) {
        const count = Math.max(0, Math.floor(meta.iconCount));
        icons.innerHTML = '';
        for (let i = 0; i < count; i++) {
          const dot = document.createElement('span');
          dot.className = 'iconToken';
          icons.appendChild(dot);
        }
        icons.dataset.count = String(count);
      }
    }
  });

  if (typeof window.snapshot === 'function') {
    try { window.snapshot(); } catch {}
  }
  if (typeof window.refreshSelectionUI === 'function') {
    try { window.refreshSelectionUI(); } catch {}
  }
  if (typeof window.updateInspector === 'function') {
    try { window.updateInspector(null); } catch {}
  }
  if (typeof window.renderLayout === 'function') {
    try { window.renderLayout(); } catch {}
  }
  if (typeof window.updateLayoutUI === 'function') {
    try { window.updateLayoutUI(); } catch {}
  }
  return true;
};

window.applyJsonFromTextarea = function(){
  const ta = document.getElementById('io');
  if (!ta) return;
  try {
    const obj = window.parseAndValidateLayoutText(ta.value);
    window.applyImportedLayout(obj);
    if (typeof window.inspStatus === 'function') window.inspStatus('Applied JSON from textarea');
  } catch (e) {
    alert(e.message || String(e));
    if (typeof window.inspStatus === 'function') window.inspStatus('Import failed');
  }
};

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

window.__saveJsonBlob = window.__saveJsonBlob || function(obj, filename='layout.json'){
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed:', err);
  }
};

window.bindDownloadButtons = function(){
  const ids = ['downloadJson', 'downloadJsonModal'];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (btn.__dlBound) return;
    btn.__dlBound = true;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.exportLayoutClean !== 'function') {
        console.warn('exportLayoutClean() not found');
        return;
      }
      const json = window.exportLayoutClean();
      window.__saveJsonBlob(json, 'layout.json');
    });
  });
};

const exportBtn = document.getElementById('export');
const ioTA = document.getElementById('io');
if (exportBtn && ioTA && modal){
  exportBtn.addEventListener('click', () => {
    const json = window.exportLayoutClean();
    const pretty = JSON.stringify(json, null, 2);
    if (typeof openModal === 'function'){
      openModal();
      ioTA.value = pretty;
    } else {
      ioTA.value = pretty;
    }
  });
}

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
window.readSavedLayouts = window.loadSavedLayouts;
window.writeSavedLayouts = window.saveLayouts;
window.refreshLayoutSelect = function(){
  if (typeof window.refreshLayoutDropdown === 'function') {
    window.refreshLayoutDropdown();
    return;
  }

  const dd = document.getElementById('layoutSel');
  if (!dd) return;
  const map = typeof window.loadSavedLayouts === 'function' ? window.loadSavedLayouts() : {};
  dd.innerHTML = '<option value="">-- none --</option>';
  Object.keys(map).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    dd.appendChild(opt);
  });
};


