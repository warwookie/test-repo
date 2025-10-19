const hist={stack:[],cursor:-1,current(){return this.cursor>=0?JSON.parse(this.stack[this.cursor]):null;},push(state){const s=JSON.stringify(state);this.stack=this.stack.slice(0,this.cursor+1);this.stack.push(s);this.cursor=this.stack.length-1;if(this.stack.length>UNDO_MAX){const over=this.stack.length-UNDO_MAX;this.stack.splice(0,over);this.cursor=this.stack.length-1;}updateHistCounter();},undo(){if(this.cursor>0){this.cursor--;updateHistCounter();return JSON.parse(this.stack[this.cursor]);}return null;},redo(){if(this.cursor<this.stack.length-1){this.cursor++;updateHistCounter();return JSON.parse(this.stack[this.cursor]);}return null;}};
function collect(){ const data={}; $$('.block').forEach(el=>{ const r=el.getBoundingClientRect(), rr=root.getBoundingClientRect(); data[el.id]={k:el.dataset.kind||(el.id==='board'?'_board':el.id==='ctrlZone'?'_ctrl':null),x:Math.round((r.left-rr.left)/TILE()), y:Math.round((r.top-rr.top)/TILE()), w:Math.round(r.width/TILE()), h:Math.round(r.height/TILE())}; }); return data; }
function persist(state){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch{} }
function persistMeta(id, meta){
  try{
    if(id && typeof meta==='object'){
      const existing=loadMeta();
      const clean={};
      if(meta.cx!==undefined && meta.cx!=='') clean.cx=meta.cx;
      if(meta.cy!==undefined && meta.cy!=='') clean.cy=meta.cy;
      if(meta.padx!==undefined && meta.padx!=='') clean.padx=meta.padx;
      if(Object.keys(clean).length){ existing[id]=clean; }
      else { delete existing[id]; }
      localStorage.setItem(META_KEY, JSON.stringify(existing));
      return existing;
    }
    const metaAll={};
    $$('.block').forEach(el=>{
      const cx=el.style.getPropertyValue('--cx');
      const cy=el.style.getPropertyValue('--cy');
      const padx=el.style.getPropertyValue('--padx');
      if(cx||cy||padx){
        metaAll[el.id]={
          cx: cx||'50%',
          cy: cy||'50%',
          padx: padx||'0px'
        };
      }
    });
    localStorage.setItem(META_KEY, JSON.stringify(metaAll));
    return metaAll;
  }catch{}
}
function loadMeta(){ try{ return JSON.parse(localStorage.getItem(META_KEY)||'{}'); }catch{return{};} }
function snapshot(){ const s=collect(); hist.push(s); persist(s); persistMeta(); updateHistCounter(); }
function updateHistCounter(){
  const el=document.getElementById('histCount');
  if(!el) return;
  const total=hist.stack.length;
  const pos=hist.cursor+1;
  el.textContent=`Undo: ${total} (pos ${pos}/${total})`;
}

window.hist = hist;
window.collect = collect;
window.persist = persist;
window.persistMeta = persistMeta;
window.loadMeta = loadMeta;
window.snapshot = snapshot;
window.updateHistCounter = updateHistCounter;
