// Living Room — a free-roam sandbox across pixel-art rooms.
// World coordinates are in pixels of the current room's map image.

// Each room: its map, walkable floor (rectangles her whole footprint must stay
// inside), furniture she can't walk through, couch seats, and doors. Rooms are
// drawn at different scales, so `scale` sizes the characters to match.
// A door's (x, y) is where the button prompt shows up; `spawn` is where you
// appear when you come into this room through that door.
const ROOMS = {
  apartment: {
    id: 'apartment',
    src: 'assets/apartment.jpg',
    w: 1536,
    h: 1024,
    scale: 1,
    floor: [
      { name: 'main room', x: 215, y: 228, w: 1047, h: 518 },
      { name: 'living room by the rug', x: 215, y: 740, w: 485, h: 148 },
      { name: 'by the left door', x: 700, y: 740, w: 108, h: 60 },
      { name: 'hall', x: 1045, y: 740, w: 105, h: 225 },
      { name: 'by the right door', x: 1150, y: 740, w: 112, h: 60 },
    ],
    obstacles: [
      { name: 'tv stand', x: 275, y: 170, w: 253, h: 98 },
      { name: 'shelf', x: 538, y: 140, w: 129, h: 125 },
      { name: 'plant stand', x: 1132, y: 190, w: 60, h: 72 },
      { name: 'floor cushion', x: 205, y: 388, w: 70, h: 82 },
      { name: 'plants by the window', x: 205, y: 520, w: 23, h: 180 },
      { name: 'sofa', x: 228, y: 612, w: 469, h: 230 },
      { name: 'sofa chaise', x: 230, y: 495, w: 142, h: 120 },
      { name: 'kitchen island', x: 815, y: 340, w: 195, h: 408 },
      { name: 'stool (top)', x: 748, y: 385, w: 70, h: 115 },
      { name: 'stool (bottom)', x: 748, y: 528, w: 70, h: 114 },
    ],
    // (x, y) is where her hips rest; `approach` is the floor spot she sits down
    // from and stands back up to. `dog` is where the dog lies next to her
    // (`ground` is where it jumps up from).
    seats: [
      {
        x: 425, y: 712, view: 'back', approach: { x: 425, y: 588 },
        dog: { x: 488, y: 722, flip: true, ground: { x: 488, y: 588 } },
      },
      {
        x: 525, y: 712, view: 'back', approach: { x: 525, y: 588 },
        dog: { x: 588, y: 722, flip: true, ground: { x: 588, y: 588 } },
      },
      {
        x: 622, y: 712, view: 'back', approach: { x: 622, y: 588 },
        dog: { x: 560, y: 722, flip: false, ground: { x: 560, y: 588 } },
      },
      {
        // The chaise end of the couch, facing the kitchen
        x: 300, y: 590, view: 'right', approach: { x: 398, y: 568 },
        dog: { x: 300, y: 532, flip: false, ground: { x: 398, y: 520 } },
      },
    ],
    doors: [
      {
        to: 'bedroom', label: 'ENTER', prompt: 'enter the bedroom',
        x: 772, y: 262, range: 80,
        spawn: { x: 772, y: 272, facing: Math.PI / 2 },
      },
      {
        // The front door: only opens when the dog needs to go out
        to: 'yard', label: 'WALK', prompt: 'take the dog out',
        x: 752, y: 775, range: 85,
        spawn: { x: 752, y: 765, facing: -Math.PI / 2 },
        when: () => walk.warning > 0,
      },
    ],
  },
  bedroom: {
    id: 'bedroom',
    src: 'assets/bedroom.jpg',
    w: 1128,
    h: 1255,
    scale: 1.35,
    floor: [
      { name: 'floor', x: 155, y: 300, w: 870, h: 715 },
      { name: 'by the door', x: 700, y: 1000, w: 200, h: 45 },
    ],
    obstacles: [
      { name: 'bed', x: 255, y: 200, w: 395, h: 475 },
      { name: 'nightstand', x: 135, y: 240, w: 120, h: 80 },
      { name: 'pouf', x: 145, y: 378, w: 110, h: 112 },
      { name: 'dresser', x: 650, y: 180, w: 250, h: 160 },
      { name: 'desk', x: 905, y: 185, w: 135, h: 115 },
      { name: 'beanbag', x: 905, y: 300, w: 125, h: 132 },
      { name: 'terrarium', x: 112, y: 668, w: 116, h: 110 },
      { name: 'tv stand', x: 228, y: 900, w: 407, h: 135 },
      { name: 'plant (left)', x: 125, y: 905, w: 110, h: 120 },
      { name: 'mirror', x: 922, y: 808, w: 128, h: 160 },
      { name: 'plant (right)', x: 918, y: 945, w: 107, h: 105 },
    ],
    seats: [
      {
        // Foot of the bed, facing the viewer
        x: 452, y: 668, view: 'front', approach: { x: 452, y: 712 },
        dog: { x: 560, y: 655, flip: true, ground: { x: 560, y: 712 } },
      },
    ],
    doors: [
      {
        to: 'apartment', label: 'EXIT', prompt: 'go back out',
        x: 800, y: 985, range: 110,
        spawn: { x: 800, y: 965, facing: -Math.PI / 2 },
      },
    ],
  },
  yard: {
    id: 'yard',
    src: 'assets/yard.jpg',
    w: 1536,
    h: 1024,
    scale: 1.1,
    floor: [{ name: 'grass', x: 20, y: 40, w: 1262, h: 965 }],
    obstacles: [{ name: 'bin', x: 1200, y: 300, w: 78, h: 76 }],
    seats: [],
    doors: [
      {
        // No button: walking off the left edge after cleaning up takes you in
        to: 'apartment', auto: true, x: 0, y: 0, range: 0,
        spawn: { x: 150, y: 520, facing: 0 },
      },
    ],
  },
};
for (const rm of Object.values(ROOMS)) {
  rm.img = new Image();
  rm.img.src = rm.src;
}
let room = ROOMS[window.claude?.hot?.data?.room] ?? ROOMS.apartment;

// The character you're not playing waits where you left them. Kiss them until
// the bar fills and you swap: you play as them, and they wait in your place.
const partner = {
  who: 'him',
  room: 'apartment',
  x: 1132, // in the kitchen, between the island and the counters
  y: 478,
  gait: 0,
  running: false,
};
const PARTNER_RANGE = 95; // how close you need to be to kiss them

function partnerBox() {
  return { name: 'partner', x: partner.x - 20, y: partner.y - 16, w: 40, h: 24 };
}

const SIT_RANGE = 80;

// Reading: spam the action button to fill the bar and finish a chapter.
const READ_DECAY = 0.08; // bar drains this much per second when you stop
const CHAPTER_POP_TIME = 1.8; // seconds "Chapter Complete" stays up

const PLAYER_RADIUS = 20; // footprint around her feet
const WALK_SPEED = 165; // map px per second: an easy walking pace
const RUN_SPEED = 310;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');


const saved = window.claude?.hot?.data?.player;
const player = {
  x: 600,
  y: 440,
  facing: saved?.facing ?? Math.PI / 2, // radians; starts facing down, toward the viewer
  who: 'her', // which character you're playing
  walkTime: 0,
  seat: null, // one of the room's seats while sitting
  stride: 0, // distance walked, drives stepping when walking up or down
  gait: 0, // stride cycles walked, drives the side-on walk
  running: false,
  moveDx: 0, // direction of the last step
  moveDy: 0,
  idleTime: 0, // how long she's been standing still
  wave: 0, // countdown while waving at him
  cheer: 0, // countdown for the happy pose after a full kiss bar
  nearHim: false,
};
// Pick up where she was after a live update, if that spot is still on the floor.
if (saved && isFree(saved.x, saved.y)) {
  player.x = saved.x;
  player.y = saved.y;
}

function loadChapters() {
  try {
    return Number(localStorage.getItem('chaptersRead')) || 0;
  } catch {
    return 0;
  }
}
function saveChapters(n) {
  try {
    localStorage.setItem('chaptersRead', String(n));
  } catch {
    // Storage blocked; the count just won't survive a reload.
  }
}

function loadCount(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function saveCount(key, n) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    // Storage blocked; the count just won't survive a reload.
  }
}

const reading = {
  levels: loadCount('levelsCleared'), // his video game levels
  progress: 0, // 0..1
  chapters: window.claude?.hot?.data?.chapters ?? loadChapters(),
  popTime: 0, // counts down while "Chapter Complete" shows
  flipTime: 0, // page-flip animation after each press
  sinceTurn: 0, // seconds since the last page turn
};

window.claude?.hot?.snapshot?.(() => ({
  room: room.id,
  player: { x: player.x, y: player.y, facing: player.facing },
  chapters: reading.chapters,
}));

const keys = new Set();
const touchDirs = new Set();
let showHitboxes = false;
let runToggle = false;
let scale = 1; // camera zoom: screen px per map px
let viewW = 0; // size of the game view in CSS px
let viewH = 0;
// Camera: how much of the room fits across the screen's shorter side (map px,
// times the room's scale), and where it's looking.
const VIEW_SPAN = 560;
const cam = { x: 0, y: 0, snap: true };
const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

// ---- Input ---------------------------------------------------------------

const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const ACTION_KEYS = ['KeyE', 'Space', 'Enter'];
// Talking has its own key (and button) so it never gets mixed up with
// sitting down when the other person is next to the couch.
const TALK_KEYS = ['KeyT', 'KeyQ'];

window.addEventListener('keydown', (e) => {
  if (ff.active) {
    // Forest Falls has the keyboard: jump is read from held keys, attack and quit here
    e.preventDefault();
    if (e.code === 'Escape') ffClose();
    else if (['KeyE', 'KeyX', 'KeyJ', 'Enter'].includes(e.code) && !e.repeat) ff.attackQueued = true;
    else if (['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyK'].includes(e.code) && !e.repeat) {
      ffPressJump(); // a quick tap can land between frames, so press on keydown
      ff.jumpWas = true;
    }
    keys.add(e.code);
    return;
  }
  if (e.code === 'KeyH' && !e.repeat) showHitboxes = !showHitboxes;
  if (dialogue.menu && ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) {
    e.preventDefault();
    moveChoice(e.code === 'ArrowUp' || e.code === 'KeyW' ? -1 : 1);
    return;
  }
  if (ACTION_KEYS.includes(e.code)) {
    e.preventDefault();
    if (!e.repeat) action(); // holding doesn't count; you have to mash it
    return;
  }
  if (TALK_KEYS.includes(e.code)) {
    e.preventDefault();
    if (!e.repeat) talkAction();
    return;
  }
  if (KEY_DIRS[e.code] || e.code.startsWith('Shift')) e.preventDefault();
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

document.querySelectorAll('#dpad button').forEach((btn) => {
  const dir = btn.dataset.dir;
  const press = (e) => {
    e.preventDefault();
    if (dialogue.menu && (dir === 'up' || dir === 'down')) moveChoice(dir === 'up' ? -1 : 1);
    touchDirs.add(dir);
    btn.classList.add('active');
  };
  const release = (e) => {
    e.preventDefault();
    touchDirs.delete(dir);
    btn.classList.remove('active');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('pointerleave', release);
});

const runBtn = document.getElementById('run');
runBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (ff.active) {
    ff.touchJump = true; // it's the JUMP button in Forest Falls
    return;
  }
  runToggle = !runToggle;
  runBtn.setAttribute('aria-pressed', String(runToggle));
});

for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  runBtn.addEventListener(ev, () => {
    ff.touchJump = false;
  });
}

const talkBtn = document.getElementById('talk');
talkBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  talkBtn.classList.add('active');
  talkAction();
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  talkBtn.addEventListener(ev, () => talkBtn.classList.remove('active'));
}

const actionBtn = document.getElementById('action');
actionBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  actionBtn.classList.add('active');
  action();
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  actionBtn.addEventListener(ev, () => actionBtn.classList.remove('active'));
}

// Tapping or clicking the room while seated also turns pages.
canvas.addEventListener('pointerdown', (e) => {
  if (dialogue.active) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const hit = choiceAt(e.clientX - r.left, e.clientY - r.top);
    if (hit >= 0) chooseOption(hit);
    else advanceDialogue();
  } else if (book.active) {
    e.preventDefault();
    bookPointerDown(e);
  } else if (ff.active) {
    e.preventDefault();
    ffPointerDown(e);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (book.active) bookPointerMove(e);
});
for (const ev of ['pointerup', 'pointercancel']) {
  canvas.addEventListener(ev, () => {
    book.dragging = false;
  });
}

function heldDirs() {
  const dirs = new Set(touchDirs);
  for (const code of keys) if (KEY_DIRS[code]) dirs.add(KEY_DIRS[code]);
  return dirs;
}

// ---- Collision -----------------------------------------------------------

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function isFree(x, y, ignorePartner = false) {
  const r = PLAYER_RADIUS * room.scale;
  // Edges of her footprint all have to be on the floor
  const onFloor = (px, py) => room.floor.some((a) => px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h);
  if (![[x, y], [x - r, y], [x + r, y], [x, y - r], [x, y + r]].every(([px, py]) => onFloor(px, py))) return false;
  if (!ignorePartner && partner.room === room.id && circleHitsRect(x, y, r, partnerBox())) return false;
  if (room.id === 'yard' && walk.phase !== 'clean' && x - r < 110) return false;
  return !room.obstacles.some((o) => circleHitsRect(x, y, r, o));
}

// ---- Sitting and reading ---------------------------------------------------

function nearestSeat() {
  let best = null;
  let bestDist = SIT_RANGE;
  for (const seat of room.seats) {
    if (partner.seat === seat && partner.room === room.id) continue;
    const d = Math.hypot(player.x - seat.approach.x, player.y - seat.approach.y);
    if (d < bestDist) {
      best = seat;
      bestDist = d;
    }
  }
  return best;
}

// ---- Doors ---------------------------------------------------------------

const FADE_TIME = 0.25; // seconds to fade out, and again to fade back in
const fade = { t: 0, door: null }; // t counts up through out + in while a door is used

function nearestDoor() {
  if (player.seat) return null;
  return room.doors.find((d) => !d.auto && (!d.when || d.when()) && Math.hypot(player.x - d.x, player.y - d.y) < d.range * room.scale) ?? null;
}

function useDoor(door) {
  if (fade.door) return;
  if (door.to === 'yard') walk.warning = 0; // made it: the timer stops
  if (door.to === 'yard' && together.mode) endTogether(); // the dog walk is just you
  fade.door = door;
  fade.t = 0;
  player.walkTime = 0;
}

// Swap rooms at the darkest point of the fade.
function arriveThrough(door) {
  const from = room.id;
  room = ROOMS[door.to];
  const entry = room.doors.find((d) => d.to === from) ?? room.doors[0]; // from the bedroom straight out to the yard
  player.x = entry.spawn.x;
  player.y = entry.spawn.y;
  player.facing = entry.spawn.facing;
  player.walkTime = 0;
  // The dog comes through right behind her.
  dog.x = player.x - Math.cos(player.facing) * 45 * room.scale;
  dog.y = player.y - Math.sin(player.facing) * 45 * room.scale;
  dog.state = 'follow';
  dog.hop = null;
  dog.walkTime = 0;
  trail.length = 0;
  hearts.length = 0;
  kiss.progress = 0;
  if (room.id === 'yard') startWalk();
  if (from === 'yard') endWalk();
  if (together.mode) {
    // Through the door together
    partner.room = room.id;
    partner.x = player.x;
    partner.y = player.y;
  }
  resize();
  cam.snap = true;
}

function updateFade(dt) {
  if (!fade.door) return;
  const before = fade.t;
  fade.t += dt;
  if (before < FADE_TIME && fade.t >= FADE_TIME) {
    if (fade.door.fn) fade.door.fn(); // not a door: something set up behind the fade
    else arriveThrough(fade.door);
  }
  if (fade.t >= FADE_TIME * 2) fade.door = null;
}

// T / TALK: start a chat, or move it on like E does.
function talkAction() {
  if (dialogue.active) advanceDialogue();
  else if (canKiss() && !fade.door && !book.active && performance.now() - dialogue.endedAt > TALK_GRACE) startTalk();
}

function action() {
  if (dialogue.active) {
    advanceDialogue();
    return;
  }
  // Extra presses right after a chat ends don't sit you down or open a door.
  if (performance.now() - dialogue.endedAt < TALK_GRACE) return;
  if (fade.door || book.active) return;
  if (player.seat) {
    if (cuddle.active) cuddleKiss();
    else if (ff.active) ff.attackQueued = true; // HIT in Forest Falls
    return;
  }
  if (together.mode) {
    const door = nearestDoor();
    if (door) useDoor(door);
    else endTogether();
    return;
  }
  if (nearPoop()) {
    pickUpPoop();
    return;
  }
  if (nearBin()) {
    throwBag();
    return;
  }
  const door = nearestDoor();
  if (door) {
    useDoor(door);
    return;
  }
  const seat = nearestSeat();
  if (seat) {
    player.seat = seat;
    player.walkTime = 0;
    reading.progress = 0;
    if (gamesHere()) ffOpen();
    else openBook();
  }
}

// He plays video games on the living-room TV instead of reading there.
function gamesHere() {
  return player.who === 'him' && room.id === 'apartment';
}
function isGaming() {
  return !!player.seat && gamesHere() && !cuddle.active;
}

function standUp(dx, dy) {
  if (ff.active) {
    ff.active = false;
    runBtn.textContent = 'RUN';
  }
  const seat = player.seat;
  player.seat = null;
  if (cuddle.active) endCuddle();
  player.x = seat.approach.x;
  player.y = seat.approach.y;
  player.facing = Math.atan2(dy, dx);
  reading.progress = 0;
}

function updateActionButton() {
  let label = '';
  if (player.seat) label = cuddle.active ? 'KISS' : isGaming() ? 'HIT' : 'READ';
  else if (together.mode) label = nearestDoor()?.label ?? (together.mode === 'piggy' ? 'HOP OFF' : 'LET GO');
  else if (nearPoop()) label = 'PICK UP';
  else if (nearBin()) label = 'TRASH';
  else if (nearestDoor()) label = nearestDoor().label;
  else if (nearestSeat()) label = 'SIT';
  if (fade.door || book.active) label = '';
  if (dialogue.active) label = 'NEXT';
  if (actionBtn.textContent !== label) actionBtn.textContent = label;
  actionBtn.disabled = !label;
  talkBtn.disabled = dialogue.active || !canKiss() || !!fade.door || book.active;
}

// ---- TV --------------------------------------------------------------------
// The living-room TV shows the map's own still picture, and mirrors the Forest
// Falls game while he's playing it.
const TV = { x: 293, y: 137, w: 210, h: 71 }; // the screen on the map

function drawTv() {
  if (!ff.active) return;
  const h = TV.h;
  const w = Math.min(TV.w, h * (FF_W / FF_H));
  ctx.fillStyle = '#05070a';
  ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ffCanvas, TV.x + (TV.w - w) / 2, TV.y, w, h);
  ctx.imageSmoothingEnabled = true;
}

// ---- Forest Falls: the video game on the TV --------------------------------
// When he sits down on the living-room couch he plays a real side-scrolling
// platformer, built from the Forest Falls sprite sheet (assets/forest.png for
// sprites and tiles, assets/forest-bg.jpg for backgrounds and screens). It runs
// on its own 480 x 270 canvas, shown full screen and mirrored on the room's TV.
//
// Controls: left/right to run, jump (Space, Up, W or the JUMP button) and
// attack (E, X or the HIT button). Stomp or slash slimes, birds and bats, slash
// the biting plants, grab coins, and reach the flag. Every third level ends in
// a fight with the stone golem. Lose all four hearts and it's game over.

