(function(){
  window.clearGuides = window.clearGuides || function(){
    const g = document.getElementById('guides');
    if (g) g.innerHTML = '';
  };

  window.renderGuides = window.renderGuides || function(lines = []){
    const g = document.getElementById('guides');
    if (!g) return;
    if (g.getAttribute('aria-hidden') === 'true'){ g.innerHTML = ''; return; }
    g.innerHTML = '';
    lines.forEach(ln => {
      if (!ln || !ln.dir || typeof ln.pos !== 'number') return;
      const d = document.createElement('div');
      d.className = 'guide-line ' + (ln.dir === 'h' ? 'h' : 'v');
      if (ln.dir === 'h') d.style.top = ln.pos + 'px';
      else d.style.left = ln.pos + 'px';
      g.appendChild(d);
    });
  };

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

  function snapStepPx(){
    const size = tileSize();
    const state = window.snapState || {};
    const step = (typeof state.step === 'number' && !Number.isNaN(state.step) && state.step > 0) ? state.step : 1;
    return size * step;
  }

  function quantizePx(px){
    const stepPx = snapStepPx();
    if (!stepPx) return Math.round(px);
    return Math.round(px / stepPx) * stepPx;
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
    const stepPx = snapStepPx();
    if (!stepPx) return px;
    return quantizePx(px);
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

    if (!state.enabled) return { x: X, y: Y, guides: [] };
    if (!state.showGuides || !guides || !guides.xs || !guides.ys || (ev && ev.altKey)){
      return { x: X, y: Y, guides: [] };
    }

    const useEdges = !snapEdgesEl || snapEdgesEl.checked;
    const useCenters = !snapCentersEl || snapCentersEl.checked;
    if (!useEdges && !useCenters) return { x: X, y: Y, guides: [] };

    const threshold = typeof state.thresholdPx === 'number' ? state.thresholdPx : 6;
    const candX = [];
    const candY = [];
    if (useEdges){ candX.push(X, X + w); candY.push(Y, Y + h); }
    if (useCenters){ candX.push(X + w / 2); candY.push(Y + h / 2); }
    if (!candX.length && !candY.length) return { x: X, y: Y, guides: [] };

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
    if (snapX !== null) X = snapX;

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
    if (snapY !== null) Y = snapY;

    const lines = [];
    if (snapX !== null){
      lines.push({ dir: 'v', pos: Math.round(X) });
      lines.push({ dir: 'v', pos: Math.round(X + w) });
    }
    if (snapY !== null){
      lines.push({ dir: 'h', pos: Math.round(Y) });
      lines.push({ dir: 'h', pos: Math.round(Y + h) });
    }

    if (state.enabled){
      X = quantizePx(X);
      Y = quantizePx(Y);
    }

    return { x: X, y: Y, guides: lines };
  }

  window.tileSize = tileSize;
  window.snapStepPx = snapStepPx;
  window.quantizePx = quantizePx;
  window.snapValuePx = snapValuePx;
  window.computeGuides = computeGuides;
  window.snapToGuides = snapToGuides;
})();
