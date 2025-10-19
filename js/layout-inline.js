const inspX=document.getElementById('inspX');
const inspY=document.getElementById('inspY');
const inspW=document.getElementById('inspW');
const inspH=document.getElementById('inspH');
const inspCx=document.getElementById('inspCx');
const inspCy=document.getElementById('inspCy');
const inspPadx=document.getElementById('inspPadx');
const inspApply=document.getElementById('inspApply');

function fillInspectorFields(block){
  if(!inspX||!inspY||!inspW||!inspH||!inspCx||!inspCy||!inspPadx) return;
  if(!block||!block.id){
    inspX.value='';
    inspY.value='';
    inspW.value='';
    inspH.value='';
    inspCx.value='';
    inspCy.value='';
    inspPadx.value='';
    return;
  }
  let layoutData={};
  try{ layoutData=(typeof collect==='function')?collect():{}; }
  catch{ layoutData={}; }
  const entry=layoutData && block.id ? layoutData[block.id] : null;
  if(entry){
    inspX.value = entry.x ?? '';
    inspY.value = entry.y ?? '';
    inspW.value = entry.w ?? '';
    inspH.value = entry.h ?? '';
  } else {
    inspX.value='';
    inspY.value='';
    inspW.value='';
    inspH.value='';
  }
  let metaStore={};
  try{ metaStore=JSON.parse(localStorage.getItem('SQ_BLOCK_META_V1')||'{}')||{}; }
  catch{ metaStore={}; }
  const meta=(block && block.id && metaStore[block.id])||{};
  inspCx.value=meta.cx||'';
  inspCy.value=meta.cy||'';
  inspPadx.value=meta.padx||'';
}

function applyInspectorChanges(){
  if(!inspX||!inspY||!inspW||!inspH) return;
  const baseSel=Array.isArray(window.CURRENT_SELECTION)?window.CURRENT_SELECTION.slice():[];
  let sel=baseSel.filter(id=>typeof id==='string'&&id);
  if(!sel.length&&window.selSet&&window.selSet.size){ sel=Array.from(window.selSet); }
  if(!sel.length&&typeof getSelection==='function'){ sel=getSelection().map(el=>el&&el.id).filter(Boolean); }
  if(!sel.length){ alert('No block selected'); return; }
  const dx=parseInt(inspX.value,10);
  const dy=parseInt(inspY.value,10);
  const dw=parseInt(inspW.value,10);
  const dh=parseInt(inspH.value,10);
  if([dx,dy,dw,dh].some(v=>isNaN(v))) return alert('Enter valid numbers');
  const valid=(v,min,max)=>Math.max(min,Math.min(max,v));
  const xVal=valid(dx,0,17);
  const yVal=valid(dy,0,31);
  const wVal=valid(dw,1,18);
  const hVal=valid(dh,1,32);
  const cxRaw=inspCx&&typeof inspCx.value==='string'?inspCx.value.trim():'';
  const cyRaw=inspCy&&typeof inspCy.value==='string'?inspCy.value.trim():'';
  const padxRaw=inspPadx&&typeof inspPadx.value==='string'?inspPadx.value.trim():'';
  sel.forEach(id=>{
    const blockEl=document.getElementById(id);
    if(!blockEl) return;
    if(typeof place==='function') place(blockEl,xVal,yVal,wVal,hVal);
    else {
      const tileSize=typeof TILE==='function'?TILE():8;
      blockEl.style.left=(xVal*tileSize)+'px';
      blockEl.style.top=(yVal*tileSize)+'px';
      blockEl.style.width=(wVal*tileSize)+'px';
      blockEl.style.height=(hVal*tileSize)+'px';
    }
    const meta={
      cx: cxRaw||undefined,
      cy: cyRaw||undefined,
      padx: padxRaw||undefined
    };
    if(meta.cx!==undefined) blockEl.style.setProperty('--cx', meta.cx);
    else blockEl.style.removeProperty('--cx');
    if(meta.cy!==undefined) blockEl.style.setProperty('--cy', meta.cy);
    else blockEl.style.removeProperty('--cy');
    if(meta.padx!==undefined) blockEl.style.setProperty('--padx', meta.padx);
    else blockEl.style.removeProperty('--padx');
    if(typeof persistMeta==='function') persistMeta(id, {...meta});
  });
  if(typeof snapshot==='function') snapshot();
  const panel=document.getElementById('inspector');
  if(panel&&typeof panel.__updateInspector==='function'){
    try{ panel.__updateInspector(); }
    catch{}
  }
}

