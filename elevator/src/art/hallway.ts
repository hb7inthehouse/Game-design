// The small slice of each floor visible through the open doors (128x120).
import { C, canvas, dither, ellipse, line, quad, rect, px, shade, tint } from './palette';
import { TINY, drawText, textWidth } from '../core/font';

export const HW = 128;
export const HH = 120;

export type HallVariant =
  | 'normal' | 'shoes' | 'infinite' | 'brick' | 'cab' | 'flooded' | 'old' | 'ceiling' | 'samedoors' | 'figure'
  | 'dark' | 'stairs' | 'pit' | 'thirteen' | 'thirteen_crowd' | 'dawn' | 'opendoor' | 'leash' | 'mirror' | 'lobbydark';

export interface HallSpec {
  floor: number;
  variant: HallVariant;
  act: number;
  names: Record<number, string>;
  figureDist?: number;
  keyGlint?: boolean;
}

interface Theme {
  wall: string;
  pattern: 'stripe' | 'floral' | 'damask' | 'plain' | 'diamond' | 'panel' | 'concrete';
  carpet: string;
  kind: 'landing' | 'corridor';
  door?: string;
  features: string[];
}

const THEMES: Record<number, Theme> = {
  2: { wall: '#2c4a38', pattern: 'stripe', carpet: '#4a2a22', kind: 'landing', door: '2B', features: ['tricycle', 'sconces'] },
  3: { wall: '#6a3a44', pattern: 'floral', carpet: '#2e3a4a', kind: 'landing', door: '3A', features: ['table', 'sconces'] },
  4: { wall: '#2a4c50', pattern: 'panel', carpet: '#5a3a24', kind: 'landing', door: '4C', features: ['shoerack', 'sconces'] },
  5: { wall: '#7a6024', pattern: 'diamond', carpet: '#4a1e1e', kind: 'corridor', features: [] },
  6: { wall: '#5a2228', pattern: 'damask', carpet: '#2a2a30', kind: 'landing', door: '6D', features: ['bottles', 'picture', 'sconces'] },
  7: { wall: '#3c4656', pattern: 'plain', carpet: '#3a2e26', kind: 'landing', door: '7A', features: ['radiator', 'brokenlight'] },
  8: { wall: '#a89870', pattern: 'panel', carpet: '#3a2a3a', kind: 'landing', features: ['window', 'chair', 'sconces'] },
  9: { wall: '#4a2a48', pattern: 'damask', carpet: '#5a4428', kind: 'landing', door: '9B', features: ['mat', 'stand', 'picture', 'sconces'] },
  10: { wall: '#4a5030', pattern: 'stripe', carpet: '#2a2026', kind: 'corridor', features: [] },
  11: { wall: '#1e2a48', pattern: 'plain', carpet: '#5a2a2a', kind: 'landing', door: '11A', features: ['drawing', 'bicycle', 'sconces'] },
  12: { wall: '#4a4a4a', pattern: 'concrete', carpet: '#2a2a2a', kind: 'landing', door: 'MACHINE', features: ['sign', 'bulb'] },
};

const cache = new Map<string, HTMLCanvasElement>();

export function hallway(spec: HallSpec): HTMLCanvasElement {
  const key = JSON.stringify(spec);
  let c = cache.get(key);
  if (!c) {
    c = render(spec);
    cache.set(key, c);
  }
  return c;
}

function render(s: HallSpec): HTMLCanvasElement {
  const [cv, ctx] = canvas(HW, HH);
  const v = s.variant;
  if (v === 'brick') { drawBrick(ctx); return cv; }
  if (v === 'pit' || s.floor === 0) { drawPit(ctx, s); return cv; }
  if (v === 'thirteen' || v === 'thirteen_crowd' || s.floor === -1) { drawThirteen(ctx, v === 'thirteen_crowd'); return cv; }
  if (v === 'cab') { drawCabInterior(ctx); return cv; }
  if (s.floor === 1) {
    drawLobby(ctx, s);
    if (v === 'dawn') return tint(cv, 'dawn');
    if (v === 'lobbydark' || v === 'dark') { darken(ctx, 0.82); return cv; }
    if (v === 'old') return tint(cv, 'sepia');
    return cv;
  }
  const theme = THEMES[s.floor] ?? THEMES[7];
  if (v === 'infinite' || v === 'samedoors' || v === 'figure') {
    drawCorridor(ctx, theme, s, v);
    return cv;
  }
  if (theme.kind === 'corridor' && v !== 'stairs') drawCorridor(ctx, theme, s, v);
  else drawLanding(ctx, theme, s);

  if (v === 'shoes') drawShoes(ctx, 56, 108);
  if (v === 'leash') {
    for (let i = 0; i < 26; i++) px(ctx, 40 + i, 110 + Math.round(Math.sin(i / 3) * 2), C.red2);
    rect(ctx, 66, 108, 3, 3, C.brass2);
  }
  if (v === 'stairs') drawStairs(ctx, theme);
  if (v === 'flooded') drawFlood(ctx);
  if (v === 'dark') {
    darken(ctx, 0.86);
    drawExitSign(ctx, 96, 14);
  }
  if (v === 'old') return tint(cv, 'sepia');
  if (v === 'ceiling') {
    const [f, fctx] = canvas(HW, HH);
    fctx.translate(0, HH);
    fctx.scale(1, -1);
    fctx.drawImage(cv, 0, 0);
    return f;
  }
  if (v === 'mirror') {
    const [f, fctx] = canvas(HW, HH);
    fctx.translate(HW, 0);
    fctx.scale(-1, 1);
    fctx.drawImage(cv, 0, 0);
    return f;
  }
  return cv;
}

