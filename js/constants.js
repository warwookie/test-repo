const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let root = null;
let board = null;
let ctrl = null;
let gridEl = null;
let appRoot = null;

Object.defineProperty(window, 'root', { get: () => root, set: v => { root = v; } });
Object.defineProperty(window, 'board', { get: () => board, set: v => { board = v; } });
Object.defineProperty(window, 'ctrl', { get: () => ctrl, set: v => { ctrl = v; } });
Object.defineProperty(window, 'gridEl', { get: () => gridEl, set: v => { gridEl = v; } });
Object.defineProperty(window, 'appRoot', { get: () => appRoot, set: v => { appRoot = v; } });

const TILE = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--s')) * 8;
const px = n => Math.round(n) + 'px';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const EXPORT_VERSION = 'sq-ui-v1';
const THEME_KEY = 'SQ_THEME_V1';
const THEME_CLASS_PREFIX = 'theme-';
const GRID_KEY = 'SQ_GRID_V1';
const META_KEY = 'SQ_BLOCK_META_V1';
const SNAP_INNER_KEY = 'SQ_INNER_SNAP_V1';
const STORAGE_KEY = 'SQ_LIVE_LAYOUT_STRICT_V1';
const UNDO_MAX = 20;

function getTheme(){ return localStorage.getItem(THEME_KEY)||'midnight'; }
function applyTheme(name){
  const body=document.body;
  body.className = body.className.split(/\s+/).filter(c=>!c.startsWith(THEME_CLASS_PREFIX)).join(' ').trim();
  if(name) body.classList.add(THEME_CLASS_PREFIX + name);
}
function setTheme(name){ localStorage.setItem(THEME_KEY,name); applyTheme(name); }

const REQUIRED_IDS=['title','board','ctrlZone','hudSneakers','hudPowerups','hudLife','hudScore','hudTimer','statBoxes','statFires','joyStick','btnBombBar','btnPause'];
const STRICT_LAYOUT={
  title:{k:'title',x:0,y:0,w:18,h:2},
  board:{k:'_board',x:1,y:3,w:16,h:14},
  ctrlZone:{k:'_ctrl',x:1,y:24,w:16,h:8},
  hudSneakers:{k:'snkr',x:1,y:18,w:8,h:2},
  hudPowerups:{k:'power',x:9,y:18,w:8,h:2},
  hudLife:{k:'life',x:1,y:21,w:5,h:2},
  hudScore:{k:'score',x:7,y:21,w:6,h:2},
  hudTimer:{k:'timer',x:14,y:21,w:4,h:2},
  statBoxes:{k:'stat',x:1,y:24,w:6,h:2},
  statFires:{k:'stat',x:1,y:26,w:6,h:2},
  joyStick:{k:'joystick',x:12,y:24,w:4,h:4},
  btnBombBar:{k:'bombbar',x:1,y:30,w:11,h:2},
  btnPause:{k:'pause',x:14,y:30,w:3,h:2}
};

const PRESETS = {
  strictDefault: function(){
    return JSON.parse(JSON.stringify(STRICT_LAYOUT));
  },
  compactHUD: function(){
    const L = JSON.parse(JSON.stringify(STRICT_LAYOUT));
    L.hudSneakers.y = 19; L.hudSneakers.w = 7;
    L.hudPowerups.y = 19; L.hudPowerups.x = 8; L.hudPowerups.w = 10;
    L.hudScore.y = 22; L.hudScore.x = 6; L.hudScore.w = 6;
    L.hudTimer.y = 22; L.hudTimer.x = 13; L.hudTimer.w = 5;
    L.statBoxes.y = 24; L.statBoxes.x = 1;
    L.statFires.y = 24; L.statFires.x = 7;
    return L;
  },
  wideHUD: function(){
    const L = JSON.parse(JSON.stringify(STRICT_LAYOUT));
    L.hudSneakers = {k:'snkr', x:1,  y:19, w:6,  h:2};
    L.hudPowerups = {k:'power', x:7,  y:19, w:6,  h:2};
    L.hudLife     = {k:'life', x:13, y:19, w:5,  h:2};
    L.hudScore.y = 22; L.hudScore.x = 6;  L.hudScore.w = 6;
    L.hudTimer.y = 22; L.hudTimer.x = 14; L.hudTimer.w = 4;
    return L;
  }
};

const MAKE_TO_ID={ '_board':'board','_ctrl':'ctrlZone','title':'title','snkr':'hudSneakers','power':'hudPowerups','life':'hudLife','score':'hudScore','timer':'hudTimer','bombbar':'btnBombBar','joystick':'joyStick','statBoxes':'statBoxes','statFires':'statFires','pause':'btnPause' };
const KIND_FOR={ 'board':'_board','ctrlZone':'_ctrl','title':'title','hudSneakers':'snkr','hudPowerups':'power','hudLife':'life','hudScore':'score','hudTimer':'timer','btnBombBar':'bombbar','joyStick':'joystick','statBoxes':'stat','statFires':'stat','btnPause':'pause' };

window.$ = $;
window.$$ = $$;
window.TILE = TILE;
window.px = px;
window.clamp = clamp;
window.EXPORT_VERSION = EXPORT_VERSION;
window.THEME_KEY = THEME_KEY;
window.THEME_CLASS_PREFIX = THEME_CLASS_PREFIX;
window.GRID_KEY = GRID_KEY;
window.META_KEY = META_KEY;
window.SNAP_INNER_KEY = SNAP_INNER_KEY;
window.STORAGE_KEY = STORAGE_KEY;
window.UNDO_MAX = UNDO_MAX;
window.getTheme = getTheme;
window.applyTheme = applyTheme;
window.setTheme = setTheme;
window.REQUIRED_IDS = REQUIRED_IDS;
window.STRICT_LAYOUT = STRICT_LAYOUT;
window.PRESETS = PRESETS;
window.MAKE_TO_ID = MAKE_TO_ID;
window.KIND_FOR = KIND_FOR;