const FF_W = 480;
const FF_H = 270;
const FF_T = 24; // tile size
const FF_ROWS = 12;
const FF_SPR = {"idle0":[0,0,21,38],"idle1":[23,0,24,39],"idle2":[49,0,24,39],"idle3":[75,0,20,39],"idle4":[97,0,19,39],"run0":[118,0,22,32],"run1":[142,0,22,35],"run2":[166,0,24,37],"run3":[192,0,24,36],"run4":[218,0,21,38],"run5":[241,0,21,37],"jump0":[264,0,26,37],"jump1":[292,0,22,33],"jump2":[316,0,19,34],"jump3":[337,0,19,33],"jump4":[358,0,21,35],"jump5":[381,0,19,30],"fall0":[402,0,21,38],"fall1":[425,0,21,36],"fall2":[448,0,19,36],"fall3":[469,0,19,39],"fall4":[490,0,18,34],"attack0":[510,0,18,35],"attack1":[530,0,19,32],"attack2":[551,0,25,35],"attack3":[578,0,33,32],"slime0":[613,0,24,20],"slime1":[639,0,24,15],"slime2":[665,0,24,15],"slime3":[691,0,26,22],"slimeDead0":[719,0,28,22],"bat0":[749,0,20,17],"bat1":[771,0,28,17],"bat2":[801,0,23,15],"bird0":[826,0,20,20],"bird1":[848,0,19,18],"bird2":[869,0,20,19],"bird3":[891,0,18,16],"bird4":[911,0,18,15],"bird5":[931,0,18,14],"plant0":[951,0,21,33],"plant1":[974,0,20,33],"plant2":[996,0,20,33],"plant3":[0,41,22,32],"golem0":[24,41,85,83],"golem1":[111,41,85,87],"golem2":[198,41,85,87],"golem3":[285,41,92,85],"golemThrow0":[379,41,97,97],"boulder0":[478,41,22,24],"coin0":[502,41,13,14],"gem0":[517,41,14,16],"heart0":[533,41,16,14],"heartEmpty0":[551,41,14,12],"face0":[567,41,16,18],"flag0":[585,41,50,76],"grass":[637,41,24,24],"dirt":[663,41,24,24],"rock":[689,41,24,24],"crate":[715,41,24,24],"plank":[741,41,24,9],"waterTop":[767,41,24,14],"waterfall":[793,41,24,56]};
const FF_BGS = {"far":[0,0,366,270],"mid":[368,0,295,270],"near":[665,0,202,270],"title":[869,0,547,270],"gameover":[1418,0,392,270]};
const ffImg = loadImage('assets/forest.png');
const ffBgImg = loadImage('assets/forest-bg.jpg');
const ffCanvas = document.createElement('canvas');
ffCanvas.width = FF_W;
ffCanvas.height = FF_H;
const fx = ffCanvas.getContext('2d');

const FF = {
  gravity: 1050,
  run: 125,
  accel: 900,
  jump: 370,
  coyote: 0.1,
  buffer: 0.13,
  hearts: 4,
  invuln: 1.3,
  attackTime: 0.3,
};

const ff = {
  active: false,
  state: 'title', // title | intro | play | clear | over
  t: 0,
  level: 1,
  lvl: null,
  p: null,
  enemies: [],
  shots: [], // boulders
  parts: [],
  coins: 0,
  levelCoins: 0,
  hearts: FF.hearts,
  camX: 0,
  touchJump: false,
  jumpWas: false,
  attackQueued: false,
  shake: 0,
};

function ffRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Levels -------------------------------------------------------------------
// Built from chunks (flat runs, steps, pits, bridges, floating planks, crates)
// with a seed per level, so level 4 is always the same level 4. Later levels
// are longer and busier.
function ffGenerate(n) {
  const R = ffRng(n * 7919 + 17);
  const ground = [];
  const solids = new Map(); // "c,r" -> tile name, for crates and pillars
  const planks = new Set(); // "c,r" one-way platforms
  const enemies = [];
  const coins = [];
  const deco = [];
  const len = Math.min(70 + n * 12, 170);
  const boss = n % 3 === 0;
  let c = 0;
  let g = 9;
  const T = FF_T;
  const flat = (k) => {
    for (let i = 0; i < k; i++) ground[c++] = g;
  };
  const coinRow = (c0, k, row) => {
    for (let i = 0; i < k; i++) coins.push({ x: (c0 + i) * T + T / 2, y: row * T + T / 2, kind: 'coin' });
  };
  const add = (type, col, extra = {}) => enemies.push({ type, x: col * T + T / 2, y: g * T, ...extra });
  flat(10);
  coinRow(5, 3, g - 2);
  while (c < len) {
    const r = R();
    if (r < 0.2) {
      const k = 5 + Math.floor(R() * 5);
      const c0 = c;
      flat(k);
      coinRow(c0 + 1, Math.min(4, k - 2), g - 2);
      if (R() < 0.55 + n * 0.05) add('slime', c0 + Math.floor(k / 2), { dir: R() < 0.5 ? -1 : 1 });
      if (n >= 2 && R() < 0.25) add('slime', c0 + k - 1, { dir: -1 });
    } else if (r < 0.36) {
      const ng = Math.max(6, Math.min(9, g + (R() < 0.5 ? -1 : 1) * (1 + Math.floor(R() * 2))));
      const c0 = c;
      g = ng;
      const k = 3 + Math.floor(R() * 4);
      flat(k);
      if (g < 9) for (let i = 0; i < k; i++) if (R() < 0.25) solids.set(`${c0 + i},${g}`, 'rock');
      if (n >= 2 && k >= 4 && R() < 0.5) add('plant', c0 + Math.floor(k / 2));
      else coins.push({ x: (c0 + 1) * T + T / 2, y: (g - 2) * T + T / 2, kind: R() < 0.15 ? 'gem' : 'coin' });
    } else if (r < 0.52) {
      const w = 2 + Math.floor(R() * Math.min(2, 1 + n / 3));
      deco.push({ type: 'waterfall', c: c });
      for (let i = 0; i < w; i++) ground[c++] = -1;
      // Coins arc over the gap
      for (let i = 0; i < 3; i++) coins.push({ x: (c - w) * T + (w * T * (i + 1)) / 4, y: (g - 2.2 - Math.sin(((i + 1) / 4) * Math.PI) * 1.3) * T, kind: 'coin' });
      flat(3);
    } else if (r < 0.66) {
      const w = 4 + Math.floor(R() * 3);
      const c0 = c;
      for (let i = 0; i < w; i++) {
        ground[c] = -1;
        planks.add(`${c},${g}`);
        c++;
      }
      coinRow(c0 + 1, w - 2, g - 2);
      if (n >= 2 || R() < 0.5) enemies.push({ type: 'bird', x: (c0 + w / 2) * T, y: (g - 3) * T, home: (c0 + w / 2) * T });
      flat(3);
    } else if (r < 0.78) {
      const w = 5 + Math.floor(R() * 2);
      const c0 = c;
      for (let i = 0; i < w; i++) ground[c++] = -1;
      const pc = c0 + Math.floor(w / 2) - 1;
      planks.add(`${pc},${g - 2}`);
      planks.add(`${pc + 1},${g - 2}`);
      coinRow(pc, 2, g - 3);
      if (R() < 0.3) coins.push({ x: (pc + 1) * T, y: (g - 5) * T, kind: 'gem' });
      flat(3);
    } else if (r < 0.88) {
      flat(2);
      const tall = n >= 2 && R() < 0.5 ? 2 : 1;
      for (let i = 0; i < tall; i++) solids.set(`${c},${g - 1 - i}`, 'crate');
      coins.push({ x: c * T + T / 2, y: (g - tall - 1) * T + T / 2, kind: 'coin' });
      flat(1);
      flat(3);
    } else {
      const c0 = c;
      flat(6);
      if (n >= 2) {
        enemies.push({ type: 'bat', x: (c0 + 3) * T, y: (g - 4) * T, home: (c0 + 3) * T });
        if (n >= 4 && R() < 0.5) enemies.push({ type: 'bat', x: (c0 + 5) * T, y: (g - 5) * T, home: (c0 + 5) * T });
      } else {
        coinRow(c0 + 1, 4, g - 2);
      }
    }
  }
  // A heart to pick up halfway through, from level 2
  if (n >= 2) {
    for (let col = Math.floor(c / 2); col < c; col++) {
      if (ground[col] > 0) {
        coins.push({ x: col * T + T / 2, y: (ground[col] - 1) * T + T / 2, kind: 'heart' });
        break;
      }
    }
  }
  let bossInfo = null;
  g = 9;
  if (boss) {
    const a0 = c;
    flat(20);
    bossInfo = { x0: (a0 + 1) * T, x1: (c - 1) * T };
    enemies.push({ type: 'golem', x: (c - 5) * T, y: g * T, hp: 3 + Math.floor(n / 6), x0: bossInfo.x0, x1: bossInfo.x1 });
  }
  flat(4);
  const flagCol = c - 1;
  flat(8);
  return { n, cols: c, ground, solids, planks, enemies, coins, deco, flagX: flagCol * T + T / 2, boss: bossInfo };
}

function ffTile(c, r) {
  const L = ff.lvl;
  if (c < 0 || c >= L.cols || r < 0) return null;
  const g = L.ground[c];
  if (g >= 0 && r >= g) return r === g ? 'grass' : 'dirt';
  return L.solids.get(`${c},${r}`) ?? null;
}

// ---- Bodies ------------------------------------------------------------------
// x is the centre, y the feet; w and h the box.
function ffMove(o, dt, oneWay = true) {
  const T = FF_T;
  o.hitWall = false;
  o.x += o.vx * dt;
  const top = o.y - o.h;
  const r0 = Math.floor((top + 1) / T);
  const r1 = Math.floor((o.y - 1) / T);
  if (o.vx > 0) {
    const col = Math.floor((o.x + o.w / 2) / T);
    for (let r = r0; r <= r1; r++) {
      if (ffTile(col, r)) {
        o.x = col * T - o.w / 2 - 0.01;
        o.vx = 0;
        o.hitWall = true;
        break;
      }
    }
  } else if (o.vx < 0) {
    const col = Math.floor((o.x - o.w / 2) / T);
    for (let r = r0; r <= r1; r++) {
      if (ffTile(col, r)) {
        o.x = (col + 1) * T + o.w / 2 + 0.01;
        o.vx = 0;
        o.hitWall = true;
        break;
      }
    }
  }
  const maxX = ff.lvl.cols * T - o.w / 2;
  if (o.x < o.w / 2) { o.x = o.w / 2; o.hitWall = true; }
  if (o.x > maxX) { o.x = maxX; o.hitWall = true; }

  const prevY = o.y;
  o.y += o.vy * dt;
  o.onGround = false;
  const c0 = Math.floor((o.x - o.w / 2 + 1) / T);
  const c1 = Math.floor((o.x + o.w / 2 - 1) / T);
  if (o.vy >= 0) {
    const row = Math.floor(o.y / T);
    for (let col = c0; col <= c1; col++) {
      const plank = oneWay && ff.lvl.planks.has(`${col},${row}`) && prevY <= row * T + 0.5 && !o.dropThrough;
      if (ffTile(col, row) || plank) {
        o.y = row * T;
        o.vy = 0;
        o.onGround = true;
        o.onPlank = !!plank && !ffTile(col, row);
        break;
      }
    }
  } else {
    const row = Math.floor((o.y - o.h) / T);
    for (let col = c0; col <= c1; col++) {
      if (ffTile(col, row)) {
        o.y = (row + 1) * T + o.h;
        o.vy = 0;
        break;
      }
    }
  }
}

function ffOverlap(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && a.y - a.h < b.y && b.y - b.h < a.y;
}

// ---- Flow ----------------------------------------------------------------------
function ffOpen() {
  ff.active = true;
  ff.state = 'title';
  ff.t = 0;
  ff.level = (reading.levels || 0) + 1;
  ff.coins = 0;
  ff.touchJump = false;
  ff.jumpWas = true; // the press that sat him down doesn't count
  ff.attackQueued = false;
  runBtn.textContent = 'JUMP';
  runBtn.setAttribute('aria-pressed', 'false');
  runToggle = false;
}

function ffClose() {
  ff.active = false;
  runBtn.textContent = 'RUN';
  if (player.seat) standUp(0, 1);
}

function ffStartLevel() {
  ff.lvl = ffGenerate(ff.level);
  const T = FF_T;
  ff.p = { x: 2 * T, y: 9 * T, w: 14, h: 30, vx: 0, vy: 0, face: 1, onGround: true, coyote: 0, buffer: 0, attackT: 0, attackId: 0, invuln: 0, anim: 0, dist: 0, safe: { x: 2 * T, y: 9 * T } };
  ff.enemies = ff.lvl.enemies.map((e) => ffMakeEnemy(e));
  ff.coinsLeft = ff.lvl.coins.map((c) => ({ ...c, taken: false }));
  ff.shots = [];
  ff.parts = [];
  ff.hearts = FF.hearts;
  ff.levelCoins = 0;
  ff.camX = 0;
  ff.state = 'intro';
  ff.t = 0;
}

function ffMakeEnemy(e) {
  const base = { ...e, vx: 0, vy: 0, dead: false, deadT: 0, anim: Math.random() * 3, hitId: -1 };
  switch (e.type) {
    case 'slime': return { ...base, w: 20, h: 16, vx: 28 * (e.dir || 1), hp: 1, stomp: true };
    case 'plant': return { ...base, w: 16, h: 30, hp: 1, stomp: false };
    case 'bird': return { ...base, w: 16, h: 14, hp: 1, stomp: true, baseY: e.y, vx: 40 };
    case 'bat': return { ...base, w: 16, h: 14, hp: 1, stomp: true, baseY: e.y };
    case 'golem': return { ...base, w: 52, h: 78, stomp: true, vx: -30, throwT: 2, hurtT: 0, throwAnim: 0 };
    default: return base;
  }
}

function ffPressJump() {
  if (ff.state === 'title') { ffStartLevel(); return; }
  if (ff.state === 'over') { ffStartLevel(); return; }
  if (ff.state === 'play') ff.p.buffer = FF.buffer;
}

function ffPressAttack() {
  if (ff.state === 'title' || ff.state === 'over') { ffPressJump(); return; }
  if (ff.state === 'play' && ff.p.attackT <= 0) {
    ff.p.attackT = FF.attackTime;
    ff.p.attackId += 1;
  }
}

function ffJumpHeld() {
  return ff.touchJump || touchDirs.has('up') || ['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyK'].some((k) => keys.has(k));
}

function ffHurt(fromX) {
  const p = ff.p;
  if (p.invuln > 0 || ff.state !== 'play') return;
  ff.hearts -= 1;
  p.invuln = FF.invuln;
  p.vx = (p.x < fromX ? -1 : 1) * 170;
  p.vy = -230;
  ff.shake = 0.25;
  ffBurst(p.x, p.y - 15, '#ff5c6a', 8);
  if (ff.hearts <= 0) {
    ff.state = 'over';
    ff.t = 0;
  }
}

function ffBurst(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 90;
    ff.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.4 + Math.random() * 0.3, color });
  }
}

function ffKill(e, how) {
  e.dead = true;
  e.deadT = 0;
  ffBurst(e.x, e.y - e.h / 2, how === 'slash' ? '#cfe8ff' : '#a6e36b', 12);
}

// ---- Update --------------------------------------------------------------------
function updateFF(dt) {
  ff.t += dt;
  ff.shake = Math.max(0, ff.shake - dt);
  const held = ffJumpHeld();
  if (held && !ff.jumpWas) ffPressJump();
  ff.jumpWas = held;
  if (ff.attackQueued) {
    ff.attackQueued = false;
    ffPressAttack();
  }
  if (ff.state === 'intro') {
    if (ff.t > 1.6) { ff.state = 'play'; ff.t = 0; }
    return;
  }
  if (ff.state === 'title' || ff.state === 'over') return;
  if (ff.state === 'clear') {
    const p = ff.p;
    p.vx = 70;
    p.vy += FF.gravity * dt;
    ffMove(p, dt);
    p.dist += Math.abs(p.vx * dt);
    if (ff.t > 3.4) {
      reading.levels = Math.max(reading.levels || 0, ff.level);
      saveCount('levelsCleared', reading.levels);
      ff.level += 1;
      ffStartLevel();
    }
    ffUpdateParts(dt);
    return;
  }
  ffUpdatePlayer(dt);
  ffUpdateEnemies(dt);
  ffUpdateCoins();
  ffUpdateParts(dt);
  const target = Math.min(Math.max(ff.p.x - FF_W * 0.4, 0), ff.lvl.cols * FF_T - FF_W);
  ff.camX += (target - ff.camX) * Math.min(1, dt * 8);
  // Reached the flag (after the golem, if there is one)
  const bossAlive = ff.enemies.some((e) => e.type === 'golem' && !e.dead);
  if (!bossAlive && ff.p.x > ff.lvl.flagX - 8) {
    ff.state = 'clear';
    ff.t = 0;
    ffBurst(ff.lvl.flagX, ff.p.y - 60, '#ffd75e', 24);
    exciteDog();
  }
}

function ffUpdatePlayer(dt) {
  const p = ff.p;
  const dirs = heldDirs();
  const left = dirs.has('left');
  const right = dirs.has('right');
  const want = (right ? 1 : 0) - (left ? 1 : 0);
  if (want) p.face = want;
  const target = want * FF.run * (p.attackT > 0 && p.onGround ? 0.4 : 1);
  const a = FF.accel * (p.onGround ? 1 : 0.65);
  if (p.vx < target) p.vx = Math.min(target, p.vx + a * dt);
  else if (p.vx > target) p.vx = Math.max(target, p.vx - a * dt);

  p.coyote = p.onGround ? FF.coyote : Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -FF.jump;
    p.buffer = 0;
    p.coyote = 0;
    p.onGround = false;
  }
  // Let go early for a short hop
  if (!ffJumpHeld() && p.vy < -140) p.vy = -140;
  p.vy = Math.min(p.vy + FF.gravity * dt, 620);
  p.dropThrough = dirs.has('down') && p.onPlank;
  ffMove(p, dt);
  p.dist += Math.abs(p.vx * dt);
  p.anim += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.attackT = Math.max(0, p.attackT - dt);
  if (p.onGround && !p.onPlank) {
    const col = Math.floor(p.x / FF_T);
    if (ff.lvl.ground[col] >= 0 && ff.lvl.ground[col - 1] >= 0 && ff.lvl.ground[col + 1] >= 0) p.safe = { x: p.x, y: p.y };
  }
  // Fell into the water
  if (p.y > FF_H + 40) {
    ff.hearts -= 1;
    ffBurst(p.x, FF_H - 10, '#7fd0ff', 14);
    if (ff.hearts <= 0) {
      ff.state = 'over';
      ff.t = 0;
      return;
    }
    p.x = p.safe.x;
    p.y = p.safe.y;
    p.vx = 0;
    p.vy = 0;
    p.invuln = FF.invuln;
  }
}

function ffAttackBox() {
  const p = ff.p;
  const t = FF.attackTime - p.attackT;
  if (p.attackT <= 0 || t < 0.05 || t > 0.24) return null;
  return { x: p.x + p.face * 20, y: p.y - 4, w: 30, h: 28 };
}

function ffUpdateEnemies(dt) {
  const p = ff.p;
  const slash = ffAttackBox();
  for (const e of ff.enemies) {
    e.anim += dt;
    if (e.dead) {
      e.deadT += dt;
      continue;
    }
    if (e.type === 'slime') {
      e.vy = Math.min(e.vy + FF.gravity * dt, 600);
      const before = e.vx;
      ffMove(e, dt);
      if (e.hitWall) e.vx = -before;
      // Turn at ledges
      const ahead = Math.floor((e.x + Math.sign(e.vx) * (e.w / 2 + 2)) / FF_T);
      if (e.onGround && !ffTile(ahead, Math.floor(e.y / FF_T))) e.vx = -e.vx;
      if (e.y > FF_H + 40) e.dead = true;
    } else if (e.type === 'bird') {
      e.x += e.vx * dt;
      if (Math.abs(e.x - e.home) > 70) e.vx = -Math.sign(e.x - e.home) * Math.abs(e.vx);
      e.y = e.baseY + Math.sin(e.anim * 2.4) * 14;
    } else if (e.type === 'bat') {
      const dx = p.x - e.x;
      if (Math.abs(dx) < 170) {
        // Swoop at you
        e.x += Math.sign(dx) * 55 * dt;
        e.y = e.baseY + Math.sin(e.anim * 3.2) * 22 + Math.max(0, 40 - Math.abs(dx) / 3);
      } else {
        e.x += Math.sin(e.anim) * 20 * dt;
        e.y = e.baseY + Math.sin(e.anim * 2) * 8;
      }
    } else if (e.type === 'golem') {
      ffUpdateGolem(e, dt);
    }
    // Slashed
    if (slash && e.hitId !== p.attackId && ffOverlap(slash, e)) {
      e.hitId = p.attackId;
      if (e.type === 'golem') ffHitGolem(e);
      else ffKill(e, 'slash');
      continue;
    }
    if (!ffOverlap(p, e)) continue;
    // Stomped: falling onto its head
    if (e.stomp && p.vy > 60 && p.y - (e.y - e.h) < 14) {
      p.vy = -FF.jump * 0.7;
      if (e.type === 'golem') ffHitGolem(e);
      else ffKill(e, 'stomp');
      continue;
    }
    ffHurt(e.x);
  }
  // Boulders
  for (const s of ff.shots) {
    s.vy += 760 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.spin += s.vx * dt * 0.05;
    const row = Math.floor(s.y / FF_T);
    if (s.vy > 0 && ffTile(Math.floor(s.x / FF_T), row)) {
      s.y = row * FF_T;
      s.vy = -Math.abs(s.vy) * 0.35;
      s.bounces += 1;
    }
    s.t += dt;
    if (slash && ffOverlap(slash, s)) {
      s.dead = true;
      ffBurst(s.x, s.y - 10, '#9b8565', 10);
    } else if (ffOverlap(p, s)) {
      s.dead = true;
      ffHurt(s.x);
    }
    if (s.t > 4 || s.y > FF_H + 60) s.dead = true;
  }
  ff.shots = ff.shots.filter((s) => !s.dead);
}

