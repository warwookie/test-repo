(function(){
  window.updateInspector = window.updateInspector || function(forceSel = null) {
    try {
      if (typeof window.__updateInspectorCore === 'function') {
        window.__updateInspectorCore(forceSel);
      }
    } catch (err) {
      console.warn('updateInspector failed', err);
    }
  };

  window.refreshSelectionUI = function() {
    const source = (window.getSelectionSet && window.getSelectionSet()) || window.selSet;
    const list = [];
    if (source instanceof Set) {
      source.forEach(id => list.push(id));
    } else if (Array.isArray(source)) {
      source.forEach(id => list.push(id));
    } else if (source && typeof source.forEach === 'function') {
      source.forEach((value, key) => {
        if (typeof value === 'string' || typeof value === 'number') {
          list.push(String(value));
        } else if (typeof key === 'string' || typeof key === 'number') {
          list.push(String(key));
        }
      });
    } else if (source && typeof source === 'object') {
      Object.keys(source).forEach(id => list.push(id));
    }
    const selectedIds = new Set(list.filter(Boolean));
    const isSelected = (el) => selectedIds.has(el.id);

    document.querySelectorAll('.block.sel').forEach(el => el.classList.remove('sel'));

    if (selectedIds.size) {
      selectedIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sel');
      });
    }

    document.querySelectorAll('.block').forEach(el => {
      const handle = el.querySelector(':scope > .handle');
      if (!handle) return;
      const locked = el.classList.contains('locked');
      handle.style.display = (isSelected(el) && !locked) ? '' : 'none';
    });
  };

  const selSet = (window.selSet instanceof Set) ? window.selSet : new Set();
  window.selSet = selSet;
  if (!Array.isArray(window.CURRENT_SELECTION)) window.CURRENT_SELECTION = [];

  function syncSelectionCache(){
    window.CURRENT_SELECTION = Array.from(selSet);
  }

  function dispatchSelectionChange(){
    syncSelectionCache();
    try {
      if (typeof window.clearGuides === 'function') window.clearGuides();
    } catch {}
    try {
      document.dispatchEvent(new CustomEvent('sq-selection-change', {
        detail: { ids: window.CURRENT_SELECTION.slice() }
      }));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('selection:changed'));
    } catch {}
  }

  function getSelection(){
    syncSelectionCache();
    return Array.from(selSet).map(id => document.getElementById(id)).filter(Boolean);
  }

  function clearSelection(){
    selSet.clear();
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    try {
      if (typeof window.clearGuides === 'function') window.clearGuides();
    } catch {}
    dispatchSelectionChange();
  }

  function addToSelection(el){
    if (!el) return;
    selSet.add(el.id);
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    dispatchSelectionChange();
  }

  function removeFromSelection(el){
    if (!el) return;
    selSet.delete(el.id);
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    dispatchSelectionChange();
  }

  function setSingleSelection(el){
    try {
      if (typeof window.clearGuides === 'function') window.clearGuides();
    } catch {}
    selSet.clear();
    if (el){
      selSet.add(el.id);
    }
    if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
    dispatchSelectionChange();
  }

  function setupSelectionListeners(){
    const stage = document.getElementById('stage');
    if (!stage) return;

    stage.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.hud-block')) {
        if (window.selection && typeof window.selection.clear === 'function') {
          try { window.selection.clear(); } catch { clearSelection(); }
        } else {
          clearSelection();
        }
        try {
          if (typeof renderSelection === 'function') renderSelection();
        } catch {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSelectionListeners);
  } else {
    setupSelectionListeners();
  }

  if (!window.__inspBound) {
    window.__inspBound = true;
    window.addEventListener('selection:changed', () => window.updateInspector(null));
    window.addEventListener('layout:changed', () => window.updateInspector(null));
  }

  if (!window.__selUiBound) {
    window.__selUiBound = true;
    window.addEventListener('selection:changed', () => window.refreshSelectionUI());
    window.addEventListener('layout:changed', () => window.refreshSelectionUI());
  }

  window.syncSelectionCache = syncSelectionCache;
  window.dispatchSelectionChange = dispatchSelectionChange;
  window.getSelection = getSelection;
  window.clearSelection = clearSelection;
  window.addToSelection = addToSelection;
  window.removeFromSelection = removeFromSelection;
  window.setSingleSelection = setSingleSelection;
  window.setupSelectionListeners = setupSelectionListeners;
  if (typeof window.refreshSelectionUI === 'function') window.refreshSelectionUI();
})();
