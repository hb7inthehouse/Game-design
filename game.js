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
// floor spot she sits down from and stands back up to. `dog` is where the dog
// lies next to her (`ground` is where it jumps up from).
const SEATS = [
  {
    x: 548, y: 474, view: 'front', approach: { x: 548, y: 528 },
    dog: { x: 488, y: 480, flip: false, ground: { x: 488, y: 540 } },
  },
  {
    x: 440, y: 474, view: 'front', approach: { x: 440, y: 528 },
    dog: { x: 500, y: 480, flip: true, ground: { x: 500, y: 540 } },
  },
  {
    x: 336, y: 640, view: 'right', approach: { x: 432, y: 640 },
    dog: { x: 345, y: 748, flip: false, ground: { x: 435, y: 748 } },
  },
  {
    x: 336, y: 790, view: 'right', approach: { x: 432, y: 790 },
    dog: { x: 345, y: 878, flip: false, ground: { x: 435, y: 878 } },
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
  updatePlayer(dt);
  updateDog(dt);
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

function drawPlayer() {
  if (player.seat) {
    drawSeated(player.seat);
    return;
  }
  const img = spriteView(player.facing) === 'back' ? herBack : herFront;
  if (!spriteReady(img)) return;

  const moving = player.walkTime > 0;
  const phase = Math.sin(player.walkTime * 11);
  const lift = 5; // sprite px a stepping foot rises
  const liftL = moving ? Math.max(0, phase) * lift : 0;
  const liftR = moving ? Math.max(0, -phase) * lift : 0;
  const bob = moving ? -Math.abs(phase) * 2 : 0;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(HER.scale, HER.scale);
  ctx.translate(-HER.centerX, -HER.h);
  ctx.imageSmoothingQuality = 'high';

  // Legs from just under the skirt down; each side lifts in turn.
  const legTop = HER.hemY - 12;
  const half = HER.legs.w / 2;
  blit(img, HER.legs.x, legTop, half, HER.h - legTop, legTop - liftL);
  blit(img, HER.legs.x + half, legTop, half, HER.h - legTop, legTop - liftR);
  drawUpperBody(img, bob);

  ctx.restore();
}

// Sitting facing the viewer: hem on the seat, knees just below, shins hanging.
function drawSeated(seat) {
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

// Draw the player and the dog back to front so whoever is lower on screen is in front.
function drawActors() {
  const playerY = player.seat ? player.seat.y : player.y;
  const dogY = dog.hop ? Math.max(dog.hop.from.y, dog.hop.to.y) : dog.y;
  if (dogY < playerY) {
    drawDog();
    drawPlayer();
  } else {
    drawPlayer();
    drawDog();
  }
}

function render() {
  ctx.clearRect(0, 0, MAP_W, MAP_H);
  if (mapImg.complete && mapImg.naturalWidth) {
    ctx.drawImage(mapImg, 0, 0, MAP_W, MAP_H);
  }
  drawActors();
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