function ffUpdateGolem(e, dt) {
  const p = ff.p;
  e.hurtT = Math.max(0, e.hurtT - dt);
  e.throwAnim = Math.max(0, e.throwAnim - dt);
  const awake = p.x > e.x0 - 40;
  if (!awake) return;
  e.face = p.x < e.x ? -1 : 1;
  if (e.throwAnim <= 0 && e.hurtT <= 0) {
    e.x += e.face * 32 * dt;
    e.x = Math.max(e.x0 + 30, Math.min(e.x1 - 30, e.x));
  }
  e.throwT -= dt;
  if (e.throwT <= 0) {
    e.throwT = Math.max(1.3, 2.4 - ff.level * 0.06);
    e.throwAnim = 0.45;
    const dx = p.x - e.x;
    ff.shots.push({ x: e.x + e.face * 30, y: e.y - 70, w: 18, h: 18, vx: Math.max(-230, Math.min(230, dx / 1.1)), vy: -300, t: 0, spin: 0, bounces: 0 });
  }
}

function ffHitGolem(e) {
  if (e.hurtT > 0) return;
  e.hp -= 1;
  e.hurtT = 0.7;
  ff.shake = 0.3;
  ffBurst(e.x, e.y - 50, '#c9b48a', 14);
  if (e.hp <= 0) {
    ffKill(e, 'slash');
    ff.shake = 0.6;
    for (let i = 0; i < 4; i++) ffBurst(e.x + (Math.random() - 0.5) * 50, e.y - Math.random() * 70, '#8a7a55', 10);
  }
}

function ffUpdateCoins() {
  const p = ff.p;
  for (const c of ff.coinsLeft) {
    if (c.taken) continue;
    if (Math.abs(c.x - p.x) < 14 && c.y > p.y - p.h - 8 && c.y < p.y + 6) {
      c.taken = true;
      if (c.kind === 'heart') ff.hearts = Math.min(FF.hearts, ff.hearts + 1);
      else {
        const v = c.kind === 'gem' ? 5 : 1;
        ff.coins += v;
        ff.levelCoins += v;
      }
      ffBurst(c.x, c.y, c.kind === 'gem' ? '#7fd0ff' : c.kind === 'heart' ? '#ff6b7a' : '#ffd75e', 6);
    }
  }
}

function ffUpdateParts(dt) {
  for (const q of ff.parts) {
    q.t += dt;
    q.vy += 300 * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
  }
  ff.parts = ff.parts.filter((q) => q.t < q.life);
}

// ---- Drawing -------------------------------------------------------------------
function ffSpr(name, x, y, flip = false, alpha = 1) {
  const r = FF_SPR[name];
  if (!r) return;
  const [sx, sy, w, h] = r;
  fx.save();
  fx.globalAlpha = alpha;
  fx.translate(Math.round(x), Math.round(y));
  if (flip) fx.scale(-1, 1);
  fx.drawImage(ffImg, sx, sy, w, h, -Math.round(w / 2), -h, w, h);
  fx.restore();
}

function ffBgLayer(name, parallax, y, mirrorTiles = true) {
  const [sx, sy, w, h] = FF_BGS[name];
  const off = -((ff.camX * parallax) % (w * 2));
  for (let x = off - w * 2; x < FF_W + w; x += w) {
    const i = Math.round((x - off) / w);
    fx.save();
    if (mirrorTiles && i % 2 !== 0) {
      fx.translate(Math.round(x) + w, 0);
      fx.scale(-1, 1);
      fx.drawImage(ffBgImg, sx, sy, w, h, 0, y, w, h);
    } else {
      fx.drawImage(ffBgImg, sx, sy, w, h, Math.round(x), y, w, h);
    }
    fx.restore();
  }
}

