// Living Room — a free-roam sandbox on top of the floor-plan image.
// All world coordinates are in image pixels (the map is 1312 x 1199).

const MAP_SRC = 'assets/living-room.jpg';
const MAP_W = 1312;
const MAP_H = 1199;

// The ceiling fan cut out of the map, drawn over the player so they walk beneath it.
const FAN_SRC = 'assets/ceiling-fan.png';
const FAN_POS = { x: 535, y: 503 };

// Walkable floor area (inside the walls).
const FLOOR = { x: 205, y: 205, w: 940, h: 920 };

// Furniture the player can't walk through.
const OBSTACLES = [
  { name: 'sofa (back)', x: 222, y: 266, w: 392, h: 234 },
  { name: 'sofa (side)', x: 200, y: 266, w: 206, h: 624 },
  { name: 'bookshelf', x: 1036, y: 390, w: 130, h: 558 },
  { name: 'side table', x: 1044, y: 160, w: 130, h: 132 },
  { name: 'tv stand', x: 198, y: 1020, w: 460, h: 110 },
];

// Places to sit on the sofa. (x, y) is where her hips rest; `approach` is the
// floor spot she sits down from and stands back up to.
const SEATS = [
  { x: 548, y: 474, view: 'front', approach: { x: 548, y: 528 } },
  { x: 440, y: 474, view: 'front', approach: { x: 440, y: 528 } },
  { x: 336, y: 640, view: 'right', approach: { x: 432, y: 640 } },
  { x: 336, y: 790, view: 'right', approach: { x: 432, y: 790 } },
];
const SIT_RANGE = 80;

// Reading: spam the action button to fill the bar and finish a chapter.
const READ_PER_PRESS = 0.075; // ~14 presses per chapter
const READ_DECAY = 0.08; // bar drains this much per second when you stop
const CHAPTER_POP_TIME = 1.8; // seconds "Chapter Complete" stays up

const PLAYER_RADIUS = 20; // footprint around her feet
const WALK_SPEED = 220; // image px per second
const RUN_SPEED = 400;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const mapImg = new Image();
mapImg.src = MAP_SRC;
const fanImg = new Image();
fanImg.src = FAN_SRC;

const saved = window.claude?.hot?.data?.player;
const player = {
  x: saved?.x ?? 720,
  y: saved?.y ?? 820,
  facing: saved?.facing ?? Math.PI / 2, // radians; starts facing down, toward the viewer
  walkTime: 0,
  seat: null, // a SEATS entry while sitting
};

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
};

window.claude?.hot?.snapshot?.(() => ({
  player: { x: player.x, y: player.y, facing: player.facing },
  chapters: reading.chapters,
}));

const keys = new Set();
const touchDirs = new Set();
let showHitboxes = false;
let runToggle = false;
let scale = 1;
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
  const r = PLAYER_RADIUS;
  if (x - r < FLOOR.x || x + r > FLOOR.x + FLOOR.w) return false;
  if (y - r < FLOOR.y || y + r > FLOOR.y + FLOOR.h) return false;
  return !OBSTACLES.some((o) => circleHitsRect(x, y, r, o));
}

// ---- Sitting and reading ---------------------------------------------------

function nearestSeat() {
  let best = null;
  let bestDist = SIT_RANGE;
  for (const seat of SEATS) {
    const d = Math.hypot(player.x - seat.approach.x, player.y - seat.approach.y);
    if (d < bestDist) {
      best = seat;
      bestDist = d;
    }
  }
  return best;
}

