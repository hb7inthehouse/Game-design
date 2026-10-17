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
      { name: 'him', x: 1112, y: 455, w: 40, h: 24 }, // matches HIM.x / HIM.y
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
};
for (const rm of Object.values(ROOMS)) {
  rm.img = new Image();
  rm.img.src = rm.src;
}
let room = ROOMS[window.claude?.hot?.data?.room] ?? ROOMS.apartment;

const SIT_RANGE = 80;

// Reading: spam the action button to fill the bar and finish a chapter.
const READ_PER_PRESS = 0.075; // ~14 presses per chapter
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

const reading = {
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

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && !e.repeat) showHitboxes = !showHitboxes;
  if (ACTION_KEYS.includes(e.code)) {
    e.preventDefault();
    if (!e.repeat) action(); // holding doesn't count; you have to mash it
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
  runToggle = !runToggle;
  runBtn.setAttribute('aria-pressed', String(runToggle));
});

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
  if (player.seat) {
    e.preventDefault();
    action();
  }
});

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

function isFree(x, y) {
  const r = PLAYER_RADIUS * room.scale;
  // Edges of her footprint all have to be on the floor
  const onFloor = (px, py) => room.floor.some((a) => px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h);
  if (![[x, y], [x - r, y], [x + r, y], [x, y - r], [x, y + r]].every(([px, py]) => onFloor(px, py))) return false;
  return !room.obstacles.some((o) => circleHitsRect(x, y, r, o));
}

// ---- Sitting and reading ---------------------------------------------------

