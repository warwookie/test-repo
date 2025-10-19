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
    $$('.block').forEach(b => b.classList.remove('sel'));
    try {
      if (typeof window.clearGuides === 'function') window.clearGuides();
    } catch {}
    dispatchSelectionChange();
  }

  function addToSelection(el){
    if (!el) return;
    selSet.add(el.id);
    el.classList.add('sel');
    dispatchSelectionChange();
  }

  function removeFromSelection(el){
    if (!el) return;
    selSet.delete(el.id);
    el.classList.remove('sel');
    dispatchSelectionChange();
  }

  function setSingleSelection(el){
    try {
      if (typeof window.clearGuides === 'function') window.clearGuides();
    } catch {}
    $$('.block').forEach(b => b.classList.remove('sel'));
    selSet.clear();
    if (el){
      selSet.add(el.id);
      el.classList.add('sel');
    }
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

  window.syncSelectionCache = syncSelectionCache;
  window.dispatchSelectionChange = dispatchSelectionChange;
  window.getSelection = getSelection;
  window.clearSelection = clearSelection;
  window.addToSelection = addToSelection;
  window.removeFromSelection = removeFromSelection;
  window.setSingleSelection = setSingleSelection;
  window.setupSelectionListeners = setupSelectionListeners;
})();