function action() {
  if (player.seat) {
    if (reading.popTime > CHAPTER_POP_TIME - 0.5) return; // brief pause after a chapter
    reading.progress = Math.min(1, reading.progress + READ_PER_PRESS);
    reading.flipTime = 0.25;
    if (reading.progress >= 1) {
      reading.chapters += 1;
      saveChapters(reading.chapters);
      reading.progress = 0;
      reading.popTime = CHAPTER_POP_TIME;
    }
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
  else if (nearestSeat()) label = 'SIT';
  if (actionBtn.textContent !== label) actionBtn.textContent = label;
  actionBtn.disabled = !label;
}

// ---- Update --------------------------------------------------------------

function update(dt) {
  reading.popTime = Math.max(0, reading.popTime - dt);
  reading.flipTime = Math.max(0, reading.flipTime - dt);
  updateActionButton();

  const dirs = heldDirs();
  let dx = 0;
  let dy = 0;
  if (dirs.has('left')) dx -= 1;
  if (dirs.has('right')) dx += 1;
  if (dirs.has('up')) dy -= 1;
  if (dirs.has('down')) dy += 1;

  if (player.seat) {
    if (dx === 0 && dy === 0) {
      reading.progress = Math.max(0, reading.progress - READ_DECAY * dt);
      return;
    }
    standUp(dx, dy);
  }

  if (dx === 0 && dy === 0) {
    player.walkTime = 0;
    return;
  }

  const len = Math.hypot(dx, dy);
  const running = runToggle || keys.has('ShiftLeft') || keys.has('ShiftRight');
  const step = (running ? RUN_SPEED : WALK_SPEED) * dt;
  const mx = (dx / len) * step;
  const my = (dy / len) * step;

  // Move each axis separately so the player slides along walls/furniture.
  if (isFree(player.x + mx, player.y)) player.x += mx;
  if (isFree(player.x, player.y + my)) player.y += my;

  player.facing = Math.atan2(dy, dx);
  player.walkTime += dt * (running ? 1.8 : 1);
}

// ---- Render --------------------------------------------------------------

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const box = document.getElementById('game');
  scale = Math.min(box.clientWidth / MAP_W, box.clientHeight / MAP_H);
  const cssW = Math.floor(MAP_W * scale);
  const cssH = Math.floor(MAP_H * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(document.getElementById('game'));
resize();

// ---- Character -------------------------------------------------------------
// Drawn standing (RPG style) so her face and outfit read at game size.
// Sprite units are map pixels; (0, 0) is between her feet, negative y is up.
// Look: long middle-parted hair (light brown roots fading to blonde), smiling
// with red lips, black tee, black belt with a double-ring buckle, ripped denim
// mini skirt, black socks, black high-tops with white toe caps, pale blue pendant.

const LOOK = {
  skin: '#f6d2bb',
  skinShade: '#e3ad93',
  blush: 'rgba(236, 120, 120, 0.35)',
  hairRoot: '#7d5a3c',
  hairMid: '#b48a5c',
  hairEnd: '#e6c78f',
  hairLine: '#5a3e27',
  brow: '#8a6646',
  lash: '#2b1d14',
  lips: '#b8322f',
  teeth: '#fffaf2',
  tee: '#1c1c1f',
  teeFold: '#34343a',
  denim: '#8db2d6',
  denimDark: '#6a90b8',
  rip: '#eef3f8',
  belt: '#0d0d0d',
  buckle: '#c9ccd1',
  sock: '#151515',
  shoe: '#141414',
  shoeWhite: '#f1eee6',
  pendant: '#cfe6f2',
  bracelet: '#e9d27a',
  watch: '#222',
  bookCover: '#2f6f73',
  bookSpine: '#24585b',
  bookGold: '#e2c27a',
  page: '#fbf6ea',
  outline: '#2a1d15',
};

const SPRITE_SCALE = 1.3;

function spriteView(facing) {
  const dx = Math.cos(facing);
  const dy = Math.sin(facing);
  if (Math.abs(dx) > Math.abs(dy) + 0.01) return dx > 0 ? 'right' : 'left';
  return dy < 0 ? 'back' : 'front';
}

function roundRect(x, y, w, h, rad) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
}

function fillStroke(fill, lw = 1.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = LOOK.outline;
  ctx.stroke();
}

function hairGradient(top, bottom) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, LOOK.hairRoot);
  g.addColorStop(0.45, LOOK.hairMid);
  g.addColorStop(1, LOOK.hairEnd);
  return g;
}

// A few soft strand lines to give hair texture.
function hairStrands(lines) {
  ctx.strokeStyle = 'rgba(90, 62, 39, 0.45)';
  ctx.lineWidth = 0.8;
  for (const [x0, y0, cx, cy, x1, y1] of lines) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
}