if(inspApply) inspApply.onclick=applyInspectorChanges;
(function(){
  // DISABLED duplicate dgGenerate binding (conflict).
  window.__disabledHandlerReport && window.__disabledHandlerReport.push({name:'#dgGenerate', reason:'legacy generator blocked'});
  return;
  const elPrompt=document.getElementById('dgPrompt');
  const elSeed=document.getElementById('dgSeed');
  const btnGen=document.getElementById('dgGenerate');
  const btnRnd=document.getElementById('dgRandom');
  const box=document.getElementById('dgPreview');
  if(!elPrompt || !elSeed || !btnGen || !btnRnd || !box){ return; }

  box.style.backgroundRepeat='no-repeat';
  box.style.backgroundPosition='center';
  box.style.backgroundSize='contain';

  const parseCtx=(()=>{
    try{
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=1;
      return canvas.getContext('2d');
    }catch{return null;}
  })();

  function parseHex(str){
    if(!str) return null;
    const hex=str.replace('#','').trim();
    if(hex.length===3){
      const r=hex.charAt(0);
      const g=hex.charAt(1);
      const b=hex.charAt(2);
      return {
        r:parseInt(r+r,16),
        g:parseInt(g+g,16),
        b:parseInt(b+b,16)
      };
    }
    if(hex.length===6){
      return {
        r:parseInt(hex.slice(0,2),16),
        g:parseInt(hex.slice(2,4),16),
        b:parseInt(hex.slice(4,6),16)
      };
    }
    if(hex.length===8){
      return {
        r:parseInt(hex.slice(0,2),16),
        g:parseInt(hex.slice(2,4),16),
        b:parseInt(hex.slice(4,6),16)
      };
    }
    return null;
  }

  function parseColor(value){
    if(!value) return null;
    const raw=String(value).trim();
    if(!raw) return null;
    if(raw.startsWith('#')){
      return parseHex(raw);
    }
    if(parseCtx){
      try{
        parseCtx.fillStyle='#000';
        parseCtx.fillStyle=raw;
        const normalized=parseCtx.fillStyle;
        if(!normalized) return null;
        if(normalized.startsWith('#')){
          return parseHex(normalized);
        }
        const parts=normalized.match(/\d+(?:\.\d+)?/g);
        if(parts && parts.length>=3){
          return {
            r:Math.round(parseFloat(parts[0])),
            g:Math.round(parseFloat(parts[1])),
            b:Math.round(parseFloat(parts[2]))
          };
        }
      }catch{}
    }
    return null;
  }

  const SPRITES={
    heart:[
      '....rr....rr....',
      '...hrrr..rrrh...',
      '..hrrrrrrrrrrh..',
      '.rrrrrrrrrrrrrr.',
      '.rrrrrrrrrrrrrr.',
      '.rrrrrrrrrrrrrr.',
      '..rrrrrrrrrrrr..',
      '...rrrrrrrrrr...',
      '....rrrrrrrr....',
      '.....rrrrrr.....',
      '......rrrr......',
      '.......rr.......',
      '................',
      '................',
      '................',
      '................'
    ],
    box:[
      'eeeeeeeeeeeeeeee',
      'ebbbbbbbbbbbbbbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbsbe',
      'ebbbbbbbbbbbbbbe',
      'ebbbbbbbbbbbbbbe',
      'ebbbbbbbbbbbbbbe',
      'eeeeeeeeeeeeeeee'
    ]
  };

  function clampColor(v){
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function jitterColor(color, rng){
    if(!color) return null;
    const factor=0.95+rng()*0.1;
    return {
      r:clampColor(color.r*factor),
      g:clampColor(color.g*factor),
      b:clampColor(color.b*factor)
    };
  }

  function lightenColor(color, amount){
    if(!color) return null;
    return {
      r:clampColor(color.r+(255-color.r)*amount),
      g:clampColor(color.g+(255-color.g)*amount),
      b:clampColor(color.b+(255-color.b)*amount)
    };
  }

  function darkenColor(color, amount){
    if(!color) return null;
    return {
      r:clampColor(color.r*(1-amount)),
      g:clampColor(color.g*(1-amount)),
      b:clampColor(color.b*(1-amount))
    };
  }

  function hashString(str){
    let h=2166136261>>>0;
    for(let i=0;i<str.length;i++){
      h^=str.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function mulberry32(a){
    let t=a>>>0;
    return function(){
      t=(t+0x6D2B79F5)>>>0;
      let r=Math.imul(t^(t>>>15), t|1);
      r^=r+Math.imul(r^(r>>>7), r|61);
      return ((r^(r>>>14))>>>0)/4294967296;
    };
  }

  function createCanvas(size){
    if(typeof OffscreenCanvas!=='undefined'){
      try{ return new OffscreenCanvas(size,size); }catch{}
    }
    const canvas=document.createElement('canvas');
    canvas.width=size;
    canvas.height=size;
    return canvas;
  }

  function canvasToDataURL(canvas){
    if(typeof OffscreenCanvas!=='undefined' && canvas instanceof OffscreenCanvas){
      if(typeof canvas.convertToBlob==='function'){
        return canvas.convertToBlob().then(blob=>new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(reader.result);
          reader.onerror=reject;
          reader.readAsDataURL(blob);
        }));
      }
      if(typeof canvas.transferToImageBitmap==='function'){
        const bitmap=canvas.transferToImageBitmap();
        const copy=document.createElement('canvas');
        copy.width=bitmap.width;
        copy.height=bitmap.height;
        const ctx=copy.getContext('2d');
        if(ctx){
          ctx.drawImage(bitmap,0,0);
          return Promise.resolve(copy.toDataURL('image/png'));
        }
      }
    }
    return Promise.resolve(canvas.toDataURL('image/png'));
  }

  function getSpritePalette(name, style, rng){
    if(name==='heart'){
      let base=parseColor(style.getPropertyValue('--red'))||parseColor('#e53935');
      let highlight=parseColor(style.getPropertyValue('--hi'))||parseColor('#ffd7d7');
      if(!highlight && base){ highlight=lightenColor(base,0.35); }
      if(!base){ base={r:229,g:57,b:53}; }
      if(!highlight){ highlight={r:255,g:215,b:215}; }
      return {
        r:jitterColor(base,rng)||base,
        h:jitterColor(highlight,rng)||highlight
      };
    }
    if(name==='box'){
      let fill=parseColor(style.getPropertyValue('--burn1'))||parseColor(style.getPropertyValue('--org'))||parseColor('#c7863b');
      let shadow=parseColor(style.getPropertyValue('--burn2'))||parseColor('#8a5a22');
      let edge=parseColor(style.getPropertyValue('--edge'))||parseColor('#5a3a18');
      if(!fill){ fill={r:199,g:134,b:59}; }
      if(!shadow){ shadow=darkenColor(fill,0.25)||{r:138,g:90,b:34}; }
      if(!edge){ edge=darkenColor(shadow,0.3)||{r:90,g:58,b:24}; }
      return {
        b:jitterColor(fill,rng)||fill,
        s:jitterColor(shadow,rng)||shadow,
        e:jitterColor(edge,rng)||edge
      };
    }
    return {};
  }

  function getBrightColors(style){
    const names=['--hi','--sel','--green','--ylw','--burn1','--org','--red'];
    const colors=[];
    for(const name of names){
      const parsed=parseColor(style.getPropertyValue(name));
      if(parsed){ colors.push(parsed); }
    }
    const fallbackHex=['#ffd93d','#5dff9f','#6bcfff','#ff9bfd'];
    for(const hex of fallbackHex){
      if(colors.length>=2) break;
      const parsed=parseColor(hex);
      if(parsed){ colors.push(parsed); }
    }
    return colors;
  }

  async function renderSprite(key, style, rng){
    const sprite=SPRITES[key];
    if(!sprite) return '';
    const size=16;
    const canvas=createCanvas(size);
    const ctx=canvas.getContext('2d');
    if(!ctx) return '';
    const image=ctx.createImageData(size,size);
    const data=image.data;
    const palette=getSpritePalette(key, style, rng);
    for(let y=0;y<size;y++){
      const row=sprite[y]||'';
      for(let x=0;x<size;x++){
        const idx=(y*size+x)*4;
        const code=row.charAt(x)||'.';
        const color=palette[code];
        if(color){
          data[idx]=color.r;
          data[idx+1]=color.g;
          data[idx+2]=color.b;
          data[idx+3]=255;
        }else{
          data[idx]=0;
          data[idx+1]=0;
          data[idx+2]=0;
          data[idx+3]=0;
        }
      }
    }
    ctx.putImageData(image,0,0);
    return canvasToDataURL(canvas);
  }

  async function renderFallback(style, rng){
    const size=8;
    const canvas=createCanvas(size);
    const ctx=canvas.getContext('2d');
    if(!ctx) return '';
    const colors=getBrightColors(style);
    let colorA=colors[0]||{r:255,g:217,b:61};
    let colorB=colors[1]||colors[0]||{r:93,g:255,b:159};
    colorA=jitterColor({...colorA},rng)||colorA;
    colorB=jitterColor({...colorB},rng)||colorB;
    const image=ctx.createImageData(size,size);
    const data=image.data;
    for(let y=0;y<size;y++){
      for(let x=0;x<Math.ceil(size/2);x++){
        const mirror=size-1-x;
        const idx=(y*size+x)*4;
        const idxMirror=(y*size+mirror)*4;
        const on=rng()<0.45;
        const useA=rng()<0.5;
        const color=useA?colorA:colorB;
        if(on){
          data[idx]=color.r; data[idx+1]=color.g; data[idx+2]=color.b; data[idx+3]=255;
          data[idxMirror]=color.r; data[idxMirror+1]=color.g; data[idxMirror+2]=color.b; data[idxMirror+3]=255;
        }else{
          data[idx]=0; data[idx+1]=0; data[idx+2]=0; data[idx+3]=0;
          data[idxMirror]=0; data[idxMirror+1]=0; data[idxMirror+2]=0; data[idxMirror+3]=0;
        }
      }
    }
    ctx.putImageData(image,0,0);
    return canvasToDataURL(canvas);
  }

  async function generateSpriteURL(prompt, seedValue){
    const promptLower=(prompt||'').toLowerCase();
    const baseSeed=parseInt(seedValue,10);
    const numericSeed=Number.isFinite(baseSeed)?baseSeed:0;
    const finalSeed=(numericSeed^hashString(promptLower))>>>0;
    const rng=mulberry32(finalSeed);
    const style=getComputedStyle(document.body);
    if(promptLower.includes('heart')){
      return renderSprite('heart', style, rng);
    }
    if(promptLower.includes('box')||promptLower.includes('cardboard')){
      return renderSprite('box', style, rng);
    }
    return renderFallback(style, rng);
  }

  async function applyPreview(){
    const prompt=elPrompt.value.trim();
    const seedRaw=parseInt(elSeed.value,10);
    const normalized=Number.isFinite(seedRaw)?seedRaw:0;
    elSeed.value=String(normalized);
    try{
      const url=await generateSpriteURL(prompt, normalized);
      box.style.backgroundImage=url?`url(${url})`:'none';
    }catch(err){
      console.error('Design preview generation failed', err);
    }
  }

  const handleGenerate=async ev=>{
    ev.preventDefault();
    await applyPreview();
  };

  const handleRandom=async ev=>{
    ev.preventDefault();
    const seed=1+Math.floor(Math.random()*1_000_000);
    elSeed.value=String(seed);
    await applyPreview();
  };

  if(btnGen.dataset.bound!=='1'){
    btnGen.dataset.bound='1';
    btnGen.addEventListener('click', handleGenerate);
  }
  if(btnRnd.dataset.bound!=='1'){
    btnRnd.dataset.bound='1';
    btnRnd.addEventListener('click', handleRandom);
  }
})();

(function(){
  let btnGen=document.getElementById('dgGenerate');
  const box=document.getElementById('dgPreview');
  if(!btnGen||!box) return;
  if(btnGen.dataset.boundHeart==='1') return;

  const fresh=btnGen.cloneNode(true);
  btnGen.replaceWith(fresh);
  btnGen=fresh;
  btnGen.dataset.boundHeart='1';

  box.style.backgroundRepeat||='no-repeat';
  box.style.backgroundPosition||='center';
  box.style.backgroundSize||='contain';
  box.style.imageRendering||='pixelated';

  function makeHeartDataURL(){
    const size=16;
    let canvas;
    if(typeof OffscreenCanvas!=='undefined'){
      try{ canvas=new OffscreenCanvas(size,size); }catch{}
    }
    if(!canvas){ canvas=document.createElement('canvas'); }
    canvas.width=size;
    canvas.height=size;
    const ctx=canvas.getContext('2d');
    if(!ctx) return '';
    const image=ctx.createImageData(size,size);
    const data=image.data;
    const rows=[
      '....rr....rr....',
      '...hrrr..rrrh...',
      '..hrrrrrrrrrrh..',
      '.rrrrrrrrrrrrrr.',
      '.rrrrrrrrrrrrrr.',
      '.rrrrrrrrrrrrrr.',
      '..rrrrrrrrrrrr..',
      '...rrrrrrrrrr...',
      '....rrrrrrrr....',
      '.....rrrrrr.....',
      '......rrrr......',
      '.......rr.......',
      '................',
      '................',
      '................',
      '................'
    ];
    const palette={
      r:[0xe5,0x39,0x35],
      h:[0xff,0xd7,0xd7]
    };
    for(let y=0;y<size;y++){
      const row=rows[y]||'';
      for(let x=0;x<size;x++){
        const idx=(y*size+x)*4;
        const code=row.charAt(x);
        const color=palette[code];
        if(color){
          data[idx]=color[0];
          data[idx+1]=color[1];
          data[idx+2]=color[2];
          data[idx+3]=255;
        }else{
          data[idx]=0;
          data[idx+1]=0;
          data[idx+2]=0;
          data[idx+3]=0;
        }
      }
    }
    ctx.putImageData(image,0,0);
    if(canvas instanceof OffscreenCanvas){
      const helper=document.createElement('canvas');
      helper.width=size;
      helper.height=size;
      const hctx=helper.getContext('2d');
      if(!hctx) return '';
      if(typeof canvas.transferToImageBitmap==='function'){
        hctx.drawImage(canvas.transferToImageBitmap(),0,0);
      }else{
        const copy=ctx.getImageData(0,0,size,size);
        hctx.putImageData(copy,0,0);
      }
      return helper.toDataURL('image/png');
    }
    return typeof canvas.toDataURL==='function'?canvas.toDataURL('image/png'):'';
  }

  btnGen.addEventListener('click',()=>{
    const url=makeHeartDataURL();
    if(url){
      box.style.backgroundImage=`url(${url})`;
    }
  });
})();

(function(){
  // DISABLED duplicate dgGenerate binding (conflict).
  window.__disabledHandlerReport && window.__disabledHandlerReport.push({name:'#dgGenerate', reason:'ai hook blocked'});
  return;
  const promptEl=document.getElementById('dgPrompt');
  const seedEl=document.getElementById('dgSeed');
  const genBtn=document.getElementById('dgGenerate');
  const previewBox=document.getElementById('dgPreview');
  if(!promptEl||!seedEl||!genBtn||!previewBox) return;
  if(genBtn.dataset.aiHookBound==='1') return;
  genBtn.dataset.aiHookBound='1';
  genBtn.addEventListener('click',ev=>{
    const prompt=String(promptEl.value||'');
    const seedRaw=parseInt(seedEl.value,10);
    const seed=Number.isFinite(seedRaw)?seedRaw:0;
    if(typeof window.sqGenImage==='function'){
      const applyUrl=url=>{
        if(typeof url==='string'&&url){
          previewBox.style.backgroundImage=`url(${url})`;
          previewBox.textContent='';
          ev.stopImmediatePropagation();
          ev.preventDefault();
        }
      };
      let result;
      try{ result=window.sqGenImage({prompt,seed}); }catch(err){ result=null; }
      if(result&&typeof result.then==='function'){
        result.then(applyUrl).catch(()=>{});
        ev.stopImmediatePropagation();
        ev.preventDefault();
      }else{
        applyUrl(result);
      }
    }else{
      previewBox.textContent='No AI provider configured';
      previewBox.style.backgroundImage='';
    }
  },{capture:true});
})();

(function(){
  const ta=document.getElementById('dgSpriteJson');
  const box=document.getElementById('dgPreview');
  if(!ta||!box) return;
  if(ta.dataset.spritePreviewBound==='1') return;
  ta.dataset.spritePreviewBound='1';

  box.style.backgroundRepeat||='no-repeat';
  box.style.backgroundPosition||='center';
  box.style.backgroundSize||='contain';
  box.style.imageRendering||='pixelated';

  function safeColorToRGBA(input){
    if(!input) return [0,0,0,0];
    const raw=String(input).trim();
    if(!raw) return [0,0,0,0];
    if(raw.toLowerCase()==='transparent') return [0,0,0,0];
    if(raw[0]==='#'){
      let hex=raw.slice(1);
      if(hex.length===3){
        hex=hex.split('').map(ch=>ch+ch).join('');
      }
      if(hex.length===6 && /^[0-9a-f]{6}$/i.test(hex)){
        const num=parseInt(hex,16);
        return [
          (num>>16)&255,
          (num>>8)&255,
          num&255,
          255
        ];
      }
    }
    return [0,0,0,0];
  }

  function renderSprite(data){
    if(!data||typeof data!=='object') throw new Error('Expected object');
    const width=Number(data.w);
    const height=Number(data.h);
    if(!Number.isInteger(width)||width<=0) throw new Error('Invalid width');
    if(!Number.isInteger(height)||height<=0) throw new Error('Invalid height');
    const pixels=data.pixels;
    if(!Array.isArray(pixels)||pixels.length!==height) throw new Error('Invalid pixels');
    const palette=(data.palette&&typeof data.palette==='object')?data.palette:{};

    let canvas; let ctx; let offscreen=false;
    if(typeof OffscreenCanvas!=='undefined'){
      try{
        const off=new OffscreenCanvas(width,height);
        const offCtx=off.getContext('2d');
        if(offCtx){
          canvas=off;
          ctx=offCtx;
          offscreen=true;
        }
      }catch{}
    }
    if(!canvas){
      const el=document.createElement('canvas');
      el.width=width;
      el.height=height;
      const elCtx=el.getContext('2d');
      if(!elCtx) throw new Error('No 2d context');
      canvas=el;
      ctx=elCtx;
    }

    const image=ctx.createImageData(width,height);
    const buf=image.data;
    for(let y=0;y<height;y++){
      const row=String(pixels[y]??'');
      if(row.length!==width) throw new Error('Row width mismatch');
      for(let x=0;x<width;x++){
        const idx=(y*width+x)*4;
        const color=safeColorToRGBA(palette[row[x]]);
        buf[idx]=color[0];
        buf[idx+1]=color[1];
        buf[idx+2]=color[2];
        buf[idx+3]=color[3];
      }
    }
    ctx.putImageData(image,0,0);

    if(offscreen){
      const helper=document.createElement('canvas');
      helper.width=width;
      helper.height=height;
      const hctx=helper.getContext('2d');
      if(!hctx) throw new Error('No helper context');
      if(typeof canvas.transferToImageBitmap==='function'){
        hctx.drawImage(canvas.transferToImageBitmap(),0,0);
      }else{
        hctx.putImageData(image,0,0);
      }
      return helper.toDataURL('image/png');
    }

    return canvas.toDataURL('image/png');
  }

  function handleChange(){
    const text=ta.value;
    if(!text||!text.trim()) return;
    try{
      const parsed=JSON.parse(text);
      const url=renderSprite(parsed);
      if(url){
        box.style.backgroundImage=`url(${url})`;
        box.textContent='';
        box.removeAttribute('title');
      }
    }catch(err){
      console.warn('[SpriteJSON] invalid:', err);
      box.title='Invalid sprite JSON';
    }
  }

  ta.addEventListener('input',handleChange);
  ta.addEventListener('change',handleChange);
  ta.addEventListener('blur',handleChange);

  handleChange();
})();

(()=>{
  const btn=document.getElementById('dgApply');
  const box=document.getElementById('dgPreview');
  if(!btn||!box) return;
  if(btn.dataset.applyBound==='1') return;
  btn.dataset.applyBound='1';

  function extractDataURL(el){
    let bg=(el.style&&el.style.backgroundImage)||'';
    if(!bg){
      const cs=getComputedStyle(el);
      bg=(cs&&cs.backgroundImage)||'';
    }
    const match=bg.match(/url\((['"]?)(data:image\/[a-zA-Z+]+;base64,[^'")]+)\1\)/);
    return match?match[2]:'';
  }

  function getSelectedBlock(){
    if(window.selected&&window.selected.classList&&window.selected.classList.contains('block')) return window.selected;
    const el=document.querySelector('.block.sel');
    if(el) return el;
    return document.querySelector('.block[data-selected="1"]')||null;
  }

  btn.addEventListener('click',()=>{
    const url=extractDataURL(box);
    if(!url||!/^data:image\//.test(url)){
      console.warn('[DesignApply] No preview image to apply');
      return;
    }

    const target=getSelectedBlock();
    if(!target){
      console.warn('[DesignApply] No selected block found (select a block first)');
      return;
    }

    target.style.backgroundImage=`url(${url})`;
    target.style.backgroundRepeat='no-repeat';
    target.style.backgroundPosition='center';
    target.style.backgroundSize='contain';
    target.style.imageRendering='pixelated';

    try{
      target.classList.add('designApplied');
      setTimeout(()=>target.classList.remove('designApplied'),300);
    }catch(e){}

    if(typeof window.snapshot==='function'){
      try{window.snapshot();}catch(e){}
    }
  });

  box.style.backgroundRepeat||='no-repeat';
  box.style.backgroundPosition||='center';
  box.style.backgroundSize||='contain';
  box.style.imageRendering||='pixelated';
})();

(()=>{
  const btn=document.getElementById('tidyTextBtn');
  if(!btn) return;
  if(btn.dataset.bound==='1') return;
  btn.dataset.bound='1';

  btn.addEventListener('click',()=>{
    const blocks=document.querySelectorAll('.block');
    blocks.forEach(el=>{
      if(!el || !(el instanceof HTMLElement)) return;
      const innerHost=el.querySelector('.innerHost')||el;
      let host=innerHost;
      if(typeof window.getTextHost==='function'){
        try{
          const resolved=window.getTextHost(el);
          if(resolved instanceof HTMLElement){ host=resolved; }
        }catch{}
      }
      const textContent=((host.textContent||'').trim())||((innerHost.textContent||'').trim());
      const dataText=(host.getAttribute&&host.getAttribute('data-text'))||(innerHost.getAttribute&&innerHost.getAttribute('data-text'));
      if(!textContent && !dataText) return;

      if(typeof window.applyAlign==='function'){
        try{ window.applyAlign(el,'left','center'); }catch{}
      }

      let usedHelper=false;
      if(typeof window.autoFit==='function'){
        try{ window.autoFit(host, el); usedHelper=true; }catch{}
      }

      if(!usedHelper){
        try{
          host.style.whiteSpace='nowrap';
          host.style.overflow='hidden';
          const r=el.getBoundingClientRect();
          const cs=getComputedStyle(el);
          const padX=parseFloat(cs.getPropertyValue('--padx'))||0;
          const padY=parseFloat(cs.getPropertyValue('--pady'))||0;
          const availW=Math.max(8, r.width-padX*2);
          const availH=Math.max(8, r.height-padY*2);
          let fs=parseFloat(getComputedStyle(host).fontSize)||14;
          while(host.scrollWidth>availW && fs>6){ fs-=0.5; host.style.fontSize=fs+'px'; }
          while(host.scrollHeight>availH && fs>6){ fs-=0.5; host.style.fontSize=fs+'px'; }
          innerHost.style.display='flex';
          innerHost.style.alignItems='center';
          innerHost.style.justifyContent='flex-start';
          if(!(getComputedStyle(el).getPropertyValue('--padx')||'').trim()){
            el.style.setProperty('--padx','4px');
          }
        }catch{}
      }
    });

    if(typeof window.snapshot==='function'){
      try{ window.snapshot(); }catch{}
    }
  });
})();

(()=>{
  const btn=document.getElementById('auditTextBtn');
  if(!btn || btn.dataset.bound==='1') return;
  btn.dataset.bound='1';

  function ensureStyle(){
    if(document.querySelector('style[data-text-audit]')) return;
    const style=document.createElement('style');
    style.setAttribute('data-text-audit','');
    style.textContent='.text-audit { outline: 2px dashed #ff9f43; outline-offset: -3px; }';
    document.head.appendChild(style);
  }

  btn.addEventListener('click',()=>{
    ensureStyle();
    document.querySelectorAll('.text-audit').forEach(n=>n.classList.remove('text-audit'));
    const blocks=document.querySelectorAll('.block');
    const results=[];
    let overflowCount=0;

    blocks.forEach(el=>{
      if(!(el instanceof HTMLElement)) return;
      let inner=null;
      if(typeof window.getTextHost==='function'){
        try{ inner=window.getTextHost(el); }catch(e){ inner=null; }
      }
      if(!(inner instanceof HTMLElement)){
        inner=el.querySelector('.innerHost')||el;
      }
      if(!(inner instanceof HTMLElement)){
        inner=el;
      }

      const text=(inner.textContent||'').trim();
      if(!text){
        return;
      }

      const br=el.getBoundingClientRect();
      const cs=getComputedStyle(el);
      const padx=parseFloat(cs.getPropertyValue('--padx'))||0;
      const pady=parseFloat(cs.getPropertyValue('--pady'))||0;
      const availW=Math.max(8, br.width-2*padx);
      const availH=Math.max(8, br.height-2*pady);
      const innerCS=getComputedStyle(inner);
      const fs0=parseFloat(innerCS.fontSize)||12;

      const clone=inner.cloneNode(true);
      if(clone.removeAttribute){ clone.removeAttribute('id'); }
      clone.style.position='absolute';
      clone.style.visibility='hidden';
      clone.style.pointerEvents='none';
      clone.style.whiteSpace='nowrap';
      clone.style.maxWidth='none';
      clone.style.maxHeight='none';
      clone.style.left='-9999px';
      clone.style.top='-9999px';
      clone.style.fontFamily=innerCS.fontFamily;
      clone.style.fontWeight=innerCS.fontWeight;
      clone.style.fontStyle=innerCS.fontStyle;
      clone.style.letterSpacing=innerCS.letterSpacing;
      clone.style.lineHeight=innerCS.lineHeight;
      clone.style.fontSize=fs0+'px';
      document.body.appendChild(clone);

      let fsFit=fs0;
      let fits=clone.scrollWidth<=availW && clone.scrollHeight<=availH;
      let guard=0;
      while(!fits && fsFit>1 && guard<200){
        fsFit=Math.max(1, fsFit-0.5);
        clone.style.fontSize=fsFit+'px';
        fits=clone.scrollWidth<=availW && clone.scrollHeight<=availH;
        guard++;
      }
      if(!fits && fsFit!==1){
        fsFit=1;
        clone.style.fontSize='1px';
        fits=clone.scrollWidth<=availW && clone.scrollHeight<=availH;
      }
      const fsFitRounded=Number(fsFit.toFixed(2));
      clone.remove();

      const innerOverflow=inner.scrollWidth>availW || inner.scrollHeight>availH;
      const isOverflow=(fs0-fsFitRounded)>0.1 || !fits || innerOverflow;
      if(isOverflow){
        el.classList.add('text-audit');
        overflowCount++;
      }

      results.push({
        id: el.id || '(unnamed)',
        text,
        fsCurrent: Number(fs0.toFixed(2)),
        fsFit: fsFitRounded,
        availW: Math.round(availW),
        availH: Math.round(availH),
        overflow: isOverflow
      });
    });

    console.table(results);
    console.log(`[TextAudit] Blocks scanned: ${results.length}, Overflows: ${overflowCount}`);
  });
})();

(function() {
    const btn = document.getElementById('fitLabelBtn');
    if (!btn) return;
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    function getInner(el) {
      if (!el) return null;
      if (typeof window.getTextHost === 'function') {
        try {
          const h = window.getTextHost(el);
          if (h) return h;
        } catch (e) {}
      }
      return el.querySelector('.innerHost') || el;
    }

    function px(n){ return (Math.round(n*100)/100) + 'px'; }

    btn.addEventListener('click', () => {
      const el = (window.selected && window.selected.classList && window.selected.classList.contains('block'))
        ? window.selected
        : document.querySelector('.block.sel');
      if (!el) { console.warn('[FitLabel] No selected block'); return; }

      const inner = getInner(el);
      if (!inner) { console.warn('[FitLabel] No text host'); return; }

      const text = (inner.textContent || '').trim();
      if (!text) { console.warn('[FitLabel] Empty label'); return; }

      const er = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const padx = parseFloat(cs.getPropertyValue('--padx')) || 0;
      const pady = parseFloat(cs.getPropertyValue('--pady')) || 0;
      const availW = Math.max(8, er.width - 2*padx);
      const availH = Math.max(8, er.height - 2*pady);

      inner.style.whiteSpace = 'nowrap';
      inner.style.overflow = 'hidden';
      inner.style.display = 'flex';
      inner.style.alignItems = 'center';
      inner.style.justifyContent = 'flex-start';
      if (!cs.getPropertyValue('--padx') || cs.getPropertyValue('--padx') === '0px') {
        el.style.setProperty('--padx', '4px');
      }

      const baseCS = getComputedStyle(inner);
      let fs = parseFloat(baseCS.fontSize) || 14;
      const minFS = 6;

      const meas = document.createElement('div');
      meas.textContent = text;
      meas.style.position = 'fixed';
      meas.style.left = '-99999px';
      meas.style.top = '-99999px';
      meas.style.whiteSpace = 'nowrap';
      meas.style.fontFamily = baseCS.fontFamily;
      meas.style.fontWeight = baseCS.fontWeight;
      meas.style.letterSpacing = baseCS.letterSpacing;
      meas.style.lineHeight = baseCS.lineHeight;
      document.body.appendChild(meas);

      function fits(sizePx){
        meas.style.fontSize = px(sizePx);
        const w = meas.scrollWidth;
        const h = Math.max(meas.scrollHeight, sizePx * 1.1);
        return (w <= availW && h <= availH);
      }

      if (!fits(fs)) {
        let hi = fs, lo = minFS;
        while (hi - lo > 0.25) {
          const mid = (hi + lo) / 2;
          if (fits(mid)) lo = mid; else hi = mid;
        }
        fs = Math.max(minFS, Math.floor(lo*100)/100);
      }

      inner.style.fontSize = px(fs);

      document.body.removeChild(meas);

      if (typeof window.snapshot === 'function') {
        try { window.snapshot(); } catch(e){}
      }
    });
  })();

(function(){
    const input = document.getElementById('iconCount');
    if (!input) return;
    if (input.dataset.bound === '1') return;
    input.dataset.bound = '1';

    function supportsIcons(el){
      if (!el) return false;
      const kind = (el.dataset && el.dataset.kind) || '';
      const id = el.id || '';
      if (kind === 'snkr' || kind === 'power') return true;
      if (id === 'hudSneakers' || id === 'hudPowerups') return true;
      return false;
    }

    function getSelectedBlock(){
      if (window.selected && window.selected.classList && window.selected.classList.contains('block')) return window.selected;
      return document.querySelector('.block.sel');
    }

    // Ensure current block has separate label + icons containers
    function ensureSplit(el){
      const inner = (typeof window.getTextHost === 'function' ? (window.getTextHost(el)||null) : null) || el.querySelector('.innerHost') || el;

      let labelHost = inner.querySelector(':scope > .labelHost');
      let iconsHost = inner.querySelector(':scope > .iconsHost');

      if (!labelHost){
        labelHost = document.createElement('span');
        labelHost.className = 'labelHost label txtHost';
        labelHost.style.display = 'inline-block';
        labelHost.style.whiteSpace = 'nowrap';
        labelHost.style.verticalAlign = 'middle';
        inner.insertBefore(labelHost, inner.firstChild || null);
      } else {
        labelHost.classList.add('labelHost');
        labelHost.classList.add('label');
        labelHost.classList.add('txtHost');
      }
      if (!iconsHost){
        iconsHost = document.createElement('span');
        iconsHost.className = 'iconsHost';
        if (labelHost.nextSibling){
          labelHost.after(iconsHost);
        } else {
          inner.appendChild(iconsHost);
        }
      }

      const txtSource = inner.querySelector(':scope > .txtHost');
      if (txtSource && txtSource !== labelHost){
        labelHost.textContent = (txtSource.textContent || '').trim();
        txtSource.remove();
      } else if (!labelHost.textContent){
        const raw = (labelHost.textContent || '').trim();
        if (!raw){
          const fallback = (inner.textContent || '').trim();
          if (fallback) labelHost.textContent = fallback;
        }
      }

      Array.from(inner.childNodes).forEach(node=>{
        if (node === labelHost || node === iconsHost) return;
        if (node.nodeType === Node.TEXT_NODE){
          if (node.textContent && node.textContent.trim()){ labelHost.textContent = node.textContent.trim(); }
          inner.removeChild(node);
          return;
        }
        if (node instanceof HTMLElement){
          iconsHost.appendChild(node);
          return;
        }
        inner.removeChild(node);
      });

      Array.from(iconsHost.children).forEach(child=>{
        if (!(child instanceof HTMLElement)) return;
        if (child.classList.contains('iconToken')) return;
        const tok=document.createElement('span');
        tok.className='iconToken';
        iconsHost.replaceChild(tok, child);
      });
      return { inner, labelHost, iconsHost };
    }

    function setIconCount(iconsHost, n){
      n = Math.max(0, Math.min(8, parseInt(n,10) || 0));
      while (iconsHost.children.length > n) iconsHost.removeChild(iconsHost.lastElementChild);
      while (iconsHost.children.length < n){
        const tok = document.createElement('span');
        tok.className = 'iconToken';
        iconsHost.appendChild(tok);
      }
    }

    function applyCount(){
      const el = getSelectedBlock();
      if (!el) { console.warn('[IconCount] No selected block'); return; }
      if (!supportsIcons(el)) return;
      const { iconsHost } = ensureSplit(el);
      setIconCount(iconsHost, input.value);
      // Refresh preview if available
      if (typeof window.buildPreviewFrom === 'function') { try { window.buildPreviewFrom(el); } catch(e){} }
      // Snapshot if available (one per change)
      if (typeof window.snapshot === 'function') { try { window.snapshot(); } catch(e){} }
    }

    // Bind changes
    input.addEventListener('change', applyCount);
    input.addEventListener('input', function(){
      const el = getSelectedBlock(); if (!el) return;
      if (!supportsIcons(el)) return;
      const { iconsHost } = ensureSplit(el);
      setIconCount(iconsHost, input.value);
      if (typeof window.buildPreviewFrom === 'function') { try { window.buildPreviewFrom(el); } catch(e){} }
    });

    // When opening editor, prefill the field from the selected block (non-invasive patch)
    if (typeof window.openEditor === 'function' && !window._iconCountHook){
      window._iconCountHook = true;
      const orig = window.openEditor;
      window.openEditor = function(el){
        const r = orig.apply(this, arguments);
        try{
          if (supportsIcons(el)){
            const { iconsHost } = ensureSplit(el);
            input.value = iconsHost.children.length;
          } else {
            input.value = 0;
          }
        }catch(e){}
        return r;
      };
    }
  })();

(function(){
  // Capture key events early within the modal editor and keep them from bubbling to global handlers.
  const editorRoot = document.querySelector('.editor');
  if (!editorRoot || editorRoot.dataset.kbGuard === '1') return;
  editorRoot.dataset.kbGuard = '1';

  function isFormTarget(t){
    return t &&
           (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.isContentEditable === true);
  }

  // Use capture to intercept before document keydown logic.
  editorRoot.addEventListener('keydown', function(e){
    if (!isFormTarget(e.target)) return;

    // Keys that should be handled by the field, not the global editor:
    const k = e.key;
    if (k === 'Backspace' || k === 'Delete' ||
        k === 'ArrowLeft' || k === 'ArrowRight' ||
        k === 'ArrowUp'   || k === 'ArrowDown' ||
        k === 'Home'      || k === 'End' ||
        k === 'PageUp'    || k === 'PageDown') {
      // Allow default text editing behavior, but stop bubbling to global hotkeys.
      e.stopPropagation();
    }
  }, true);
})();

(function(){
  const els = {
    iconsX: document.getElementById('iconsX'),
    iconsY: document.getElementById('iconsY'),
    clean: document.getElementById('cleanExtras'),
  };
  if (!els.iconsX || !els.iconsY || els.iconsX.dataset.bound === '1') return;
  els.iconsX.dataset.bound = '1';

  function getSel(){
    if (window.selected && window.selected.classList?.contains('block')) return window.selected;
    return document.querySelector('.block.sel');
  }

  function getInner(el){
    if (!el) return null;
    if (typeof window.getTextHost === 'function'){
      try {
        const h = window.getTextHost(el);
        if (h) return h.closest('.innerHost') || h;
      } catch(e){}
    }
    return el.querySelector('.innerHost') || el;
  }

  function ensureLayers(el){
    const inner = getInner(el);
    if (!inner) return { inner:null, label:null, icons:null };

    try {
      const cs = getComputedStyle(inner);
      if (cs.position === 'static') inner.style.position = 'relative';
    } catch(e){}

    let label = inner.querySelector(':scope > .labelHost');
    if (label && !label.classList.contains('txtHost')) label.classList.add('txtHost');
    if (label && !label.classList.contains('label')) label.classList.add('label');

    if (!label){
      const existing = inner.querySelector(':scope > .txtHost');
      if (existing){
        label = existing;
        label.classList.add('labelHost');
        if (!label.classList.contains('label')) label.classList.add('label');
      } else {
        label = document.createElement('span');
        label.className = 'labelHost label txtHost';
        const fallback = (inner.textContent || '').trim();
        if (fallback) label.textContent = fallback;
      }
    }

    if (!label.parentElement){
      inner.insertBefore(label, inner.firstChild || null);
    }

    let icons = inner.querySelector(':scope > .iconsHost');
    if (!icons){
      icons = document.createElement('span');
      icons.className = 'iconsHost';
    } else if (!icons.classList.contains('iconsHost')){
      icons.classList.add('iconsHost');
    }

    if (!icons.parentElement){
      inner.appendChild(icons);
    }

    if (!label.textContent?.trim()){
      const raw = (inner.textContent || '').trim();
      if (raw) label.textContent = raw;
    }

    return { inner, label, icons };
  }

  function applyIconsPos(el, cx, cy){
    const { icons } = ensureLayers(el);
    if (!icons) return;
    icons.dataset.cx = String(cx);
    icons.dataset.cy = String(cy);
    icons.style.left = cx + '%';
    icons.style.top = cy + '%';
  }

  function readIconsPos(el){
    const { icons } = ensureLayers(el);
    if (!icons) return { cx:50, cy:50 };
    const cx = +(icons.dataset.cx ?? 50);
    const cy = +(icons.dataset.cy ?? 50);
    return { cx, cy };
  }

  function refreshEditorFieldsFromSelection(){
    const el = getSel();
    if (!el) return;
    const { cx, cy } = readIconsPos(el);
    els.iconsX.value = String(cx);
    els.iconsY.value = String(cy);
  }

  function pushPreview(el){
    if (typeof window.buildPreviewFrom === 'function'){
      try { window.buildPreviewFrom(el); } catch(e){}
    }
  }

  function snap(){
    if (typeof window.snapshot === 'function'){
      try { window.snapshot(); } catch(e){}
    }
  }

  function onIconsX(){
    const el = getSel();
    if (!el) return;
    const { cy } = readIconsPos(el);
    applyIconsPos(el, +els.iconsX.value, cy);
    pushPreview(el);
  }

  function onIconsY(){
    const el = getSel();
    if (!el) return;
    const { cx } = readIconsPos(el);
    applyIconsPos(el, cx, +els.iconsY.value);
    pushPreview(el);
  }

  els.iconsX.addEventListener('input', onIconsX);
  els.iconsX.addEventListener('change', function(){ const el = getSel(); if (!el) return; onIconsX(); snap(); });
  els.iconsY.addEventListener('input', onIconsY);
  els.iconsY.addEventListener('change', function(){ const el = getSel(); if (!el) return; onIconsY(); snap(); });

  function doClean(){
    const el = getSel();
    if (!el){ console.warn('[CleanExtras] No selected block'); return; }
    const layer = ensureLayers(el);
    const inner = layer.inner;
    if (!inner) return;
    Array.from(inner.childNodes).forEach(node => {
      if (node === layer.label || node === layer.icons) return;
      if (node.nodeType === Node.ELEMENT_NODE){
        const cls = (node.className || '').toString().toUpperCase();
        if (cls.includes('LABELHOST') || cls.includes('ICONSHOST')) return;
      }
      inner.removeChild(node);
    });
    ensureLayers(el);
    pushPreview(el);
    snap();
  }

  if (els.clean){
    els.clean.addEventListener('click', doClean);
  }

  if (!window.__sep1Patched && typeof window.openEditor === 'function'){
    window.__sep1Patched = true;
    const orig = window.openEditor;
    window.openEditor = function(el){
      const r = orig.apply(this, arguments);
      try {
        if (el) ensureLayers(el);
        refreshEditorFieldsFromSelection();
        if (el) pushPreview(el);
      } catch(e){}
      return r;
    };
  }

  refreshEditorFieldsFromSelection();
})();

(function(){
  if (window.__ix2bBound) return; window.__ix2bBound = true;

  // ---------- Helpers ----------
  function getSel(){
    return document.querySelector('.block.sel') || window.selected || null;
  }
  function getInner(block){
    if (!block) return null;
    return block.querySelector('.innerHost') || block;
  }
  function ensureLayers(block){
    const inner = getInner(block); if (!inner) return {};
    // ensure labelHost
    let label = inner.querySelector(':scope > .labelHost');
    if (!label) {
      label = document.createElement('span');
      label.className = 'labelHost';
      // harvest existing text from any txtHost/label node
      const host = block.querySelector('.txtHost') || block.querySelector('.label') || inner;
      const txt = (host.textContent || '').trim();
      // clear only the text node from host (non-destructive for other elements)
      if (host !== label) host.textContent = '';
      label.textContent = txt || 'LABEL';
      inner.appendChild(label);
    }
    // ensure iconsHost
    let icons = inner.querySelector(':scope > .iconsHost');
    if (!icons) {
      icons = document.createElement('span');
      icons.className = 'iconsHost';
      inner.appendChild(icons);
    }
    // absolute anchoring already in CSS; ensure relative container
    if (getComputedStyle(inner).position === 'static') inner.style.position = 'relative';
    return { inner, label, icons };
  }

  function rebuildIcons(block, count){
    const { icons } = ensureLayers(block);
    if (!icons) return;
    const n = Math.max(0, Math.min(8, parseInt(count||0,10) || 0));
    // rebuild tokens
    if (icons.dataset.count === String(n)) return; // no-op
    icons.innerHTML = '';
    for (let i=0; i<n; i++){
      const t = document.createElement('span');
      t.className = 'iconToken';
      icons.appendChild(t);
    }
    icons.dataset.count = String(n);
  }

  function setIconsPos(block, cx, cy){
    const { icons } = ensureLayers(block);
    if (!icons) return;
    const X = Math.max(0, Math.min(100, Number(cx)));
    const Y = Math.max(0, Math.min(100, Number(cy)));
    icons.style.left = X + '%';
    icons.style.top  = Y + '%';
    icons.dataset.cx = String(X);
    icons.dataset.cy = String(Y);
  }

  function readIconsPos(block){
    const { icons } = ensureLayers(block);
    if (!icons) return { cx:50, cy:50 };
    const cx = +(icons.dataset.cx ?? 50);
    const cy = +(icons.dataset.cy ?? 50);
    return { cx, cy };
  }

  function refreshPreview(block){
    if (typeof window.buildPreviewFrom === 'function') {
      try { window.buildPreviewFrom(block); } catch(e){}
    }
  }
  function snap(){
    if (typeof window.snapshot === 'function') {
      try { window.snapshot(); } catch(e){}
    }
  }

  // ---------- Field bindings ----------
  const iconCount = document.getElementById('iconCount');
  const iconsX    = document.getElementById('iconsX');
  const iconsY    = document.getElementById('iconsY');

  if (!iconCount || !iconsX || !iconsY) {
    console.warn('[IX-2B] Missing editor fields (iconCount/iconsX/iconsY).');
    return;
  }
  if (iconCount.dataset.bound === '1') return;
  iconCount.dataset.bound = '1';
  iconsX.dataset.bound = '1';
  iconsY.dataset.bound = '1';

  // Change handlers
  iconCount.addEventListener('input', () => {
    const b = getSel(); if (!b) return;
    rebuildIcons(b, iconCount.value);
    refreshPreview(b);
  });
  iconCount.addEventListener('change', () => {
    const b = getSel(); if (!b) return;
    rebuildIcons(b, iconCount.value);
    snap(); refreshPreview(b);
  });

  iconsX.addEventListener('input', () => {
    const b = getSel(); if (!b) return;
    setIconsPos(b, iconsX.value, readIconsPos(b).cy);
    refreshPreview(b);
  });
  iconsX.addEventListener('change', () => { const b=getSel(); if(!b) return; setIconsPos(b, iconsX.value, readIconsPos(b).cy); snap(); });

  iconsY.addEventListener('input', () => {
    const b = getSel(); if (!b) return;
    setIconsPos(b, readIconsPos(b).cx, iconsY.value);
    refreshPreview(b);
  });
  iconsY.addEventListener('change', () => { const b=getSel(); if(!b) return; setIconsPos(b, readIconsPos(b).cx, iconsY.value); snap(); });

  // Patch openEditor to prefill fields and normalize layers for the selected block
  if (!window.__ix2bOpenPatched && typeof window.openEditor === 'function') {
    window.__ix2bOpenPatched = true;
    const orig = window.openEditor;
    window.openEditor = function(el){
      const r = orig.apply(this, arguments);
      try {
        const b = el || (document.querySelector('.block.sel') || window.selected);
        if (!b) return r;
        const { icons } = ensureLayers(b);
        // Prefill fields
        iconCount.value = (icons && icons.dataset.count) ? icons.dataset.count : (icons ? icons.children.length : 0);
        const pos = readIconsPos(b);
        iconsX.value = String(pos.cx);
        iconsY.value = String(pos.cy);
      } catch(e){}
      return r;
    };
  }

  console.log('[IX-2B] Icon layer wired for selected block.');
})();

(function(){
  if (window.__ICON_FIX_BOUND) return; window.__ICON_FIX_BOUND = true;

  // --- helpers ---
  function selBlock(){
    return document.querySelector('.block.sel') || window.selected || null;
  }
  function getInner(b){
    return b ? (b.querySelector('.innerHost') || b) : null;
  }
  function ensureLayers(b){
    const inner = getInner(b); if (!inner) return {};
    // label host: do not destroy existing text, only relocate it if needed
    let label = inner.querySelector(':scope > .labelHost');
    if (!label) {
      label = document.createElement('span');
      label.className = 'labelHost';
      // harvest text from existing inner (but DO NOT wipe inner children wholesale)
      const txt = (inner.textContent || '').trim();
      if (txt) label.textContent = txt;
      inner.appendChild(label);
    }
    // icons host
    let icons = inner.querySelector(':scope > .iconsHost');
    if (!icons) {
      icons = document.createElement('span');
      icons.className = 'iconsHost';
      inner.appendChild(icons);
    }
    // default positions only if not already set (0–100%)
    if (!icons.dataset.cx) { icons.dataset.cx = '50'; icons.style.left = '50%'; }
    if (!icons.dataset.cy) { icons.dataset.cy = '70'; icons.style.top  = '70%'; }
    if (!label.dataset.cx) { label.dataset.cx = '50'; label.style.left = '50%'; }
    if (!label.dataset.cy) { label.dataset.cy = '40'; label.style.top  = '40%'; }

    return { inner, label, icons };
  }

  function rebuildIcons(b, count){
    const L = ensureLayers(b); if (!L.icons) return;
    const n = Math.max(0, Math.min(8, parseInt(count||0,10) || 0));
    // Rebuild only if different
    if (L.icons.dataset.count === String(n)) return;
    L.icons.innerHTML = '';
    for (let i=0;i<n;i++){
      const t = document.createElement('span');
      t.className = 'iconToken';
      L.icons.appendChild(t);
    }
    L.icons.dataset.count = String(n);
  }

  // --- bind Icon Count field robustly (by its label text) ---
  function findIconCountInput(){
    const explicit = document.getElementById('iconCount');
    if (explicit) return explicit;
    const rows = document.querySelectorAll('.dgRow');
    for (const row of rows){
      const lbl = row.querySelector('.dgLabel');
      const fld = row.querySelector('.dgField input[type="number"], .dgField input');
      if (lbl && /icon\s*count/i.test(lbl.textContent||'') && fld) return fld;
    }
    return null;
  }

  const iconCount = findIconCountInput();
  if (!iconCount) { console.warn('[ICON-FIX] Icon Count input not found'); return; }
  if (iconCount.dataset.iconFixBound === '1') return;
  iconCount.dataset.iconFixBound = '1';

  function applyCount(){
    const b = selBlock(); if (!b) { console.warn('[ICON-FIX] no selected block'); return; }
    rebuildIcons(b, iconCount.value);
    if (typeof window.buildPreviewFrom === 'function') { try { window.buildPreviewFrom(b); } catch(e){} }
    if (typeof window.snapshot === 'function') { try { window.snapshot(); } catch(e){} }
  }

  iconCount.addEventListener('input', function(){
    const b = selBlock(); if (!b) return;
    rebuildIcons(b, iconCount.value);
    if (typeof window.buildPreviewFrom === 'function') { try { window.buildPreviewFrom(b); } catch(e){} }
  });
  iconCount.addEventListener('change', applyCount);

  // --- patch openEditor so both layers exist and the field reflects current icons ---
  if (typeof window.openEditor === 'function' && !window.__ICON_FIX_OPEN_PATCH){
    window.__ICON_FIX_OPEN_PATCH = true;
    const orig = window.openEditor;
    window.openEditor = function(el){
      const r = orig.apply(this, arguments);
      try {
        const b = el || selBlock(); if (!b) return r;
        const L = ensureLayers(b);
        // set field from current icons child count if dataset not set
        const current = (L.icons && L.icons.dataset.count) ? parseInt(L.icons.dataset.count,10) : (L.icons ? L.icons.children.length : 0);
        iconCount.value = isNaN(current) ? 0 : current;
      } catch(e){}
      return r;
    };
  }

  console.log('[ICON-FIX] Icon Count now renders icons in selected block');
})();

(function(){
  if (window.__tx1Bound) return; window.__tx1Bound = true;

  const sx = document.getElementById('textX');
  const sy = document.getElementById('textY');
  if (!sx || !sy) { console.warn('[TX-1] text sliders not found'); return; }
  if (sx.dataset.bound === '1') return;
  sx.dataset.bound = sy.dataset.bound = '1';

  function selBlock(){
    return document.querySelector('.block.sel') || window.selected || null;
  }
  function innerOf(b){
    return b ? (b.querySelector('.innerHost') || b) : null;
  }
  function ensureLabel(b){
    const inner = innerOf(b); if (!inner) return {};
    let label = inner.querySelector(':scope > .labelHost');
    if (!label){
      label = document.createElement('span');
      label.className = 'labelHost';
      const txt = (inner.textContent || '').trim();
      if (txt) label.textContent = txt;
      inner.appendChild(label);
    }
    if (getComputedStyle(inner).position === 'static') inner.style.position = 'relative';
    return { inner, label };
  }
  function setTextPos(b, xPct, yPct){
    const L = ensureLabel(b); if (!L.label) return;
    const X = Math.max(0, Math.min(100, Number(xPct)));
    const Y = Math.max(0, Math.min(100, Number(yPct)));
    L.label.style.left = X + '%';
    L.label.style.top  = Y + '%';
    L.label.dataset.cx = String(X);
    L.label.dataset.cy = String(Y);
  }
  function readTextPos(b){
    const L = ensureLabel(b); if (!L.label) return {cx:50, cy:50};
    const cx = +(L.label.dataset.cx ?? 50);
    const cy = +(L.label.dataset.cy ?? 50);
    return {cx, cy};
  }
  function refreshPreview(b){
    if (typeof window.buildPreviewFrom === 'function') { try { window.buildPreviewFrom(b); } catch(e){} }
  }
  function snap(){
    if (typeof window.snapshot === 'function') { try { window.snapshot(); } catch(e){} }
  }

  // Bind
  sx.addEventListener('input', () => { const b=selBlock(); if(!b) return; setTextPos(b, sx.value, (readTextPos(b).cy)); refreshPreview(b); });
  sy.addEventListener('input', () => { const b=selBlock(); if(!b) return; setTextPos(b, (readTextPos(b).cx), sy.value); refreshPreview(b); });
  sx.addEventListener('change', () => { const b=selBlock(); if(!b) return; setTextPos(b, sx.value, (readTextPos(b).cy)); snap(); });
  sy.addEventListener('change', () => { const b=selBlock(); if(!b) return; setTextPos(b, (readTextPos(b).cx), sy.value); snap(); });

  // Patch openEditor to preload slider values from the selected block
  if (typeof window.openEditor === 'function' && !window.__tx1OpenPatched){
    window.__tx1OpenPatched = true;
    const orig = window.openEditor;
    window.openEditor = function(el){
      const r = orig.apply(this, arguments);
      try {
        const b = el || selBlock(); if (!b) return r;
        const pos = readTextPos(b);
        sx.value = String(pos.cx);
        sy.value = String(pos.cy);
        refreshPreview(b);
      } catch(e){}
      return r;
    };
  }
})();

(function(){
  if (window.__drag1Bound) return; window.__drag1Bound = true;

  const moveSel = document.getElementById('moveTarget');
  const clampPct = (v)=>Math.max(0, Math.min(100, Number(v)));

  function selBlock(){
    return document.querySelector('.block.sel') || window.selected || null;
  }
  function innerOf(b){
    return b ? (b.querySelector('.innerHost') || b) : null;
  }
  function calcPercentFromRect(node, block){
    if (!node || !block) return null;
    const rect = node.getBoundingClientRect();
    const hostRect = block.getBoundingClientRect();
    if (!hostRect.width || !hostRect.height) return null;
    const cx = clampPct(((rect.left + rect.width / 2) - hostRect.left) / hostRect.width * 100);
    const cy = clampPct(((rect.top + rect.height / 2) - hostRect.top) / hostRect.height * 100);
    return { cx, cy };
  }
  function readNodePercent(node, defX, defY, block){
    if (!node) return { cx: defX, cy: defY };
    let cx = Number(node.dataset && node.dataset.cx);
    let cy = Number(node.dataset && node.dataset.cy);
    if (!Number.isFinite(cx)){
      const left = node.style && node.style.left;
      if (left && left.includes('%')) cx = parseFloat(left);
    }
    if (!Number.isFinite(cy)){
      const top = node.style && node.style.top;
      if (top && top.includes('%')) cy = parseFloat(top);
    }
    if (!Number.isFinite(cx) || !Number.isFinite(cy)){
      const guess = calcPercentFromRect(node, block || selBlock());
      if (guess){
        if (!Number.isFinite(cx)) cx = guess.cx;
        if (!Number.isFinite(cy)) cy = guess.cy;
      }
    }
    if (!Number.isFinite(cx)) cx = defX;
    if (!Number.isFinite(cy)) cy = defY;
    return { cx, cy };
  }
  function setNodePosPercent(node, pctX, pctY){
    if (!node) return;
    const x = clampPct(pctX);
    const y = clampPct(pctY);
    const fx = Math.round(x * 100) / 100;
    const fy = Math.round(y * 100) / 100;
    node.style.position = 'absolute';
    node.style.left = fx + '%';
    node.style.top = fy + '%';
    node.style.transform = 'translate(-50%, -50%)';
    node.dataset.cx = String(fx);
    node.dataset.cy = String(fy);
  }
  function applyNodePos(node, defX, defY, block){
    if (!node) return;
    const pos = readNodePercent(node, defX, defY, block);
    setNodePosPercent(node, pos.cx, pos.cy);
  }

  function ensureTwoLines(b){
    const inner = innerOf(b); if (!inner) return {};
    if (typeof window.ensureInnerHost === 'function'){
      try { window.ensureInnerHost(b); } catch(_){}
    }
    if (getComputedStyle(inner).position === 'static') inner.style.position = 'relative';
    let labelHost = inner.querySelector(':scope > .labelHost');
    if (!labelHost){
      labelHost = document.createElement('span');
      labelHost.className = 'labelHost label txtHost';
      const txt = (inner.textContent || '').trim();
      if (txt) labelHost.textContent = txt;
      inner.insertBefore(labelHost, inner.firstChild || null);
    }
    labelHost.classList.add('labelHost');
    labelHost.style.position = 'absolute';
    labelHost.style.left = labelHost.style.left || '50%';
    labelHost.style.top = labelHost.style.top || '50%';
    labelHost.style.transform = 'translate(-50%, -50%)';
    labelHost.style.width = labelHost.style.width || '100%';
    labelHost.style.height = labelHost.style.height || '100%';
    labelHost.style.pointerEvents = 'none';
    let l1 = labelHost.querySelector(':scope > .labelLine1');
    let l2 = labelHost.querySelector(':scope > .labelLine2');
    if (!l1 || !l2){
      const raw = labelHost.textContent || '';
      const parts = raw.split('\n');
      const t1 = (parts[0] || '').trim();
      const t2 = parts.slice(1).join('\n').trim();
      labelHost.textContent = '';
      l1 = document.createElement('span'); l1.className = 'labelLine labelLine1'; l1.textContent = t1;
      l2 = document.createElement('span'); l2.className = 'labelLine labelLine2'; l2.textContent = t2;
      labelHost.append(l1, l2);
    }
    l1.classList.add('labelLine'); l1.classList.add('labelLine1');
    l2.classList.add('labelLine'); l2.classList.add('labelLine2');

    const blockRectReady = b && b.getBoundingClientRect && b.getBoundingClientRect();
    const needPos1 = !(l1.dataset && l1.dataset.cx !== undefined && l1.dataset.cy !== undefined);
    const needPos2 = !(l2.dataset && l2.dataset.cx !== undefined && l2.dataset.cy !== undefined);
    if ((needPos1 || needPos2) && blockRectReady && blockRectReady.width && blockRectReady.height){
      const guess1 = calcPercentFromRect(l1, b);
      const guess2 = calcPercentFromRect(l2, b);
      if (needPos1 && guess1){ l1.dataset.cx = String(guess1.cx); l1.dataset.cy = String(guess1.cy); }
      if (needPos2 && guess2){ l2.dataset.cx = String(guess2.cx); l2.dataset.cy = String(guess2.cy); }
    }
    l1.style.pointerEvents = 'auto';
    l2.style.pointerEvents = 'auto';
    applyNodePos(l1, 50, 45, b);
    applyNodePos(l2, 50, 55, b);
    return { inner, labelHost, l1, l2 };
  }

  function ensureIcons(b){
    const inner = innerOf(b); if (!inner) return {};
    if (getComputedStyle(inner).position === 'static') inner.style.position = 'relative';
    let icons = inner.querySelector(':scope > .iconsHost');
    if (!icons){
      icons = document.createElement('span');
      icons.className = 'iconsHost';
      inner.appendChild(icons);
    }
    icons.classList.add('iconsHost');
    icons.style.position = 'absolute';
    icons.style.transform = 'translate(-50%, -50%)';
    if (!icons.style.display) icons.style.display = 'flex';
    if (!icons.style.gap) icons.style.gap = '6px';
    if (!(icons.dataset && icons.dataset.cx) || !(icons.dataset && icons.dataset.cy)){
      const guess = calcPercentFromRect(icons, b);
      if (guess){
        icons.dataset.cx = String(guess.cx);
        icons.dataset.cy = String(guess.cy);
      }
    }
    applyNodePos(icons, 50, 70, b);
    return { inner, icons };
  }

  function getLiveTarget(b, kind){
    const L = ensureTwoLines(b);
    const I = ensureIcons(b);
    if (kind === 'line1') return L.l1;
    if (kind === 'line2') return L.l2;
    if (kind === 'icons') return I.icons;
    return null;
  }

  function updateControlInputs(kind, x, y){
    const tx = document.getElementById('textX');
    const ty = document.getElementById('textY');
    const ix = document.getElementById('iconsX');
    const iy = document.getElementById('iconsY');
    const rx = String(Math.round(x));
    const ry = String(Math.round(y));
    if (kind === 'icons'){
      if (ix) ix.value = rx;
      if (iy) iy.value = ry;
    } else {
      if (tx) tx.value = rx;
      if (ty) ty.value = ry;
    }
  }

  function ensureSetup(b){
    if (!b) return;
    ensureTwoLines(b);
    ensureIcons(b);
  }

  function syncSelect(){
    if (!moveSel) return;
    const b = selBlock(); if (!b) return;
    ensureSetup(b);
    const target = getLiveTarget(b, moveSel.value || 'line1');
    if (!target) return;
    const pos = readNodePercent(target, 50, 50, b);
    updateControlInputs(moveSel.value, pos.cx, pos.cy);
  }

  function bindSelect(){
    if (!moveSel || moveSel.dataset.drag1 === '1') return;
    moveSel.dataset.drag1 = '1';
    moveSel.addEventListener('change', ()=>{
      const b = selBlock();
      if (!b) return;
      ensureSetup(b);
      syncSelect();
      const wrap = getPreviewWrap();
      if (!wrap) return;
      wrap.querySelectorAll('.dragTargetHint').forEach(n=>n.classList.remove('dragTargetHint'));
      const pv = findPreviewNode(moveSel.value);
      if (pv){
        pv.classList.add('dragTargetHint');
        setTimeout(()=>{ pv.classList.remove('dragTargetHint'); }, 250);
      }
    });
  }

  function getPreviewWrap(){
    return document.getElementById('previewWrap');
  }
  function getPreviewBlock(){
    const wrap = getPreviewWrap();
    if (!wrap) return null;
    return wrap.querySelector('.block');
  }
  function findPreviewNode(kind){
    const wrap = getPreviewWrap();
    if (!wrap) return null;
    if (kind === 'icons') return wrap.querySelector('.iconsHost');
    if (kind === 'line2') return wrap.querySelector('.labelLine2');
    return wrap.querySelector('.labelLine1');
  }

  let dragging = null;

  function pointerToPercent(e){
    const blockClone = dragging && dragging.previewBlock ? dragging.previewBlock : getPreviewBlock();
    if (!blockClone) return null;
    const rect = blockClone.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const pctX = clampPct((e.clientX - rect.left) / rect.width * 100);
    const pctY = clampPct((e.clientY - rect.top) / rect.height * 100);
    return { pctX, pctY };
  }

  function applyDrag(pctX, pctY){
    if (!dragging) return;
    setNodePosPercent(dragging.liveTarget, pctX, pctY);
    if (dragging.previewTarget) setNodePosPercent(dragging.previewTarget, pctX, pctY);
    updateControlInputs(dragging.mode, pctX, pctY);
  }

  function finishDrag(cancelled){
    if (!dragging) return;
    const { wrap, previewTarget, block, pointerId } = dragging;
    if (previewTarget) previewTarget.classList.remove('dragTargetHint');
    if (wrap && wrap.releasePointerCapture){ try { wrap.releasePointerCapture(pointerId); } catch(_){} }
    dragging = null;
    if (block){
      if (typeof window.buildPreviewFrom === 'function'){
        try { window.buildPreviewFrom(block); } catch(_){}
      }
      if (!cancelled && typeof window.snapshot === 'function'){
        try { window.snapshot(); } catch(_){}
      }
    }
    syncSelect();
  }

  function onPointerDown(e){
    if (e.button !== 0) return;
    const wrap = e.currentTarget;
    const block = selBlock();
    if (!block) return;
    ensureSetup(block);
    const mode = (moveSel && moveSel.value) || 'line1';
    const liveTarget = getLiveTarget(block, mode);
    const previewTarget = findPreviewNode(mode);
    const previewBlock = getPreviewBlock();
    if (!liveTarget || !previewTarget || !previewBlock) return;
    dragging = {
      block,
      mode,
      liveTarget,
      previewTarget,
      wrap,
      previewBlock,
      pointerId: e.pointerId
    };
    previewTarget.classList.add('dragTargetHint');
    if (wrap.setPointerCapture){ try { wrap.setPointerCapture(e.pointerId); } catch(_){} }
    const first = pointerToPercent(e);
    if (first) applyDrag(first.pctX, first.pctY);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function onPointerMove(e){
    if (!dragging) return;
    const pos = pointerToPercent(e);
    if (!pos) return;
    applyDrag(pos.pctX, pos.pctY);
    e.preventDefault();
  }

  function onPointerUp(){
    if (!dragging) return;
    finishDrag(false);
  }

  function onPointerCancel(){
    if (!dragging) return;
    finishDrag(true);
  }

  function bindPreviewDrag(){
    const wrap = getPreviewWrap();
    if (!wrap || wrap.dataset.drag1 === '1') return;
    wrap.dataset.drag1 = '1';
    wrap.addEventListener('pointerdown', onPointerDown, true);
    wrap.addEventListener('pointermove', onPointerMove);
    wrap.addEventListener('pointerup', onPointerUp);
    wrap.addEventListener('pointercancel', onPointerCancel);
  }

  if (typeof window.openEditor === 'function' && !window.__drag1OpenPatched){
    window.__drag1OpenPatched = true;
    const orig = window.openEditor;
    window.openEditor = function(el){
      const block = el || selBlock();
      if (block) ensureSetup(block);
      const r = orig.apply(this, arguments);
      try {
        const b = el || selBlock();
        if (b){
          ensureSetup(b);
          bindPreviewDrag();
          syncSelect();
        }
      } catch(_){}
      return r;
    };
  }

  bindPreviewDrag();
  bindSelect();
  syncSelect();
})();

(function(){
  const btn = document.getElementById('dupBlockBtn');
  if (!btn || btn.dataset.bound === '1') { if(btn) btn.dataset.bound = '1'; return; }
  btn.dataset.bound = '1';

  // Helpers assumed by project; provide fallbacks
  function selBlock(){ return document.querySelector('.block.sel') || window.selected || null; }
  function gridTile(){ return (window.TILE || 8 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s'))||5)); }
  function px(n){ return (Math.round(n*100)/100)+'px'; }

  function uniqueId(base){
    const root = base.replace(/-copy\d+$/,'');
    let i = 1, id;
    do { id = root + '-copy' + i++; } while (document.getElementById(id));
    return id;
  }

  function offsetRect(el, dxTiles, dyTiles){
    const style = getComputedStyle(el);
    const left = el.style.left || style.left;
    const top  = el.style.top  || style.top;
    // If layout is using tile grid via CSS variables, fall back to transform via x/y/w/h attrs
    // Prefer tile snap if available
    const TILE = gridTile();
    const dx = (dxTiles||1) * TILE;
    const dy = (dyTiles||1) * TILE;

    // Use translate via style.left/top if absolute positioning is used
    if (left && top && left.endsWith('px') && top.endsWith('px')) {
      el.style.left = px(parseFloat(left) + dx);
      el.style.top  = px(parseFloat(top)  + dy);
      return;
    }
    // Otherwise use dataset tile coordinates if present
    const x = parseInt(el.dataset.x || '0',10) + (dxTiles||1);
    const y = parseInt(el.dataset.y || '0',10) + (dyTiles||1);
    el.dataset.x = String(x);
    el.dataset.y = String(y);
  }

  function wireIfNeeded(el){
    try {
      if (typeof window.wire === 'function') window.wire(el);
    } catch(e){}
  }
  function focusAndFlash(el){
    try {
      if (typeof window.select === 'function') window.select(el);
      if (typeof window.focusAndFlash === 'function') window.focusAndFlash(el);
      else { el.classList.add('sel'); setTimeout(()=>el.classList.remove('sel'), 250); }
    } catch(e){}
  }
  function snapshot(){
    try { if (typeof window.snapshot === 'function') window.snapshot(); } catch(e){}
  }

  btn.addEventListener('click', function(){
    const src = selBlock();
    if (!src) { console.warn('[duplicate] no selected block'); return; }

    // Create deep clone of the block DOM (including label/icons layers if present)
    const dup = src.cloneNode(true);

    // Assign unique id
    const newId = uniqueId(src.id || 'block');
    if (dup.id) dup.id = newId; else dup.setAttribute('id', newId);

    // Ensure selection class not carried over
    dup.classList.remove('sel');

    // Insert after source in the same parent
    src.parentElement.insertBefore(dup, src.nextSibling);

    // Offset position by 1 tile x/y (or ~8px * --s)
    offsetRect(dup, 1, 1);

    // Rewire interactions for the new element
    wireIfNeeded(dup);

    // Select the duplicate and flash
    focusAndFlash(dup);

    // Commit to history
    snapshot();

    console.log('[duplicate] created:', newId);
  });
})();

(function(){
  if (window.__isz1Bound) return; window.__isz1Bound = true;

  const sizeInput = document.getElementById('iconSize');
  const sizeLabel = document.getElementById('iconSizeVal');
  if (!sizeInput || !sizeLabel) { console.warn('[ISZ-1] Icon Size controls not found'); return; }
  if (sizeInput.dataset.bound === '1') return; sizeInput.dataset.bound = '1';

  function selBlock(){ return document.querySelector('.block.sel') || window.selected || null; }
  function innerOf(b){ return b ? (b.querySelector('.innerHost') || b) : null; }
  function ensureIconsHost(b){
    const inner = innerOf(b); if (!inner) return null;
    let host = inner.querySelector(':scope > .iconsHost');
    if (!host){
      host = document.createElement('span');
      host.className = 'iconsHost';
      inner.appendChild(host);
    }
    return host;
  }
  function setIconSizePx(b, px){
    const host = ensureIconsHost(b); if (!host) return;
    host.style.setProperty('--iconSize', px + 'px');
    host.querySelectorAll('.iconToken').forEach(t=>{
      t.style.width = ''; t.style.height = '';
    });
  }
  function getIconSizePx(b){
    const host = ensureIconsHost(b); if (!host) return 14;
    const v = getComputedStyle(host).getPropertyValue('--iconSize').trim();
    if (v.endsWith('px')) return parseFloat(v) || 14;
    return parseFloat(v) || 14;
  }
  function refreshPreview(b){
    if (typeof window.buildPreviewFrom === 'function') { try { window.buildPreviewFrom(b); } catch(e){} }
  }
  function snap(){
    if (typeof window.snapshot === 'function') { try { window.snapshot(); } catch(e){} }
  }

  sizeInput.addEventListener('input', () => {
    const b = selBlock(); if (!b) return;
    const px = Math.max(8, Math.min(36, parseInt(sizeInput.value,10) || 14));
    setIconSizePx(b, px);
    sizeLabel.textContent = px + 'px';
    refreshPreview(b);
  });
  sizeInput.addEventListener('change', () => {
    const b = selBlock(); if (!b) return;
    const px = Math.max(8, Math.min(36, parseInt(sizeInput.value,10) || 14));
    setIconSizePx(b, px);
    sizeLabel.textContent = px + 'px';
    snap();
  });

  if (typeof window.openEditor === 'function' && !window.__isz1OpenPatched){
    window.__isz1OpenPatched = true;
    const orig = window.openEditor;
    window.openEditor = function(el){
      const r = orig.apply(this, arguments);
      try{
        const b = el || selBlock(); if (!b) return r;
        const px = getIconSizePx(b);
        sizeInput.value = String(Math.round(px));
        sizeLabel.textContent = Math.round(px) + 'px';
        refreshPreview(b);
      }catch(e){}
      return r;
    };
  }
})();

(function(){
  // Remove styles by id if still present
  ['box-rsz-style','prv-rsz-style','diag-rsz-style'].forEach(id=>{
    const n = document.getElementById(id); if (n) n.remove();
  });

  // Remove “Box” option from Move element selector
  const sel = document.getElementById('moveTarget');
  if (sel) {
    const opt = Array.from(sel.options).find(o => o.value === 'box');
    if (opt) sel.removeChild(opt);
  }

  // Clear preview wrappers/handles/diag classes
  const preview = document.querySelector('.editor .preview, .editor .design-preview, .editor .pane .preview, #dgPreview');
  if (preview) {
    preview.classList.remove('pv-diag-outline');
    preview.querySelectorAll('.pv-diag-watermark,.pvHandle').forEach(n=>n.remove());
    const wrap = preview.querySelector(':scope > .pvRszWrap');
    if (wrap) {
      // Move children out of wrap, then remove wrap
      while (wrap.firstChild) preview.appendChild(wrap.firstChild);
      wrap.remove();
    }
  }

  // Clear global flags if they were set
  ['__boxRszBound','__boxRszOpenPatched','__prvRszBound','__diagRSZBound','__diagRSZOpenPatched']
    .forEach(k => { try { if (k in window) delete window[k]; } catch(_){} });

  console.info('[revert] preview-resize & diagnostics removed');
})();

(function(){
    function guardHiddenTabs(){
      const tabsEl=document.getElementById('edTabs');
      if(!tabsEl || tabsEl.dataset.guardHidden==='1') return;
      tabsEl.dataset.guardHidden='1';
      tabsEl.addEventListener('click',function(ev){
        const blocked=ev.target && ev.target.closest && ev.target.closest('.tab.hidden');
        if(blocked){
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
        }
      },true);
    }

    function applyDesignGeneratorFlag(){
      const enabled=!!(FLAGS && FLAGS.designGenerator);
      const tab=document.querySelector('#edTabs .tab[data-tab="design"]');
      const pane=document.getElementById('pane-design');
      if(tab){
        tab.classList.toggle('hidden', !enabled);
        if(!enabled && tab.classList.contains('active')){
          tab.classList.remove('active');
        }
      }
      if(pane){
        const wasActive=pane.classList.contains('active');
        pane.classList.toggle('hidden', !enabled);
        if(!enabled && wasActive){
          pane.classList.remove('active');
        }
      }
      if(!enabled){
        const fallback=document.querySelector('#edTabs .tab:not(.hidden)');
        if(fallback && !fallback.classList.contains('active')){
          fallback.classList.add('active');
          const paneTarget=document.getElementById(`pane-${fallback.dataset.tab}`);
          document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
          if(paneTarget){ paneTarget.classList.add('active'); }
        }
      } else if(enabled && tab && !document.querySelector('#edTabs .tab.active')){
        tab.classList.add('active');
        if(pane){
          document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
          pane.classList.add('active');
        }
      }
    }

    function setupInspector(){
      const btn=document.getElementById('inspectorBtn');
      const panel=document.getElementById('inspector');
      if(!btn || !panel) return;
      const fields={};
      panel.querySelectorAll('[data-field]').forEach(el=>{ fields[el.dataset.field]=el; });
      if(inspApply) inspApply.onclick=applyInspectorChanges;

      function getSelectedBlock(){
        if(window.selected && window.selected.classList && window.selected.classList.contains('block')) return window.selected;
        return document.querySelector('.block.sel');
      }

      function computeMetrics(){
        const defaults={id:'—',kind:'—',x:'—',y:'—',w:'—',h:'—'};
        const sel=getSelectedBlock();
        if(!sel || !(sel instanceof HTMLElement)) return defaults;
        let layoutData=null;
        try{
          layoutData=typeof collect==='function'?collect():null;
        }catch(e){ layoutData=null; }
        const entry=sel.id && layoutData && layoutData[sel.id] ? layoutData[sel.id] : null;
        const tileSize=(typeof TILE==='function' && Number(TILE())) ? Number(TILE()) : 1;
        const rootEl=typeof root!=='undefined' && root && root.getBoundingClientRect ? root : document.getElementById('root');
        const rootRect=rootEl && rootEl.getBoundingClientRect ? rootEl.getBoundingClientRect() : {left:0,top:0};
        const rect=sel.getBoundingClientRect();
        const metrics=entry||{
          k: sel.dataset.kind || null,
          x: Math.round((rect.left-rootRect.left)/tileSize),
          y: Math.round((rect.top-rootRect.top)/tileSize),
          w: Math.round(rect.width/tileSize),
          h: Math.round(rect.height/tileSize)
        };
        return {
          id: sel.id || '(unnamed)',
          kind: sel.dataset.kind || (metrics && metrics.k) || '—',
          x: Number.isFinite(metrics && metrics.x) ? metrics.x : '—',
          y: Number.isFinite(metrics && metrics.y) ? metrics.y : '—',
          w: Number.isFinite(metrics && metrics.w) ? metrics.w : '—',
          h: Number.isFinite(metrics && metrics.h) ? metrics.h : '—'
        };
      }

      function applyMetrics(){
        const info=computeMetrics();
        Object.entries(fields).forEach(([key,el])=>{
          if(el) el.textContent = info[key] ?? '—';
        });
      }

      const updateInspector=()=>{
        applyMetrics();
        try{ fillInspectorFields(getSelectedBlock()); }
        catch{}
      };

      panel.__updateInspector=updateInspector;

      btn.addEventListener('click',()=>{
        panel.classList.toggle('hidden');
        updateInspector();
      });

      function wrapSelect(){
        if(typeof window.select !== 'function') return;
        if(window.select.__inspectorWrapped) return;
        const original=window.select;
        const wrapped=function(){
          const result=original.apply(this, arguments);
          try{ updateInspector(); }catch(e){}
          return result;
        };
        wrapped.__inspectorWrapped=true;
        wrapped.__originalSelect=original;
        window.select=wrapped;
      }

      wrapSelect();
      updateInspector();

      document.addEventListener('keydown',()=>{ if(!panel.classList.contains('hidden')) updateInspector(); });
      document.addEventListener('pointerup',()=>{ if(!panel.classList.contains('hidden')) updateInspector(); });
      document.addEventListener('pointercancel',()=>{ if(!panel.classList.contains('hidden')) updateInspector(); });
      window.addEventListener('resize',()=>{ if(!panel.classList.contains('hidden')) updateInspector(); });
      document.addEventListener('sq-selection-change',()=>{ updateInspector(); });
    }

    function reportAudits(){
      const rows=[];
      const unused=Array.isArray(window.__unusedFunctionReport)?window.__unusedFunctionReport:[];
      const disabled=Array.isArray(window.__disabledHandlerReport)?window.__disabledHandlerReport:[];
      unused.forEach(name=>{ rows.push({name, reason:'UNUSED'}); });
      disabled.forEach(entry=>{
        if(entry && entry.name){
          rows.push({name:entry.name, reason:entry.reason || 'DISABLED'});
        }
      });
      console.table(rows);
    }

    guardHiddenTabs();
    applyDesignGeneratorFlag();

    document.addEventListener('DOMContentLoaded',()=>{
      setupInspector();
      reportAudits();
      try {
        console.assert(typeof FLAGS === 'object', 'FLAGS present');
        console.assert(document.getElementById('inspectorBtn'), 'Inspector button present');
        console.assert(typeof getSelection === 'function' && typeof addToSelection === 'function', 'selection helpers present');
        console.assert(document.getElementById('alignApply') && document.getElementById('distApply'), 'align/distribute controls present');
        console.assert(typeof THEME_PRESETS === 'object', 'theme presets present');
        console.assert(document.getElementById('themeSel'), 'theme selector present');
        console.assert(document.getElementById('helpBtn') && document.getElementById('helpOverlay'), 'help overlay present');
        console.assert(document.querySelector('.tb-file') && document.querySelector('.tb-edit') && document.querySelector('.tb-view'), 'toolbar groups present');
        console.assert(document.getElementById('export') && document.getElementById('alignApply') && document.getElementById('snapToggle'), 'key controls present');
        console.assert(typeof readSavedLayouts === 'function' && typeof writeSavedLayouts === 'function', 'saved layout I/O present');
        console.assert(document.getElementById('layoutSel'), 'layouts UI present');
      } catch {}
    });
  })();
  try{
    console.assert(typeof applyInspectorChanges==='function','inspector edit apply');
    console.assert(document.getElementById('inspX') && document.getElementById('inspApply'),'inspector inputs present');
  }catch{}
