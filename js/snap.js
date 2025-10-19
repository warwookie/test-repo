(function(){
  window.snapState = window.snapState || {
    enabled: true,
    step: 1,
    showGuides: true,
    thresholdPx: 6
  };

  function tileSize(){
    try {
      if (typeof TILE === 'function') return TILE();
    } catch {}
    return 8;
  }

  function resolveControl(id){
    const el = document.getElementById(id);
    if (id === 'snapTiles') window.snapTiles = el;
    if (id === 'snapEdges') window.snapEdges = el;
    if (id === 'snapCenters') window.snapCenters = el;
    return el;
  }

  const snapTilesEl = resolveControl('snapTiles');
  const snapEdgesEl = resolveControl('snapEdges');
  const snapCentersEl = resolveControl('snapCenters');

  function snapValuePx(px, ev){
    const state = window.snapState || {};
    if (ev && ev.altKey) return px;
    if (!state.enabled) return px;
    const stepPx = tileSize() * (state.step || 1);
    if (!stepPx) return px;
    return Math.round(px / stepPx) * stepPx;
  }

  function computeGuides(){
    const stage = typeof root !== 'undefined' ? root : document.getElementById('root');
    if (!stage) return { xs: [], ys: [] };
    const rr = stage.getBoundingClientRect();
    const blocks = $$('.block');
    const xs = new Set([0, rr.width / 2, rr.width]);
    const ys = new Set([0, rr.height / 2, rr.height]);
    blocks.forEach(b => {
      const r = b.getBoundingClientRect();
      const x = r.left - rr.left;
      const y = r.top - rr.top;
      const w = r.width;
      const h = r.height;
      xs.add(x); xs.add(x + w / 2); xs.add(x + w);
      ys.add(y); ys.add(y + h / 2); ys.add(y + h);
    });
    return { xs: [...xs], ys: [...ys] };
  }

  function snapToGuides(x, y, w, h, ev, guides){
    const state = window.snapState || {};
    let X = x;
    let Y = y;
    const clear = typeof clearGuides === 'function' ? clearGuides : null;
    if (clear) clear();
    if (!state.enabled) return { x: X, y: Y };
    if (!state.showGuides) return { x: X, y: Y };
    if (!guides || !guides.xs || !guides.ys) return { x: X, y: Y };
    if (ev && ev.altKey) return { x: X, y: Y };

    const useEdges = !snapEdgesEl || snapEdgesEl.checked;
    const useCenters = !snapCentersEl || snapCentersEl.checked;
    if (!useEdges && !useCenters) return { x: X, y: Y };

    const threshold = typeof state.thresholdPx === 'number' ? state.thresholdPx : 6;
    const candX = [];
    const candY = [];
    if (useEdges){ candX.push(X, X + w); candY.push(Y, Y + h); }
    if (useCenters){ candX.push(X + w / 2); candY.push(Y + h / 2); }
    if (!candX.length && !candY.length) return { x: X, y: Y };

    let bestDx = Infinity;
    let snapX = null;
    guides.xs.forEach(gx => {
      candX.forEach(cx => {
        const d = Math.abs(cx - gx);
        if (d < bestDx && d <= threshold){
          bestDx = d;
          snapX = X + (gx - cx);
        }
      });
    });
    if (snapX !== null){
      X = snapX;
      if (state.showGuides && typeof drawGuideLine === 'function'){
        drawGuideLine('v', X);
        drawGuideLine('v', X + w);
      }
    }

    let bestDy = Infinity;
    let snapY = null;
    guides.ys.forEach(gy => {
      candY.forEach(cy => {
        const d = Math.abs(cy - gy);
        if (d < bestDy && d <= threshold){
          bestDy = d;
          snapY = Y + (gy - cy);
        }
      });
    });
    if (snapY !== null){
      Y = snapY;
      if (state.showGuides && typeof drawGuideLine === 'function'){
        drawGuideLine('h', Y);
        drawGuideLine('h', Y + h);
      }
    }
    return { x: X, y: Y };
  }

  window.tileSize = tileSize;
  window.snapValuePx = snapValuePx;
  window.computeGuides = computeGuides;
  window.snapToGuides = snapToGuides;
})();
