(function(){
  const TILE = window.TILE_PX || 16;

  function getSnapPx(){
    return (typeof window.getSnapStep === 'function') ? window.getSnapStep() : TILE;
  }

  function toSnap(px){
    const s = getSnapPx();
    return Math.round(px / s) * s;
  }

  function clamp(x, y, w, h){
    if (typeof window.clampToStage === 'function'){
      const c = window.clampToStage(x, y, w, h);
      return { x:c.x, y:c.y, w, h };
    }
    const stage = document.getElementById('stage');
    const W = stage ? stage.clientWidth : 360;
    const H = stage ? stage.clientHeight : 640;
    return { x: Math.min(Math.max(0,x), Math.max(0,W-w)),
             y: Math.min(Math.max(0,y), Math.max(0,H-h)),
             w, h };
  }

  function read(el){
    const x = Number(el.dataset.x || el.style.left?.replace('px','') || 0);
    const y = Number(el.dataset.y || el.style.top?.replace('px','') || 0);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return { x, y, w, h };
  }

  function write(el, geo){
    el.style.width  = geo.w + 'px';
    el.style.height = geo.h + 'px';
    if (typeof window.setBlockPos === 'function') window.setBlockPos(el, geo.x, geo.y);
    else { el.style.left = geo.x + 'px'; el.style.top = geo.y + 'px'; el.dataset.x = String(geo.x); el.dataset.y = String(geo.y); }
  }

  // Public operations
  window.alignBaselineY = function(els){
    if (!els || !els.length) return;
    const first = read(els[0]);
    const baseY = toSnap(first.y);
    const out = [];
    els.forEach(el=>{
      const g = read(el);
      const t = clamp(g.x, baseY, g.w, g.h);
      t.x = toSnap(t.x);
      write(el, t);
      out.push({ id: el.id, from: g, to: t });
    });
    return out;
  };

  window.alignEqualH = function(els){
    if (!els || !els.length) return;
    // Choose the tallest height among selection (snapped)
    let maxH = 0;
    els.forEach(el => { maxH = Math.max(maxH, read(el).h); });
    maxH = toSnap(maxH);
    const out = [];
    els.forEach(el=>{
      const g = read(el);
      const t = clamp(g.x, g.y, g.w, maxH);
      t.x = toSnap(t.x);
      t.y = toSnap(t.y);
      write(el, t);
      out.push({ id: el.id, from: g, to: t });
    });
    return out;
  };

})();
