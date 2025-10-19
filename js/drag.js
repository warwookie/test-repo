(function(){
  function resolveStage(){
    return typeof root !== 'undefined' ? root : document.getElementById('root');
  }

  function getSnapToggle(){
    return window.snapTiles || document.getElementById('snapTiles');
  }

  function getSnapEdges(){
    return window.snapEdges || document.getElementById('snapEdges');
  }

  function getSnapCenters(){
    return window.snapCenters || document.getElementById('snapCenters');
  }

  function isEditing(){
    try { return window.editing !== false; } catch { return true; }
  }

  function updateSelectedFromSet(){
    const selList = (typeof getSelection === 'function') ? getSelection() : [];
    window.selected = selList.length ? selList[selList.length - 1] : null;
    return selList;
  }

  function handleDoubleTap(el){
    let lastTap = 0;
    return function(ev){
      const now = Date.now();
      if (now - lastTap < 300){
        if (typeof openEditor === 'function') openEditor(el);
        ev.preventDefault();
        return;
      }
      lastTap = now;
    };
  }

  function attachBlockInteractions(el){
    if (!el) return;
    el.addEventListener('dblclick', () => { if (typeof openEditor === 'function') openEditor(el); });
    el.addEventListener('pointerdown', handleDoubleTap(el));

    el.addEventListener('pointerdown', e => {
      const toggle = (e.ctrlKey || e.metaKey) === true;
      if (toggle){
        if (window.selSet && window.selSet.has(el.id)) removeFromSelection(el);
        else addToSelection(el);
      } else {
        setSingleSelection(el);
      }
      e.__handledSelection = true;
      updateSelectedFromSet();
      if (!isEditing()) return;
      if (el.classList.contains('locked')) return;

      const handle = e.target.classList.contains('handle');
      const mode = handle ? 'resize' : 'move';
      const stage = resolveStage();
      if (!stage) return;
      const rr = stage.getBoundingClientRect();
      const startX = clamp(e.clientX, rr.left, rr.right);
      const startY = clamp(e.clientY, rr.top, rr.bottom);
      const r = el.getBoundingClientRect();
      const start = { x: startX, y: startY, l: r.left - rr.left, t: r.top - rr.top, w: r.width, h: r.height };
      const targets = (window.selSet && window.selSet.size > 0) ? getSelection() : [el];
      start.map = {};
      targets.forEach(t => {
        const tr = t.getBoundingClientRect();
        start.map[t.id] = { l: tr.left - rr.left, t: tr.top - rr.top };
      });

      const capturePositions = () => {
        const shell = stage.getBoundingClientRect();
        return targets
          .filter(Boolean)
          .map(t => {
            const tr = t.getBoundingClientRect();
            return {
              id: t.id,
              x: Math.round(tr.left - shell.left),
              y: Math.round(tr.top - shell.top)
            };
          });
      };
      console.debug('drag:start', capturePositions());

      if (typeof el.setPointerCapture === 'function'){
        try { el.setPointerCapture(e.pointerId); } catch {}
      }

      const boardRect = window.board ? window.board.getBoundingClientRect() : rr;
      const ctrlRect = window.ctrl ? window.ctrl.getBoundingClientRect() : rr;
      const refs = [rr, boardRect, ctrlRect];
      const EV = refs.flatMap(R => [R.left, R.right]);
      const EH = refs.flatMap(R => [R.top, R.bottom]);
      const CV = refs.map(R => (R.left + R.right) / 2);
      const CH = refs.map(R => (R.top + R.bottom) / 2);
      const guides = (mode === 'move' && typeof computeGuides === 'function') ? computeGuides() : null;
      let moved = false;

      let rafId = null;
      let pendingEvent = null;

      const processMove = () => {
        const ev = pendingEvent;
        pendingEvent = null;
        rafId = null;
        if (!ev) return;

        const shell = stage.getBoundingClientRect();
        const pointerX = clamp(ev.clientX, shell.left, shell.right);
        const pointerY = clamp(ev.clientY, shell.top, shell.bottom);
        if (mode === 'move'){
          const dx = pointerX - start.x;
          const dy = pointerY - start.y;
          const base = start.map[el.id] || { l: start.l, t: start.t };
          let baseL = base.l + dx;
          let baseT = base.t + dy;
          const W = start.w;
          const H = start.h;
          const snapToggle = getSnapToggle();
          if (snapToggle && snapToggle.checked){
            baseL = snapValuePx(baseL, ev);
            baseT = snapValuePx(baseT, ev);
          }
          let snapped = { x: baseL, y: baseT };
          const snapEdgesEl = getSnapEdges();
          const snapCentersEl = getSnapCenters();
          if (guides && ((snapEdgesEl && snapEdgesEl.checked) || (snapCentersEl && snapCentersEl.checked))){
            snapped = snapToGuides(baseL, baseT, W, H, ev, guides);
          } else if (typeof clearGuides === 'function'){
            try { clearGuides(); } catch {}
          }
          let nx = snapped.x;
          let ny = snapped.y;
          nx = clamp(nx, 0, Math.max(0, shell.width - W));
          ny = clamp(ny, 0, Math.max(0, shell.height - H));
          const baseInfo = start.map[el.id] || { l: start.l, t: start.t };
          const deltaX = nx - baseInfo.l;
          const deltaY = ny - baseInfo.t;
          const movingTargets = getSelection().length ? getSelection() : [el];
          movingTargets.forEach(t => {
            if (t.classList.contains('locked')) return;
            const info = start.map[t.id];
            if (!info) return;
            const tr = t.getBoundingClientRect();
            const tw = tr.width;
            const th = tr.height;
            let L = info.l + deltaX;
            let T = info.t + deltaY;
            L = clamp(L, 0, Math.max(0, shell.width - tw));
            T = clamp(T, 0, Math.max(0, shell.height - th));
            t.style.left = Math.round(L) + 'px';
            t.style.top = Math.round(T) + 'px';
          });
        } else {
          if (typeof clearGuides === 'function'){
            try { clearGuides(); } catch {}
          }
          const deltaX = pointerX - start.x;
          const deltaY = pointerY - start.y;
          let L = start.l + deltaX;
          let T = start.t + deltaY;
          let W = Math.max(TILE(), start.w + deltaX);
          let H = Math.max(TILE(), start.h + deltaY);
          const snapToggle = getSnapToggle();
          if (snapToggle && snapToggle.checked && !ev.altKey){
            const size = TILE();
            L = Math.round(L / size) * size;
            T = Math.round(T / size) * size;
            W = Math.round(W / size) * size;
            H = Math.round(H / size) * size;
          }
          const cur = {
            left: rr.left + L,
            top: rr.top + T,
            right: rr.left + L + W,
            bottom: rr.top + T + H,
            cx: rr.left + L + W / 2,
            cy: rr.top + T + H / 2
          };
          const thr = TILE() / 2;
          const snapEdgesEl = getSnapEdges();
          if (snapEdgesEl && snapEdgesEl.checked && !ev.altKey){
            EV.forEach(x => {
              if (Math.abs(cur.left - x) < thr) L = x - rr.left;
              if (Math.abs(cur.right - x) < thr) L = x - rr.left - W;
            });
            EH.forEach(y => {
              if (Math.abs(cur.top - y) < thr) T = y - rr.top;
              if (Math.abs(cur.bottom - y) < thr) T = y - rr.top - H;
            });
          }
          const snapCentersEl = getSnapCenters();
          if (snapCentersEl && snapCentersEl.checked && !ev.altKey){
            CV.forEach(x => { if (Math.abs(cur.cx - x) < thr) L = x - rr.left - W / 2; });
            CH.forEach(y => { if (Math.abs(cur.cy - y) < thr) T = y - rr.top - H / 2; });
          }
          L = clamp(L, 0, Math.max(0, shell.width - W));
          T = clamp(T, 0, Math.max(0, shell.height - H));
          const availableWidth = Math.max(0, shell.width - L);
          const availableHeight = Math.max(0, shell.height - T);
          if (availableWidth < TILE()){
            W = availableWidth;
          } else {
            W = clamp(W, TILE(), availableWidth);
          }
          if (availableHeight < TILE()){
            H = availableHeight;
          } else {
            H = clamp(H, TILE(), availableHeight);
          }
          el.style.left = px(Math.round(L));
          el.style.top = px(Math.round(T));
          el.style.width = px(Math.round(W));
          el.style.height = px(Math.round(H));
        }
        moved = true;
        if (pendingEvent){
          rafId = requestAnimationFrame(processMove);
        }
      };

      const onMove = ev => {
        if (!ev) return;
        if (ev.cancelable) ev.preventDefault();
        pendingEvent = {
          clientX: ev.clientX,
          clientY: ev.clientY,
          altKey: ev.altKey,
          ctrlKey: ev.ctrlKey,
          metaKey: ev.metaKey,
          shiftKey: ev.shiftKey,
          target: ev.target || el,
          type: ev.type
        };
        if (!rafId){
          rafId = requestAnimationFrame(processMove);
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (rafId){
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        pendingEvent = null;
        try {
          if (typeof clearGuides === 'function') clearGuides();
        } catch {}
        if (moved && typeof snapshot === 'function') snapshot();
        console.debug('drag:end', capturePositions());
        if (typeof el.releasePointerCapture === 'function'){
          try { el.releasePointerCapture(e.pointerId); } catch {}
        }
      };
      try {
        window.addEventListener('pointermove', onMove, { passive: false });
      } catch {
        window.addEventListener('pointermove', onMove);
      }
      window.addEventListener('pointerup', onUp);
      e.preventDefault();
    });
  }

  window.attachBlockInteractions = attachBlockInteractions;
  window.wire = attachBlockInteractions;
})();