function darken(ctx: CanvasRenderingContext2D, a: number): void {
  ctx.fillStyle = `rgba(4,3,6,${a})`;
  ctx.fillRect(0, 0, HW, HH);
}

function wallpaper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, pattern: Theme['pattern']): void {
  rect(ctx, x, y, w, h, base);
  const d = shade(base, -0.22);
  const l = shade(base, 0.1);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j;
    let on = false;
    switch (pattern) {
      case 'stripe': on = X % 8 < 2; break;
      case 'floral': on = (X % 10 === 4 && Y % 10 === 4) || ((X + 5) % 10 === 4 && (Y + 5) % 10 === 4) || (X % 10 === 4 && Y % 10 === 5) || (X % 10 === 5 && Y % 10 === 4); break;
      case 'damask': { const a = (X % 12) - 6, b = (Y % 14) - 7; on = Math.abs(a) + Math.abs(b) === 5 || (a === 0 && Math.abs(b) < 2); break; }
      case 'diamond': on = (X + Y) % 10 === 0 || (X - Y + 1000) % 10 === 0; break;
      case 'panel': on = X % 24 === 0 || Y % 30 === 0; break;
      case 'concrete': on = ((X * 7 + Y * 13) % 17 === 0) || ((X * 3 + Y * 5) % 23 === 0); break;
      default: on = false;
    }
    if (on) px(ctx, X, Y, pattern === 'floral' && (X + Y) % 2 ? l : d);
  }
}

