(function(){
  function setS(){
    const bw=144,bh=256,vw=Math.min(innerWidth,720),vh=innerHeight;
    let s=Math.floor(Math.min((vw-340)/bw, vh/bh)); s=Math.max(3,Math.min(7,s));
    document.documentElement.style.setProperty('--s',s);
  }
  setS(); addEventListener('resize',setS);
  if(window.visualViewport){visualViewport.addEventListener('resize',setS); visualViewport.addEventListener('scroll',setS);}
})();

root=$('#root');
board=$('#board');
ctrl=$('#ctrlZone');
gridEl=$('#grid');
appRoot=document.querySelector('.app');

(function init(){
  const bootTheme=getTheme(); applyTheme(bootTheme); const sel=$('#themeSel'); if(sel){ sel.value=bootTheme; sel.addEventListener('change', e=> setTheme(e.target.value)); }
  wire(board); wire(ctrl);
  const savedGrid=(localStorage.getItem(GRID_KEY)||'1')==='1'; setGridUI(savedGrid);
  const savedRaw=localStorage.getItem(STORAGE_KEY);
  if(savedRaw){ try{ applyStrict(reconcileLayout(JSON.parse(savedRaw)), true); }catch{ applyStrict(STRICT_LAYOUT,true); } }
  else { applyStrict(STRICT_LAYOUT,true); }
  const meta=loadMeta(); Object.entries(meta).forEach(([id,m])=>{ const el=document.getElementById(id); if(el){ if(m.cx) el.style.setProperty('--cx', m.cx); if(m.cy) el.style.setProperty('--cy', m.cy); if(m.padx) el.style.setProperty('--padx', m.padx); }});
  hist.stack=[]; hist.cursor=-1; snapshot(); updateHistCounter();
  const mo=new MutationObserver(muts=>{ muts.forEach(m=>{ m.addedNodes&&m.addedNodes.forEach(n=>{ if(n.classList&&n.classList.contains('block')) wire(n); }); }); });
  mo.observe(root,{childList:true});
  try{
    const first=$$('#root .block').find(b=>b.id!=='board'&&b.id!=='ctrlZone')||$('#board');
    openEditor(first); console.assert(previewWrap.children.length>0,'preview built');
    const tIcons=$('#edTabs .tab[data-tab="icons"]'); tIcons && tIcons.click(); console.assert($('#pane-icons').classList.contains('active'),'icons pane active');
    const tText=$('#edTabs .tab[data-tab="text"]'); tText && tText.click(); console.assert($('#pane-text').classList.contains('active'),'text pane active');
    if(!getScoreHosts(first)){
      const host=getTextHost(first); const prev=host.innerText; setSafeMultilineText(host,'L1\nL2'); console.assert(host.querySelector('br'),'multiline works'); setSafeMultilineText(host, prev);
    }
    const score=document.getElementById('hudScore')||makeBlock('score','hudScore');
    select(score); preloadTextControls(score); console.assert(rowDual.style.display!=='none','dual inputs visible for score');
    padX && (padX.value=12, padX.dispatchEvent(new Event('input')));
    const m1=loadMeta(); console.assert(m1['hudScore'] && m1['hudScore'].padx==='12px','pad persisted');
    const good = { layout: { title: { k: 'title', x:0, y:0, w:18, h:2 } } };
    const bad  = { layout: { 'bad id!': { k:'unknown', x:-1, y:99, w:0, h:0 } } };
    const g = validateLayoutPayload(good);
    const b = validateLayoutPayload(bad);
    console.assert(g.ok && g.errors.length === 0, 'good payload validates');
    console.assert(!b.ok && b.errors.length >= 1, 'bad payload rejected');
    const p=buildExportPayload();
    console.assert(p && p.version && p.meta && p.layout && p.coords, 'export payload has required sections');
    const someId=Object.keys(p.layout)[0];
    console.assert(someId && p.layout[someId].w >= 1, 'layout contains at least one block');
    const savedStack=hist.stack.slice();
    const savedCursor=hist.cursor;
    for(let i=0;i<UNDO_MAX+5;i++) hist.push({test:i});
    console.assert(hist.stack.length===UNDO_MAX,'history capped to UNDO_MAX');
    console.assert(hist.cursor===hist.stack.length-1,'cursor at end after cap');
    hist.stack=savedStack;
    hist.cursor=savedCursor;
    updateHistCounter();
    try {
      if (typeof PRESETS === 'object') {
        const s = PRESETS.strictDefault && PRESETS.strictDefault();
        console.assert(s && s.title && s.board, 'strictDefault preset builds');
        const c = PRESETS.compactHUD && PRESETS.compactHUD();
        console.assert(c && c.hudSneakers && c.hudPowerups, 'compactHUD preset builds');
      }
    } catch {}
    edClose && edClose.click();
    try {
      console.assert(typeof trapFocus === 'function' && typeof releaseFocus === 'function', 'focus trap helpers present');
    } catch {}
    try {
      console.assert(typeof window.selSet !== 'undefined', 'selSet exists');
      console.assert(typeof window.addToSelection === 'function', 'addToSelection exists');
    } catch {}
  }catch{}
})();

