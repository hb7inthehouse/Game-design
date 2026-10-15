// Living Room — a free-roam sandbox on top of the floor-plan image.
// All world coordinates are in image pixels (the map is 1312 x 1199).

const MAP_SRC = 'assets/living-room.png';
const MAP_W = 1312;
const MAP_H = 1199;

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

const player = {
  x: 720,
  y: 820,
  facing: -Math.PI / 2, // radians, pointing up
  walkTime: 0,
};

const keys = new Set();
const touchDirs = new Set();
let showHitboxes = false;
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
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
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
  scale = Math.min(window.innerWidth / MAP_W, window.innerHeight / MAP_H);
  const cssW = Math.floor(MAP_W * scale);
  const cssH = Math.floor(MAP_H * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function drawPlayer() {
  const { x, y, facing, walkTime } = player;
  const r = PLAYER_RADIUS;
  const swing = Math.sin(walkTime * 12) * 0.9;

  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(4, 6, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(facing + Math.PI / 2); // sprite is drawn facing "up"

  // Feet (alternate while walking)
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -swing * r * 0.45, r * 0.22, r * 0.32, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.4, swing * r * 0.45, r * 0.22, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders / body
  ctx.fillStyle = '#3d7bd6';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = '#f0c49a';
  ctx.beginPath();
  ctx.arc(0, -r * 0.08, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair (back of head) so facing direction is readable
  ctx.fillStyle = '#4a2f1d';
  ctx.beginPath();
  ctx.arc(0, -r * 0.08, r * 0.48, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  ctx.fill();

  // Nose hint
  ctx.fillStyle = '#d9a57a';
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.1, 0, Math.PI * 2);
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