function ffText(text, x, y, size, color, align = 'center') {
  fx.font = `800 ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  fx.textAlign = align;
  fx.textBaseline = 'middle';
  fx.lineWidth = Math.max(3, size / 4);
  fx.strokeStyle = '#0b1210';
  fx.strokeText(text, x, y);
  fx.fillStyle = color;
  fx.fillText(text, x, y);
}

function drawFF() {
  if (!spriteReady(ffImg) || !spriteReady(ffBgImg)) return;
  fx.imageSmoothingEnabled = false;
  fx.setTransform(1, 0, 0, 1, 0, 0);
  if (ff.state === 'title') {
    const [sx, sy, w, h] = FF_BGS.title;
    fx.drawImage(ffBgImg, sx + (w - FF_W) / 2, sy, FF_W, h, 0, 0, FF_W, FF_H);
    // The art says PRESS A: here that's JUMP (Space on a keyboard)
    if (Math.floor(ff.t * 2) % 2 === 0) ffText(isTouch ? '(A = JUMP)' : '(A = Space)', FF_W / 2, 262, 9, '#fff4c8');
    ffText(`Best: level ${reading.levels || 0}`, 10, 14, 10, '#cfe8c8', 'left');
    return;
  }
  if (ff.state === 'over') {
    const [sx, sy, w, h] = FF_BGS.gameover;
    fx.fillStyle = '#1a0605';
    fx.fillRect(0, 0, FF_W, FF_H);
    fx.drawImage(ffBgImg, sx, sy, w, h, (FF_W - w) / 2, 0, w, h);
    if (Math.floor(ff.t * 2) % 2 === 0) ffText(isTouch ? 'Tap JUMP to retry' : 'Press Space to retry', FF_W / 2, 250, 13, '#ffd2c8');
    return;
  }
  const shake = ff.shake > 0 ? (Math.random() - 0.5) * 6 * (ff.shake / 0.3) : 0;
  fx.setTransform(1, 0, 0, 1, Math.round(shake), 0);
  // Sky and parallax forest
  fx.fillStyle = '#163847';
  fx.fillRect(-10, 0, FF_W + 20, FF_H);
  ffBgLayer('mid', 0.3, 0);
  const cam = Math.round(ff.camX);
  fx.save();
  fx.translate(-cam, 0);
  ffDrawWorld(cam);
  fx.restore();
  fx.setTransform(1, 0, 0, 1, 0, 0);
  ffDrawHud();
  if (ff.state === 'intro') {
    fx.fillStyle = `rgba(6, 12, 10, ${Math.max(0, 0.75 - Math.max(0, ff.t - 1.1) * 1.5)})`;
    fx.fillRect(0, 0, FF_W, FF_H);
    ffText(`LEVEL ${ff.level}`, FF_W / 2, FF_H / 2 - 14, 26, '#ffe27a');
    ffText(ff.lvl.boss ? 'The golem awaits...' : 'Forest Falls', FF_W / 2, FF_H / 2 + 16, 13, '#d8f0d0');
  }
  if (ff.state === 'clear' && ff.t > 0.4) {
    const k = Math.min(1, (ff.t - 0.4) * 4);
    ffText('LEVEL COMPLETE!', FF_W / 2, 92, 16 + 10 * k, '#ffe27a');
    if (ff.t > 1) ffText(`Coins: ${ff.levelCoins}`, FF_W / 2, 124, 13, '#fff4c8');
  }
}

function ffDrawWorld(cam) {
  const L = ff.lvl;
  const T = FF_T;
  const c0 = Math.max(0, Math.floor(cam / T) - 1);
  const c1 = Math.min(L.cols - 1, Math.ceil((cam + FF_W) / T) + 1);
  const [wx, wy, ww, wh] = FF_SPR.waterfall;
  // Waterfalls behind the pits
  for (const d of L.deco) {
    if (d.c < c0 - 3 || d.c > c1 + 3) continue;
    const scroll = Math.floor((ff.t * 60) % wh);
    for (let y = 120 - wh; y < FF_H; y += wh) {
      fx.globalAlpha = 0.8;
      fx.drawImage(ffImg, wx, wy, ww, wh, d.c * T + 6, y + scroll, ww, wh);
    }
    fx.globalAlpha = 1;
  }
  // Water in the pits
  const [tx, ty, tw, th] = FF_SPR.waterTop;
  const waterY = FF_H - 26 + Math.round(Math.sin(ff.t * 2) * 1.5);
  for (let c = c0; c <= c1; c++) {
    if (L.ground[c] >= 0) continue;
    fx.fillStyle = '#123f7a';
    fx.fillRect(c * T, waterY + th - 2, T, FF_H);
    fx.drawImage(ffImg, tx, ty, tw, th, c * T, waterY, T, th);
  }
  // Ground, crates and rocks
  for (let c = c0; c <= c1; c++) {
    for (let r = 0; r < FF_ROWS; r++) {
      const t = ffTile(c, r);
      if (!t) continue;
      const [sx, sy, w, h] = FF_SPR[t];
      fx.drawImage(ffImg, sx, sy, w, h, c * T, r * T, T, T);
    }
  }
  // Planks: bridges and floating platforms
  const [px, py, pw, ph] = FF_SPR.plank;
  for (const k of L.planks) {
    const [c, r] = k.split(',').map(Number);
    if (c < c0 || c > c1) continue;
    fx.drawImage(ffImg, px, py, pw, ph, c * T, r * T, T, ph);
  }
  // Flag
  const bossAlive = ff.enemies.some((e) => e.type === 'golem' && !e.dead);
  ffSpr('flag0', L.flagX + 14, (L.ground[Math.floor(L.flagX / T)] || 9) * T + 2, false, bossAlive ? 0.35 : 1);
  // Coins and pickups
  for (const c of ff.coinsLeft) {
    if (c.taken || c.x < cam - 20 || c.x > cam + FF_W + 20) continue;
    const bob = Math.round(Math.sin(ff.t * 4 + c.x * 0.05) * 2);
    ffSpr(`${c.kind}0`, c.x, c.y + 7 + bob);
  }
  // Enemies
  for (const e of ff.enemies) {
    if (e.x < cam - 120 || e.x > cam + FF_W + 120) continue;
    ffDrawEnemy(e);
  }
  for (const s of ff.shots) ffSpr('boulder0', s.x, s.y + 4);
  ffDrawPlayer();
  for (const q of ff.parts) {
    fx.globalAlpha = 1 - q.t / q.life;
    fx.fillStyle = q.color;
    fx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3);
  }
  fx.globalAlpha = 1;
}

function ffDrawEnemy(e) {
  const a = e.dead ? Math.max(0, 1 - e.deadT * 2.5) : 1;
  if (a <= 0) return;
  switch (e.type) {
    case 'slime':
      if (e.dead) ffSpr('slimeDead0', e.x, e.y, false, a);
      else ffSpr(`slime${Math.floor(e.anim * 6) % 4}`, e.x, e.y + 1, e.vx > 0);
      break;
    case 'plant': {
      const near = Math.abs(ff.p.x - e.x) < 70;
      ffSpr(`plant${Math.floor(e.anim * (near ? 9 : 4)) % 4}`, e.x, e.y + 1, ff.p.x > e.x, a);
      break;
    }
    case 'bird':
      ffSpr(`bird${Math.floor(e.anim * 8) % 6}`, e.x, e.y + 8, e.vx < 0, a);
      break;
    case 'bat':
      ffSpr(`bat${Math.floor(e.anim * 8) % 3}`, e.x, e.y + 8, ff.p.x < e.x, a);
      break;
    case 'golem': {
      const name = e.throwAnim > 0 ? 'golemThrow0' : `golem${Math.floor(e.anim * 3) % 4}`;
      const flash = e.hurtT > 0 && Math.floor(e.hurtT * 14) % 2 === 0;
      ffSpr(name, e.x, e.y + 3, (e.face || -1) < 0, flash ? 0.45 : a);
      break;
    }
  }
}

function ffDrawPlayer() {
  const p = ff.p;
  if (p.invuln > 0 && ff.state === 'play' && Math.floor(p.invuln * 16) % 2 === 0) return;
  let name;
  if (p.attackT > 0) {
    name = `attack${Math.min(3, Math.floor(((FF.attackTime - p.attackT) / FF.attackTime) * 4))}`;
  } else if (!p.onGround) {
    name = p.vy < 0 ? `jump${Math.min(3, 1 + Math.floor(p.anim * 8) % 3)}` : `fall${Math.floor(p.anim * 8) % 5}`;
  } else if (Math.abs(p.vx) > 15) {
    name = `run${Math.floor(p.dist / 9) % 6}`;
  } else {
    name = `idle${Math.floor(p.anim * 5) % 5}`;
  }
  ffSpr(name, p.x, p.y + 1, p.face < 0);
}

function ffDrawHud() {
  ffSpr('face0', 16, 24);
  for (let i = 0; i < FF.hearts; i++) ffSpr(i < ff.hearts ? 'heart0' : 'heartEmpty0', 36 + i * 17, 22);
  ffSpr('coin0', FF_W - 52, 22);
  ffText(`× ${String(ff.coins).padStart(2, '0')}`, FF_W - 42, 15, 12, '#fff4c8', 'left');
  ffText(`LEVEL ${ff.level}`, FF_W / 2, 14, 11, '#d8f0d0');
  const golem = ff.enemies.find((e) => e.type === 'golem' && !e.dead);
  if (golem && ff.p.x > golem.x0 - 40) {
    const max = 3 + Math.floor(ff.level / 6);
    fx.fillStyle = 'rgba(0,0,0,0.6)';
    fx.fillRect(FF_W / 2 - 62, 26, 124, 9);
    fx.fillStyle = '#c94a3a';
    fx.fillRect(FF_W / 2 - 60, 28, (120 * golem.hp) / max, 5);
    ffText('GOLEM', FF_W / 2, 42, 9, '#f2d0b0');
  }
}

// ---- Full-screen view and TV mirror ------------------------------------------------
function ffLayout() {
  const top = 50;
  const s = Math.min((viewW - 16) / FF_W, (viewH - top - 16) / FF_H);
  const w = FF_W * s;
  const h = FF_H * s;
  return { x: (viewW - w) / 2, y: top + (viewH - top - h) / 2, w, h };
}

function ffCloseButton() {
  return { x: viewW - 46, y: 8, w: 34, h: 34 };
}

function drawFFOverlay() {
  if (!ff.active) return;
  drawFF();
  ctx.fillStyle = 'rgba(10, 8, 6, 0.9)';
  ctx.fillRect(0, 0, viewW, viewH);
  const L = ffLayout();
  // TV bezel
  ctx.fillStyle = '#0c0d10';
  ctx.beginPath();
  ctx.roundRect(L.x - 7, L.y - 7, L.w + 14, L.h + 14, 8);
  ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ffCanvas, L.x, L.y, L.w, L.h);
  ctx.imageSmoothingEnabled = true;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 14px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillStyle = '#f3e6d2';
  ctx.fillText('Forest Falls', viewW / 2, 16);
  ctx.font = '500 11px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(243, 230, 210, 0.75)';
  ctx.fillText(isTouch ? '◀ ▶ run · JUMP jump · HIT attack' : '←/→ run · Space/↑ jump · E/X attack · ↓ drop · Esc quit', viewW / 2 - 20, 34, viewW - 110);
  const b = ffCloseButton();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#f3e6d2';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(b.x + 11, b.y + 11);
  ctx.lineTo(b.x + b.w - 11, b.y + b.h - 11);
  ctx.moveTo(b.x + b.w - 11, b.y + 11);
  ctx.lineTo(b.x + 11, b.y + b.h - 11);
  ctx.stroke();
}

function ffPointerDown(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  const b = ffCloseButton();
  if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
    ffClose();
    return;
  }
  // Tapping the game screen on the title or game-over screen starts it
  if (ff.state === 'title' || ff.state === 'over') ffPressJump();
}

// ---- Reading minigame ----------------------------------------------------------
// Sitting down to read opens the book full screen. Drag the finger (touch,
// mouse, or arrow keys) along the lines: text you pass over turns from black
// to yellow. Turn every line yellow before time runs out and the page turns;
// read 4 spreads to finish the chapter. Run out of time and the chapter is
// lost. Either way the book closes and she stands up.

const bookImg = loadImage('assets/book.png');
const bookTurnImg = loadImage('assets/book-turn.png');
const handImg = loadImage('assets/hand.png');
const BOOK = {
  w: 1054, h: 679, // book.png
  pages: [[150, 482], [574, 905]], // text columns, book px
  top: 70, lines: 11, lineGap: 46, lineH: 20,
  cell: 14, // text is split into cells this wide; each turns yellow on its own
  reachX: 26, reachY: 22, // how close the fingertip must pass
};
const BOOK_TURN = { w: 257, h: 216, base: { w: 236, h: 190 }, frames: [1, 2, 3, 4, 5], frameTime: 0.15 };
const HAND = { w: 277, h: 452, tipX: 109, tipY: 6 };
const PAGES_PER_CHAPTER = 4;
const PAGE_TIME = 45; // seconds per spread
const FINGER_SPEED = 520; // book px per second with the arrow keys
const BOOK_RESULT_TIME = 1.8;

const book = {
  active: false,
  page: 0, // 0..3
  cells: [],
  read: 0,
  timeLeft: PAGE_TIME,
  tip: { x: 150, y: 64 },
  dragging: false,
  turnT: -1, // >= 0 while the page-turn animation plays
  result: null, // 'win' | 'fail' while the result message shows
  resultT: 0,
};

function makePage() {
  const cells = [];
  BOOK.pages.forEach(([x0, x1], side) => {
    for (let l = 0; l < BOOK.lines; l++) {
      const y = BOOK.top + l * BOOK.lineGap;
      // Indent the first line of a paragraph, end the last one short
      let x = x0 + (l % 4 === 0 ? 30 : 0);
      const end = l === BOOK.lines - 1 || l % 4 === 3 ? x0 + (x1 - x0) * (0.35 + Math.random() * 0.35) : x1;
      while (x < end - 12) {
        const word = Math.min(end - x, 34 + Math.random() * 70);
        for (let cx = 0; cx < word - 2; cx += BOOK.cell) {
          cells.push({ x: x + cx, y, w: Math.min(BOOK.cell, word - cx), read: false });
        }
        x += word + 14;
      }
    }
  });
  book.cells = cells;
  book.read = 0;
  book.timeLeft = PAGE_TIME;
}

function openBook() {
  book.active = true;
  book.page = 0;
  book.turnT = -1;
  book.result = null;
  book.dragging = false;
  book.tip = { x: BOOK.pages[0][0] - 10, y: BOOK.top + 4 };
  makePage();
}

function closeBook() {
  const won = book.result === 'win';
  book.active = false;
  book.dragging = false;
  if (player.seat) standUp(0, 1);
  if (won) {
    reading.chapters += 1;
    saveChapters(reading.chapters);
    player.cheer = CHEER_TIME;
    exciteDog();
  }
}

// Mark everything the fingertip passed over on its way from a to b.
function sweepFinger(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
  for (let i = 0; i <= steps; i++) {
    const px = a.x + ((b.x - a.x) * i) / steps;
    const py = a.y + ((b.y - a.y) * i) / steps;
    for (const c of book.cells) {
      if (c.read) continue;
      const dx = Math.max(0, Math.abs(px - (c.x + c.w / 2)) - c.w / 2) / BOOK.reachX;
      const dy = (py - (c.y + BOOK.lineH / 2)) / BOOK.reachY;
      if (dx * dx + dy * dy <= 1) {
        c.read = true;
        book.read += 1;
      }
    }
  }
}

function moveFinger(to) {
  const t = { x: Math.min(BOOK.w, Math.max(0, to.x)), y: Math.min(BOOK.h, Math.max(0, to.y)) };
  if (book.turnT < 0 && !book.result) sweepFinger(book.tip, t);
  book.tip = t;
}

function updateBook(dt) {
  if (book.result) {
    book.resultT -= dt;
    if (book.resultT <= 0) closeBook();
    return;
  }
  if (book.turnT >= 0) {
    book.turnT += dt;
    if (book.turnT >= BOOK_TURN.frames.length * BOOK_TURN.frameTime) {
      book.turnT = -1;
      book.page += 1;
      makePage();
      book.tip = { x: BOOK.pages[0][0] - 10, y: BOOK.top + 4 };
    }
    return;
  }
  // Arrow keys steer the finger too
  const dirs = heldDirs();
  const kx = (dirs.has('right') ? 1 : 0) - (dirs.has('left') ? 1 : 0);
  const ky = (dirs.has('down') ? 1 : 0) - (dirs.has('up') ? 1 : 0);
  if (kx || ky) {
    const len = Math.hypot(kx, ky);
    moveFinger({ x: book.tip.x + (kx / len) * FINGER_SPEED * dt, y: book.tip.y + (ky / len) * FINGER_SPEED * dt });
  }
  if (book.read >= book.cells.length) {
    if (book.page + 1 >= PAGES_PER_CHAPTER) {
      book.result = 'win';
      book.resultT = BOOK_RESULT_TIME;
    } else {
      book.turnT = 0;
    }
    return;
  }
  book.timeLeft -= dt;
  if (book.timeLeft <= 0) {
    book.timeLeft = 0;
    book.result = 'fail';
    book.resultT = BOOK_RESULT_TIME;
  }
}

// Where the book sits on screen (CSS px) and its scale.
function bookLayout() {
  const top = 72;
  const availW = viewW * 0.94;
  const availH = (viewH - top - 16) * 0.96;
  const s = Math.min(availW / BOOK.w, availH / BOOK.h);
  const w = BOOK.w * s;
  const h = BOOK.h * s;
  return { x: (viewW - w) / 2, y: top + (viewH - top - h) / 2, w, h, s };
}

function bookCloseButton() {
  return { x: viewW - 46, y: 12, w: 34, h: 34 };
}

function screenToBook(sx, sy) {
  const L = bookLayout();
  return { x: (sx - L.x) / L.s, y: (sy - L.y) / L.s };
}

function bookPointerDown(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  const b = bookCloseButton();
  if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
    book.result = 'closed';
    closeBook();
    return;
  }
  book.dragging = true;
  canvas.setPointerCapture?.(e.pointerId);
  // The fingertip jumps to where you touch, then follows the drag
  book.tip = screenToBook(sx, sy);
  moveFinger(book.tip);
}

function bookPointerMove(e) {
  if (!book.dragging) return;
  const r = canvas.getBoundingClientRect();
  moveFinger(screenToBook(e.clientX - r.left, e.clientY - r.top));
}

function drawBookOverlay() {
  if (!book.active) return;
  const L = bookLayout();
  ctx.fillStyle = 'rgba(16, 12, 9, 0.82)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.imageSmoothingEnabled = false;

  if (book.turnT >= 0 && spriteReady(bookTurnImg)) {
    // Page turning: the small animation frames stretched over the book
    const i = BOOK_TURN.frames[Math.min(BOOK_TURN.frames.length - 1, Math.floor(book.turnT / BOOK_TURN.frameTime))];
    const kx = L.w / BOOK_TURN.base.w;
    const ky = L.h / BOOK_TURN.base.h;
    const dw = BOOK_TURN.w * kx;
    const dh = BOOK_TURN.h * ky;
    ctx.drawImage(bookTurnImg, i * BOOK_TURN.w, 0, BOOK_TURN.w, BOOK_TURN.h, L.x + (L.w - dw) / 2, L.y + L.h - dh, dw, dh);
  } else {
    if (spriteReady(bookImg)) ctx.drawImage(bookImg, L.x, L.y, L.w, L.h);
    for (const c of book.cells) {
      ctx.fillStyle = c.read ? '#f1c232' : '#1d1610';
      ctx.fillRect(L.x + c.x * L.s, L.y + c.y * L.s, Math.max(1, (c.w - 1) * L.s), BOOK.lineH * L.s);
    }
  }
  ctx.imageSmoothingEnabled = true;

  // The hand, fingertip on the page
  if (spriteReady(handImg) && book.turnT < 0) {
    const hs = (L.w * 0.2) / HAND.w;
    const tx = L.x + book.tip.x * L.s;
    const ty = L.y + book.tip.y * L.s;
    ctx.drawImage(handImg, tx - HAND.tipX * hs, ty - HAND.tipY * hs, HAND.w * hs, HAND.h * hs);
  }

  // Header: chapter and page, time left
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 15px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillStyle = '#f3e6d2';
  const pct = book.cells.length ? Math.floor((book.read / book.cells.length) * 100) : 0;
  ctx.fillText(`Chapter ${reading.chapters + 1} · Page ${book.page + 1} of ${PAGES_PER_CHAPTER} · ${pct}% read`, viewW / 2, 20);
  const bw = Math.min(360, viewW - 130);
  const bx = (viewW - bw) / 2;
  const frac = book.timeLeft / PAGE_TIME;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.roundRect(bx, 36, bw, 10, 5);
  ctx.fill();
  ctx.fillStyle = frac > 0.3 ? '#f1c232' : '#e0563f';
  ctx.beginPath();
  ctx.roundRect(bx, 36, Math.max(10, bw * frac), 10, 5);
  ctx.fill();
  ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillStyle = '#f3e6d2';
  ctx.fillText(`${Math.ceil(book.timeLeft)}s left`, viewW / 2, 56);

  // Close button
  const b = bookCloseButton();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#f3e6d2';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(b.x + 11, b.y + 11);
  ctx.lineTo(b.x + b.w - 11, b.y + b.h - 11);
  ctx.moveTo(b.x + b.w - 11, b.y + 11);
  ctx.lineTo(b.x + 11, b.y + b.h - 11);
  ctx.stroke();

  if (book.page === 0 && book.read === 0 && book.turnT < 0 && !book.result) {
    ctx.font = '600 13px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    pill(isTouch ? 'Drag your finger along every line to read it' : 'Drag along every line to read it (or steer with the arrow keys)', viewW / 2, L.y + L.h + 4 > viewH - 14 ? viewH - 18 : L.y + L.h + 4, 'rgba(28, 25, 21, 0.9)', '#f3e6d2');
  }

  if (book.result === 'win' || book.result === 'fail') {
    const t = 1 - book.resultT / BOOK_RESULT_TIME;
    const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : t < 0.25 ? 1.15 - ((t - 0.15) / 0.1) * 0.15 : 1;
    ctx.save();
    ctx.translate(viewW / 2, viewH / 2);
    ctx.scale(pop, pop);
    ctx.font = '800 30px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.95)';
    const text = book.result === 'win' ? 'Chapter Complete' : 'Out of time!';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = book.result === 'win' ? '#f1c232' : '#ef7b62';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// ---- Partner life ------------------------------------------------------------
// Whoever you're not playing gets on with their day in the apartment: they
// walk between favourite spots (the couch, the kitchen, the TV, the window),
// sit on the couch for a while, and strike idle poses. Walk up to them and
// they stop, turn to you and wave.

const PARTNER_SPOTS = [
  { name: 'couch', seat: 1 },
  { name: 'couch', seat: 2 },
  { name: 'kitchen', x: 1132, y: 478, facing: Math.PI },
  { name: 'tv', x: 400, y: 330, facing: -Math.PI / 2 },
  { name: 'window', x: 330, y: 300, facing: Math.PI },
  { name: 'shelf', x: 640, y: 300, facing: -Math.PI / 2 },
  { name: 'island', x: 700, y: 560, facing: 0 },
];
// Points the partner can route through to get around the island and couch.
const PARTNER_NODES = [
  { x: 600, y: 440 }, { x: 720, y: 300 }, { x: 1060, y: 300 }, { x: 1080, y: 470 },
  { x: 1080, y: 700 }, { x: 760, y: 700 }, { x: 700, y: 560 }, { x: 420, y: 560 },
];
const PARTNER_GREET = 95; // map px: they stop and greet you inside this (about kissing distance)
const PARTNER_STAY = [8, 16]; // seconds at a spot before moving on

Object.assign(partner, {
  facing: Math.PI,
  walkTime: 0,
  moveDx: 0,
  moveDy: 0,
  idleTime: 0,
  wave: 0,
  greeted: false,
  path: [],
  seat: null,
  spot: PARTNER_SPOTS[2],
  stay: 6,
});

function partnerFree(x, y) {
  return isFree(x, y, true);
}

function lineClear(a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12));
  for (let i = 0; i <= n; i++) {
    if (!partnerFree(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  }
  return true;
}

// Shortest route from `from` to `to` through the waypoints.
function findRoute(from, to) {
  if (lineClear(from, to)) return [to];
  const nodes = [from, ...PARTNER_NODES, to];
  const dist = nodes.map(() => Infinity);
  const prev = nodes.map(() => -1);
  const done = nodes.map(() => false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === nodes.length - 1) break;
    done[u] = true;
    for (let v = 0; v < nodes.length; v++) {
      if (done[v] || v === u) continue;
      const d = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y);
      if (dist[u] + d < dist[v] && lineClear(nodes[u], nodes[v])) {
        dist[v] = dist[u] + d;
        prev[v] = u;
      }
    }
  }
  if (dist[nodes.length - 1] === Infinity) return null;
  const route = [];
  for (let i = nodes.length - 1; i > 0; i = prev[i]) route.unshift(nodes[i]);
  return route;
}

function spotTarget(spot) {
  if (spot.seat !== undefined) return ROOMS.apartment.seats[spot.seat].approach;
  return spot;
}

function partnerStandUp() {
  if (!partner.seat) return;
  partner.x = partner.seat.approach.x;
  partner.y = partner.seat.approach.y;
  partner.seat = null;
}

function choosePartnerSpot() {
  const options = PARTNER_SPOTS.filter((s) => s !== partner.spot && !(s.seat !== undefined && player.seat === ROOMS.apartment.seats[s.seat]));
  const spot = options[Math.floor(Math.random() * options.length)];
  partnerStandUp();
  const route = findRoute({ x: partner.x, y: partner.y }, spotTarget(spot));
  if (!route) {
    partner.stay = 3;
    return;
  }
  partner.spot = spot;
  partner.path = route;
}

function updatePartner(dt) {
  partner.wave = Math.max(0, partner.wave - dt);
  if (partner.room !== room.id || room.id !== 'apartment' || cuddle.active || together.mode) return;
  const near = Math.hypot(player.x - partner.x, player.y - partner.y) < PARTNER_GREET * room.scale && !player.seat;
  // Busy with you: kissing, celebrating or talking
  if (kiss.progress > 0 || kiss.celebrate > 0 || dialogue.active) {
    partner.walkTime = 0;
    return;
  }
  if (near) {
    if (!partner.greeted) {
      partner.greeted = true;
      partnerStandUp();
      partner.wave = WAVE_TIME;
    }
    partner.walkTime = 0;
    partner.idleTime = 0;
    partner.facing = Math.atan2(player.y - partner.y, player.x - partner.x);
    return;
  }
  partner.greeted = false;

  if (partner.path.length) {
    const t = partner.path[0];
    const dx = t.x - partner.x;
    const dy = t.y - partner.y;
    const d = Math.hypot(dx, dy);
    const step = WALK_SPEED * 0.8 * room.scale * dt;
    if (d <= step) {
      partner.x = t.x;
      partner.y = t.y;
      partner.path.shift();
      if (!partner.path.length) {
        partner.walkTime = 0;
        partner.idleTime = 0;
        partner.stay = PARTNER_STAY[0] + Math.random() * (PARTNER_STAY[1] - PARTNER_STAY[0]);
        const spot = partner.spot;
        if (spot.seat !== undefined) {
          const seat = ROOMS.apartment.seats[spot.seat];
          if (player.seat !== seat) {
            partner.seat = seat;
            partner.x = seat.x;
            partner.y = seat.y;
          }
        } else {
          partner.facing = spot.facing;
        }
      }
      return;
    }
    partner.x += (dx / d) * step;
    partner.y += (dy / d) * step;
    partner.walkTime += dt;
    partner.gait += step / room.scale / GAIT.walkCycle;
    partner.facing = Math.atan2(dy, dx);
    // Walk sideways when mostly sideways, otherwise step toward or away
    partner.moveDx = Math.abs(dx) > Math.abs(dy) * 0.6 ? Math.sign(dx) : 0;
    partner.moveDy = Math.sign(dy);
    return;
  }
  partner.walkTime = 0;
  partner.idleTime += dt;
  partner.stay -= dt;
  if (partner.stay <= 0) choosePartnerSpot();
}

// Partner on the couch: just sitting, no book.
function partnerSeatedPose(ch, seat) {
  if (cuddle.active) return cuddlePose(ch, seat, player.seat);
  if (ch.name === 'him') {
    if (seat.view === 'back') return { name: 'back', waistUp: true };
    return { name: 'floorSit' };
  }
  if (seat.view === 'back') return { name: 'couchBack' };
  if (seat.view === 'front') return { name: 'couchFront' };
  return { name: 'couchRight', mirror: seat.view === 'left' };
}

// ---- Dialogue -----------------------------------------------------------------
// Classic RPG text box: the speaker's portrait on the left, their name, and the
// line typing out across a big box at the bottom of the screen. Tap or press E
// to finish the line or move on. Plays after a full kiss bar.

const NAMES = { her: 'Her', him: 'Him' }; // put their real names here
const PORTRAITS = {
  her: { r: [8, 0, 102, 102] }, // head crops from each 'front' pose
  him: { r: [12, 0, 117, 117] },
};
const TYPE_SPEED = 38; // characters per second
// `a` is whoever gave the kisses, `b` whoever got them.
const KISS_TALKS = [
  [['b', 'What was that for?'], ['a', 'Do I need a reason?'], ['b', "No. But now it's my turn."]],
  [['b', 'Okay, okay, I surrender!'], ['a', 'Good. I win.'], ['b', 'Rematch. Right now.']],
  [['b', "You're in a really good mood today."], ['a', "I'm always in a good mood when I'm with you."], ['b', 'Smooth. Come here, you.']],
  [['b', 'The dog is staring at us, you know.'], ['a', "Let him stare. He's jealous."], ['b', 'Fair. Okay, my turn to steal some kisses.']],
  [['b', "I'm keeping count. That's at least a dozen."], ['a', 'Then I owe you another dozen.'], ['b', "I'll hold you to that."]],
];
const dialogue = { active: false, lines: [], i: 0, shown: 0, onDone: null, talk: 0, menu: null, endedAt: -1e9 };
const TALK_GRACE = 450; // ms after a chat ends when E is ignored

// ---- Talking ----------------------------------------------------------------------
// Walk up to the other person and press TALK. They say something, and a menu
// of things to say pops up next to the text box: pick one with up/down (or tap
// it) and press E / NEXT. You say what you picked, they answer, and most
// answers open another menu, so a chat can wander off in different directions.
// Some end in a kiss (with its own lines afterwards), a cuddle on the couch, or
// taking the dog out.
// In lines, 'me' is whoever you're playing and 'you' is the other person.
// Text can be one string, a list (one is picked at random), or a function.
// A choice is { label, to, say? }: you say `say` (or the label), then node `to`
// plays. A node has `lines` and then one of:
//   choices: [...]            another menu
//   to: 'id'                  straight on to another node
//   kiss: true                the usual kiss (chat, then swap characters)
//   kiss: { lines, then }     a kiss, these lines, then a node id / 'cuddle' / 'walk' (or swap if no `then`)
//   event: 'cuddle' | 'walk'  go and do it
// and optionally after(), run once its lines are done.
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const MAIN_CHOICES = [
  { label: 'Kiss', to: 'kiss', say: ['Come here, you.', "C'mere for a sec.", 'I owe you a kiss.'] },
  { label: 'Hug', to: 'hug', say: ['Hug?', "C'mere. Hug.", 'I need a hug.'] },
  { label: "How's your day going?", to: 'day' },
  { label: 'What should we do?', to: 'plans' },
  { label: 'You look really cute today.', to: 'compliment' },
  { label: "How's the pup doing?", to: 'dog' },
  { label: 'See you in a bit.', to: 'bye' },
];
const TALK_TREE = {
  hello: {
    lines: [['you', ['Hey, you.', "Oh, hi! What's up?", 'There you are.', 'Hiii. Need something?']]],
    choices: MAIN_CHOICES,
  },
  menu: { lines: [['you', ['Anything else?', "What else is on your mind?", 'Mm-hm?']]], choices: MAIN_CHOICES },
  kiss: { lines: [['you', ['Oh? Okay...', 'Mwah!', 'Finally.']]], kiss: true },
  hug: {
    lines: [['you', ['Aww. Always.', 'Hug time!', 'Get in here.']]],
    kiss: {
      pose: ['hug', 'hugSide', 'hugBack'],
      lines: [['you', 'Mm. You give the best hugs.'], ['me', "I've had practice."], ['you', 'On who?!'], ['me', 'The dog.']],
      then: 'menu',
    },
  },
  bye: { lines: [['you', ["Don't be long!", 'Okay, bye bye.', "I'll be here."]]] },

  // Shared endings
  hands_go: { lines: [['you', ['Lead the way.', 'Yes! Where are we going?', 'Okay. Hold on tight.']]], event: 'hands' },
  piggy_go: { lines: [['you', () => (partner.who === 'him' ? 'Hop on! ...Oof. Okay. Where to?' : "Yes! Bend down, I'm climbing on.")]], event: 'piggy' },
  selfie_go: { lines: [['you', 'Wait, get my good side!'], ['me', 'Say cheese!']], event: 'selfie' },
  selfie_after: {
    lines: [['you', ["Cute. That one's going on the fridge.", 'Send me that one!', "Okay, we're adorable."]]],
    choices: [
      { label: 'Another one?', to: 'selfie_again' },
      { label: 'We really are.', to: 'menu' },
    ],
  },
  selfie_again: { lines: [['you', 'Okay, silly face this time!']], event: 'selfie' },
  cuddle_go: { lines: [['you', ["Yay. Come on, let's get comfy.", 'Best idea all day.', "Scoot in. I've got the good blanket."]]], event: 'cuddle' },
  walk_go: { lines: [['you', ['He heard "walk." Look at that tail go.', 'Leash is by the door. Go go go!', "Okay buddy, let's go!"]]], event: 'walk', after: () => exciteDog() },

  // How's your day going?
  day: {
    lines: [['you', () => {
      if (partner.who === 'her' && reading.chapters > 0) return `Really good! I've read ${reading.chapters} chapter${reading.chapters === 1 ? '' : 's'} of my book.`;
      if (partner.who === 'him' && reading.levels > 0) return `Pretty great. I made it to level ${reading.levels + 1} in Forest Falls.`;
      return pick(["Slow, honestly. Better now that you're here.", 'Busy! But good.', "It's been a cozy one."]);
    }]],
    choices: [
      { label: 'Tell me everything.', to: 'day_tell' },
      { label: "Mine's been kind of long.", to: 'day_long' },
      { label: 'Never mind.', to: 'menu' },
    ],
  },
  day_tell: {
    lines: [['you', 'Honestly? The best part is right now.']],
    choices: [
      { label: 'Smooth.', to: 'day_smooth' },
      { label: 'Same here.', to: 'day_same' },
      { label: 'Come for a walk with me?', to: 'hands_go' },
    ],
  },
  day_smooth: {
    lines: [['you', 'I learned from the best.']],
    choices: [
      { label: 'Okay, that earns a kiss.', to: 'kiss_smooth' },
      { label: 'Ha. Flattery noted.', to: 'menu' },
    ],
  },
  kiss_smooth: {
    lines: [['you', 'I was hoping you would say that.']],
    kiss: { lines: [['you', 'Maybe I should be smooth more often.'], ['me', 'Please do.'], ['you', "Noted. Anything else, or are you just going to stand there smiling?"]], then: 'menu_smile' },
  },
  menu_smile: { lines: [['me', "I'm allowed to smile."]], choices: MAIN_CHOICES },
  day_same: {
    lines: [['you', "Then let's not waste it. Couch?"]],
    choices: [
      { label: 'Couch.', to: 'cuddle_go' },
      { label: 'In a bit.', to: 'menu' },
    ],
  },
  day_long: {
    lines: [['you', 'Aw, c\'mere. What happened?']],
    choices: [
      { label: 'Just tired.', to: 'day_tired' },
      { label: "Work stuff. Don't want to talk about it.", to: 'day_work' },
      { label: "Nothing, it's fine.", to: 'day_okay' },
    ],
  },
  day_tired: {
    lines: [['you', "Then you're getting cuddles. Doctor's orders."]],
    choices: [
      { label: 'Yes please.', to: 'cuddle_go' },
      { label: "I'm okay, really.", to: 'day_okay' },
    ],
  },
  day_work: {
    lines: [['you', 'Okay. Want a distraction instead?']],
    choices: [
      { label: 'A kiss would help.', to: 'kiss_better' },
      { label: "Let's take the dog out.", to: 'walk_go' },
      { label: 'Just sit with me a minute.', to: 'cuddle_go' },
    ],
  },
  kiss_better: {
    lines: [['you', 'Prescription filled.']],
    kiss: { pose: 'foreheadKiss', lines: [['you', 'Better?'], ['me', 'A little.'], ['you', 'Only a little? Okay, couch. Now. More treatment needed.']], then: 'cuddle' },
  },
  day_okay: { lines: [['you', "You sure? I'm right here if you want to talk."], ['me', 'I know. Thank you.']], to: 'menu' },

  // What should we do?
  plans: {
    lines: [['you', "Hmm... couch and a movie? Or the pup's been eyeing the door."]],
    choices: [
      { label: 'Couch and cuddles.', to: 'plans_couch' },
      { label: "Let's take the dog out.", to: 'plans_walk' },
      { label: 'Go for a little walk with me?', to: 'hands_go' },
      { label: 'Surprise me.', to: 'plans_surprise' },
      { label: 'Nothing. I just wanted to see you.', to: 'plans_see' },
    ],
  },
  plans_couch: {
    lines: [['you', "Deal. But kiss first. That's the rule."]],
    choices: [
      { label: 'Rules are rules.', to: 'kiss_rule' },
      { label: 'Cuddles first, kiss later?', to: 'plans_haggle' },
      { label: 'Ha. Maybe later.', to: 'menu' },
    ],
  },
  kiss_rule: {
    lines: [['you', 'Good. I like rules.']],
    kiss: { lines: [['you', 'Okay, rule satisfied.'], ['me', 'Couch?'], ['you', "Couch. You're the big spoon."]], then: 'cuddle' },
  },
  plans_haggle: { lines: [['you', "Fine... but I'm collecting later. With interest."]], event: 'cuddle' },
  plans_walk: {
    lines: [['you', "Good call. He's been giving us the eyes all afternoon."]],
    choices: [
      { label: 'Come on, buddy!', to: 'walk_go' },
      { label: 'Actually, five more minutes.', to: 'plans_wait' },
    ],
  },
  plans_wait: { lines: [['you', "He's going to sit by the door and sigh at you. Loudly."]], to: 'menu', after: () => exciteDog() },
  plans_surprise: {
    lines: [['you', 'Okay. Staring contest, loser owes the winner a kiss. Or... piggyback ride!']],
    choices: [
      { label: 'Staring contest. You\'re on.', to: 'stare' },
      { label: 'Piggyback!', to: 'piggy_go' },
      { label: "Those both sound like traps.", to: 'stare_trap' },
    ],
  },
  stare_trap: {
    lines: [['you', "It's only a trap if you lose."]],
    choices: [
      { label: "Fine. You're on.", to: 'stare' },
      { label: 'Not falling for it.', to: 'menu' },
    ],
  },
  stare: {
    lines: [['you', '...'], ['me', '...'], ['you', '...Ha! You blinked! I win.'], ['me', 'I absolutely did not.'], ['you', 'Pay up.']],
    choices: [
      { label: 'Fine, fine.', to: 'kiss_stare' },
      { label: 'Best two out of three.', to: 'stare_again' },
    ],
  },
  kiss_stare: {
    lines: [['you', 'Mm-hm. Come here, loser.']],
    kiss: { lines: [['you', 'Worth losing for?'], ['me', 'Every single time.']], then: 'menu' },
  },
  stare_again: {
    lines: [['you', '...'], ['me', '...'], ['you', 'Wow. You blinked AGAIN. That is two kisses.']],
    kiss: { lines: [['you', "That's two. I'm keeping a tab."], ['me', 'Put it on my account.'], ['you', "Oh, I will. It's getting very long."]], then: 'menu' },
  },
  plans_see: {
    lines: [['you', "...That's really sweet. Come sit with me?"]],
    choices: [
      { label: 'Yeah.', to: 'cuddle_go' },
      { label: 'In a minute.', to: 'menu' },
    ],
  },

  // You look really cute today.
  compliment: {
    lines: [['you', ['Stoppp. ...Okay, keep going.', 'Who, me?', "You're just saying that."]]],
    choices: [
      { label: 'I mean it.', to: 'comp_mean' },
      { label: 'Hold still, I want a picture.', to: 'selfie_go' },
      { label: 'Just teasing.', to: 'comp_tease' },
    ],
  },
  comp_mean: {
    lines: [['you', '...Okay, now you HAVE to kiss me.']],
    choices: [
      { label: 'Happily.', to: 'kiss_comp' },
      { label: 'Make me.', to: 'kiss_make' },
      { label: 'Later. Building suspense.', to: 'comp_later' },
    ],
  },
  kiss_comp: {
    lines: [['you', 'Hehe.']],
    kiss: { pose: 'kissSide', lines: [['you', "You're blushing."], ['me', "YOU'RE blushing."], ['you', "...Okay, we're both blushing."]], then: 'menu' },
  },
  kiss_make: {
    lines: [['you', 'Oh, I will.']],
    kiss: { lines: [['me', 'Okay. You made me.'], ['you', 'I always win.'], ['me', "I'm going to get you back, you know."], ['you', "Counting on it."]] },
  },
  comp_later: { lines: [['you', 'Suspense is overrated. ...But fine.']], to: 'menu' },
  comp_tease: {
    lines: [['you', "Wow. Rude. I'm telling the dog."]],
    choices: [
      { label: 'Wait, I was kidding!', to: 'comp_sorry' },
      { label: "He's on my side.", to: 'comp_side' },
    ],
  },
  comp_sorry: {
    lines: [['you', 'Hmm. I only accept apologies in cuddles.']],
    choices: [
      { label: 'Deal.', to: 'cuddle_go' },
      { label: 'How about a kiss?', to: 'kiss_sorry' },
    ],
  },
  kiss_sorry: {
    lines: [['you', "That's a start."]],
    kiss: { pose: 'foreheadKiss', lines: [['you', '...Okay. Apology accepted.'], ['me', 'And the cuddles?'], ['you', 'Those too. Come on.']], then: 'cuddle' },
  },
  comp_side: { lines: [['you', "He's right there. Let's ask him. ...See? He's wagging at ME."]], to: 'menu', after: () => exciteDog() },

  // How's the pup doing?
  dog: {
    lines: [['you', ['He stole one of my socks again.', 'He did the zoomies around the couch earlier.', 'Asleep on my side of the bed, obviously.']]],
    choices: [
      { label: 'Bad dog!', to: 'dog_bad' },
      { label: 'Good boy.', to: 'dog_good' },
      { label: 'Does he need to go out?', to: 'dog_out' },
    ],
  },
  dog_bad: {
    lines: [['you', "You don't mean that. Look at that face."]],
    after: () => exciteDog(),
    choices: [
      { label: '...Okay, good dog.', to: 'dog_good' },
      { label: "Fine. He's forgiven.", to: 'dog_forgive' },
    ],
  },
  dog_forgive: {
    lines: [['you', "He'd forgive you too. Want to take him out? He's earned it."]],
    choices: [
      { label: 'Walk time!', to: 'walk_go' },
      { label: 'After a nap.', to: 'dog_nap' },
    ],
  },
  dog_good: {
    lines: [['you', 'He really is. Best boy.']],
    after: () => exciteDog(),
    choices: [
      { label: 'Who wants a walk?', to: 'walk_go' },
      { label: 'Nap time for all three of us.', to: 'dog_nap' },
      { label: 'Back to us.', to: 'menu' },
    ],
  },
  dog_nap: { lines: [['you', 'Puppy pile! I love it.']], event: 'cuddle' },
  dog_out: {
    lines: [['you', "He's been sitting by the door. I think that's a yes."]],
    choices: [
      { label: "Let's go, buddy.", to: 'walk_go' },
      { label: 'In a little bit.', to: 'menu' },
    ],
  },
};