function nearestSeat() {
  let best = null;
  let bestDist = SIT_RANGE;
  for (const seat of room.seats) {
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
  return room.doors.find((d) => Math.hypot(player.x - d.x, player.y - d.y) < d.range * room.scale) ?? null;
}

function useDoor(door) {
  if (fade.door) return;
  fade.door = door;
  fade.t = 0;
  player.walkTime = 0;
}

// Swap rooms at the darkest point of the fade.
function arriveThrough(door) {
  const from = room.id;
  room = ROOMS[door.to];
  const entry = room.doors.find((d) => d.to === from);
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
  resize();
  cam.snap = true;
}

function updateFade(dt) {
  if (!fade.door) return;
  const before = fade.t;
  fade.t += dt;
  if (before < FADE_TIME && fade.t >= FADE_TIME) arriveThrough(fade.door);
  if (fade.t >= FADE_TIME * 2) fade.door = null;
}

function action() {
  if (fade.door) return;
  if (player.seat) {
    if (reading.popTime > CHAPTER_POP_TIME - 0.5) return; // brief pause after a chapter
    reading.progress = Math.min(1, reading.progress + READ_PER_PRESS);
    reading.flipTime = 0.25;
    reading.sinceTurn = 0;
    if (reading.progress >= 1) {
      reading.chapters += 1;
      saveChapters(reading.chapters);
      reading.progress = 0;
      reading.popTime = CHAPTER_POP_TIME;
      exciteDog();
    }
    return;
  }
  if (canKiss()) {
    giveKiss();
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
  }
}

function standUp(dx, dy) {
  const seat = player.seat;
  player.seat = null;
  player.x = seat.approach.x;
  player.y = seat.approach.y;
  player.facing = Math.atan2(dy, dx);
  reading.progress = 0;
}

function updateActionButton() {
  let label = '';
  if (player.seat) label = 'READ';
  else if (canKiss()) label = 'KISS';
  else if (nearestDoor()) label = nearestDoor().label;
  else if (nearestSeat()) label = 'SIT';
  if (fade.door) label = '';
  if (actionBtn.textContent !== label) actionBtn.textContent = label;
  actionBtn.disabled = !label;
}

// ---- Update --------------------------------------------------------------

function update(dt) {
  updateFade(dt);
  updateCamera(dt);
  if (fade.door) {
    player.walkTime = 0; // hold still while the screen fades
    updateActionButton();
    return;
  }
  updatePlayer(dt);
  updateDog(dt);
  updateKiss(dt);
}

function updatePlayer(dt) {
  reading.popTime = Math.max(0, reading.popTime - dt);
  reading.flipTime = Math.max(0, reading.flipTime - dt);
  reading.sinceTurn = player.seat ? reading.sinceTurn + dt : 0;
  player.wave = Math.max(0, player.wave - dt);
  player.cheer = Math.max(0, player.cheer - dt);
  // Wave hello when she walks up to him
  const near = room.id === 'apartment' && nearHim();
  if (near && !player.nearHim && kiss.cooldown <= 0) player.wave = WAVE_TIME;
  player.nearHim = near;
  updateActionButton();

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

const herImg = new Image();
herImg.src = 'assets/her.png';
const HER_FRAMES = {
  front: { r: [0, 0, 118, 344], ax: 57, ay: 344, hem: 210 },
  frontRight: { r: [120, 0, 104, 344], ax: 44, ay: 344 },
  right: { r: [226, 0, 90, 342], ax: 54, ay: 342 },
  backRight: { r: [318, 0, 101, 342], ax: 54, ay: 342 },
  back: { r: [421, 0, 113, 342], ax: 56, ay: 342, hem: 210 },
  backLeft: { r: [536, 0, 101, 342], ax: 45, ay: 342 },
  walk1: { r: [639, 0, 190, 334], ax: 101, ay: 334 },
  walk2: { r: [831, 0, 204, 334], ax: 108, ay: 334 },
  walk3: { r: [1037, 0, 208, 334], ax: 110, ay: 334 },
  walk4: { r: [1247, 0, 214, 334], ax: 113, ay: 334 },
  walk5: { r: [1463, 0, 214, 332], ax: 109, ay: 332 },
  walk6: { r: [1679, 0, 212, 334], ax: 112, ay: 334 },
  walk7: { r: [0, 346, 219, 338], ax: 115, ay: 338 },
  walk8: { r: [221, 346, 197, 334], ax: 104, ay: 334 },
  walk9: { r: [420, 346, 192, 334], ax: 101, ay: 334 },
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
// Walking sideways is animated from her side-view pose split into layers
// (assets/her-walk.png, each layer 90 x 342 like the 'right' pose): upper body,
// thigh, shin + shoe, and darker copies of the leg for the far side. Legs swing
// from the hip and bend at the knee; she dips as her feet spread and rises as
// they pass, which is what gives a walk its weight.
const herWalkImg = new Image();
herWalkImg.src = 'assets/her-walk.png';
const SIDE = {
  w: 90, h: 342, ax: 54, ay: 342,
  hip: { x: 53, y: 200 },
  knee: { x: 51, y: 252 },
  thigh: 52, // hip to knee, sprite px
  shin: 90, // knee to sole
};
const SIDE_LAYERS = { upper: 0, thigh: 1, shin: 2, thighFar: 3, shinFar: 4, arm: 5, armFar: 6 };
const SHOULDER = { x: 46, y: 134 };
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
const HER_LEG_LIFT = 14; // sprite px a foot rises when walking straight up or down

// Idle routine: after a short pause she strikes a pose now and then, and after a
// long wait she sits down on the floor.
const IDLE_POSE_AFTER = 4;
const IDLE_POSE_EVERY = 6; // seconds per cycle once posing starts
const IDLE_POSE_HOLD = 3.5; // seconds of each cycle spent in the pose
const IDLE_POSES = ['happy', 'peace', 'armsCrossed', 'phone', 'idle'];
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

// Which way is she looking when she faces mostly away from the viewer?
function facingAway(facing) {
  return Math.sin(facing) < -0.38;
}

function playerPose() {
  if (player.seat) return seatedPose(player.seat);
  if (player.walkTime > 0) {
    if (player.moveDx !== 0) return { name: 'right', mirror: player.moveDx < 0, side: true };
    return { name: player.moveDy < 0 ? 'back' : 'front', stepping: true };
  }
  if (player.cheer > 0) return { name: 'happy' };
  if (player.wave > 0) return { name: 'wave', mirror: HIM.x < player.x };
  const t = player.idleTime;
  if (t > FLOOR_SIT_AFTER) return { name: 'floorSit' };
  if (t > IDLE_POSE_AFTER) {
    const cycle = Math.floor((t - IDLE_POSE_AFTER) / IDLE_POSE_EVERY);
    const inPose = (t - IDLE_POSE_AFTER) % IDLE_POSE_EVERY < IDLE_POSE_HOLD;
    if (inPose) {
      // Facing away, she alternates between showing her backpack and turning around
      if (facingAway(player.facing) && cycle % 2 === 0) return { name: 'backpack' };
      return { name: IDLE_POSES[(cycle * 3 + 1) % IDLE_POSES.length] };
    }
  }
  return standingPose(player.facing);
}

// On a seat she faces the way the seat faces, glances at the dog when she
// stops turning pages, and turns to the viewer when she finishes a chapter.
function seatedPose(seat) {
  const dogLeft = dog.x < seat.x;
  const celebrating = reading.popTime > 0;
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
function blitHer(f, sx, sy, sw, sh, dx, dy) {
  ctx.drawImage(herImg, f.r[0] + sx, f.r[1] + sy, sw, sh, sx - f.ax + dx, sy - f.ay + dy, sw, sh);
}

function drawPlayer() {
  if (!spriteReady(herImg)) return;
  const pose = playerPose();
  const f = HER_FRAMES[pose.name];
  const at = player.seat ?? player;
  const [, , w, h] = f.r;

  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(room.scale, room.scale);
  if (!player.seat) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, pose.name === 'floorSit' ? 32 : 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.scale(pose.mirror ? -0.5 : 0.5, 0.5);
  ctx.imageSmoothingQuality = 'high';

  if (pose.side) {
    drawSideWalk();
  } else if (pose.stepping) {
    // Walking straight toward or away from the viewer: step each leg in turn.
    const s = Math.sin(player.gait * Math.PI * 2); // same rhythm as the side-on walk
    const liftL = Math.max(0, s) * HER_LEG_LIFT;
    const liftR = Math.max(0, -s) * HER_LEG_LIFT;
    const bob = -Math.abs(s) * 3;
    const legTop = f.hem - 16;
    blitHer(f, 0, legTop, f.ax, h - legTop, 0, -liftL);
    blitHer(f, f.ax, legTop, w - f.ax, h - legTop, 0, -liftR);
    blitHer(f, 0, 0, w, f.hem, 0, bob);
  } else {
    // A small settle each time she turns a page
    const nudge = player.seat && reading.flipTime > 0 ? Math.sin((reading.flipTime / 0.25) * Math.PI) * 3 : 0;
    blitHer(f, 0, 0, w, h, 0, nudge);
  }
  ctx.restore();
}

function sideLayer(layer) {
  ctx.drawImage(herWalkImg, layer * SIDE.w, 0, SIDE.w, SIDE.h, 0, 0, SIDE.w, SIDE.h);
}

function drawSideLeg(thighLayer, shinLayer, hipAngle, kneeAngle) {
  const { hip, knee } = SIDE;
  ctx.save();
  ctx.translate(hip.x, hip.y);
  ctx.rotate(hipAngle);
  ctx.translate(-hip.x, -hip.y);
  sideLayer(thighLayer);
  ctx.translate(knee.x, knee.y);
  ctx.rotate(kneeAngle);
  ctx.translate(-knee.x, -knee.y);
  sideLayer(shinLayer);
  ctx.restore();
}

function drawSideArm(layer, angle) {
  ctx.save();
  ctx.translate(SHOULDER.x, SHOULDER.y);
  ctx.rotate(angle);
  ctx.translate(-SHOULDER.x, -SHOULDER.y);
  sideLayer(layer);
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

function drawSideWalk() {
  if (!spriteReady(herWalkImg)) return;
  const phase = player.gait * Math.PI * 2;
  const run = player.running;
  const near = legAngles(phase, run);
  const far = legAngles(phase + Math.PI, run);
  // Keep the lower foot on the floor: the more the legs spread, the lower the hips.
  const footY = (a) => SIDE.thigh * Math.cos(a.hip) + SIDE.shin * Math.cos(a.hip + a.knee);
  const drop = SIDE.thigh + SIDE.shin - Math.max(footY(near), footY(far));
  ctx.translate(-SIDE.ax, -SIDE.ay + drop);
  drawSideLeg(SIDE_LAYERS.thighFar, SIDE_LAYERS.shinFar, far.hip, far.knee);
  drawSideLeg(SIDE_LAYERS.thigh, SIDE_LAYERS.shin, near.hip, near.knee);
  ctx.save();
  ctx.translate(SIDE.hip.x, SIDE.hip.y);
  ctx.rotate(-(run ? GAIT.runLean : GAIT.lean) - Math.abs(Math.sin(phase)) * 0.015);
  ctx.translate(-SIDE.hip.x, -SIDE.hip.y);
  // Arms swing opposite their legs: the near arm goes back as the near leg steps forward.
  const armSwing = (run ? GAIT.runArm : GAIT.arm) * Math.sin(phase);
  drawSideArm(SIDE_LAYERS.armFar, -armSwing);
  sideLayer(SIDE_LAYERS.upper);
  drawSideArm(SIDE_LAYERS.arm, armSwing);
  ctx.restore();
}

// Height of her current pose above its anchor, in map px (for the HUD).
function playerHeadHeight() {
  const f = HER_FRAMES[playerPose().name];
  return f.ay * 0.5 * room.scale;
}

function drawHitboxes() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 255, 120, 0.9)';
  for (const a of room.floor) ctx.strokeRect(a.x, a.y, a.w, a.h);
  ctx.fillStyle = 'rgba(255, 40, 40, 0.25)';
  ctx.strokeStyle = 'rgba(255, 40, 40, 0.9)';
  for (const o of room.obstacles) {
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
  const sy = toScreenY(anchor.y - headTop);

  if (player.seat) {
    const w = 96;
    const h = 12;
    const bx = sx - w / 2;
    const by = sy - 22;
    // Chapter label
    ctx.font = '600 11px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    pill(`Chapter ${reading.chapters + 1}`, sx, by - 12, 'rgba(28, 25, 21, 0.75)', '#efe6d8');
    // Bar
    ctx.fillStyle = 'rgba(28, 25, 21, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bx - 2, by - 2, w + 4, h + 4, 8);
    ctx.fill();
    ctx.fillStyle = '#3a332b';
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 6);
    ctx.fill();
    if (reading.progress > 0) {
      const g = ctx.createLinearGradient(bx, 0, bx + w, 0);
      g.addColorStop(0, '#e6a75c');
      g.addColorStop(1, '#f4d27a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(bx, by, Math.max(h, w * reading.progress), h, 6);
      ctx.fill();
    }

    if (reading.popTime > 0) {
      const t = 1 - reading.popTime / CHAPTER_POP_TIME; // 0 -> 1
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : t < 0.25 ? 1.15 - ((t - 0.15) / 0.1) * 0.15 : 1;
      const alpha = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx, by - 40 - t * 14);
      ctx.scale(pop, pop);
      ctx.font = '800 18px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(28, 25, 21, 0.9)';
      ctx.strokeText('Chapter Complete', 0, 0);
      ctx.fillStyle = '#f4d27a';
      ctx.fillText('Chapter Complete', 0, 0);
      ctx.restore();
    } else if (reading.progress === 0) {
      ctx.font = '500 11px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
      const hint = isTouch ? 'Tap READ fast · arrows to get up' : 'Mash E or Space · arrows to get up';
      pill(hint, sx, by + h + 16, 'rgba(28, 25, 21, 0.75)', '#efe6d8');
    }
  } else if (nearestDoor() && !fade.door) {
    const door = nearestDoor();
    ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    const text = isTouch ? `Tap ${door.label} to ${door.prompt}` : `Press E to ${door.prompt}`;
    pill(text, sx, sy - 14, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
  } else if (nearestSeat()) {
    ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    pill(isTouch ? 'Tap SIT to read' : 'Press E to sit and read', sx, sy - 14, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
  }
  drawKissHud();
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

// ---- Him -------------------------------------------------------------------
// Stands in the kitchen. Walk up and mash the action button to give
// him kisses; when the bar fills he jumps with his arms up while hearts float
// away. Afterwards there's a quiet 5 second cooldown before he'll take more.

const HIM = {
  x: 1132, // his feet, in map px: in the kitchen, between the island and the counters
  y: 478,
  w: 137, // sprite px (one layer of the parts image)
  h: 352,
  scale: 0.5,
  centerX: 68.5,
  range: 95, // how close she needs to be to kiss him
  // Shoulder pivots (sprite px) for raising the arms
  shoulderL: { x: 20, y: 104 },
  shoulderR: { x: 117, y: 104 },
};
const HIM_PARTS = { body: 0, armL: 1, armR: 2 };

const KISS_PER_PRESS = 0.08; // ~13 kisses fill the bar
const KISS_DECAY = 0.1;
const KISS_COOLDOWN = 5; // seconds, not shown on screen
const CELEBRATE_TIME = 2.4;

const himImg = new Image();
himImg.src = 'assets/him-parts.png';

const kiss = {
  progress: 0,
  cooldown: 0,
  celebrate: 0, // counts down while he's jumping
  burstLeft: 0, // hearts still to release in the celebration
};
const hearts = [];

function nearHim() {
  return Math.hypot(player.x - HIM.x, player.y - HIM.y) < HIM.range;
}

function canKiss() {
  return room.id === 'apartment' && !player.seat && kiss.cooldown <= 0 && nearHim();
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

function giveKiss() {
  player.wave = 0;
  player.idleTime = 0;
  player.facing = Math.atan2(HIM.y - player.y, HIM.x - player.x);
  player.walkTime = 0;
  // A little heart pops up between them with every kiss
  addHeart((player.x + HIM.x) / 2, Math.min(player.y, HIM.y) - 150, false);
  kiss.progress = Math.min(1, kiss.progress + KISS_PER_PRESS);
  if (kiss.progress >= 1) {
    kiss.progress = 0;
    kiss.celebrate = CELEBRATE_TIME;
    kiss.cooldown = KISS_COOLDOWN;
    player.cheer = CHEER_TIME;
    exciteDog();
    kiss.burstLeft = 22;
  }
}

function updateKiss(dt) {
  kiss.cooldown = Math.max(0, kiss.cooldown - dt);
  kiss.celebrate = Math.max(0, kiss.celebrate - dt);
  if (kiss.progress > 0) kiss.progress = Math.max(0, kiss.progress - KISS_DECAY * dt);

  // Release the celebration hearts over the first part of the jump
  if (kiss.burstLeft > 0) {
    const due = Math.ceil((kiss.celebrate - CELEBRATE_TIME * 0.35) / (CELEBRATE_TIME * 0.65) * 22);
    while (kiss.burstLeft > Math.max(0, due)) {
      addHeart(HIM.x + (Math.random() - 0.5) * 50, HIM.y - 175 + Math.random() * 30, true);
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

function drawHimArm(layer, pivot, angle) {
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(angle);
  ctx.translate(-pivot.x, -pivot.y);
  ctx.drawImage(himImg, layer * HIM.w, 0, HIM.w, HIM.h, 0, 0, HIM.w, HIM.h);
  ctx.restore();
}

function drawHim() {
  if (!spriteReady(himImg)) return;
  let hop = 0;
  let squash = 0;
  let raise = 0;
  let wave = 0;
  if (kiss.celebrate > 0) {
    const t = CELEBRATE_TIME - kiss.celebrate;
    const hops = 4;
    const f = ((t / CELEBRATE_TIME) * hops) % 1;
    hop = 4 * f * (1 - f) * 20; // map px off the floor
    squash = f < 0.12 ? 1 - f / 0.12 : 0; // landing squish
    // Arms go up fast, wave while he bounces, and come down at the end
    raise = Math.min(1, t / 0.15, kiss.celebrate / 0.25);
    wave = Math.sin(t * 16) * 0.15;
  }

  ctx.save();
  ctx.translate(HIM.x, HIM.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 24 - hop * 0.4, 6 - hop * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -hop);
  ctx.scale(HIM.scale * (1 + squash * 0.06), HIM.scale * (1 - squash * 0.08));
  ctx.translate(-HIM.centerX, -HIM.h);
  ctx.imageSmoothingQuality = 'high';

  // Raised: arms swing up past the head (about 160 degrees), waving a little.
  const up = 2.75 * raise;
  drawHimArm(HIM_PARTS.armL, HIM.shoulderL, up + wave * raise);
  drawHimArm(HIM_PARTS.armR, HIM.shoulderR, -up + wave * raise);
  ctx.drawImage(himImg, HIM_PARTS.body * HIM.w, 0, HIM.w, HIM.h, 0, 0, HIM.w, HIM.h);
  ctx.restore();
}

// Bar over his head while kissing; nothing at all during the cooldown.
function drawKissHud() {
  if (room.id !== 'apartment' || kiss.cooldown > 0 || player.seat) return;
  if (!nearHim() && kiss.progress === 0) return;
  const sx = toScreenX(HIM.x);
  const sy = toScreenY(HIM.y - HIM.h * HIM.scale - 6);
  const w = 96;
  const h = 12;
  const bx = sx - w / 2;
  const by = sy - 22;

  ctx.fillStyle = 'rgba(28, 25, 21, 0.8)';
  ctx.beginPath();
  ctx.roundRect(bx - 2, by - 2, w + 4, h + 4, 8);
  ctx.fill();
  ctx.fillStyle = '#3a2b33';
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 6);
  ctx.fill();
  if (kiss.progress > 0) {
    const g = ctx.createLinearGradient(bx, 0, bx + w, 0);
    g.addColorStop(0, '#ff7aa2');
    g.addColorStop(1, '#ffb3c8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(bx, by, Math.max(h, w * kiss.progress), h, 6);
    ctx.fill();
  }
  // Heart badge on the left end of the bar
  drawHeart(bx - 2, by + h / 2, 2, 1);

  if (kiss.progress === 0 && nearHim()) {
    ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    pill(isTouch ? 'Tap KISS fast' : 'Mash E to give kisses', sx, by + h + 16, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
  }
}

// Draw everyone back to front so whoever is lower on screen is in front.
function drawActors() {
  const actors = [
    { y: player.seat ? player.seat.y : player.y, draw: drawPlayer },
    { y: dog.hop ? Math.max(dog.hop.from.y, dog.hop.to.y) : dog.y, draw: drawDog },
  ];
  if (room.id === 'apartment') actors.push({ y: HIM.y, draw: drawHim });
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
  drawActors();
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