// One leg with sock and high-top. `side` view draws the shoe pointing right.
function drawLeg(x, lift, view) {
  const L = LOOK;
  const top = -46;
  const foot = -lift;
  roundRect(x - 4, top, 8, foot - 12 - top, 3);
  fillStroke(L.skin);
  // Black crew sock
  roundRect(x - 4.2, foot - 21, 8.4, 9, 2);
  fillStroke(L.sock);

  if (view === 'side') {
    roundRect(x - 6, foot - 13, 15, 13, [5, 5, 3, 3]);
    fillStroke(L.shoe);
    ctx.fillStyle = L.shoeWhite;
    ctx.fillRect(x - 6, foot - 3, 15, 3);
    ctx.beginPath();
    ctx.ellipse(x + 7, foot - 4, 3.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = L.shoeWhite;
    ctx.lineWidth = 0.9;
    for (const ly of [-10, -7.5]) {
      ctx.beginPath();
      ctx.moveTo(x + 1, foot + ly);
      ctx.lineTo(x + 5, foot + ly + 1);
      ctx.stroke();
    }
    return;
  }

  roundRect(x - 6.5, foot - 14, 13, 14, [5, 5, 3, 3]);
  fillStroke(L.shoe);
  ctx.fillStyle = L.shoeWhite;
  ctx.fillRect(x - 6.5, foot - 3, 13, 3);
  if (view === 'front') {
    // White toe cap and laces
    ctx.beginPath();
    ctx.ellipse(x, foot - 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = L.shoeWhite;
    ctx.lineWidth = 0.9;
    for (const ly of [-12, -9.5, -7]) {
      ctx.beginPath();
      ctx.moveTo(x - 2.5, foot + ly);
      ctx.lineTo(x + 2.5, foot + ly);
      ctx.stroke();
    }
  } else {
    // Heel patch
    ctx.fillStyle = L.shoeWhite;
    ctx.beginPath();
    ctx.arc(x, foot - 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSkirt(halfTop, halfHem, view) {
  const L = LOOK;
  const g = ctx.createLinearGradient(0, -64, 0, -44);
  g.addColorStop(0, L.denimDark);
  g.addColorStop(1, L.denim);
  ctx.beginPath();
  ctx.moveTo(-halfTop, -64);
  ctx.lineTo(halfTop, -64);
  ctx.lineTo(halfHem, -44);
  ctx.lineTo(-halfHem, -44);
  ctx.closePath();
  fillStroke(g);

  // Frayed hem
  ctx.strokeStyle = L.rip;
  ctx.lineWidth = 0.8;
  for (let fx = -halfHem + 2; fx < halfHem - 1; fx += 2.5) {
    ctx.beginPath();
    ctx.moveTo(fx, -44.5);
    ctx.lineTo(fx + 0.4, -42.5);
    ctx.stroke();
  }

  if (view === 'front') {
    // Distressed rips
    ctx.fillStyle = L.rip;
    for (const [rx, ry, rw] of [[-10, -57, 6], [7, -54, 7], [-6, -49, 5], [10, -48, 4]]) {
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + rw * 0.3, ry - 1.2);
      ctx.lineTo(rx + rw * 0.6, ry + 0.3);
      ctx.lineTo(rx + rw, ry - 0.8);
      ctx.lineTo(rx + rw * 0.8, ry + 1.4);
      ctx.lineTo(rx + rw * 0.2, ry + 1.6);
      ctx.closePath();
      ctx.fill();
    }
    // Center seam
    ctx.strokeStyle = L.denimDark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -61);
    ctx.lineTo(0, -45);
    ctx.stroke();
  } else if (view === 'back') {
    // Back pockets
    ctx.strokeStyle = L.denimDark;
    ctx.lineWidth = 0.9;
    for (const px of [-9, 3]) ctx.strokeRect(px, -59, 6, 7);
  }
}

function drawBelt(half, view) {
  const L = LOOK;
  ctx.fillStyle = L.belt;
  ctx.fillRect(-half, -67, half * 2, 5);
  if (view === 'front') {
    ctx.strokeStyle = L.buckle;
    ctx.lineWidth = 1.3;
    for (const bx of [-2, 2]) {
      ctx.beginPath();
      ctx.arc(bx, -64.5, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Arm hanging from the shoulder, rotated by `swing` radians.
function drawArm(sx, sy, swing, wrist) {
  const L = LOOK;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(swing);
  roundRect(-3.5, 0, 7, 33, 3.5);
  fillStroke(L.skin);
  ctx.beginPath();
  ctx.arc(0, 34, 3.8, 0, Math.PI * 2);
  fillStroke(L.skin, 1.2);
  if (wrist === 'bracelet') {
    ctx.fillStyle = L.bracelet;
    ctx.fillRect(-3.7, 27, 7.4, 2);
  } else if (wrist === 'watch') {
    ctx.fillStyle = L.watch;
    ctx.fillRect(-3.7, 26, 7.4, 3);
  }
  ctx.restore();
}

function drawTee(half, view) {
  const L = LOOK;
  roundRect(-half, -95, half * 2, 31, [7, 7, 3, 3]);
  fillStroke(L.tee);
  // Soft folds
  ctx.strokeStyle = L.teeFold;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-half * 0.5, -78);
  ctx.quadraticCurveTo(-half * 0.2, -73, -half * 0.45, -68);
  ctx.moveTo(half * 0.55, -80);
  ctx.quadraticCurveTo(half * 0.25, -74, half * 0.5, -69);
  ctx.stroke();
  if (view === 'front') {
    // Crew neck
    ctx.strokeStyle = L.teeFold;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -96, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

function drawSleeve(x, y, rx) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, 9, 0, 0, Math.PI * 2);
  fillStroke(LOOK.tee);
}

function drawSmilingEye(ex, ey, mirror = 1) {
  const L = LOOK;
  ctx.strokeStyle = L.lash;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(ex, ey + 1.5, 3.2, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  // Outer lash flick
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ex + mirror * 3, ey - 0.3);
  ctx.lineTo(ex + mirror * 4.6, ey - 1.6);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawFrontHead(hy) {
  const L = LOOK;
  // Neck
  ctx.fillStyle = L.skinShade;
  ctx.fillRect(-4, hy + 13, 8, 8);

  // Face
  ctx.beginPath();
  ctx.ellipse(0, hy, 15.5, 17, 0, 0, Math.PI * 2);
  fillStroke(L.skin);

  // Brows
  ctx.strokeStyle = L.brow;
  ctx.lineWidth = 1.3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 2.8, hy - 6.5);
    ctx.quadraticCurveTo(s * 6, hy - 8.5, s * 9.5, hy - 6.8);
    ctx.stroke();
  }
  drawSmilingEye(-6, hy - 1.5, -1);
  drawSmilingEye(6, hy - 1.5, 1);

  // Cheeks
  ctx.fillStyle = L.blush;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 9, hy + 4.5, 3.2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose
  ctx.strokeStyle = L.skinShade;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-1.2, hy + 4.5);
  ctx.quadraticCurveTo(0, hy + 5.6, 1.2, hy + 4.5);
  ctx.stroke();

  // Big open smile: red lips, white teeth
  ctx.beginPath();
  ctx.moveTo(-6, hy + 7.5);
  ctx.quadraticCurveTo(0, hy + 9, 6, hy + 7.5);
  ctx.quadraticCurveTo(0, hy + 15.5, -6, hy + 7.5);
  ctx.closePath();
  ctx.fillStyle = L.teeth;
  ctx.fill();
  ctx.strokeStyle = L.lips;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = L.lips;
  ctx.beginPath();
  ctx.moveTo(-4.5, hy + 11.8);
  ctx.quadraticCurveTo(0, hy + 15.8, 4.5, hy + 11.8);
  ctx.quadraticCurveTo(0, hy + 14, -4.5, hy + 11.8);
  ctx.fill();

  // Hair: two curtains from a middle part, falling over the shoulders
  ctx.fillStyle = hairGradient(hy - 18, hy + 45);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, hy - 18.5);
    ctx.quadraticCurveTo(s * 19, hy - 19, s * 18.5, hy + 2);
    ctx.quadraticCurveTo(s * 19, hy + 22, s * 21, hy + 42);
    ctx.lineTo(s * 13, hy + 40);
    ctx.quadraticCurveTo(s * 14, hy + 18, s * 13.5, hy + 4);
    ctx.quadraticCurveTo(s * 12, hy - 9, s * 3, hy - 14);
    ctx.quadraticCurveTo(s * 1, hy - 15.5, 0, hy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = L.hairLine;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  hairStrands([
    [-6, hy - 16, -15, hy - 8, -16, hy + 14],
    [-15.5, hy + 10, -17, hy + 25, -17.5, hy + 38],
    [6, hy - 16, 15, hy - 8, 16, hy + 14],
    [15.5, hy + 10, 17, hy + 25, 17.5, hy + 38],
  ]);
}

function drawBackHead(hy) {
  const L = LOOK;
  ctx.fillStyle = hairGradient(hy - 18, hy + 48);
  ctx.beginPath();
  ctx.moveTo(0, hy - 18);
  ctx.quadraticCurveTo(19, hy - 18, 19, hy + 2);
  ctx.quadraticCurveTo(21, hy + 30, 19, hy + 48);
  ctx.quadraticCurveTo(0, hy + 53, -19, hy + 48);
  ctx.quadraticCurveTo(-21, hy + 30, -19, hy + 2);
  ctx.quadraticCurveTo(-19, hy - 18, 0, hy - 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = L.hairLine;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  hairStrands([
    [0, hy - 17, -2, hy + 15, -1, hy + 48],
    [-8, hy - 15, -14, hy + 15, -11, hy + 48],
    [8, hy - 15, 14, hy + 15, 11, hy + 48],
    [-14, hy - 5, -18, hy + 25, -16, hy + 46],
    [14, hy - 5, 18, hy + 25, 16, hy + 46],
  ]);
}

function drawSideHead(hy) {
  const L = LOOK;
  ctx.fillStyle = L.skinShade;
  ctx.fillRect(-3, hy + 13, 7, 8);

  // Face in profile, nose and chin toward +x
  ctx.beginPath();
  ctx.moveTo(-12, hy - 6);
  ctx.quadraticCurveTo(-10, hy - 17, 2, hy - 17);
  ctx.quadraticCurveTo(14, hy - 16, 14.5, hy - 3);
  ctx.lineTo(17, hy + 3);
  ctx.lineTo(14.5, hy + 4.5);
  ctx.quadraticCurveTo(14.5, hy + 12, 9, hy + 15.5);
  ctx.quadraticCurveTo(0, hy + 18, -6, hy + 12);
  ctx.closePath();
  fillStroke(L.skin);

  ctx.strokeStyle = L.brow;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(6, hy - 7);
  ctx.quadraticCurveTo(9, hy - 9, 12, hy - 7.5);
  ctx.stroke();
  drawSmilingEye(9, hy - 1.5, 1);

  ctx.fillStyle = L.blush;
  ctx.beginPath();
  ctx.ellipse(7, hy + 5, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Smile in profile
  ctx.beginPath();
  ctx.moveTo(9, hy + 8.5);
  ctx.quadraticCurveTo(12, hy + 9.5, 13.8, hy + 8);
  ctx.quadraticCurveTo(12.5, hy + 13, 9, hy + 8.5);
  ctx.closePath();
  ctx.fillStyle = L.teeth;
  ctx.fill();
  ctx.strokeStyle = L.lips;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hair covers the back of the head and falls down the back
  ctx.fillStyle = hairGradient(hy - 19, hy + 48);
  ctx.beginPath();
  ctx.moveTo(10, hy - 15.5);
  ctx.quadraticCurveTo(-2, hy - 23, -15, hy - 10);
  ctx.quadraticCurveTo(-20, hy + 20, -17, hy + 48);
  ctx.quadraticCurveTo(-10, hy + 51, -3, hy + 46);
  ctx.quadraticCurveTo(-4, hy + 25, -1, hy + 8);
  ctx.quadraticCurveTo(1, hy - 4, 4, hy - 10);
  ctx.quadraticCurveTo(7, hy - 13, 10, hy - 15.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = L.hairLine;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  hairStrands([
    [4, hy - 16, -8, hy - 12, -12, hy + 10],
    [-8, hy - 5, -14, hy + 20, -12, hy + 46],
    [-2, hy + 5, -7, hy + 25, -7, hy + 46],
  ]);
}

// Book held up while reading. Cover faces the viewer in the front view.
function drawBookFront(cx, cy) {
  const L = LOOK;
  // Pages peeking over the top edge, one flipping after each press
  ctx.fillStyle = L.page;
  roundRect(cx - 13, cy - 11, 26, 4, 1);
  ctx.fill();
  if (reading.flipTime > 0) {
    const t = reading.flipTime / 0.25;
    ctx.save();
    ctx.translate(cx, cy - 9);
    ctx.scale(Math.cos((1 - t) * Math.PI), 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, -1);
    ctx.lineTo(12, -7 * t - 2);
    ctx.lineTo(0, -3);
    ctx.closePath();
    fillStroke(L.page, 0.8);
    ctx.restore();
  }
  roundRect(cx - 13, cy - 9, 26, 19, 1.5);
  fillStroke(L.bookCover);
  ctx.fillStyle = L.bookSpine;
  ctx.fillRect(cx - 1.2, cy - 9, 2.4, 19);
  ctx.fillStyle = L.bookGold;
  ctx.fillRect(cx + 3, cy - 4, 7, 1.4);
  ctx.fillRect(cx + 4, cy - 1, 5, 1);
  // Hands on the edges
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * 12.5, cy + 3, 3.6, 0, Math.PI * 2);
    fillStroke(L.skin, 1.2);
  }
}

function drawSeatedFront() {
  const L = LOOK;
  // Lower legs hang off the cushion; knees come toward the viewer.
  ctx.save();
  ctx.translate(0, 39);
  for (const s of [-1, 1]) drawLeg(s * 6.5, 0, 'front');
  ctx.restore();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 7, -1, 6.5, 6, 0, 0, Math.PI * 2);
    fillStroke(L.skin);
  }

  ctx.save();
  ctx.translate(0, 44); // hem of the skirt sits on the seat
  const hy = -114;
  drawSkirt(15.5, 18.5, 'front');
  drawBelt(15.5, 'front');
  ctx.fillStyle = hairGradient(hy - 10, hy + 50);
  ctx.beginPath();
  ctx.moveTo(-18, hy);
  ctx.quadraticCurveTo(-23, hy + 30, -19, hy + 50);
  ctx.lineTo(19, hy + 50);
  ctx.quadraticCurveTo(23, hy + 30, 18, hy);
  ctx.closePath();
  ctx.fill();
  // Arms bend in to hold the book
  drawArm(-17, -88, -0.62, 'bracelet');
  drawArm(17, -88, 0.62, 'watch');
  drawTee(16.5, 'front');
  drawSleeve(-17.5, -86, 7);
  drawSleeve(17.5, -86, 7);
  drawFrontHead(hy);
  drawBookFront(0, -66);
  ctx.restore();
}

function drawSeatedSide() {
  const L = LOOK;
  // Thigh along the seat, shin hanging down, shoe pointing forward
  roundRect(-4, -9, 24, 9, 4);
  fillStroke(L.skin);
  roundRect(13, -5, 8, 24, 3);
  fillStroke(L.skin);
  roundRect(12.8, 12, 8.4, 9, 2);
  fillStroke(L.sock);
  roundRect(11, 19, 15, 12, [5, 5, 3, 3]);
  fillStroke(L.shoe);
  ctx.fillStyle = L.shoeWhite;
  ctx.fillRect(11, 28, 15, 3);
  ctx.beginPath();
  ctx.ellipse(23.5, 27, 3, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, 40);
  const hy = -114;
  // Skirt drapes over the top of the thigh
  ctx.save();
  ctx.translate(0, -49);
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(14, 5);
  ctx.lineTo(14, 9);
  ctx.lineTo(-11, 9);
  ctx.closePath();
  fillStroke(L.denim);
  ctx.restore();
  drawSkirt(10.5, 11, 'side');
  drawBelt(10.5, 'side');
  drawTee(10.5, 'side');
  drawSideHead(hy);

  // Open book held up in front of her
  const bx = 24;
  const by = -78;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.25);
  ctx.fillStyle = L.page;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, -12);
  ctx.lineTo(-1, -12);
  ctx.lineTo(1.5, 0);
  ctx.lineTo(5, -11);
  ctx.lineTo(8, -11);
  ctx.lineTo(2, 1.5);
  ctx.closePath();
  fillStroke(L.page, 0.8);
  ctx.strokeStyle = L.bookCover;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-4.5, -13);
  ctx.lineTo(1, 2);
  ctx.lineTo(9, -12);
  ctx.stroke();
  if (reading.flipTime > 0) {
    const t = reading.flipTime / 0.25;
    ctx.strokeStyle = L.page;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(1 + Math.cos(t * Math.PI) * 6, -11);
    ctx.stroke();
  }
  ctx.restore();

  drawArm(0, -88, -1.05, 'watch');
  drawSleeve(0, -87, 6.5);
  ctx.restore();
}