function talkText(t) {
  const v = typeof t === 'function' ? t() : Array.isArray(t) ? pick(t) : t;
  return v;
}

// [['me' | 'you', text]] → lines for the text box
function talkLines(lines) {
  return (lines || []).map(([who, text]) => ({ who: who === 'me' ? player.who : partner.who, text: talkText(text) }));
}

function startTalk() {
  player.wave = 0;
  player.idleTime = 0;
  player.walkTime = 0;
  player.facing = Math.atan2(partner.y - player.y, partner.x - player.x);
  partner.facing = Math.atan2(player.y - partner.y, player.x - partner.x);
  dialogue.active = true;
  dialogue.blink = 0;
  playTalkNode('hello');
}

// Show some lines, then call onDone.
function sayLines(lines, onDone) {
  dialogue.menu = null;
  dialogue.lines = lines;
  dialogue.i = 0;
  dialogue.shown = 0;
  dialogue.onDone = onDone;
  dialogue.active = true;
  dialogue.blink = 0;
}

function playTalkNode(id, first = []) {
  const node = TALK_TREE[id];
  sayLines([...first, ...talkLines(node.lines)], () => {
    node.after?.();
    if (node.choices) {
      // Keep the last line up while choosing
      dialogue.active = true;
      dialogue.i = Math.max(0, dialogue.lines.length - 1);
      dialogue.shown = dialogue.lines[dialogue.i]?.text.length ?? 0;
      dialogue.menu = { options: node.choices, sel: 0 };
    } else if (node.to) {
      talkThen(node.to);
    } else if (node.kiss) {
      giveKiss(talkText(node.kiss.pose));
      // Lines are worked out now, while 'me' is still who you're playing
      kiss.after = node.kiss === true ? null : { lines: talkLines(node.kiss.lines), then: node.kiss.then };
    } else if (node.event) {
      talkThen(node.event);
    }
  });
}

// Where a chat goes next: another node, an event, or (nothing) swap characters.
function talkThen(then) {
  if (!then) swapCharacters();
  else if (then === 'cuddle') startCuddle();
  else if (then === 'walk') startDogWalk();
  else if (then === 'hands' || then === 'piggy') startTogether(then);
  else if (then === 'selfie') startSelfie(() => playTalkNode('selfie_after'));
  else playTalkNode(then);
}

function chooseOption(i) {
  const m = dialogue.menu;
  if (!m) return;
  const opt = m.options[i ?? m.sel];
  dialogue.menu = null;
  // You say what you picked, then they answer
  playTalkNode(opt.to, [{ who: player.who, text: talkText(opt.say ?? opt.label) }]);
}

// Out the front door with the dog, wherever you are.
function startDogWalk() {
  const door = room.doors.find((d) => d.to === 'yard') ?? { to: 'yard' };
  useDoor(door);
}

// ---- Together -------------------------------------------------------------------------
// Art of the two of them together (assets/couple.png): kissing, hugging,
// cuddling, walking hand in hand, piggyback and a selfie. While one of these
// is showing, it's drawn in place of both characters. In the art he's always
// on the left; it's mirrored when she's on the left.
const coupleImg = loadImage('assets/couple.png');
const COUPLE = {
  front: [0, 0, 152, 219],
  frontRight: [154, 0, 135, 220],
  right: [291, 0, 135, 220],
  backRight: [428, 0, 144, 219],
  back: [574, 0, 150, 221],
  backLeft: [726, 0, 137, 221],
  left: [865, 0, 131, 220],
  frontLeft: [998, 0, 147, 220],
  hug: [1147, 0, 143, 233],
  hugSide: [1292, 0, 147, 234],
  hugBack: [1441, 0, 139, 232],
  kiss: [0, 236, 143, 227],
  kissSide: [145, 236, 139, 224],
  foreheadKiss: [286, 236, 138, 235],
  sideBySide: [426, 236, 156, 224],
  holdHands: [584, 236, 157, 223],
  cuddleSit: [743, 236, 208, 161],
  selfie: [953, 236, 163, 176],
  piggyback: [1118, 236, 156, 196],
  lean: [1276, 236, 207, 164],
  walk0: [0, 473, 163, 181],
  walk1: [165, 473, 162, 184],
  walk2: [329, 473, 167, 185],
  walk3: [498, 473, 147, 185],
  walk4: [647, 473, 160, 184],
  walk5: [809, 473, 155, 185],
  walk6: [966, 473, 165, 185],
  walk7: [1133, 473, 167, 185],
  sitBack: [1302, 473, 169, 138],
  talkHer: [0, 660, 148, 225],
  talkHim: [150, 660, 153, 225],
  talkBoth: [305, 660, 182, 225],
};
const COUPLE_K = 0.82; // sheet px to map px, so they match the single sprites
const COUPLE_WALK = 8; // walk frames per stride cycle

// Walking hand in hand ('hands') or with her on his back ('piggy'): you steer
// the two of them; E lets go.
const together = { mode: null, left: false };
const SELFIE_TIME = 4;
const selfie = { t: 0 }; // counts up while the photo is on screen; 0 = hidden

function hisSideLeft() {
  const hisX = player.who === 'him' ? player.x : partner.x;
  const herX = player.who === 'her' ? player.x : partner.x;
  return hisX <= herX;
}

function startTogether(mode) {
  partnerStandUp();
  together.mode = mode;
  together.left = false;
  partner.path = [];
  partner.walkTime = 0;
  partner.x = player.x;
  partner.y = player.y;
  player.walkTime = 0;
  player.idleTime = 0;
  player.cheer = 0;
  player.wave = 0;
  player.facing = Math.PI / 2;
  exciteDog();
}

// Let go: the other one steps out to their side.
function endTogether() {
  together.mode = null;
  const s = room.scale;
  const hisSide = together.left ? 1 : -1; // mirrored when walking left
  const side = partner.who === 'him' ? hisSide : -hisSide;
  let px = player.x + side * 34 * s;
  let mx = player.x - side * 18 * s;
  if (!isFree(px, player.y) || !isFree(mx, player.y)) {
    px = player.x + side * 4;
    mx = player.x;
  }
  partner.x = px;
  partner.y = player.y + 2;
  player.x = mx;
  partner.room = room.id;
  partner.facing = Math.atan2(player.y - partner.y, player.x - partner.x);
  partner.stay = 5;
  partner.greeted = true;
  partner.idleTime = 0;
  partner.walkTime = 0;
  player.facing = Math.atan2(partner.y - player.y, partner.x - player.x);
  player.walkTime = 0;
  player.nearHim = true; // no hello wave
}

function togetherFrame() {
  const moving = player.walkTime > 0;
  if (moving && player.moveDx !== 0) together.left = player.moveDx < 0;
  const bob = moving ? Math.abs(Math.sin(player.gait * Math.PI * 2)) * 4 : 0;
  if (together.mode === 'piggy') return { name: 'piggyback', mirror: together.left, lift: bob };
  if (moving) {
    if (player.moveDx !== 0) return { name: 'walk' + (Math.floor(player.gait * COUPLE_WALK) % COUPLE_WALK), mirror: player.moveDx < 0 };
    return { name: player.moveDy < 0 ? 'back' : 'front', lift: bob };
  }
  // The sheet's side views don't agree on which way they face, so turned
  // three-quarter frames (mirrored for the left) stand in for them.
  const i = ((Math.round(player.facing / (Math.PI / 4)) % 8) + 8) % 8;
  return [
    { name: 'frontRight' }, { name: 'frontRight' }, { name: 'holdHands' }, { name: 'frontRight', mirror: true },
    { name: 'frontRight', mirror: true }, { name: 'backRight', mirror: true }, { name: 'back' }, { name: 'backRight' },
  ][i];
}

// The pair to draw instead of the two of them, if any.
function coupleNow() {
  if (together.mode) return { ...togetherFrame(), x: player.x, y: player.y };
  if (cuddle.active && player.seat && partner.seat) {
    const x = (player.seat.x + partner.seat.x) / 2;
    if (player.seat.view === 'back') return { name: 'sitBack', x, y: player.seat.y + 8, shadow: false };
    // On the bed: sitting together, then her head on his shoulder, and back
    return { name: Math.floor(cuddle.t / 7) % 2 ? 'lean' : 'cuddleSit', x, y: player.seat.y + 30, shadow: false };
  }
  if (kiss.celebrate > 0 && kiss.pose) {
    return { name: kiss.pose, x: (player.x + partner.x) / 2, y: Math.max(player.y, partner.y), mirror: !hisSideLeft() };
  }
  if (chattingStanding()) return talkFrame();
  return null;
}

// Standing face to face having a chat (not on a seat, not mid-fade).
function chattingStanding() {
  return dialogue.active && !fade.door && partner.room === room.id && !player.seat && !partner.seat &&
    Math.hypot(player.x - partner.x, player.y - partner.y) < PARTNER_RANGE * 1.5 * room.scale;
}

// Whoever's speaking gets the talking pose; while their line types out it
// flips to the other chat frame every so often so they look animated.
function talkFrame() {
  const line = dialogue.lines[dialogue.i];
  const herTalking = line?.who === 'her';
  const typing = line && !dialogue.menu && dialogue.shown < line.text.length;
  const alt = typing && Math.floor(dialogue.blink / 0.45) % 2 === 1;
  const name = alt ? 'talkBoth' : herTalking ? 'talkHer' : 'talkHim';
  const mirror = !hisSideLeft();
  // In the art he's on the left: the bubble goes over whoever's talking
  const herSide = mirror ? -1 : 1;
  return {
    name,
    mirror,
    x: (player.x + partner.x) / 2,
    y: Math.max(player.y, partner.y),
    bubble: typing ? (herTalking ? herSide : -herSide) : 0,
  };
}

