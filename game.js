// Living Room — a free-roam sandbox on top of the floor-plan image.
// All world coordinates are in image pixels (the map is 1312 x 1199).

const MAP_SRC = 'assets/apartment.jpg';
const MAP_W = 1536;
const MAP_H = 1024;

// Walkable floor, as rectangles. Her whole footprint has to stay inside them.
const FLOOR_AREAS = [
  { name: 'main room', x: 215, y: 228, w: 1047, h: 518 },
  { name: 'living room by the rug', x: 215, y: 740, w: 485, h: 148 },
  { name: 'by the left door', x: 700, y: 740, w: 108, h: 60 },
  { name: 'hall', x: 1045, y: 740, w: 105, h: 225 },
  { name: 'by the right door', x: 1150, y: 740, w: 112, h: 60 },
];

// Furniture the player can't walk through.
const OBSTACLES = [
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
];

// Places to sit on the sofa. (x, y) is where her hips rest; `approach` is the
// floor spot she sits down from and stands back up to. `dog` is where the dog
// lies next to her (`ground` is where it jumps up from).
const SEATS = [
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

const saved = window.claude?.hot?.data?.player;
const player = {
  x: 600,
  y: 440,
  facing: saved?.facing ?? Math.PI / 2, // radians; starts facing down, toward the viewer
  walkTime: 0,
  seat: null, // a SEATS entry while sitting
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
  // Edges of her footprint all have to be on the floor
  const onFloor = (px, py) => FLOOR_AREAS.some((a) => px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h);
  if (![[x, y], [x - r, y], [x + r, y], [x, y - r], [x, y + r]].every(([px, py]) => onFloor(px, py))) return false;
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
  if (canKiss()) {
    giveKiss();
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
  else if (nearestSeat()) label = 'SIT';
  if (actionBtn.textContent !== label) actionBtn.textContent = label;
  actionBtn.disabled = !label;
}

// ---- Update --------------------------------------------------------------

function update(dt) {
  updatePlayer(dt);
  updateDog(dt);
  updateKiss(dt);
}

function updatePlayer(dt) {
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
// Pixel-art sprite cut from the character art. The front image is the original;
// the back image is the same art with her hair painted over the front.
// Walking slices the legs off and steps them; sitting drops the thighs so her
// knees sit right under the skirt hem.
// Sprite coordinates below are pixels in the sprite images (118 x 344).

const HER = {
  w: 118,
  h: 344,
  scale: 0.5, // sprite px -> map px (she stands 172 map px tall)
  centerX: 59,
  hemY: 212, // bottom of the skirt's frayed hem
  kneeY: 236, // top of the knees (where the seated pose picks up)
  legs: { x: 22, w: 74 }, // columns that hold only legs below the hem
  hands: [{ x: 0, w: 24 }, { x: 94, w: 24 }], // hands hang a little below the hem
  handsBottom: 222,
};

const herFront = new Image();
herFront.src = 'assets/her-front.png';
const herBack = new Image();
herBack.src = 'assets/her-back.png';

// Walking uses the same art split into layers, side by side in one image:
// body (no arms or legs), left arm, right arm, legs. Each layer is HER.w wide.
const PARTS = { body: 0, armL: 1, armR: 2, legs: 3 };
const herFrontParts = new Image();
herFrontParts.src = 'assets/her-front-parts.png';
const herBackParts = new Image();
herBackParts.src = 'assets/her-back-parts.png';

// Walk cycle, in sprite px. One full cycle is two steps.
const WALK = {
  speed: 9, // cycle speed (radians per second of walkTime)
  kneeY: 252, // legs bend here: the shin lifts more than the thigh
  shinLift: 15,
  thighLift: 5,
  stepIn: 1.5, // a lifted foot tucks slightly toward the middle
  bob: 3, // body rises as each foot passes
  sway: 2, // hips shift over the planted foot
  armSwing: 5, // arms swing opposite the legs
};

const BOOK = {
  cover: '#2f6f73',
  coverDark: '#24585b',
  page: '#fbf6ea',
  pageShade: '#e6dcc6',
  text: '#b9ae98',
  outline: '#140c06',
};

function spriteView(facing) {
  // The art is front-facing; walking up shows her back, everything else her front.
  return Math.sin(facing) < -0.7 ? 'back' : 'front';
}

function spriteReady(img) {
  return img.complete && img.naturalWidth > 0;
}

// Copy a horizontal band of the sprite: rows [sy, sy + sh) of columns [sx, sx + sw)
// drawn at sprite coordinates (sx, dy).
function blit(img, sx, sy, sw, sh, dy) {
  ctx.drawImage(img, sx, sy, sw, sh, sx, dy, sw, sh);
}

function drawUpperBody(img, dy) {
  blit(img, 0, 0, HER.w, HER.hemY, dy);
  for (const hand of HER.hands) {
    blit(img, hand.x, HER.hemY, hand.w, HER.handsBottom - HER.hemY, HER.hemY + dy);
  }
}

// Draw a piece of one layer from the parts image, offset by (dx, dy).
function part(img, layer, sx, sy, sw, sh, dx, dy) {
  ctx.drawImage(img, layer * HER.w + sx, sy, sw, sh, sx + dx, sy + dy, sw, sh);
}

function drawLegWalking(img, x0, w, lift, inward) {
  const top = HER.hemY - 12;
  const dx = inward * lift * WALK.stepIn;
  // Shin first, then the thigh over its top, so a lifted leg reads as a bent knee.
  part(img, PARTS.legs, x0, WALK.kneeY, w, HER.h - WALK.kneeY, dx, -lift * WALK.shinLift);
  part(img, PARTS.legs, x0, top, w, WALK.kneeY - top + 2, dx * 0.5, -lift * WALK.thighLift);
}

function drawPlayer() {
  if (player.seat) {
    drawSeated(player.seat);
    return;
  }
  const back = spriteView(player.facing) === 'back';
  const img = back ? herBackParts : herFrontParts;
  if (!spriteReady(img)) return;

  const moving = player.walkTime > 0;
  const s = moving ? Math.sin(player.walkTime * WALK.speed) : 0;
  // Ease the lift so feet stay planted a little longer before rising.
  const liftL = Math.pow(Math.max(0, s), 1.4);
  const liftR = Math.pow(Math.max(0, -s), 1.4);
  const bob = -WALK.bob * Math.abs(s);
  const sway = -WALK.sway * s;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Shadow narrows a touch while a foot is up
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22 - Math.abs(s) * 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(HER.scale, HER.scale);
  ctx.translate(-HER.centerX, -HER.h);
  ctx.imageSmoothingQuality = 'high';

  const half = HER.legs.w / 2;
  drawLegWalking(img, HER.legs.x, half, liftL, 1);
  drawLegWalking(img, HER.legs.x + half, half, liftR, -1);

  // Each arm swings opposite its leg; seen from behind, sides swap.
  const swingL = WALK.armSwing * s * (back ? -1 : 1);
  part(img, PARTS.armL, 0, 0, HER.w, HER.h, sway, bob + swingL);
  part(img, PARTS.armR, 0, 0, HER.w, HER.h, sway, bob - swingL);
  part(img, PARTS.body, 0, 0, HER.w, HER.h, sway, bob);

  ctx.restore();
}

// Sitting facing the viewer: hem on the seat, knees just below, shins hanging.
function drawSeated(seat) {
  if (seat.view === 'back') {
    drawSeatedBack(seat);
    return;
  }
  if (!spriteReady(herFront)) return;
  ctx.save();
  ctx.translate(seat.x, seat.y);
  ctx.scale(HER.scale, HER.scale);
  ctx.translate(-HER.centerX, -HER.hemY);
  ctx.imageSmoothingQuality = 'high';

  blit(herFront, HER.legs.x, HER.kneeY, HER.legs.w, HER.h - HER.kneeY, HER.hemY - 4);
  drawUpperBody(herFront, 0);
  drawOpenBook(HER.centerX, 192);
  ctx.restore();
}

// Sitting facing away (the couch faces the TV): her back to the viewer, hem on
// the cushion, legs and book out of sight in front of her.
function drawSeatedBack(seat) {
  if (!spriteReady(herBack)) return;
  ctx.save();
  ctx.translate(seat.x, seat.y);
  ctx.scale(HER.scale, HER.scale);
  ctx.translate(-HER.centerX, -HER.hemY);
  ctx.imageSmoothingQuality = 'high';
  // Settle a pixel or two each time she turns a page
  const nudge = reading.flipTime > 0 ? Math.sin((reading.flipTime / 0.25) * Math.PI) * 2 : 0;
  drawUpperBody(herBack, nudge);
  ctx.restore();
}

// Open book resting on her lap, in sprite px. A page flips after each press.
function drawOpenBook(cx, cy) {
  const B = BOOK;
  const w = 31; // width of one page
  const h = 24;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = B.outline;

  // Cover peeking out around the pages
  ctx.fillStyle = B.cover;
  ctx.beginPath();
  ctx.rect(cx - w - 3, cy - h / 2 - 2, w * 2 + 6, h + 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = B.coverDark;
  ctx.fillRect(cx - w - 2, cy + h / 2, w * 2 + 4, 2);

  // Two pages
  for (const s of [-1, 1]) {
    ctx.fillStyle = B.page;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2 + 2);
    ctx.lineTo(cx + s * w, cy - h / 2);
    ctx.lineTo(cx + s * w, cy + h / 2);
    ctx.lineTo(cx, cy + h / 2 + 1);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Lines of text
    ctx.fillStyle = B.text;
    for (let i = 0; i < 5; i++) {
      const ly = cy - h / 2 + 4 + i * 3.5;
      const x0 = s < 0 ? cx - w + 4 : cx + 4;
      ctx.fillRect(x0, ly, w - 8 - (i === 4 ? 8 : 0), 1.5);
    }
  }
  // Gutter shadow
  ctx.fillStyle = B.pageShade;
  ctx.fillRect(cx - 1, cy - h / 2 + 2, 2, h - 1);

  if (reading.flipTime > 0) {
    const t = reading.flipTime / 0.25; // 1 -> 0
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(Math.cos((1 - t) * Math.PI), 1);
    ctx.fillStyle = B.page;
    ctx.beginPath();
    ctx.moveTo(0, cy - h / 2 + 2);
    ctx.lineTo(w, cy - h / 2 - 3 * Math.sin(t * Math.PI));
    ctx.lineTo(w, cy + h / 2 - 3 * Math.sin(t * Math.PI));
    ctx.lineTo(0, cy + h / 2 + 1);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawHitboxes() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 255, 120, 0.9)';
  for (const a of FLOOR_AREAS) ctx.strokeRect(a.x, a.y, a.w, a.h);
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
  const headTop = (player.seat ? HER.hemY : HER.h) * HER.scale + 4;
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
  drawKissHud();
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
// Small brindle pup with a white chest, muzzle and face blaze, brown patches
// around the eyes, big upright ears, short legs, white paws and a white tail tip.
// She follows the player's footsteps (so she never cuts through furniture) and
// hops up to lie on the couch whenever the player sits down to read.

const DOG_LOOK = {
  coat: '#9a5a2c',
  coatLight: '#b8743d',
  stripe: 'rgba(58, 30, 14, 0.55)',
  white: '#f6f1e8',
  earInner: '#d9a0a0',
  earOuter: '#4a2a18',
  nose: '#1b1411',
  eye: '#1b1411',
  outline: '#2a1d15',
};

const DOG_SCALE = 1.3;
const DOG_FOLLOW_DIST = 70; // how far behind (along her path) the dog trails
const DOG_MAX_SPEED = 480;
const HOP_TIME = 0.35;

const dog = {
  x: player.x - 50,
  y: player.y + 12,
  flip: false, // true = facing left
  walkTime: 0,
  wagTime: 0,
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
  return step >= d - 0.01;
}

function startHop(to, next) {
  dog.hop = { from: { x: dog.x, y: dog.y }, to, t: 0 };
  dog.state = next;
}

function updateDog(dt) {
  dog.wagTime += dt;

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
    if (moveDogToward(spot.ground.x, spot.ground.y, DOG_MAX_SPEED * 0.75, dt)) {
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

  const excess = pathLen - DOG_FOLLOW_DIST;
  if (excess > 0) {
    const speed = Math.min(DOG_MAX_SPEED, 120 + excess * 5);
    moveDogToward(trail[0].x, trail[0].y, speed, dt);
  } else {
    dog.walkTime = 0;
    // Face toward the player while waiting.
    if (Math.abs(player.x - dog.x) > 4) dog.flip = player.x < dog.x;
  }
}

function dogFillStroke(fill, lw = 1.2) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = DOG_LOOK.outline;
  ctx.stroke();
}

function coatGradient(y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, DOG_LOOK.coat);
  g.addColorStop(1, DOG_LOOK.coatLight);
  return g;
}

// Brindle: short dark tiger stripes across the coat.
function brindle(cx, cy, w, h) {
  ctx.strokeStyle = DOG_LOOK.stripe;
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const sx = cx - w / 2 + (i + 0.5) * (w / 6);
    ctx.beginPath();
    ctx.moveTo(sx - 1.5, cy - h / 2);
    ctx.quadraticCurveTo(sx + 1.5, cy, sx - 0.5, cy + h / 2);
    ctx.stroke();
  }
}

// Head looking slightly toward the viewer, nose pointing right.
function drawDogHead(hx, hy) {
  const D = DOG_LOOK;
  // Ears: big, upright, dark outside with pink inside
  for (const [ex, lean] of [[-3.5, -0.25], [3, 0.2]]) {
    ctx.save();
    ctx.translate(hx + ex, hy - 5);
    ctx.rotate(lean);
    ctx.beginPath();
    ctx.moveTo(-4, 1);
    ctx.quadraticCurveTo(-3.5, -9, 0, -14);
    ctx.quadraticCurveTo(3.5, -9, 4, 1);
    ctx.closePath();
    dogFillStroke(D.earOuter);
    ctx.beginPath();
    ctx.moveTo(-2.2, 0);
    ctx.quadraticCurveTo(-2, -7, 0, -10.5);
    ctx.quadraticCurveTo(2, -7, 2.2, 0);
    ctx.closePath();
    ctx.fillStyle = D.earInner;
    ctx.fill();
    ctx.restore();
  }
  // Skull: brown on top and sides, white blaze down the middle
  ctx.beginPath();
  ctx.ellipse(hx, hy, 8, 7.5, 0, 0, Math.PI * 2);
  dogFillStroke(D.coat);
  ctx.fillStyle = D.white;
  ctx.beginPath();
  ctx.moveTo(hx - 1.6, hy - 7.2);
  ctx.quadraticCurveTo(hx + 1, hy - 7.5, hx + 2.5, hy - 2);
  ctx.quadraticCurveTo(hx + 7, hy + 2, hx + 6, hy + 6.5);
  ctx.quadraticCurveTo(hx, hy + 8.5, hx - 6, hy + 6);
  ctx.quadraticCurveTo(hx - 5, hy + 1, hx - 1.6, hy - 7.2);
  ctx.closePath();
  ctx.fill();
  // Muzzle
  ctx.beginPath();
  ctx.ellipse(hx + 6, hy + 3, 5, 3.6, 0.1, 0, Math.PI * 2);
  dogFillStroke(D.white);
  ctx.beginPath();
  ctx.ellipse(hx + 10.4, hy + 2.2, 1.9, 1.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = D.nose;
  ctx.fill();
  ctx.strokeStyle = D.outline;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hx + 7, hy + 5.6);
  ctx.quadraticCurveTo(hx + 8.5, hy + 6.4, hx + 10, hy + 5.2);
  ctx.stroke();
  // Eyes in brown patches
  for (const ex of [-2.5, 3.6]) {
    ctx.fillStyle = D.coat;
    ctx.beginPath();
    ctx.ellipse(hx + ex, hy - 1.2, 2.6, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = D.eye;
    ctx.beginPath();
    ctx.arc(hx + ex + 0.3, hy - 1, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(hx + ex + 0.7, hy - 1.5, 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDogTail(baseX, baseY, wag) {
  const D = DOG_LOOK;
  const tipX = baseX - 10;
  const tipY = baseY - 4 + wag;
  ctx.lineCap = 'round';
  ctx.strokeStyle = D.outline;
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX - 6, baseY - 1, tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = D.coat;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.strokeStyle = D.white;
  ctx.beginPath();
  ctx.moveTo(baseX - 7, baseY - 2 + wag * 0.6);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawDogLeg(x, top, swing, color, paw) {
  ctx.beginPath();
  ctx.roundRect(x - 2.4 + swing, top, 4.8, -top - 1, 2);
  dogFillStroke(color, 1);
  ctx.beginPath();
  ctx.ellipse(x + swing + 0.8, -1.4, 3, 1.8, 0, 0, Math.PI * 2);
  dogFillStroke(paw, 1);
}

function drawDogStanding() {
  const D = DOG_LOOK;
  const moving = dog.walkTime > 0;
  const phase = Math.sin(dog.walkTime * 16);
  const swing = moving ? phase * 2.6 : 0;
  const bob = moving ? -Math.abs(phase) * 0.8 : 0;
  const wag = Math.sin(dog.wagTime * (moving ? 10 : 16)) * 3;

  // Far legs (darker, behind the body)
  ctx.globalAlpha = 0.85;
  drawDogLeg(9, -12, -swing, D.white, D.white);
  drawDogLeg(-12, -12, swing, D.coat, D.white);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(0, bob);
  drawDogTail(-17, -19, wag);
  // Body
  ctx.beginPath();
  ctx.ellipse(-2, -18, 18, 8.5, 0, 0, Math.PI * 2);
  dogFillStroke(coatGradient(-26, -10));
  ctx.save();
  ctx.clip();
  brindle(-5, -19, 22, 14);
  // White chest and belly
  ctx.fillStyle = D.white;
  ctx.beginPath();
  ctx.ellipse(9, -14, 9, 7.5, 0, 0, Math.PI * 2);
  ctx.ellipse(-2, -10.5, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Near legs: white front legs, brindle back legs with white paws
  drawDogLeg(11, -13, swing, D.white, D.white);
  drawDogLeg(-10, -13, -swing, D.coatLight, D.white);

  ctx.save();
  ctx.translate(0, bob);
  // Neck
  ctx.fillStyle = D.white;
  ctx.beginPath();
  ctx.ellipse(12, -24, 5, 6.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  drawDogHead(15, -31);
  ctx.restore();
}

// Lying down on the couch like in the photo: legs tucked, head up.
function drawDogLying() {
  const D = DOG_LOOK;
  const breathe = 1 + Math.sin(dog.wagTime * 2.2) * 0.025;
  const wag = Math.sin(dog.wagTime * 3) * 1.5;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(-1, 0, 22, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawDogTail(-18, -4, wag);
  ctx.save();
  ctx.scale(1, breathe);
  ctx.beginPath();
  ctx.ellipse(-3, -8, 18, 8, 0, 0, Math.PI * 2);
  dogFillStroke(coatGradient(-16, 0));
  ctx.save();
  ctx.clip();
  brindle(-7, -9, 22, 14);
  ctx.fillStyle = D.white;
  ctx.beginPath();
  ctx.ellipse(9, -6, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Back haunch
  ctx.beginPath();
  ctx.ellipse(-11, -7, 8, 6.5, 0, 0, Math.PI * 2);
  dogFillStroke(D.coatLight);
  brindle(-11, -7, 10, 9);
  ctx.restore();
  // Tucked paws
  for (const [px, py] of [[-4, -1.5], [12, -1.5], [17, -2]]) {
    ctx.beginPath();
    ctx.ellipse(px, py, 3.6, 2, 0, 0, Math.PI * 2);
    dogFillStroke(D.white, 1);
  }
  // Neck and head
  ctx.fillStyle = D.white;
  ctx.beginPath();
  ctx.ellipse(11, -13, 5, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  drawDogHead(13, -20);
}

function drawDog() {
  let lift = 0;
  if (dog.hop) lift = Math.sin(dog.hop.t * Math.PI) * 22;
  ctx.save();
  ctx.translate(dog.x, dog.y);

  if (dog.state !== 'couch') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 * (1 - lift / 60), 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(0, -lift);
  ctx.scale(dog.flip ? -DOG_SCALE : DOG_SCALE, DOG_SCALE);
  ctx.lineJoin = 'round';
  if (dog.state === 'couch') drawDogLying();
  else drawDogStanding();
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
  return !player.seat && kiss.cooldown <= 0 && nearHim();
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
  player.facing = Math.atan2(HIM.y - player.y, HIM.x - player.x);
  player.walkTime = 0;
  // A little heart pops up between them with every kiss
  addHeart((player.x + HIM.x) / 2, Math.min(player.y, HIM.y) - 150, false);
  kiss.progress = Math.min(1, kiss.progress + KISS_PER_PRESS);
  if (kiss.progress >= 1) {
    kiss.progress = 0;
    kiss.celebrate = CELEBRATE_TIME;
    kiss.cooldown = KISS_COOLDOWN;
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
  if (kiss.cooldown > 0 || player.seat) return;
  if (!nearHim() && kiss.progress === 0) return;
  const sx = HIM.x * scale;
  const sy = (HIM.y - HIM.h * HIM.scale - 6) * scale;
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
    { y: HIM.y, draw: drawHim },
  ];
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();
}

function render() {
  ctx.clearRect(0, 0, MAP_W, MAP_H);
  if (mapImg.complete && mapImg.naturalWidth) {
    ctx.drawImage(mapImg, 0, 0, MAP_W, MAP_H);
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
