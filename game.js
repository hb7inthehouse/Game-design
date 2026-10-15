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

const PLAYER_RADIUS = 26;
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
  facing: saved?.facing ?? -Math.PI / 2, // radians, pointing up
  walkTime: 0,
};
window.claude?.hot?.snapshot?.(() => ({ player: { x: player.x, y: player.y, facing: player.facing } }));

const keys = new Set();
const touchDirs = new Set();
let showHitboxes = false;
let runToggle = false;
let scale = 1;

// ---- Input ---------------------------------------------------------------

const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && !e.repeat) showHitboxes = !showHitboxes;
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

// ---- Update --------------------------------------------------------------

function update(dt) {
  const dirs = heldDirs();
  let dx = 0;
  let dy = 0;
  if (dirs.has('left')) dx -= 1;
  if (dirs.has('right')) dx += 1;
  if (dirs.has('up')) dy -= 1;
  if (dirs.has('down')) dy += 1;

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

// Character look: long middle-parted hair (light brown roots fading to blonde),
// black tee, denim mini skirt, black high-tops with white toe caps, pale blue pendant.
const LOOK = {
  skin: '#f3cdb3',
  skinShade: '#dfae92',
  hairRoot: '#8b6443',
  hairEnd: '#e2c08a',
  hairLine: '#5e4129',
  tee: '#1d1d20',
  denim: '#8fb3d6',
  shoe: '#151515',
  shoeToe: '#f2f0ea',
  pendant: '#cfe6f2',
  outline: '#111',
};

function drawPlayer() {
  const { x, y, facing, walkTime } = player;
  const r = PLAYER_RADIUS;
  const swing = Math.sin(walkTime * 12) * 0.9;
  const sway = Math.sin(walkTime * 6) * r * 0.06;
  const L = LOOK;

  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(4, 6, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(facing + Math.PI / 2); // sprite is drawn facing "up"
  ctx.lineWidth = 2;
  ctx.strokeStyle = L.outline;

  // High-top sneakers (alternate while walking): black with white toe cap
  for (const [sx, step] of [[-1, -swing], [1, swing]]) {
    const fx = sx * r * 0.36;
    const fy = step * r * 0.5 - r * 0.2;
    ctx.fillStyle = L.shoe;
    ctx.beginPath();
    ctx.ellipse(fx, fy, r * 0.2, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = L.shoeToe;
    ctx.beginPath();
    ctx.ellipse(fx, fy - r * 0.22, r * 0.15, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Denim skirt peeking out around the hips
  ctx.fillStyle = L.denim;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.3, r * 0.74, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Arms swing opposite the feet
  ctx.fillStyle = L.skin;
  for (const [sx, step] of [[-1, swing], [1, -swing]]) {
    ctx.beginPath();
    ctx.ellipse(sx * r * 0.92, step * r * 0.25 + r * 0.12, r * 0.14, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Black tee across the shoulders
  ctx.fillStyle = L.tee;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pendant on the chest, just in front of the head
  ctx.fillStyle = L.pendant;
  ctx.beginPath();
  ctx.arc(0, -r * 0.62, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Long hair down the back and over the shoulders, darker at the roots
  const hairGrad = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.85);
  hairGrad.addColorStop(0, L.hairRoot);
  hairGrad.addColorStop(1, L.hairEnd);
  ctx.fillStyle = hairGrad;
  ctx.strokeStyle = L.hairLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.2);
  ctx.bezierCurveTo(-r * 0.62, r * 0.3, -r * 0.45 + sway, r * 0.8, sway, r * 0.86);
  ctx.bezierCurveTo(r * 0.45 + sway, r * 0.8, r * 0.62, r * 0.3, r * 0.5, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Front strands falling over each shoulder
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * r * 0.5, -r * 0.12, r * 0.13, r * 0.36, sx * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Head from above: hair with a middle part, forehead and nose showing at the front
  const hy = -r * 0.1;
  const hr = r * 0.42;
  const crownGrad = ctx.createRadialGradient(0, hy, hr * 0.1, 0, hy, hr);
  crownGrad.addColorStop(0, L.hairRoot);
  crownGrad.addColorStop(1, '#b8905f');
  ctx.fillStyle = crownGrad;
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.ellipse(0, hy - hr * 1.02, hr * 0.42, hr * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = L.hairLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, Math.PI * 2);
  ctx.stroke();
  // Middle part, from the forehead back to the crown
  ctx.beginPath();
  ctx.moveTo(0, hy - hr * 0.66);
  ctx.lineTo(0, hy + hr * 0.1);
  ctx.stroke();

  // Nose tip
  ctx.fillStyle = L.skinShade;
  ctx.beginPath();
  ctx.arc(0, hy - hr * 1.02, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

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