// "..." speech bubble, dots bouncing in turn
function drawTalkBubble(c, w, h) {
  const s = room.scale;
  const bx = c.x + c.bubble * w * COUPLE_K * 0.27 * s;
  const by = c.y - (h * COUPLE_K + 14) * s;
  const bw = 30 * s;
  const bh = 18 * s;
  ctx.save();
  ctx.fillStyle = '#fbf7ef';
  ctx.strokeStyle = '#2a1f1a';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(bx - bw / 2, by - bh, bw, bh, 8 * s);
  ctx.moveTo(bx - 4 * s, by);
  ctx.lineTo(bx - c.bubble * 6 * s, by + 7 * s);
  ctx.lineTo(bx + 4 * s, by);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fbf7ef';
  ctx.fillRect(bx - 4 * s, by - 2 * s, 8 * s, 3 * s); // hide the seam over the tail
  ctx.fillStyle = '#2a1f1a';
  for (let i = 0; i < 3; i++) {
    const hop = Math.max(0, Math.sin(dialogue.blink * 8 - i * 0.9)) * 2.5 * s;
    ctx.beginPath();
    ctx.arc(bx + (i - 1) * 7 * s, by - bh / 2 - hop, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCouple(c) {
  if (!spriteReady(coupleImg)) return;
  const [sx, sy, w, h] = COUPLE[c.name];
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(room.scale, room.scale);
  if (c.shadow !== false) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * COUPLE_K * 0.38, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(0, -(c.lift ?? 0));
  ctx.scale(c.mirror ? -COUPLE_K : COUPLE_K, COUPLE_K);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(coupleImg, sx, sy, w, h, -w / 2, -h, w, h);
  ctx.restore();
  if (c.bubble) drawTalkBubble(c, w, h);
}

function drawTogetherHud() {
  if (!together.mode || dialogue.active || fade.door) return;
  const sx = toScreenX(player.x);
  const sy = toScreenY(player.y - 200 * room.scale);
  const what = together.mode === 'piggy' ? 'hop off' : 'let go';
  ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  pill(isTouch ? `Tap ${what.toUpperCase()} to ${what}` : `E: ${what}`, sx, sy, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
}

// Selfie: a camera flash, then the photo pops up like a polaroid.
function startSelfie(onDone) {
  selfie.t = 0.0001;
  exciteDog();
  onDone?.();
}

function updateSelfie(dt) {
  if (selfie.t <= 0) return;
  selfie.t += dt;
  if (selfie.t > SELFIE_TIME) selfie.t = 0;
}

function drawSelfie() {
  if (selfie.t <= 0 || !spriteReady(coupleImg)) return;
  const t = selfie.t;
  const boxH = viewW < 500 ? 118 : 132;
  const size = Math.min(230, viewW * 0.55, (viewH - boxH - 60) * 0.8);
  const pop = Math.min(1, t / 0.25);
  const fadeOut = Math.min(1, (SELFIE_TIME - t) / 0.4);
  ctx.save();
  ctx.globalAlpha = Math.max(0, fadeOut);
  ctx.translate(viewW / 2, (viewH - boxH) / 2);
  ctx.rotate(-0.05);
  ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
  // Polaroid: white card, photo of the room behind you, the two of you in front
  const pad = size * 0.06;
  const W = size + pad * 2;
  const H = size + pad * 2 + size * 0.2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-W / 2 + 6, -H / 2 + 8, W, H);
  ctx.fillStyle = '#fbf7ef';
  ctx.fillRect(-W / 2, -H / 2, W, H);
  const px = -size / 2;
  const py = -H / 2 + pad;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, size, size);
  ctx.clip();
  if (spriteReady(room.img)) {
    const span = 300;
    const cx = Math.min(Math.max(player.x, span / 2), room.w - span / 2);
    const cy = Math.min(Math.max(player.y - 100, span / 2), room.h - span / 2);
    ctx.drawImage(room.img, cx - span / 2, cy - span / 2, span, span, px, py, size, size);
  } else {
    ctx.fillStyle = '#6b5a48';
    ctx.fillRect(px, py, size, size);
  }
  const [sx, sy, w, h] = COUPLE.selfie;
  const k = (size * 0.92) / Math.max(w, h);
  ctx.drawImage(coupleImg, sx, sy, w, h, -w * k / 2, py + size - h * k, w * k, h * k);
  ctx.restore();
  ctx.fillStyle = '#5b4a3a';
  ctx.font = `600 ${Math.round(size * 0.075)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('us ♥', 0, H / 2 - size * 0.1);
  ctx.restore();
  // Flash
  if (t < 0.35) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * (1 - t / 0.35)})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
}

// ---- Cuddling ----------------------------------------------------------------------
// From the talk menu: the screen fades, and you're both on the couch (or the
// bed) side by side, with the dog curled up next to you. Hearts drift up now
// and then; press E / KISS for a little peck, move to get up.
// She always takes the left spot. `dog` is where the dog lies.
const CUDDLE_SPOTS = {
  apartment: {
    left: { x: 478, y: 712, view: 'back', approach: { x: 478, y: 588 } },
    right: { x: 546, y: 712, view: 'back', approach: { x: 546, y: 588 } },
    dog: { x: 612, y: 722, flip: true, ground: { x: 612, y: 588 } },
  },
  bedroom: {
    left: { x: 392, y: 668, view: 'front', approach: { x: 392, y: 712 } },
    right: { x: 505, y: 672, view: 'front', approach: { x: 505, y: 712 } },
    dog: { x: 598, y: 655, flip: true, ground: { x: 598, y: 712 } },
  },
};
const CUDDLE_LINES = [
  [['you', 'Comfy?'], ['me', 'Very.']],
  [['you', 'This is my favorite part of the day.'], ['me', 'Mine too.']],
  [['me', 'Scoot over.'], ['you', 'Never. Just squish in.']],
  [['you', "Don't move. The dog's asleep and so am I, almost."]],
];
const cuddle = { active: false, heartIn: 0, peck: 0, t: 0 };

function startCuddle() {
  const spots = CUDDLE_SPOTS[room.id];
  if (!spots) return;
  fade.door = {
    fn: () => {
      const mine = player.who === 'her' ? spots.left : spots.right;
      const theirs = player.who === 'her' ? spots.right : spots.left;
      cuddle.active = true;
      cuddle.heartIn = 1.2;
      cuddle.t = 0;
      player.seat = { ...mine, dog: spots.dog };
      player.walkTime = 0;
      player.idleTime = 0;
      player.cheer = 0;
      reading.progress = 0;
      partner.seat = { ...theirs, dog: spots.dog };
      partner.x = theirs.x;
      partner.y = theirs.y;
      partner.path = [];
      partner.walkTime = 0;
      // The dog's already curled up with you when the fade lifts
      dog.state = 'couch';
      dog.hop = null;
      dog.lastSeat = player.seat;
      dog.x = spots.dog.x;
      dog.y = spots.dog.y;
      dog.flip = spots.dog.flip;
      dog.walkTime = 0;
      trail.length = 0;
      cam.snap = true;
      sayLines(talkLines(pick(CUDDLE_LINES)));
    },
  };
  fade.t = 0;
}

function endCuddle() {
  cuddle.active = false;
  partnerStandUp();
  partner.stay = 5; // stays put a moment before wandering off
  partner.greeted = true;
  partner.idleTime = 0;
}

function cuddleKiss() {
  if (cuddle.peck > 0) return;
  cuddle.peck = 0.5;
  const x = (player.seat.x + partner.seat.x) / 2;
  const y = player.seat.y - 120 * room.scale;
  for (let i = 0; i < 4; i++) addHeart(x + (i - 1.5) * 10, y, i % 2 === 0);
}

function updateCuddle(dt) {
  if (!cuddle.active) return;
  cuddle.t += dt;
  cuddle.peck = Math.max(0, cuddle.peck - dt);
  cuddle.heartIn -= dt;
  if (cuddle.heartIn <= 0) {
    cuddle.heartIn = 1.4 + Math.random() * 1.6;
    addHeart((player.seat.x + partner.seat.x) / 2 + (Math.random() - 0.5) * 30, player.seat.y - 115 * room.scale, false);
  }
}

// Leaning in toward each other. He has no couch art: his back from the waist
// up on the couch, cross-legged on the bed.
function cuddlePose(ch, seat, other) {
  const toward = other && other.x < seat.x ? 'left' : 'right';
  if (ch.name === 'him') return seat.view === 'back' ? { name: 'back', waistUp: true } : { name: 'floorSit' };
  if (seat.view === 'back') return { name: 'couchBackLeft', mirror: toward === 'right' };
  return { name: 'couchFrontRight', mirror: toward === 'left' };
}

function drawCuddleHud() {
  if (!cuddle.active || dialogue.active || fade.door) return;
  const sx = toScreenX((player.seat.x + partner.seat.x) / 2);
  const sy = toScreenY(player.seat.y - 160 * room.scale);
  ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  pill(isTouch ? 'Tap KISS for a kiss · arrows to get up' : 'E: kiss · move to get up', sx, sy, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
}

function moveChoice(d) {
  const m = dialogue.menu;
  if (!m) return;
  m.sel = (m.sel + d + m.options.length) % m.options.length;
}

// Where the choice list sits on screen (above the text box, on the right).
function choiceLayout() {
  const m = dialogue.menu;
  const boxW = Math.min(viewW - 24, 720);
  const boxH = viewW < 500 ? 118 : 132;
  const rowH = viewW < 500 ? 26 : 28;
  ctx.font = '600 14px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  const w = Math.min(boxW, Math.max(...m.options.map((o) => ctx.measureText(o.label).width)) + 52);
  const h = m.options.length * rowH + 16;
  const x = (viewW + boxW) / 2 - w;
  const y = viewH - boxH - 14 - h - 8;
  return { x, y, w, h, rowH };
}

function choiceAt(sx, sy) {
  if (!dialogue.menu) return -1;
  const L = choiceLayout();
  if (sx < L.x || sx > L.x + L.w || sy < L.y + 8 || sy > L.y + L.h - 8) return -1;
  return Math.min(dialogue.menu.options.length - 1, Math.floor((sy - L.y - 8) / L.rowH));
}

function drawChoices() {
  const m = dialogue.menu;
  if (!m) return;
  const L = choiceLayout();
  ctx.fillStyle = 'rgba(18, 14, 24, 0.94)';
  ctx.beginPath();
  ctx.roundRect(L.x, L.y, L.w, L.h, 10);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#efe6d8';
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  m.options.forEach((o, i) => {
    const y = L.y + 8 + i * L.rowH + L.rowH / 2;
    const on = i === m.sel;
    if (on) {
      ctx.fillStyle = 'rgba(239, 230, 216, 0.12)';
      ctx.beginPath();
      ctx.roundRect(L.x + 6, y - L.rowH / 2 + 2, L.w - 12, L.rowH - 4, 6);
      ctx.fill();
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.moveTo(L.x + 16, y - 6);
      ctx.lineTo(L.x + 24, y);
      ctx.lineTo(L.x + 16, y + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = `${on ? 700 : 600} 14px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
    const love = !!TALK_TREE[o.to]?.kiss; // leads to a kiss
    ctx.fillStyle = love ? '#ff9fc0' : on ? '#fff6e6' : '#d9cfc0';
    ctx.fillText((love ? '♥ ' : '') + o.label, L.x + 32, y + 1);
  });
  ctx.textAlign = 'center';
}

function startKissTalk(kisser, kissed, onDone) {
  const talk = KISS_TALKS[dialogue.talk % KISS_TALKS.length];
  dialogue.talk += 1;
  dialogue.menu = null;
  dialogue.lines = talk.map(([who, text]) => ({ who: who === 'a' ? kisser : kissed, text }));
  dialogue.i = 0;
  dialogue.shown = 0;
  dialogue.onDone = onDone;
  dialogue.active = true;
  dialogue.blink = 0;
}

function advanceDialogue() {
  if (dialogue.menu) {
    chooseOption();
    return;
  }
  const line = dialogue.lines[dialogue.i];
  if (!line) {
    dialogue.active = false;
    dialogue.endedAt = performance.now();
    dialogue.onDone?.();
    return;
  }
  if (dialogue.shown < line.text.length) {
    dialogue.shown = line.text.length; // finish typing first
    return;
  }
  dialogue.i += 1;
  dialogue.shown = 0;
  if (dialogue.i >= dialogue.lines.length) {
    dialogue.active = false;
    dialogue.endedAt = performance.now();
    const done = dialogue.onDone;
    dialogue.onDone = null;
    done?.();
  }
}

function updateDialogue(dt) {
  dialogue.blink += dt;
  const line = dialogue.lines[dialogue.i];
  if (line) dialogue.shown = Math.min(line.text.length, dialogue.shown + TYPE_SPEED * dt);
}

function wrapText(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawDialogue() {
  if (!dialogue.active) return;
  const line = dialogue.lines[dialogue.i];
  if (!line) return;
  const ch = CHARS[line.who];
  const pad = 12;
  const boxW = Math.min(viewW - 24, 720);
  const boxH = viewW < 500 ? 118 : 132;
  const bx = (viewW - boxW) / 2;
  const by = viewH - boxH - 14;
  const portrait = boxH - pad * 2;

  // Box: dark panel with a double border, the classic look
  ctx.fillStyle = 'rgba(18, 14, 24, 0.94)';
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 10);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#efe6d8';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(239, 230, 216, 0.35)';
  ctx.beginPath();
  ctx.roundRect(bx + 5, by + 5, boxW - 10, boxH - 10, 7);
  ctx.stroke();

  // Portrait in its own frame
  const px = bx + pad;
  const py = by + pad;
  ctx.fillStyle = line.who === 'her' ? '#4a2f3a' : '#2f2a4a';
  ctx.beginPath();
  ctx.roundRect(px, py, portrait, portrait, 6);
  ctx.fill();
  ctx.strokeStyle = '#efe6d8';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (spriteReady(ch.img)) {
    const f = ch.frames.front;
    const [cx, cy, cw, chh] = PORTRAITS[line.who].r;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px + 2, py + 2, portrait - 4, portrait - 4, 5);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    // Gentle bob while they talk
    const talking = dialogue.shown < line.text.length;
    const bob = talking ? Math.round(Math.sin(dialogue.blink * 14)) : 0;
    ctx.drawImage(ch.img, f.r[0] + cx, f.r[1] + cy, cw, chh, px + 4, py + 6 + bob, portrait - 8, portrait - 8);
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
  }

  // Name and text
  const tx = px + portrait + 14;
  const tw = bx + boxW - tx - pad;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 15px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillStyle = line.who === 'her' ? '#ff9fc0' : '#b9a6ff';
  ctx.fillText(NAMES[line.who], tx, py + 2);
  ctx.font = viewW < 500 ? '600 14px ui-rounded, "SF Pro Rounded", system-ui, sans-serif' : '600 17px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillStyle = '#f6efe4';
  const lh = viewW < 500 ? 19 : 23;
  const lines = wrapText(line.text, tw);
  let left = Math.floor(dialogue.shown);
  lines.forEach((l, k) => {
    const part = l.slice(0, Math.max(0, left));
    left -= l.length + 1;
    ctx.fillText(part, tx, py + 26 + k * lh);
  });
  // Blinking "next" arrow once the line is out
  if (!dialogue.menu && dialogue.shown >= line.text.length && Math.floor(dialogue.blink * 2.5) % 2 === 0) {
    const ax = bx + boxW - 24;
    const ay = by + boxH - 22;
    ctx.fillStyle = '#efe6d8';
    ctx.beginPath();
    ctx.moveTo(ax - 7, ay);
    ctx.lineTo(ax + 7, ay);
    ctx.lineTo(ax, ay + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawChoices();
}

// ---- Dog walks ---------------------------------------------------------------
// Every 30 seconds indoors the dog needs to go out, and you get 10 seconds to
// reach the front door (bottom of the living room). Out in the yard he's on a
// leash and wanders and sniffs until he goes; pick it up, throw it in the bin,
// then walk off the left edge to go back in. You can't go back in until you've
// cleaned up.

// The dog needs to go out at a random moment every 2 to 4 minutes indoors.
const WALK_MIN = 120;
const WALK_MAX = 240;
function nextWalkIn() {
  return WALK_MIN + Math.random() * (WALK_MAX - WALK_MIN);
}
const WALK_WARNING = 10; // seconds to reach the front door
const WALK_FAIL_TIME = 3.5; // how long the "too late" message stays up
const LEASH = 150; // leash length, map px (times the room scale)
const SQUAT_TIME = 2.2;
const BIN = { x: 1239, y: 268 }; // rim of the bin in the yard
const THROW_TIME = 0.6;

const walk = {
  next: nextWalkIn(), // countdown to the next warning
  warning: 0, // countdown while the dog is waiting at the door
  failT: 0, // countdown for the failure message
  phase: null, // in the yard: sniff | squat | poop | carry | clean
  sniffed: 0, // seconds of wandering so far
  needAfter: 0, // seconds of wandering before he goes
  squat: 0,
  poop: null, // { x, y } on the grass
  throwT: 0, // 0..1 while the bag flies to the bin
  throwFrom: null,
};

function updateWalk(dt) {
  walk.failT = Math.max(0, walk.failT - dt);
  if (room.id === 'yard' || fade.door || minigameActive()) return;
  if (walk.warning > 0) {
    walk.warning -= dt;
    if (walk.warning <= 0) {
      walk.warning = 0;
      walk.failT = WALK_FAIL_TIME;
      walk.next = nextWalkIn();
    }
    return;
  }
  walk.next -= dt;
  if (walk.next <= 0) walk.warning = WALK_WARNING;
}

// Reading, gaming or kissing: the dog waits until you're done.
function minigameActive() {
  return book.active || isGaming() || kiss.progress > 0 || kiss.celebrate > 0 || dialogue.active || cuddle.active;
}

function startWalk() {
  walk.warning = 0;
  walk.phase = 'sniff';
  walk.sniffed = 0;
  walk.needAfter = 8 + Math.random() * 6;
  walk.poop = null;
  walk.throwT = 0;
  dog.state = 'leash';
  dog.target = null;
  dog.sniff = 0;
}

function endWalk() {
  walk.phase = null;
  walk.next = nextWalkIn();
}

function nearPoop() {
  return walk.phase === 'poop' && walk.poop && Math.hypot(player.x - walk.poop.x, player.y - walk.poop.y) < 70 * room.scale;
}
function nearBin() {
  return walk.phase === 'carry' && walk.throwT === 0 && Math.hypot(player.x - BIN.x, player.y - (BIN.y + 110)) < 120 * room.scale;
}

function pickUpPoop() {
  walk.poop = null;
  walk.phase = 'carry';
  player.walkTime = 0;
}

function throwBag() {
  walk.throwT = 0.0001;
  walk.throwFrom = { x: player.x + Math.cos(player.facing) * 12, y: player.y - 80 * room.scale };
  player.facing = Math.atan2(BIN.y + 110 - player.y, BIN.x - player.x);
}

function updateYard(dt) {
  if (room.id !== 'yard') return;
  if (walk.throwT > 0) {
    walk.throwT += dt / THROW_TIME;
    if (walk.throwT >= 1) {
      walk.throwT = 0;
      walk.phase = 'clean';
      exciteDog();
    }
  }
  // Once it's all cleaned up, walking off the left edge takes you back inside.
  if (walk.phase === 'clean' && player.x < 60 && !fade.door) useDoor(room.doors[0]);
}

// The dog on the leash: wander to spots near you, stop to sniff, and
// eventually squat. If he gets to the end of the leash he's pulled along.
function updateLeashDog(dt) {
  const L = LEASH * room.scale;
  if (walk.squat > 0) {
    dog.walkTime = 0;
    walk.squat -= dt;
    if (walk.squat <= 0) {
      walk.poop = { x: dog.x + (dog.flip ? 22 : -22) * room.scale, y: dog.y + 2 };
      walk.phase = 'poop';
      dog.target = null;
      dog.sniff = 1.5;
    }
    return;
  }
  const away = Math.hypot(player.x - dog.x, player.y - dog.y);
  if (away > L) {
    // Pulled along by the leash
    dog.sniff = 0;
    dog.target = null;
    moveDogToward(player.x, player.y, Math.max(WALK_SPEED, RUN_SPEED * 0.9) * room.scale, dt * Math.min(1, (away - L) / 20 + 0.3));
    return;
  }
  if (walk.phase === 'sniff') walk.sniffed += dt;
  if (dog.sniff > 0) {
    dog.walkTime = 0;
    dog.sniff -= dt;
    if (walk.phase === 'sniff' && walk.sniffed > walk.needAfter) {
      walk.phase = 'squat';
      walk.squat = SQUAT_TIME;
    }
    return;
  }
  if (!dog.target) {
    const a = Math.random() * Math.PI * 2;
    const d = (0.3 + Math.random() * 0.6) * L;
    let tx = Math.min(1240, Math.max(60, player.x + Math.cos(a) * d));
    let ty = Math.min(980, Math.max(80, player.y + Math.sin(a) * d * 0.7));
    if (tx > 1170 && ty < 400) ty = 420; // keep out of the bin
    dog.target = { x: tx, y: ty };
  }
  if (moveDogToward(dog.target.x, dog.target.y, 110 * room.scale, dt)) {
    dog.target = null;
    dog.sniff = 0.8 + Math.random() * 1.6;
  }
}

function leashPose() {
  if (walk.squat > 0) return { name: 'sit' };
  if (dog.walkTime > 0) return { name: DOG_WALK[Math.floor(dog.stride / DOG_STEP) % DOG_WALK.length], left: dog.flip };
  if (dog.sniff > 0) return { name: 'bow', left: dog.flip }; // nose to the grass
  return { name: 'idle', left: dog.flip };
}

// Leash from her hand to his collar, sagging a little when slack.
function drawLeash() {
  if (room.id !== 'yard' || dog.state !== 'leash') return;
  const s = room.scale;
  const hx = player.x + Math.cos(player.facing) * 10 * s;
  const hy = player.y - 78 * s;
  const cx = dog.x + (dog.flip ? -1 : 1) * 16 * s;
  const cy = dog.y - (walk.squat > 0 ? 34 : 30) * s;
  const span = Math.hypot(cx - hx, cy - hy);
  const sag = Math.max(0, LEASH * s - span) * 0.35;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a0f0a';
  ctx.lineWidth = 3.2 * s;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo((hx + cx) / 2, (hy + cy) / 2 + sag, cx, cy);
  ctx.stroke();
  ctx.strokeStyle = '#b8342a';
  ctx.lineWidth = 1.8 * s;
  ctx.stroke();
  ctx.restore();
}

// A little pixel-art pile
function drawPoopAt(x, y, k) {
  const c = 3.6 * k;
  const rows = ['..##..', '.####.', '######'];
  ctx.fillStyle = '#2b170b';
  rows.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(x + (i - 3) * c - c * 0.3, y + (r - 3) * c - c * 0.3, c * 1.6, c * 1.6);
  });
  ctx.fillStyle = '#6b4220';
  rows.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(x + (i - 3) * c, y + (r - 3) * c, c, c);
  });
  ctx.fillStyle = '#93622f';
  ctx.fillRect(x - c, y - 3 * c, c, c);
}

function drawBag(x, y, k) {
  ctx.fillStyle = '#121a12';
  ctx.beginPath();
  ctx.roundRect(x - 5 * k, y - 5 * k, 10 * k, 10 * k, 3 * k);
  ctx.fill();
  ctx.fillStyle = '#2f5a36';
  ctx.beginPath();
  ctx.roundRect(x - 4 * k, y - 4 * k, 8 * k, 8 * k, 2.5 * k);
  ctx.fill();
  ctx.fillStyle = '#2f5a36';
  ctx.fillRect(x - 1.5 * k, y - 8 * k, 3 * k, 4 * k); // tied top
}

function drawYardGround() {
  if (room.id !== 'yard' || !walk.poop) return;
  drawPoopAt(walk.poop.x, walk.poop.y, room.scale);
}

function drawYardAir() {
  if (room.id !== 'yard') return;
  drawLeash();
  const s = room.scale;
  if (walk.phase === 'carry' && walk.throwT === 0) {
    // Dangling from her hand
    drawBag(player.x + Math.cos(player.facing) * 8 * s, player.y - 56 * s, s * 1.2);
  }
  if (walk.throwT > 0) {
    const t = walk.throwT;
    const x = walk.throwFrom.x + (BIN.x - walk.throwFrom.x) * t;
    const y = walk.throwFrom.y + (BIN.y - walk.throwFrom.y) * t - Math.sin(t * Math.PI) * 90 * s;
    drawBag(x, y, s);
  }
}