function drawPlayer() {
  if (player.seat) {
    ctx.save();
    ctx.translate(player.seat.x, player.seat.y);
    ctx.scale(SPRITE_SCALE, SPRITE_SCALE);
    ctx.lineJoin = 'round';
    if (player.seat.view === 'right') drawSeatedSide();
    else drawSeatedFront();
    ctx.restore();
    return;
  }
  const { x, y, facing, walkTime } = player;
  const L = LOOK;
  const view = spriteView(facing);
  const moving = walkTime > 0;
  const phase = Math.sin(walkTime * 11);
  const bob = moving ? -Math.abs(phase) * 1.6 : 0;
  const hy = -114; // head center

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);
  ctx.lineJoin = 'round';

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (view === 'left') ctx.scale(-1, 1);

  if (view === 'left' || view === 'right') {
    const stride = moving ? phase * 6 : 0;
    drawLeg(-stride, moving ? Math.max(0, -phase) * 3 : 0, 'side');
    ctx.translate(0, bob);
    drawSkirt(10.5, 12.5, 'side');
    ctx.translate(0, -bob);
    drawLeg(stride, moving ? Math.max(0, phase) * 3 : 0, 'side');
    ctx.translate(0, bob);
    drawBelt(10.5, 'side');
    drawTee(10.5, 'side');
    drawSideHead(hy);
    drawArm(0, -88, moving ? phase * 0.45 : 0, 'watch');
    drawSleeve(0, -87, 6.5);
    ctx.restore();
    return;
  }

  // Front and back views
  for (const s of [-1, 1]) {
    const lift = moving ? Math.max(0, phase * s) * 4 : 0;
    drawLeg(s * 6.5, lift, view);
  }
  ctx.translate(0, bob);
  drawSkirt(15.5, 18.5, view);
  drawBelt(15.5, view);

  if (view === 'front') {
    // Long hair behind the shoulders
    ctx.fillStyle = hairGradient(hy - 10, hy + 50);
    ctx.beginPath();
    ctx.moveTo(-18, hy);
    ctx.quadraticCurveTo(-23, hy + 30, -19, hy + 50);
    ctx.lineTo(19, hy + 50);
    ctx.quadraticCurveTo(23, hy + 30, 18, hy);
    ctx.closePath();
    ctx.fill();
  }

  const armSwing = moving ? phase * 0.3 : 0;
  // From the front her right arm is on screen-left; flip for the back view.
  const leftWrist = view === 'front' ? 'bracelet' : 'watch';
  const rightWrist = view === 'front' ? 'watch' : 'bracelet';
  drawArm(-17, -88, 0.12 + armSwing, leftWrist);
  drawArm(17, -88, -0.12 + armSwing, rightWrist);
  drawTee(16.5, view);
  drawSleeve(-17.5, -86, 7);
  drawSleeve(17.5, -86, 7);

  if (view === 'front') {
    drawFrontHead(hy);
    // Necklace with a pale blue pendant
    ctx.strokeStyle = 'rgba(220, 220, 225, 0.8)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-5, -94);
    ctx.lineTo(0, -82);
    ctx.lineTo(5, -94);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -80.5, 2, 2.6, 0, 0, Math.PI * 2);
    fillStroke(L.pendant, 0.8);
  } else {
    drawBackHead(hy);
  }

  ctx.restore();
}

function drawHitboxes() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 255, 120, 0.9)';
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  ctx.fillStyle = 'rgba(255, 40, 40, 0.25)';
  ctx.strokeStyle = 'rgba(255, 40, 40, 0.9)';
  for (const o of OBSTACLES) {
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  }
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
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
  const headTop = player.seat ? 92 * SPRITE_SCALE : 136 * SPRITE_SCALE;
  const sx = anchor.x * scale;
  const sy = (anchor.y - headTop) * scale;

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
  } else if (nearestSeat()) {
    ctx.font = '600 12px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    pill(isTouch ? 'Tap SIT to read' : 'Press E to sit and read', sx, sy - 14, 'rgba(28, 25, 21, 0.8)', '#efe6d8');
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

function render() {
  ctx.clearRect(0, 0, MAP_W, MAP_H);
  if (mapImg.complete && mapImg.naturalWidth) {
    ctx.drawImage(mapImg, 0, 0, MAP_W, MAP_H);
  }
  drawPlayer();
  if (fanImg.complete && fanImg.naturalWidth) {
    ctx.drawImage(fanImg, FAN_POS.x, FAN_POS.y);
  }
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