function carpet(ctx: CanvasRenderingContext2D, y: number, color: string): void {
  for (let j = y; j < HH; j++) {
    const t = (j - y) / (HH - y);
    rect(ctx, 0, j, HW, 1, shade(color, -0.25 + t * 0.2));
  }
  const border = shade(color, 0.25);
  rect(ctx, 0, y + 3, HW, 1, border);
  rect(ctx, 0, HH - 6, HW, 1, border);
  for (let i = 0; i < HW; i += 8) {
    const yy = y + 8 + Math.floor((i / 8) % 2) * 2;
    px(ctx, i + 2, yy, border);
    px(ctx, i + 6, yy + 6, shade(color, 0.1));
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, nameplate?: string, open = false): void {
  rect(ctx, x - 3, y - 3, w + 6, h + 3, C.wood1);
  rect(ctx, x - 3, y - 3, w + 6, 1, C.wood3);
  if (open) {
    // warm light from inside
    rect(ctx, x, y, w, h, C.amber);
    dither(ctx, x, y, w, h, C.amberHi, 0.3);
    rect(ctx, x, y, 4, h, C.wood2);
    rect(ctx, x + 4, y, 1, h, C.wood0);
    return;
  }
  rect(ctx, x, y, w, h, C.wood3);
  rect(ctx, x + w - 1, y, 1, h, C.wood2);
  for (const [px0, py0, pw, ph] of [[3, 4, w / 2 - 5, h * 0.36], [w / 2 + 2, 4, w / 2 - 5, h * 0.36], [3, h * 0.48, w / 2 - 5, h * 0.44], [w / 2 + 2, h * 0.48, w / 2 - 5, h * 0.44]]) {
    rect(ctx, x + px0, y + py0, pw, ph, C.wood2);
    rect(ctx, x + px0, y + py0, pw, 1, C.wood1);
    rect(ctx, x + px0 + 1, y + py0 + ph - 1, pw - 1, 1, C.wood4);
  }
  rect(ctx, x + w - 5, y + h * 0.5, 3, 2, C.brass3);
  px(ctx, x + w / 2, y + 12, C.ink);
  if (label) {
    const tw = textWidth(TINY, label);
    rect(ctx, x + w / 2 - tw / 2 - 2, y - 11, tw + 4, 8, C.brass1);
    rect(ctx, x + w / 2 - tw / 2 - 2, y - 11, tw + 4, 1, C.brass3);
    drawText(ctx, TINY, label, x + w / 2 - tw / 2, y - 9, C.brass4);
  }
  if (nameplate) {
    const tw = textWidth(TINY, nameplate);
    const nx = x + w + 6;
    rect(ctx, nx - 2, y + 18, tw + 4, 8, C.cream2);
    rect(ctx, nx - 2, y + 25, tw + 4, 1, C.cream0);
    drawText(ctx, TINY, nameplate, nx, y + 20, C.ink);
  }
}

function sconce(ctx: CanvasRenderingContext2D, x: number, y: number, lit = true): void {
  if (lit) {
    for (let r = 14; r > 2; r -= 3) {
      ctx.fillStyle = `rgba(255,214,140,${0.05})`;
      for (let j = -r; j <= r; j++) {
        const hw = Math.round(Math.sqrt(r * r - j * j));
        ctx.fillRect(x - hw, y + j, hw * 2, 1);
      }
    }
  }
  rect(ctx, x - 1, y + 2, 2, 4, C.brass1);
  rect(ctx, x - 3, y - 3, 6, 5, lit ? C.lamp : C.cream0);
  rect(ctx, x - 3, y - 3, 6, 1, lit ? C.white : C.cream1);
}

function drawLanding(ctx: CanvasRenderingContext2D, t: Theme, s: HallSpec): void {
  const floorY = 92;
  rect(ctx, 0, 0, HW, 10, shade(t.wall, -0.65));
  wallpaper(ctx, 0, 10, HW, floorY - 10, t.wall, t.pattern);
  // wainscot
  if (t.pattern !== 'concrete') {
    rect(ctx, 0, 62, HW, floorY - 62, shade(t.wall, -0.42));
    rect(ctx, 0, 61, HW, 2, shade(t.wall, 0.2));
    for (let x = 4; x < HW; x += 22) {
      rect(ctx, x, 67, 16, 19, shade(t.wall, -0.5));
      rect(ctx, x, 67, 16, 1, shade(t.wall, -0.6));
    }
  }
  rect(ctx, 0, floorY - 3, HW, 3, C.wood1);
  carpet(ctx, floorY, t.carpet);
  // ceiling lamp
  rect(ctx, 56, 8, 16, 3, s.act >= 3 && s.floor % 3 === 0 ? C.cream0 : C.lamp);
  rect(ctx, 63, 0, 2, 8, C.steel1);

  const name = s.names[s.floor];
  const f = t.features;
  if (t.door === 'MACHINE') {
    rect(ctx, 38, 26, 44, 66, C.steel1);
    rect(ctx, 40, 28, 40, 64, C.steel2);
    rect(ctx, 59, 28, 1, 64, C.steel1);
    rect(ctx, 52, 56, 4, 3, C.steel4);
    rect(ctx, 42, 34, 36, 10, C.amber);
    drawText(ctx, TINY, 'MACHINE', 46, 37, C.ink);
    rect(ctx, 46, 48, 28, 6, C.red2);
    drawText(ctx, TINY, 'NO ENTRY', 47, 49, C.white);
    // ladder to the roof hatch
    for (let y = 12; y < floorY; y += 6) rect(ctx, 98, y, 12, 1, C.steel3);
    rect(ctx, 98, 10, 1, floorY - 10, C.steel3);
    rect(ctx, 109, 10, 1, floorY - 10, C.steel3);
    rect(ctx, 0, 0, HW, 4, C.ink);
    ellipse(ctx, 22, 14, 2, 2, C.lamp);
    line(ctx, 22, 4, 22, 12, C.steel0);
  } else if (t.door) {
    const doorOpen = s.variant === 'opendoor';
    drawDoor(ctx, 46, 30, 30, floorY - 30, s.variant === 'samedoors' ? '13' : t.door, name, doorOpen);
    if (s.act >= 2 && name === 'HALLORAN' && !doorOpen) {
      // her cake tin left on the mat
      rect(ctx, 50, floorY + 4, 10, 4, C.red2);
      rect(ctx, 50, floorY + 4, 10, 1, C.red3);
    }
  }
  if (f.includes('sconces')) {
    const broken = f.includes('brokenlight');
    sconce(ctx, 20, 40, true);
    sconce(ctx, 106, 40, !broken);
  }
  if (f.includes('brokenlight')) {
    sconce(ctx, 20, 40, true);
    sconce(ctx, 106, 40, false);
  }
  if (f.includes('picture')) {
    const tilt = s.act >= 2 ? 2 : 0;
    rect(ctx, 92, 22 + tilt, 22, 16, C.brass1);
    rect(ctx, 94, 24 + tilt, 18, 12, s.act >= 3 ? C.ink : C.green1);
    if (s.act < 3) {
      rect(ctx, 94, 31 + tilt, 18, 5, C.green2);
      ellipse(ctx, 104, 28 + tilt, 2, 2, C.cream2);
    } else {
      ellipse(ctx, 103, 29 + tilt, 2, 3, C.cream0);
    }
  }
  if (f.includes('tricycle')) {
    ellipse(ctx, 16, 86, 4, 4, C.ink);
    ellipse(ctx, 16, 86, 2, 2, C.steel2);
    ellipse(ctx, 30, 88, 2, 2, C.ink);
    line(ctx, 16, 86, 28, 80, C.red2);
    line(ctx, 28, 80, 30, 88, C.red2);
    rect(ctx, 22, 79, 6, 2, C.ink);
  }
  if (f.includes('table')) {
    rect(ctx, 88, 70, 22, 2, C.wood3);
    rect(ctx, 90, 72, 2, 17, C.wood2);
    rect(ctx, 106, 72, 2, 17, C.wood2);
    rect(ctx, 86, 69, 26, 1, C.paper);
    rect(ctx, 96, 60, 6, 9, C.blue2);
    for (const [dx, dy, c] of [[-2, -4, C.rose3], [2, -5, C.white], [5, -3, C.rose2], [0, -6, C.amber]] as const) rect(ctx, 97 + dx, 60 + dy, 3, 3, s.act >= 3 ? C.cream0 : c);
  }
  if (f.includes('shoerack')) {
    rect(ctx, 88, 78, 26, 11, C.wood2);
    rect(ctx, 88, 83, 26, 1, C.wood1);
    drawShoes(ctx, 92, 80);
    drawShoes(ctx, 103, 85);
    rect(ctx, 12, 58, 3, 30, C.blue1);
    rect(ctx, 13, 55, 1, 3, C.wood3);
  }
  if (f.includes('bottles')) {
    for (let i = 0; i < 4; i++) {
      rect(ctx, 92 + i * 5, 80, 3, 9, i % 2 ? C.green2 : C.amberDim);
      rect(ctx, 93 + i * 5, 77, 1, 3, i % 2 ? C.green2 : C.amberDim);
    }
  }
  if (f.includes('radiator')) {
    rect(ctx, 86, 70, 30, 18, C.steel2);
    for (let x = 88; x < 114; x += 4) rect(ctx, x, 71, 2, 16, C.steel3);
  }
  if (f.includes('window')) {
    rect(ctx, 84, 22, 32, 38, C.wood1);
    rect(ctx, 86, 24, 28, 34, C.blue0);
    for (let i = 0; i < 9; i++) {
      const bx = 88 + ((i * 7) % 24), by = 34 + ((i * 11) % 20);
      rect(ctx, bx, by, 1, 1, i % 3 ? C.amber : C.blue3);
    }
    rect(ctx, 86, 46, 28, 12, C.blue1);
    for (let i = 0; i < 12; i++) px(ctx, 87 + ((i * 5) % 26), 25 + ((i * 9) % 30), C.blue3);
    rect(ctx, 99, 24, 2, 34, C.wood1);
    rect(ctx, 86, 40, 28, 2, C.wood1);
    // chair
    rect(ctx, 18, 70, 16, 3, C.wood3);
    rect(ctx, 18, 52, 3, 36, C.wood2);
    rect(ctx, 31, 73, 2, 15, C.wood2);
    rect(ctx, 20, 73, 2, 15, C.wood2);
  }
  if (f.includes('mat')) {
    rect(ctx, 46, floorY + 1, 30, 4, C.wood2);
    rect(ctx, 46, floorY + 1, 30, 1, C.wood3);
  }
  if (f.includes('stand')) {
    rect(ctx, 16, 72, 8, 17, C.brass1);
    rect(ctx, 17, 60, 1, 14, C.ink);
    rect(ctx, 20, 62, 1, 12, C.red1);
  }
  if (f.includes('drawing')) {
    rect(ctx, 52, 44, 12, 9, C.paper);
    ellipse(ctx, 56, 47, 2, 2, C.amber);
    line(ctx, 53, 51, 62, 51, C.green2);
    rect(ctx, 59, 48, 2, 3, C.red2);
    // bicycle
    ellipse(ctx, 96, 82, 6, 6, C.ink);
    ellipse(ctx, 96, 82, 4, 4, shade(t.wall, -0.42));
    ellipse(ctx, 114, 82, 6, 6, C.ink);
    ellipse(ctx, 114, 82, 4, 4, shade(t.wall, -0.42));
    line(ctx, 96, 82, 104, 72, C.teal2);
    line(ctx, 104, 72, 114, 82, C.teal2);
    line(ctx, 104, 72, 112, 72, C.teal2);
  }
  if (f.includes('sign')) {
    rect(ctx, 6, 30, 22, 14, C.amber);
    drawText(ctx, TINY, 'ROOF', 9, 33, C.ink);
    line(ctx, 9, 40, 25, 40, C.ink);
  }
  if (s.act >= 3 && t.pattern !== 'concrete') {
    // water stain creeping down from the ceiling
    for (let i = 0; i < 26; i++) {
      const sx = 26 + Math.round(Math.sin(i * 1.7) * 6) + (i % 5);
      rect(ctx, sx, 10, 1, 4 + ((i * 13) % 20), shade(t.wall, -0.5));
    }
  }
  // the corridor fades into darkness on both sides
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(5,4,7,${0.06 * (14 - i)})`;
    ctx.fillRect(i, 0, 1, HH);
    ctx.fillRect(HW - 1 - i, 0, 1, HH);
  }
}

function drawShoes(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  for (const dx of [0, 7]) {
    rect(ctx, x + dx, y, 6, 3, C.ink);
    rect(ctx, x + dx, y, 6, 1, C.steel1);
    rect(ctx, x + dx + 4, y - 1, 2, 1, C.ink);
  }
}

function drawExitSign(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  for (let r = 12; r > 0; r -= 3) {
    ctx.fillStyle = 'rgba(224,64,46,0.07)';
    ctx.fillRect(x - r, y - r / 2, 20 + r * 2, 8 + r);
  }
  rect(ctx, x, y, 20, 8, C.exitGlow);
  drawText(ctx, TINY, 'EXIT', x + 3, y + 2, C.exit);
}

function persp(vx: number, edge: number, z: number): number {
  return vx + (edge - vx) / z;
}

function drawCorridor(ctx: CanvasRenderingContext2D, t: Theme, s: HallSpec, v: HallVariant): void {
  const vx = 64, vy = 58;
  const infinite = v === 'infinite';
  const far = infinite ? 60 : 7;
  const wallC = t.wall;
  // ceiling & floor
  rect(ctx, 0, 0, HW, HH, shade(wallC, -0.7));
  const L = 0, R = HW, T = -10, B = HH;
  const fz = (z: number) => ({ l: persp(vx, L, z), r: persp(vx, R, z), t: persp(vy, T, z), b: persp(vy, B, z) });
  const end = fz(far);
  quad(ctx, [[L, B], [R, B], [end.r, end.b], [end.l, end.b]], t.carpet);
  quad(ctx, [[L, T], [R, T], [end.r, end.t], [end.l, end.t]], shade(wallC, -0.6));
  quad(ctx, [[L, T], [end.l, end.t], [end.l, end.b], [L, B]], wallC);
  quad(ctx, [[R, T], [end.r, end.t], [end.r, end.b], [R, B]], shade(wallC, -0.15));
  // runner on the carpet
  quad(ctx, [[30, B], [98, B], [persp(vx, 98, far), end.b], [persp(vx, 30, far), end.b]], shade(t.carpet, 0.15));
  // wallpaper rhythm lines + doors + lamps
  const zs: number[] = [];
  for (let z = 1.2; z < far; z *= 1.32) zs.push(z);
  for (const z of zs) {
    const a = fz(z);
    line(ctx, a.l, a.t, a.l, a.b, shade(wallC, -0.2));
    line(ctx, a.r, a.t, a.r, a.b, shade(wallC, -0.3));
  }
  let n = 0;
  for (let z = 1.5; z < far; z *= 1.75) {
    n++;
    const a = fz(z), b = fz(z * 1.18);
    const label = v === 'samedoors' ? '13' : `${s.floor}${String.fromCharCode(64 + n)}`;
    // left door
    const dt = (y: number, zz: number) => persp(vy, y, zz);
    const ly0 = dt(10, z), ly1 = dt(B - 2, z), ly0b = dt(10, z * 1.18), ly1b = dt(B - 2, z * 1.18);
    quad(ctx, [[a.l, ly0], [b.l, ly0b], [b.l, ly1b], [a.l, ly1]], C.wood2);
    if (z < 3) {
      px(ctx, Math.round((a.l + b.l) / 2), Math.round((ly0 + ly1) / 2), C.brass3);
      if (z < 2) drawText(ctx, TINY, label, Math.round(a.l + 3), Math.round(ly0 - 7), shade(wallC, 0.4));
    }
    const ry0 = dt(10, z * 1.08), ry1 = dt(B - 2, z * 1.08), ry0b = dt(10, z * 1.26), ry1b = dt(B - 2, z * 1.26);
    const ra = fz(z * 1.08), rb = fz(z * 1.26);
    quad(ctx, [[ra.r, ry0], [rb.r, ry0b], [rb.r, ry1b], [ra.r, ry1]], C.wood1);
    // ceiling lamp
    const lz = fz(z * 1.1);
    const lw = Math.max(1, Math.round(10 / z));
    rect(ctx, vx - lw, lz.t + 1, lw * 2, Math.max(1, Math.round(3 / z)), s.floor === 10 && n === 2 ? C.cream0 : C.lamp);
  }
  if (!infinite) {
    // end wall with a window
    rect(ctx, end.l, end.t, end.r - end.l, end.b - end.t, shade(wallC, -0.25));
    const ww = (end.r - end.l) * 0.5;
    rect(ctx, vx - ww / 2, end.t + 3, ww, (end.b - end.t) * 0.5, C.blue0);
    px(ctx, vx - 2, end.t + 6, C.amber);
  } else {
    rect(ctx, vx - 1, vy - 3, 2, 4, C.void);
  }
  if (v === 'figure') {
    const z = s.figureDist ?? 6;
    const fb = persp(vy, B - 4, z);
    const fh = Math.round(100 / z);
    const fw = Math.max(3, Math.round(fh * 0.3));
    const fx = vx - fw / 2;
    rect(ctx, fx, fb - fh, fw, fh, C.void);
    rect(ctx, fx + 1, fb - fh - Math.round(fh * 0.18), fw - 2, Math.round(fh * 0.18), C.void);
    if (z < 3) {
      // too close now: a pale face
      rect(ctx, fx + 1, fb - fh - Math.round(fh * 0.18) + 1, fw - 2, Math.round(fh * 0.16), C.ash);
      px(ctx, fx + 2, fb - fh - Math.round(fh * 0.1), C.void);
      px(ctx, fx + fw - 3, fb - fh - Math.round(fh * 0.1), C.void);
    }
  }
  // light falloff
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(5,4,7,0.12)';
    const rr = 6 + i * 4;
    ctx.fillRect(vx - rr, vy - rr, rr * 2, rr * 2);
  }
}

function drawLobby(ctx: CanvasRenderingContext2D, s: HallSpec): void {
  const floorY = 90;
  rect(ctx, 0, 0, HW, 8, C.ink);
  // marble wall panels
  rect(ctx, 0, 8, HW, floorY - 8, '#5a5040');
  for (let x = 0; x < HW; x += 16) {
    rect(ctx, x, 8, 1, floorY - 8, '#3e3628');
    for (let k = 0; k < 4; k++) line(ctx, x + 3 + k * 2, 14 + k * 17, x + 9 + k, 22 + k * 17, '#6e6450');
  }
  rect(ctx, 0, 8, HW, 3, C.brass1);
  rect(ctx, 0, floorY - 4, HW, 4, '#2a2418');
  // checker floor
  const rows = [90, 95, 101, 108, 116, 126];
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r], y1 = rows[r + 1];
    for (let y = y0; y < Math.min(HH, y1); y++) {
      const spread = 1 + (y - floorY) / 40;
      for (let c = -8; c < 8; c++) {
        const xa = 64 + c * 9 * spread, xb = 64 + (c + 1) * 9 * spread;
        rect(ctx, xa, y, xb - xa + 1, 1, (c + r) % 2 === 0 ? '#c8bea0' : '#1e1a16');
      }
    }
  }
  // glass street doors
  rect(ctx, 40, 18, 48, 72, C.brass1);
  rect(ctx, 42, 20, 21, 70, C.blue0);
  rect(ctx, 65, 20, 21, 70, C.blue0);
  rect(ctx, 63, 20, 2, 70, C.brass2);
  if (s.variant !== 'dawn') {
    // street: lamp, wet road, rain
    rect(ctx, 49, 34, 1, 40, C.steel1);
    rect(ctx, 47, 32, 5, 3, C.amber);
    for (let r = 10; r > 0; r -= 3) {
      ctx.fillStyle = 'rgba(255,180,74,0.06)';
      ctx.fillRect(49 - r, 33 - r, r * 2, r * 2);
    }
    rect(ctx, 42, 74, 44, 16, C.blue1);
    for (let i = 0; i < 16; i++) line(ctx, 43 + ((i * 7) % 42), 22 + ((i * 13) % 50), 42 + ((i * 7) % 42), 26 + ((i * 13) % 50), C.blue3);
    rect(ctx, 70, 76, 10, 1, C.amberDim);
  } else {
    rect(ctx, 42, 20, 44, 70, '#f0a860');
    rect(ctx, 42, 60, 44, 30, '#c07850');
    ellipse(ctx, 75, 58, 7, 7, '#fff0c0');
  }
  rect(ctx, 55, 52, 6, 2, C.brass3);
  rect(ctx, 67, 52, 6, 2, C.brass3);
  // brass mailboxes
  rect(ctx, 4, 30, 30, 34, C.brass1);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
    rect(ctx, 6 + i * 9, 32 + j * 8, 8, 7, C.brass2);
    rect(ctx, 7 + i * 9, 34 + j * 8, 6, 1, C.brass0);
  }
  // memorial portrait of Walter
  rect(ctx, 96, 26, 22, 28, C.brass2);
  rect(ctx, 98, 28, 18, 22, s.act >= 2 ? C.ink : '#3a3228');
  if (s.act < 2) {
    rect(ctx, 103, 32, 8, 9, '#c8a088');
    rect(ctx, 102, 30, 10, 3, C.red1);
    rect(ctx, 101, 41, 12, 9, C.red1);
  } else {
    rect(ctx, 101, 41, 12, 9, C.red1);
    rect(ctx, 102, 30, 10, 3, C.red1);
  }
  rect(ctx, 98, 56, 18, 6, C.cream2);
  drawText(ctx, TINY, 'W.I.', 101, 57, C.ink);
  // candle
  rect(ctx, 106, 64, 2, 5, C.cream3);
  px(ctx, 106, 63, C.amber);
  rect(ctx, 100, 69, 14, 2, C.wood3);
  // palm
  rect(ctx, 14, 74, 10, 14, C.wood2);
  for (const [dx, dy] of [[-8, -10], [6, -12], [-2, -16], [10, -6], [-10, -4]]) line(ctx, 19, 74, 19 + dx, 74 + dy, C.green2);
  // ceiling lamp
  rect(ctx, 58, 8, 12, 4, C.brass2);
  rect(ctx, 60, 12, 8, 3, C.lamp);
}

function drawBrick(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, HW, HH, '#2a1a16');
  for (let y = 0; y < HH; y += 6) {
    const off = (y / 6) % 2 ? 6 : 0;
    for (let x = -off; x < HW; x += 12) {
      const c = ((x * 13 + y * 7) % 5) === 0 ? '#5a2a20' : '#4a2218';
      rect(ctx, x + 1, y + 1, 11, 5, c);
      rect(ctx, x + 1, y + 1, 11, 1, shade(c, 0.15));
    }
  }
  // scratched numbers
  drawText(ctx, TINY, '13', 58, 50, '#8a6a5a');
  for (let i = 0; i < 5; i++) line(ctx, 40 + i * 3, 70, 44 + i * 3, 86, '#7a5a4a');
}

function drawPit(ctx: CanvasRenderingContext2D, s: HallSpec): void {
  rect(ctx, 0, 0, HW, HH, '#141414');
  wallpaper(ctx, 0, 0, HW, 96, '#262624', 'concrete');
  // pipes
  rect(ctx, 0, 18, HW, 4, C.steel1);
  rect(ctx, 0, 18, HW, 1, C.steel2);
  rect(ctx, 100, 0, 4, 96, C.steel1);
  // buffer springs
  for (const bx of [24, 92]) {
    rect(ctx, bx, 78, 12, 18, C.steel0);
    for (let y = 80; y < 96; y += 3) rect(ctx, bx - 1, y, 14, 1, C.steel2);
  }
  // bulb
  line(ctx, 64, 0, 64, 12, C.ink);
  ellipse(ctx, 64, 14, 2, 2, C.lamp);
  for (let r = 18; r > 0; r -= 4) {
    ctx.fillStyle = 'rgba(255,230,170,0.04)';
    ctx.fillRect(64 - r * 2, 14 - r, r * 4, r * 2);
  }
  // black water
  rect(ctx, 0, 96, HW, 24, '#06080a');
  for (let i = 0; i < 12; i++) rect(ctx, (i * 19) % HW, 98 + ((i * 7) % 20), 6 + (i % 4) * 3, 1, '#1a2228');
  rect(ctx, 60, 100, 8, 1, '#3a3020');
  if (s.keyGlint) {
    px(ctx, 74, 104, C.brass4);
    px(ctx, 75, 104, C.brass3);
    px(ctx, 74, 105, C.brass2);
  }
  drawText(ctx, TINY, 'B', 8, 30, C.amberDim);
  // painted shaft markings
  drawText(ctx, TINY, 'PIT', 6, 60, '#5a5a50');
}

function drawThirteen(ctx: CanvasRenderingContext2D, crowd: boolean): void {
  const t: Theme = { wall: '#3a0e10', pattern: 'plain', carpet: '#1a0808', kind: 'corridor', features: [] };
  const vx = 64, vy = 58;
  rect(ctx, 0, 0, HW, HH, '#0a0304');
  const far = 12;
  const fz = (z: number) => ({ l: persp(vx, 0, z), r: persp(vx, HW, z), t: persp(vy, -10, z), b: persp(vy, HH, z) });
  const e = fz(far);
  quad(ctx, [[0, HH], [HW, HH], [e.r, e.b], [e.l, e.b]], '#160606');
  quad(ctx, [[0, -10], [e.l, e.t], [e.l, e.b], [0, HH]], t.wall);
  quad(ctx, [[HW, -10], [e.r, e.t], [e.r, e.b], [HW, HH]], shade(t.wall, -0.2));
  for (let z = 1.4; z < far; z *= 1.6) {
    const a = fz(z), b = fz(z * 1.2);
    const y0 = persp(vy, 14, z), y1 = persp(vy, HH - 2, z), y0b = persp(vy, 14, z * 1.2), y1b = persp(vy, HH - 2, z * 1.2);
    quad(ctx, [[a.l, y0], [b.l, y0b], [b.l, y1b], [a.l, y1]], '#4a1a14');
    // bricked doorway
    for (let yy = Math.round(y0) + 2; yy < y1; yy += 3) line(ctx, a.l + 1, yy, b.l - 1, yy + (y0b - y0) * 0.2, '#2a0a08');
    if (z < 3) drawText(ctx, TINY, '13', Math.round(a.l + 3), Math.round(y0 + 6), '#c04030');
  }
  rect(ctx, e.l, e.t, e.r - e.l, e.b - e.t, '#000');
  drawExitSign(ctx, 54, 10);
  for (let i = 0; i < HH; i++) {
    ctx.fillStyle = `rgba(150,20,20,${0.08 * Math.sin((i / HH) * Math.PI)})`;
    ctx.fillRect(0, i, HW, 1);
  }
  if (crowd) {
    for (let i = 0; i < 9; i++) {
      const z = 1.6 + i * 0.7;
      const h = Math.round(100 / z);
      const x = vx + ((i % 3) - 1) * (60 / z) - h * 0.15;
      const b = persp(vy, HH - 4, z);
      rect(ctx, x, b - h, Math.round(h * 0.3), h, '#050101');
      rect(ctx, x + 1, b - h - h * 0.16, Math.round(h * 0.3) - 2, h * 0.17, '#050101');
    }
  }
}

function drawCabInterior(ctx: CanvasRenderingContext2D): void {
  // The car seen from outside: a small warm wooden room with a man at the panel.
  rect(ctx, 0, 0, HW, HH, C.wood1);
  for (let x = 0; x < HW; x += 12) rect(ctx, x, 0, 1, HH, C.wood0);
  quad(ctx, [[0, 0], [HW, 0], [104, 14], [24, 14]], C.ink);
  quad(ctx, [[0, HH], [HW, HH], [104, 100], [24, 100]], '#2a0e10');
  rect(ctx, 24, 14, 80, 86, C.wood2);
  for (let x = 28; x < 104; x += 10) rect(ctx, x, 18, 1, 78, C.wood1);
  rect(ctx, 56, 4, 16, 4, C.lamp);
  rect(ctx, 24, 70, 80, 2, C.brass2);
  ellipse(ctx, 64, 26, 12, 6, C.cream2);
  line(ctx, 64, 30, 58, 24, C.ink);
}

function drawStairs(ctx: CanvasRenderingContext2D, t: Theme): void {
  // A staircase that climbs straight into the ceiling.
  for (let i = 0; i < 12; i++) {
    const y = 92 - i * 8;
    const x0 = 34 + i * 2, x1 = 94 - i * 2;
    rect(ctx, x0, y - 8, x1 - x0, 8, shade(t.carpet, -0.1 + (i % 2) * 0.08));
    rect(ctx, x0, y - 8, x1 - x0, 1, shade(t.carpet, 0.25));
  }
  rect(ctx, 30, 0, 2, 92, C.wood3);
  rect(ctx, 96, 0, 2, 92, C.wood3);
  rect(ctx, 0, 0, HW, 6, shade(t.wall, -0.7));
}

function drawFlood(ctx: CanvasRenderingContext2D): void {
  for (let y = 84; y < HH; y++) {
    const t = (y - 84) / (HH - 84);
    ctx.fillStyle = `rgba(4,8,10,${0.82 + t * 0.15})`;
    ctx.fillRect(0, y, HW, 1);
  }
  for (let i = 0; i < 18; i++) rect(ctx, (i * 23) % HW, 86 + ((i * 11) % 32), 4 + (i % 5) * 2, 1, '#28343a');
  rect(ctx, 46, 86, 30, 1, '#4a3a20');
}