// Banner across the top of the screen
function drawWalkBanner() {
  let text = '';
  let warn = false;
  let bar = -1;
  if (walk.failT > 0) {
    text = 'Too late! He had an accident inside.';
    warn = true;
  } else if (walk.warning > 0) {
    text = `The dog needs to go out! Get to the front door: ${Math.ceil(walk.warning)}s`;
    warn = true;
    bar = walk.warning / WALK_WARNING;
  } else if (room.id === 'yard') {
    if (walk.phase === 'sniff') text = 'Walk him around until he goes';
    else if (walk.phase === 'squat') text = "He's going...";
    else if (walk.phase === 'poop') text = 'Pick up after him';
    else if (walk.phase === 'carry') text = 'Throw it in the bin';
    else if (walk.phase === 'clean') text = 'All clean! Walk off the left edge to go back inside';
    if (walk.phase !== 'clean' && player.x < 170) text = "You can't go back in until you've picked up after him";
  }
  if (!text) return;
  ctx.font = '700 14px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  const w = Math.min(viewW - 24, ctx.measureText(text).width + 28);
  const cx = viewW / 2;
  const y = 14;
  ctx.fillStyle = warn ? 'rgba(150, 38, 28, 0.92)' : 'rgba(28, 25, 21, 0.85)';
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, y, w, bar >= 0 ? 40 : 30, 10);
  ctx.fill();
  ctx.fillStyle = '#fff4e8';
  ctx.fillText(text, cx, y + 15, w - 16);
  if (bar >= 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(cx - w / 2 + 12, y + 29, w - 24, 5);
    ctx.fillStyle = '#ffd2a8';
    ctx.fillRect(cx - w / 2 + 12, y + 29, (w - 24) * bar, 5);
  }
}

// ---- Update --------------------------------------------------------------

function update(dt) {
  updateFade(dt);
  updateWalk(dt);
  updateCamera(dt);
  if (fade.door) {
    player.walkTime = 0; // hold still while the screen fades
    updateActionButton();
    return;
  }
  if (ff.active) {
    updateFF(dt);
    updateActionButton();
    updatePartner(dt);
    updateDog(dt);
    return;
  }
  if (dialogue.active) {
    player.walkTime = 0;
    updateDialogue(dt);
    updateActionButton();
    updateDog(dt);
    updateKiss(dt); // hearts keep floating away
    updateSelfie(dt);
    return;
  }
  updatePlayer(dt);
  updatePartner(dt);
  updateDog(dt);
  updateKiss(dt);
  updateCuddle(dt);
  updateSelfie(dt);
  updateYard(dt);
}

function updatePlayer(dt) {
  reading.popTime = Math.max(0, reading.popTime - dt);
  reading.flipTime = Math.max(0, reading.flipTime - dt);
  reading.sinceTurn = player.seat ? reading.sinceTurn + dt : 0;
  player.wave = Math.max(0, player.wave - dt);
  player.cheer = Math.max(0, player.cheer - dt);
  // Wave hello when she walks up to him
  const near = nearPartner();
  if (near && !player.nearHim && kiss.cooldown <= 0) player.wave = WAVE_TIME;
  player.nearHim = near;
  updateActionButton();
  if (book.active) {
    updateBook(dt);
    return;
  }

  const dirs = heldDirs();
  let dx = 0;
  let dy = 0;
  if (dirs.has('left')) dx -= 1;
  if (dirs.has('right')) dx += 1;
  if (dirs.has('up')) dy -= 1;
  if (dirs.has('down')) dy += 1;

  if (player.seat) {
    player.idleTime = 0;
    if (dx === 0 && dy === 0) {
      reading.progress = Math.max(0, reading.progress - READ_DECAY * dt);
      return;
    }
    standUp(dx, dy);
  }

  if (dx === 0 && dy === 0) {
    player.walkTime = 0;
    player.idleTime += dt;
    return;
  }
  player.idleTime = 0;
  player.wave = 0;
  player.moveDx = dx;
  player.moveDy = dy;

  const len = Math.hypot(dx, dy);
  const running = runToggle || keys.has('ShiftLeft') || keys.has('ShiftRight');
  const step = (running ? RUN_SPEED : WALK_SPEED) * room.scale * dt;
  const mx = (dx / len) * step;
  const my = (dy / len) * step;

  // Move each axis separately so the player slides along walls/furniture.
  if (isFree(player.x + mx, player.y)) player.x += mx;
  if (isFree(player.x, player.y + my)) player.y += my;
  player.stride += step / room.scale;
  player.gait += step / room.scale / (running ? GAIT.runCycle : GAIT.walkCycle);
  player.running = running;

  player.facing = Math.atan2(dy, dx);
  player.walkTime += dt * (running ? 1.8 : 1);
}

// ---- Render --------------------------------------------------------------

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const box = document.getElementById('game');
  viewW = box.clientWidth;
  viewH = box.clientHeight;
  // Zoom in, but never so far out that the room leaves empty margins on both axes.
  const fit = Math.min(viewW / room.w, viewH / room.h);
  scale = Math.max(fit, Math.min(viewW, viewH) / (VIEW_SPAN * room.scale));
  canvas.style.width = viewW + 'px';
  canvas.style.height = viewH + 'px';
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
}

// Follow her (a little above her feet so she sits mid-screen), easing toward
// her and stopping at the room's edges.
function updateCamera(dt) {
  const target = player.seat ?? player;
  let tx = target.x;
  let ty = target.y - 70 * room.scale;
  if (isGaming()) {
    // Look up toward the TV so you can watch the game
    tx = (target.x + TV.x + TV.w / 2) / 2;
    ty = (target.y - 90 + TV.y + TV.h / 2) / 2;
  }
  const halfW = viewW / scale / 2;
  const halfH = viewH / scale / 2;
  tx = room.w <= halfW * 2 ? room.w / 2 : Math.min(Math.max(tx, halfW), room.w - halfW);
  ty = room.h <= halfH * 2 ? room.h / 2 : Math.min(Math.max(ty, halfH), room.h - halfH);
  if (cam.snap) {
    cam.x = tx;
    cam.y = ty;
    cam.snap = false;
    return;
  }
  const k = Math.min(1, dt * 6);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
}

function toScreenX(x) {
  return (x - cam.x) * scale + viewW / 2;
}
function toScreenY(y) {
  return (y - cam.y) * scale + viewH / 2;
}

window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(document.getElementById('game'));
resize();

// ---- Character -------------------------------------------------------------
// Pixel-art sprites cut from her character sheets (assets/her.png), stored at
// 2 image px per map px. Each pose has an anchor: her feet for standing poses,
// the seat (bottom of her shorts) for couch poses. Poses that only exist facing
// one way are mirrored for the other side.

const HER_FRAMES = {
  front: { r: [0, 0, 118, 344], ax: 57, ay: 344, hem: 210 },
  frontRight: { r: [120, 0, 104, 344], ax: 44, ay: 344 },
  right: { r: [226, 0, 90, 342], ax: 54, ay: 342 },
  backRight: { r: [318, 0, 101, 342], ax: 54, ay: 342 },
  back: { r: [421, 0, 113, 342], ax: 56, ay: 342, hem: 210 },
  backLeft: { r: [536, 0, 101, 342], ax: 45, ay: 342 },
  idle: { r: [614, 346, 118, 344], ax: 58, ay: 344 },
  happy: { r: [734, 346, 138, 344], ax: 81, ay: 344 },
  peace: { r: [874, 346, 150, 344], ax: 92, ay: 344 },
  armsCrossed: { r: [1026, 346, 108, 344], ax: 52, ay: 344 },
  phone: { r: [1136, 346, 131, 344], ax: 57, ay: 344 },
  backpack: { r: [1269, 346, 112, 343], ax: 55, ay: 343 },
  wave: { r: [1383, 346, 167, 343], ax: 56, ay: 343 },
  floorSit: { r: [1552, 346, 141, 206], ax: 74, ay: 206 },
  couchFront: { r: [1695, 346, 136, 272], ax: 58, ay: 188 },
  couchFrontRight: { r: [1833, 346, 174, 272], ax: 24, ay: 194 },
  couchRight: { r: [0, 692, 187, 270], ax: 33, ay: 199 },
  couchBack: { r: [189, 692, 117, 195], ax: 56, ay: 190 },
  couchBackLeft: { r: [308, 692, 168, 259], ax: 127, ay: 188 },
};
const HIM_FRAMES = {
  front: { r: [0, 0, 141, 356], ax: 69, ay: 356, hem: 247 },
  frontRight: { r: [143, 0, 129, 357], ax: 58, ay: 357 },
  right: { r: [274, 0, 108, 365], ax: 52, ay: 365 },
  backRight: { r: [384, 0, 123, 366], ax: 62, ay: 366 },
  back: { r: [509, 0, 137, 360], ax: 68, ay: 360, hem: 248 },
  backLeft: { r: [648, 0, 123, 366], ax: 56, ay: 366 },
  idle: { r: [773, 0, 141, 353], ax: 70, ay: 353 },
  happy: { r: [916, 0, 222, 352], ax: 110, ay: 352 },
  armsCrossed: { r: [1140, 0, 138, 357], ax: 68, ay: 357 },
  wave: { r: [1280, 0, 166, 357], ax: 95, ay: 357 },
  phone: { r: [1448, 0, 154, 363], ax: 69, ay: 363 },
  floorSit: { r: [1604, 0, 196, 263], ax: 97, ay: 263 },
  crouch: { r: [1802, 0, 165, 264], ax: 89, ay: 264 },
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// Walking sideways is animated from each character's side-view pose split into
// layers (assets/*-walk.png, each layer the size of the 'right' pose): upper
// body, thigh, shin + shoe, darker copies of the leg for the far side, then the
// near arm and a darker far arm. Legs swing from the hip and bend at the knee;
// the body dips as the feet spread and rises as they pass, and the arms swing
// against the legs.
const SIDE_LAYERS = { upper: 0, thigh: 1, shin: 2, thighFar: 3, shinFar: 4, arm: 5, armFar: 6 };
const CHARS = {
  her: {
    name: 'her',
    img: loadImage('assets/her.png'),
    frames: HER_FRAMES,
    walkImg: loadImage('assets/her-walk.png'),
    side: {
      w: 90, h: 342, ax: 54, ay: 342,
      hip: { x: 53, y: 200 },
      knee: { x: 51, y: 252 },
      shoulder: { x: 46, y: 134 },
      thigh: 52, // hip to knee, sprite px
      shin: 90, // knee to sole
    },
    idlePoses: ['happy', 'peace', 'armsCrossed', 'phone', 'idle'],
    backIdle: 'backpack', // idle pose while facing away
  },
  him: {
    name: 'him',
    img: loadImage('assets/him.png'),
    frames: HIM_FRAMES,
    walkImg: loadImage('assets/him-walk.png'),
    side: {
      w: 108, h: 365, ax: 52, ay: 365,
      hip: { x: 52, y: 235 },
      knee: { x: 50, y: 290 },
      shoulder: { x: 52, y: 142 },
      thigh: 55,
      shin: 75,
    },
    idlePoses: ['armsCrossed', 'phone', 'crouch', 'happy', 'idle'],
    backIdle: null,
  },
};
const GAIT = {
  walkCycle: 150, // map px per full stride (two steps)
  runCycle: 230,
  swing: 0.42, // hip swing, radians each way
  runSwing: 0.62,
  knee: 0.85, // knee bend at mid-swing
  runKnee: 1.25,
  arm: 0.3, // arm swing, radians each way
  runArm: 0.5,
  lean: 0.035, // leans into the walk a little
  runLean: 0.08,
};
const LEG_LIFT = 14; // sprite px a foot rises when walking straight up or down

// Idle routine: after a short pause they strike a pose now and then, and after
// a long wait they sit down on the floor.
const IDLE_POSE_AFTER = 4;
const IDLE_POSE_EVERY = 6; // seconds per cycle once posing starts
const IDLE_POSE_HOLD = 3.5; // seconds of each cycle spent in the pose
const FLOOR_SIT_AFTER = 28;
const WAVE_TIME = 1.6;
const CHEER_TIME = 2.2;
const GLANCE_AFTER = 4; // seconds without a page turn before she looks at the dog

function spriteReady(img) {
  return img.complete && img.naturalWidth > 0;
}

// Standing pose for a facing angle (8 directions). Left-facing poses mirror
// their right-facing twins.
function standingPose(facing) {
  const oct = Math.round(facing / (Math.PI / 4));
  switch (((oct % 8) + 8) % 8) {
    case 0: return { name: 'right' };
    // The three-quarter front art looks toward the viewer's left, so mirror it for down-right.
    case 1: return { name: 'frontRight', mirror: true };
    case 2: return { name: 'front' };
    case 3: return { name: 'frontRight' };
    case 4: return { name: 'right', mirror: true };
    case 5: return { name: 'backLeft' };
    case 6: return { name: 'back' };
    default: return { name: 'backRight' };
  }
}

// Mostly facing away from the viewer?
function facingAway(facing) {
  return Math.sin(facing) < -0.38;
}

// Pose for the character you're playing.
function playerPose() {
  const ch = CHARS[player.who];
  if (player.seat) return seatedPose(ch, player.seat);
  return actorPose(ch, player, partner);
}

// Walking, waving, cheering or idling: shared by you and your partner.
function actorPose(ch, actor, other) {
  if (actor.walkTime > 0) {
    if (actor.moveDx !== 0) return { name: 'right', mirror: actor.moveDx < 0, side: true };
    return { name: actor.moveDy < 0 ? 'back' : 'front', stepping: true };
  }
  if (actor.cheer > 0) return { name: 'happy' };
  if (actor.wave > 0) return { name: 'wave', mirror: other.x < actor.x };
  const t = actor.idleTime;
  if (t > FLOOR_SIT_AFTER) return { name: 'floorSit' };
  if (t > IDLE_POSE_AFTER) {
    const cycle = Math.floor((t - IDLE_POSE_AFTER) / IDLE_POSE_EVERY);
    const inPose = (t - IDLE_POSE_AFTER) % IDLE_POSE_EVERY < IDLE_POSE_HOLD;
    if (inPose) {
      // Facing away, she alternates between showing her backpack and turning around
      if (facingAway(actor.facing) && ch.backIdle && cycle % 2 === 0) return { name: ch.backIdle };
      return { name: ch.idlePoses[(cycle * 3 + 1) % ch.idlePoses.length] };
    }
  }
  return standingPose(actor.facing);
}

// The character you're not playing: cheers when the kiss bar fills, otherwise
// turns to watch you when you're nearby.
function partnerPose() {
  const ch = CHARS[partner.who];
  if (kiss.celebrate > 0) return { name: 'happy' };
  if (partner.seat) return partnerSeatedPose(ch, partner.seat);
  if (dialogue.active || kiss.progress > 0) return standingPose(Math.atan2(player.y - partner.y, player.x - partner.x));
  return actorPose(ch, partner, player);
}

// On a seat she faces the way the seat faces, glances at the dog when she
// stops turning pages, and turns to the viewer when she finishes a chapter.
// He has no couch art: facing away he shows his back from the waist up,
// otherwise he sits cross-legged.
function seatedPose(ch, seat) {
  if (cuddle.active) return cuddlePose(ch, seat, partner.seat);
  const celebrating = reading.popTime > 0;
  if (ch.name === 'him') {
    if (seat.view === 'back' && !celebrating) return { name: 'back', waistUp: true };
    return { name: 'floorSit' };
  }
  const dogLeft = dog.x < seat.x;
  const glancing = !celebrating && reading.sinceTurn > GLANCE_AFTER && dog.state === 'couch';
  if (seat.view === 'back') {
    if (celebrating) return { name: 'couchFront' };
    if (glancing) return { name: 'couchBackLeft', mirror: !dogLeft };
    return { name: 'couchBack' };
  }
  if (seat.view === 'front') {
    if (glancing) return { name: 'couchFrontRight', mirror: dogLeft };
    return { name: 'couchFront' };
  }
  const left = seat.view === 'left';
  if (celebrating) return { name: 'couchFrontRight', mirror: left };
  return { name: 'couchRight', mirror: left };
}

// Draw part of a pose: [sx, sy, sw, sh] within the pose, at sprite offset (dx, dy).
function blitPose(ch, f, sx, sy, sw, sh, dx, dy) {
  ctx.drawImage(ch.img, f.r[0] + sx, f.r[1] + sy, sw, sh, sx - f.ax + dx, sy - f.ay + dy, sw, sh);
}

// Draw a character standing at (x, y). `actor` supplies the walk state.
function drawCharacter(ch, pose, x, y, actor, opts = {}) {
  if (!spriteReady(ch.img)) return;
  const f = ch.frames[pose.name];
  const [, , w, h] = f.r;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(room.scale, room.scale);
  if (!opts.seated) {
    const lift = opts.hop ?? 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, (pose.name === 'floorSit' ? 32 : 22) - lift * 0.3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, -lift);
  }
  const squash = opts.squash ?? 0;
  ctx.scale((pose.mirror ? -0.5 : 0.5) * (1 + squash * 0.06), 0.5 * (1 - squash * 0.08));
  ctx.imageSmoothingQuality = 'high';

  if (pose.side) {
    drawSideWalk(ch, actor);
  } else if (pose.stepping) {
    // Walking straight toward or away from the viewer: step each leg in turn.
    const s = Math.sin(actor.gait * Math.PI * 2); // same rhythm as the side-on walk
    const liftL = Math.max(0, s) * LEG_LIFT;
    const liftR = Math.max(0, -s) * LEG_LIFT;
    const bob = -Math.abs(s) * 3;
    const legTop = f.hem - 16;
    blitPose(ch, f, 0, legTop, f.ax, h - legTop, 0, -liftL);
    blitPose(ch, f, f.ax, legTop, w - f.ax, h - legTop, 0, -liftR);
    blitPose(ch, f, 0, 0, w, f.hem, 0, bob);
  } else if (pose.waistUp) {
    // Sitting with his back to us: only the part above the cushion shows.
    const cut = f.hem - 18;
    blitPose(ch, f, 0, 0, w, cut, 0, f.ay - cut + (opts.nudge ?? 0));
  } else {
    blitPose(ch, f, 0, 0, w, h, 0, opts.nudge ?? 0);
  }
  ctx.restore();
}

function drawPlayer() {
  const ch = CHARS[player.who];
  const pose = playerPose();
  const at = player.seat ?? player;
  // A small settle each time she turns a page
  const nudge = player.seat && reading.flipTime > 0 ? Math.sin((reading.flipTime / 0.25) * Math.PI) * 3 : 0;
  drawCharacter(ch, pose, at.x, at.y, player, { seated: !!player.seat, nudge });
}

function drawPartner() {
  let hop = 0;
  let squash = 0;
  if (kiss.celebrate > 0) {
    const t = CELEBRATE_TIME - kiss.celebrate;
    const f = ((t / CELEBRATE_TIME) * 4) % 1; // four hops
    hop = 4 * f * (1 - f) * 20;
    squash = f < 0.12 ? 1 - f / 0.12 : 0; // landing squish
  }
  drawCharacter(CHARS[partner.who], partnerPose(), partner.x, partner.y, partner, { hop, squash, seated: !!partner.seat });
}

function sideLayer(ch, layer) {
  const s = ch.side;
  ctx.drawImage(ch.walkImg, layer * s.w, 0, s.w, s.h, 0, 0, s.w, s.h);
}

function drawSideLeg(ch, thighLayer, shinLayer, hipAngle, kneeAngle) {
  const { hip, knee } = ch.side;
  ctx.save();
  ctx.translate(hip.x, hip.y);
  ctx.rotate(hipAngle);
  ctx.translate(-hip.x, -hip.y);
  sideLayer(ch, thighLayer);
  ctx.translate(knee.x, knee.y);
  ctx.rotate(kneeAngle);
  ctx.translate(-knee.x, -knee.y);
  sideLayer(ch, shinLayer);
  ctx.restore();
}

function drawSideArm(ch, layer, angle) {
  const { shoulder } = ch.side;
  ctx.save();
  ctx.translate(shoulder.x, shoulder.y);
  ctx.rotate(angle);
  ctx.translate(-shoulder.x, -shoulder.y);
  sideLayer(ch, layer);
  ctx.restore();
}

// One leg's hip and knee angles at this point in the stride. Positive angles
// swing the foot backward; the knee bends most while the leg swings through.
function legAngles(phase, run) {
  const swing = run ? GAIT.runSwing : GAIT.swing;
  const bend = run ? GAIT.runKnee : GAIT.knee;
  const hip = -swing * Math.sin(phase);
  const knee = bend * Math.pow(Math.max(0, Math.cos(phase)), 1.5) + 0.06;
  return { hip, knee };
}

