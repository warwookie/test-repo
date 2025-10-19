(function(){
  const selSet = (window.selSet instanceof Set) ? window.selSet : new Set();
  window.selSet = selSet;
  if (!Array.isArray(window.CURRENT_SELECTION)) window.CURRENT_SELECTION = [];

  function syncSelectionCache(){
    window.CURRENT_SELECTION = Array.from(selSet);
  }

  function dispatchSelectionChange(){
    syncSelectionCache();
    try {
      document.dispatchEvent(new CustomEvent('sq-selection-change', {
        detail: { ids: window.CURRENT_SELECTION.slice() }
      }));
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
      if (typeof clearGuides === 'function') clearGuides();
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
      if (typeof clearGuides === 'function') clearGuides();
    } catch {}
    $$('.block').forEach(b => b.classList.remove('sel'));
    selSet.clear();
    if (el){
      selSet.add(el.id);
      el.classList.add('sel');
    }
    dispatchSelectionChange();
  }

  window.syncSelectionCache = syncSelectionCache;
  window.dispatchSelectionChange = dispatchSelectionChange;
  window.getSelection = getSelection;
  window.clearSelection = clearSelection;
  window.addToSelection = addToSelection;
  window.removeFromSelection = removeFromSelection;
  window.setSingleSelection = setSingleSelection;
})();