function drawSideWalk(ch, actor) {
  if (!spriteReady(ch.walkImg)) return;
  const S = ch.side;
  const phase = actor.gait * Math.PI * 2;
  const run = actor.running;
  const near = legAngles(phase, run);
  const far = legAngles(phase + Math.PI, run);
  // Keep the lower foot on the floor: the more the legs spread, the lower the hips.
  const footY = (a) => S.thigh * Math.cos(a.hip) + S.shin * Math.cos(a.hip + a.knee);
  const drop = S.thigh + S.shin - Math.max(footY(near), footY(far));
  ctx.translate(-S.ax, -S.ay + drop);
  drawSideLeg(ch, SIDE_LAYERS.thighFar, SIDE_LAYERS.shinFar, far.hip, far.knee);
  drawSideLeg(ch, SIDE_LAYERS.thigh, SIDE_LAYERS.shin, near.hip, near.knee);
  ctx.save();
  ctx.translate(S.hip.x, S.hip.y);
  ctx.rotate(-(run ? GAIT.runLean : GAIT.lean) - Math.abs(Math.sin(phase)) * 0.015);
  ctx.translate(-S.hip.x, -S.hip.y);
  // Arms swing opposite their legs: the near arm goes back as the near leg steps forward.
  const armSwing = (run ? GAIT.runArm : GAIT.arm) * Math.sin(phase);
  drawSideArm(ch, SIDE_LAYERS.armFar, -armSwing);
  sideLayer(ch, SIDE_LAYERS.upper);
  drawSideArm(ch, SIDE_LAYERS.arm, armSwing);
  ctx.restore();
}
// Height of a pose above its anchor, in map px (for the HUD).
function poseHeight(who, pose) {
  const f = CHARS[who].frames[pose.name];
  return (pose.waistUp ? f.hem - 18 : f.ay) * 0.5 * room.scale;
}
function playerHeadHeight() {
  return poseHeight(player.who, playerPose());
}

function drawHitboxes() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 255, 120, 0.9)';
  for (const a of room.floor) ctx.strokeRect(a.x, a.y, a.w, a.h);
  ctx.fillStyle = 'rgba(255, 40, 40, 0.25)';
  ctx.strokeStyle = 'rgba(255, 40, 40, 0.9)';
  for (const o of partner.room === room.id ? [...room.obstacles, partnerBox()] : room.obstacles) {
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  }
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS * room.scale, 0, Math.PI * 2);
  ctx.stroke();
}

// Screen-space overlay: prompts, the reading bar and "Chapter Complete".
function drawHud() {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const anchor = player.seat ?? player;
  // Top of her head in map pixels: seated sprites are shorter than standing.
  const headTop = playerHeadHeight() + 4 * room.scale;
  const sx = toScreenX(anchor.x);
  // Stack above the "talk" hint when that's showing too
  const sy = toScreenY(anchor.y - headTop) - (canKiss() && partner.room === room.id ? 28 : 0);

  if (nearestDoor() && !fade.door) {
    const door = nearestDoor();
    ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    const text = isTouch ? `Tap ${door.label} to ${door.prompt}` : `Press E to ${door.prompt}`;
    pill(text, sx, sy - 14, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
  } else if (!player.seat && !together.mode && nearestSeat()) {
    ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    const what = gamesHere() ? 'play video games' : 'read';
    pill(isTouch ? `Tap SIT to ${what}` : `Press E to sit and ${what}`, sx, sy - 14, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
  }
  drawKissHud();
  drawCuddleHud();
  drawTogetherHud();
  if (!player.seat && (nearPoop() || nearBin())) {
    ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    const what = nearPoop() ? 'pick up the poop' : 'throw it in the bin';
    pill(isTouch ? `Tap ${nearPoop() ? 'PICK UP' : 'TRASH'} to ${what}` : `Press E to ${what}`, sx, sy - 14, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
  }
  drawWalkBanner();
  drawBookOverlay();
  drawFFOverlay();
  drawSelfie();
  drawDialogue();
  if (fade.door) {
    const k = fade.t < FADE_TIME ? fade.t / FADE_TIME : 2 - fade.t / FADE_TIME;
    ctx.fillStyle = `rgba(12, 10, 8, ${Math.min(1, Math.max(0, k))})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  ctx.restore();
}

function pill(text, cx, cy, bg, fg) {
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - 10, w, 20, 10);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, cx, cy + 0.5);
}

// ---- Dog -------------------------------------------------------------------
// Pixel-art pup from the sprite sheet (assets/dog.png). She follows the
// player's footsteps (so she never cuts through furniture) using the walk
// cycle; when the player stops she stands, then sits facing the player, lies
// down and eventually falls asleep. She hops up to lie on the couch while the
// player reads, and does a play bow when something exciting happens.

const dogImg = new Image();
dogImg.src = 'assets/dog.png';
// Poses in the dog image: [x, y, w, h], stored at 2 image px per map px.
// `headRight` says which way the art faces, so we know when to mirror it.
const DOG_FRAMES = {
  front: { r: [0, 0, 74, 111] },
  frontHeadLeft: { r: [76, 0, 76, 111] },
  right: { r: [154, 0, 137, 115] },
  back: { r: [293, 0, 60, 119] },
  left: { r: [355, 0, 139, 115] },
  frontHeadRight: { r: [496, 0, 75, 111] },
  walk1: { r: [573, 0, 141, 116], headRight: true },
  walk2: { r: [716, 0, 158, 116], headRight: true },
  walk3: { r: [876, 0, 150, 116], headRight: true },
  walk4: { r: [1028, 0, 179, 116], headRight: true },
  walk5: { r: [1209, 0, 168, 116], headRight: true },
  walk6: { r: [1379, 0, 171, 116], headRight: true },
  walk7: { r: [1552, 0, 164, 116], headRight: true },
  idle: { r: [1718, 0, 108, 97], headRight: false },
  sit: { r: [1828, 0, 78, 111] },
  lie: { r: [1908, 0, 118, 69], headRight: true },
  bow: { r: [2028, 0, 116, 102], headRight: false },
  sleep: { r: [2146, 0, 123, 69], headRight: false },
};
const DOG_WALK = ['walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7'];
const DOG_STEP = 16; // map px travelled per walk frame (~10 frames a second at her pace)
// How long she waits (seconds) before settling into each idle pose
const DOG_SIT_AFTER = 1.2;
const DOG_LIE_AFTER = 7;
const DOG_SLEEP_AFTER = 16;
const DOG_COUCH_SLEEP_AFTER = 12;
const DOG_BOW_TIME = 1.4;

const DOG_FOLLOW_DIST = 70; // how far behind (along her path) the dog trails
const DOG_MAX_SPEED = 380;
const HOP_TIME = 0.35;

const dog = {
  x: player.x - 50,
  y: player.y + 12,
  flip: false, // true = facing left
  walkTime: 0,
  wagTime: 0,
  stride: 0, // distance walked, drives the walk-cycle frame
  idleTime: 0, // how long she's been waiting for the player
  couchTime: 0, // how long she's been lying on the couch
  excited: 0, // play bow countdown
  state: 'follow', // follow | toCouch | hopUp | couch | hopDown
  hop: null, // { from, to, t }
};
const trail = []; // player footsteps the dog walks along

function dogSpotFor(seat) {
  return seat.dog;
}

function moveDogToward(tx, ty, speed, dt) {
  const dx = tx - dog.x;
  const dy = ty - dog.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return true;
  const step = Math.min(d, speed * dt);
  dog.x += (dx / d) * step;
  dog.y += (dy / d) * step;
  if (Math.abs(dx) > 0.5) dog.flip = dx < 0;
  dog.walkTime += dt * (speed / 260);
  // Faster means longer strides, not just quicker legs
  dog.stride += step / room.scale / Math.sqrt(Math.max(1, speed / (WALK_SPEED * room.scale)));
  return step >= d - 0.01;
}

function startHop(to, next) {
  dog.hop = { from: { x: dog.x, y: dog.y }, to, t: 0 };
  dog.state = next;
}

function updateDog(dt) {
  dog.wagTime += dt;
  dog.excited = Math.max(0, dog.excited - dt);
  if (dog.state === 'leash') {
    updateLeashDog(dt);
    return;
  }
  dog.couchTime = dog.state === 'couch' ? dog.couchTime + dt : 0;

  // Sitting down / standing up switches what the dog is doing.
  if (player.seat && (dog.state === 'follow' || dog.state === 'hopDown')) {
    dog.state = 'toCouch';
    dog.hop = null;
  }
  if (!player.seat && (dog.state === 'couch' || dog.state === 'toCouch' || dog.state === 'hopUp')) {
    const seat = dog.lastSeat;
    trail.length = 0;
    if (dog.state === 'toCouch' || !seat) {
      dog.state = 'follow';
    } else {
      startHop({ x: seat.dog.ground.x, y: seat.dog.ground.y }, 'hopDown');
    }
  }

  if (dog.state === 'toCouch') {
    const spot = dogSpotFor(player.seat);
    dog.lastSeat = player.seat;
    if (moveDogToward(spot.ground.x, spot.ground.y, DOG_MAX_SPEED * room.scale * 0.75, dt)) {
      startHop({ x: spot.x, y: spot.y }, 'hopUp');
    }
    return;
  }

  if (dog.state === 'hopUp' || dog.state === 'hopDown') {
    const h = dog.hop;
    h.t = Math.min(1, h.t + dt / HOP_TIME);
    dog.x = h.from.x + (h.to.x - h.from.x) * h.t;
    dog.y = h.from.y + (h.to.y - h.from.y) * h.t;
    if (Math.abs(h.to.x - h.from.x) > 1) dog.flip = h.to.x < h.from.x;
    if (h.t >= 1) {
      if (dog.state === 'hopUp') {
        dog.state = 'couch';
        dog.flip = dog.lastSeat.dog.flip;
      } else {
        dog.state = 'follow';
      }
      dog.hop = null;
    }
    return;
  }

  if (dog.state === 'couch') return;

  // Follow: drop footsteps as the player walks, then walk along them.
  const lastStep = trail[trail.length - 1];
  if (!lastStep || Math.hypot(player.x - lastStep.x, player.y - lastStep.y) > 6) {
    trail.push({ x: player.x, y: player.y });
  }
  while (trail.length > 1 && Math.hypot(dog.x - trail[0].x, dog.y - trail[0].y) < 6) trail.shift();

  // Remaining path length from the dog to the player along the footsteps.
  let pathLen = Math.hypot(trail[0].x - dog.x, trail[0].y - dog.y);
  for (let i = 1; i < trail.length; i++) {
    pathLen += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
  }

  const excess = pathLen - DOG_FOLLOW_DIST * room.scale;
  if (excess > 0) {
    const speed = Math.min(DOG_MAX_SPEED * room.scale, 100 + excess * 4);
    moveDogToward(trail[0].x, trail[0].y, speed, dt);
  } else {
    dog.walkTime = 0;
    dog.idleTime += dt;
    // Face toward the player while waiting.
    if (Math.abs(player.x - dog.x) > 4) dog.flip = player.x < dog.x;
  }
  if (dog.walkTime > 0) dog.idleTime = 0;
}

// Something fun happened: wake up and play bow (or just wake up on the couch).
function exciteDog() {
  dog.idleTime = 0;
  dog.couchTime = 0;
  if (dog.state === 'follow') dog.excited = DOG_BOW_TIME;
}

// Which pose to show, and whether her head should point left.
function dogPose() {
  if (dog.state === 'leash') return leashPose();
  if (dog.hop) return { name: 'walk4', left: dog.flip };
  if (dog.state === 'couch') {
    return { name: dog.couchTime > DOG_COUCH_SLEEP_AFTER ? 'sleep' : 'lie', left: dog.flip };
  }
  if (dog.walkTime > 0) {
    return { name: DOG_WALK[Math.floor(dog.stride / DOG_STEP) % DOG_WALK.length], left: dog.flip };
  }
  // Waiting: look toward the player.
  const tx = (player.seat ?? player).x - dog.x;
  const ty = (player.seat ?? player).y - dog.y;
  const toLeft = tx < 0;
  const side = Math.abs(tx) > Math.abs(ty) * 1.2;
  const above = !side && ty < 0;
  if (dog.excited > 0) return { name: 'bow', left: toLeft };
  const t = dog.idleTime;
  if (t > DOG_SLEEP_AFTER) return { name: 'sleep', left: toLeft };
  if (t > DOG_LIE_AFTER) return { name: 'lie', left: toLeft };
  if (t > DOG_SIT_AFTER) {
    if (above) return { name: 'back' };
    if (side) return { name: toLeft ? 'frontHeadLeft' : 'frontHeadRight' };
    return { name: 'front' };
  }
  if (above) return { name: 'back' };
  if (side) return { name: toLeft ? 'left' : 'right' };
  return { name: 'idle', left: toLeft };
}


function drawDog() {
  if (!spriteReady(dogImg)) return;
  const pose = dogPose();
  const f = DOG_FRAMES[pose.name];
  const [fx, fy, fw, fh] = f.r;
  // Mirror when the art faces the other way from where she should look.
  const mirror = f.headRight !== undefined && pose.left !== undefined && pose.left === f.headRight;
  let lift = 0;
  if (dog.hop) lift = Math.sin(dog.hop.t * Math.PI) * 22;
  // A little breathing on the couch and while lying or asleep
  const resting = pose.name === 'lie' || pose.name === 'sleep';
  const breathe = resting ? 1 + Math.sin(dog.wagTime * 2.2) * 0.02 : 1;

  ctx.save();
  ctx.translate(dog.x, dog.y);
  ctx.scale(room.scale, room.scale);
  if (dog.state !== 'couch') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, (fw / 4) * (1 - lift / 60), 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Trotting bounce: two little lifts per walk cycle
  const trot = pose.name.startsWith('walk') ? Math.abs(Math.sin((dog.stride / DOG_STEP / DOG_WALK.length) * Math.PI * 2)) * 2.2 : 0;
  ctx.translate(0, -lift - trot);
  ctx.scale(mirror ? -0.5 : 0.5, 0.5 * breathe);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(dogImg, fx, fy, fw, fh, -fw / 2, -fh, fw, fh);
  ctx.restore();
}

// ---- Kisses ----------------------------------------------------------------
// Walk up to whoever you're not playing and mash the action button to give
// them kisses; when the bar fills they cheer and hop while hearts float away,
// then you swap and play as them. Afterwards there's a quiet 5 second
// cooldown before they'll take more.

const KISS_COOLDOWN = 5; // seconds, not shown on screen
const CELEBRATE_TIME = 2.4;


const kiss = {
  progress: 0,
  cooldown: 0,
  celebrate: 0, // counts down while he's jumping
  burstLeft: 0, // hearts still to release in the celebration
  after: null, // { lines, then } for a kiss from the talk menu
  pose: null, // couple art shown while it lasts
};
const hearts = [];

function nearPartner() {
  return partner.room === room.id && Math.hypot(player.x - partner.x, player.y - partner.y) < PARTNER_RANGE * room.scale;
}

function canKiss() {
  return !together.mode && !player.seat && kiss.celebrate <= 0 && !dialogue.active && nearPartner();
}

// Take control of the partner; you stay behind in their place.
function swapCharacters() {
  partnerStandUp();
  const was = { who: player.who, x: player.x, y: player.y };
  player.who = partner.who;
  player.x = partner.x;
  player.y = partner.y;
  player.facing = Math.atan2(was.y - partner.y, was.x - partner.x);
  player.walkTime = 0;
  player.idleTime = 0;
  player.cheer = 0;
  player.wave = 0;
  player.nearHim = true; // no hello wave straight after swapping
  partner.who = was.who;
  partner.x = was.x;
  partner.y = was.y;
  partner.room = room.id;
  partner.facing = Math.atan2(player.y - was.y, player.x - was.x);
  partner.path = [];
  partner.spot = null;
  partner.stay = 6;
  partner.greeted = true; // already together: no hello wave
  partner.walkTime = 0;
  partner.idleTime = 0;
  trail.length = 0;
}

function addHeart(x, y, big) {
  hearts.push({
    x,
    y,
    vx: (Math.random() - 0.5) * (big ? 50 : 20),
    vy: -(big ? 55 + Math.random() * 45 : 45 + Math.random() * 15),
    t: 0,
    life: big ? 1.8 + Math.random() * 0.8 : 1.1,
    size: big ? 2.2 + Math.random() * 1.2 : 1.8,
    phase: Math.random() * Math.PI * 2,
  });
}

// `pose` is the couple art to show: a kiss (default), a hug, a forehead kiss...
function giveKiss(pose) {
  kiss.pose = pose ?? pick(['kiss', 'kissSide']);
  player.wave = 0;
  player.idleTime = 0;
  player.facing = Math.atan2(partner.y - player.y, partner.x - player.x);
  player.walkTime = 0;
  // A little heart pops up between them with every kiss
  addHeart((player.x + partner.x) / 2, Math.min(player.y, partner.y) - 150 * room.scale, false);
  for (let i = 0; i < 3; i++) addHeart((player.x + partner.x) / 2 + (i - 1) * 14, Math.min(player.y, partner.y) - 150 * room.scale, false);
  kiss.celebrate = CELEBRATE_TIME;
  kiss.cooldown = KISS_COOLDOWN;
  player.cheer = CHEER_TIME;
  exciteDog();
  kiss.burstLeft = 22;
}

function updateKiss(dt) {
  kiss.cooldown = Math.max(0, kiss.cooldown - dt);
  if (kiss.celebrate > 0) {
    kiss.celebrate = Math.max(0, kiss.celebrate - dt);
    // Have a little chat, then swap who you're playing. A kiss from the talk
    // menu has its own lines and can lead on to something else instead.
    if (kiss.celebrate === 0) {
      const after = kiss.after;
      kiss.after = null;
      if (after) sayLines(after.lines, () => talkThen(after.then));
      else startKissTalk(player.who, partner.who, swapCharacters);
    }
  }

  // Release the celebration hearts over the first part of the jump
  if (kiss.burstLeft > 0) {
    const due = Math.ceil((kiss.celebrate - CELEBRATE_TIME * 0.35) / (CELEBRATE_TIME * 0.65) * 22);
    while (kiss.burstLeft > Math.max(0, due)) {
      addHeart(partner.x + (Math.random() - 0.5) * 50, partner.y - 175 * room.scale + Math.random() * 30, true);
      kiss.burstLeft -= 1;
    }
  }

  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.t += dt;
    h.x += (h.vx + Math.sin(h.t * 4 + h.phase) * 18) * dt;
    h.y += h.vy * dt;
    h.vy *= 1 - 0.25 * dt; // drift up, slowing gently
    if (h.t >= h.life) hearts.splice(i, 1);
  }
}

// Pixel heart, 7 x 6 cells
const HEART_ROWS = [
  '.##.##.',
  '#######',
  '#######',
  '.#####.',
  '..###..',
  '...#...',
];

function drawHeart(cx, cy, cell, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const x0 = cx - 3.5 * cell;
  const y0 = cy - 3 * cell;
  // Dark edge first, slightly larger, then the pink fill and a highlight
  ctx.fillStyle = '#5a1530';
  HEART_ROWS.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '#') ctx.fillRect(x0 + c * cell - cell * 0.35, y0 + r * cell - cell * 0.35, cell * 1.7, cell * 1.7);
    }
  });
  ctx.fillStyle = '#ff5c8d';
  HEART_ROWS.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '#') ctx.fillRect(x0 + c * cell, y0 + r * cell, cell + 0.2, cell + 0.2);
    }
  });
  ctx.fillStyle = '#ffd1df';
  ctx.fillRect(x0 + cell, y0 + cell, cell, cell);
  ctx.restore();
}

function drawHearts() {
  for (const h of hearts) {
    const k = h.t / h.life;
    const alpha = k < 0.15 ? k / 0.15 : k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1;
    const grow = Math.min(1, 0.5 + k * 3);
    drawHeart(h.x, h.y, h.size * grow, Math.max(0, alpha));
  }
}

// "Press E to talk" over the other person when you're close enough.
function drawKissHud() {
  if (partner.room !== room.id || kiss.celebrate > 0 || player.seat || dialogue.active || together.mode) return;
  if (!nearPartner()) return;
  const sx = toScreenX(partner.x);
  const sy = toScreenY(partner.y - poseHeight(partner.who, partnerPose()) - 6);
  ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  pill(isTouch ? 'Tap TALK to chat' : 'Press T to talk', sx, sy - 14, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
}

// Draw everyone back to front so whoever is lower on screen is in front.
function drawActors() {
  const pair = coupleNow();
  if (pair) {
    const both = [
      { y: pair.y, draw: () => drawCouple(pair) },
      { y: dog.hop ? Math.max(dog.hop.from.y, dog.hop.to.y) : dog.y, draw: drawDog },
    ];
    both.sort((a, b) => a.y - b.y);
    for (const a of both) a.draw();
    return;
  }
  const actors = [
    { y: player.seat ? player.seat.y : player.y, draw: drawPlayer },
    { y: dog.hop ? Math.max(dog.hop.from.y, dog.hop.to.y) : dog.y, draw: drawDog },
  ];
  if (partner.room === room.id) actors.push({ y: partner.y, draw: drawPartner });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1c1915';
  ctx.fillRect(0, 0, viewW, viewH);
  // World space: map pixels, centred on the camera
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (viewW / 2 - cam.x * scale), dpr * (viewH / 2 - cam.y * scale));
  if (room.img.complete && room.img.naturalWidth) {
    ctx.drawImage(room.img, 0, 0, room.w, room.h);
  }
  if (room.id === 'apartment') drawTv();
  drawYardGround();
  drawActors();
  drawYardAir();
  drawHearts();
  if (showHitboxes) drawHitboxes();
  drawHud();
}

// ---- Loop ----------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
