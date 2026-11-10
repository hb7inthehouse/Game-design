// The elevator car interior: layout, static layers and per-frame details.
import { C, canvas, dither, ellipse, line, px, quad, rect, shade } from './palette';
import { TINY, drawText, textWidth } from '../core/font';
import { floorLabel } from '../game/elevator';

export const SW = 384;
export const SH = 216;
export const DOOR = { x: 108, y: 56, w: 128, h: 120 };
export const DOOR_MID = DOOR.x + DOOR.w / 2;
export const FRONT = { x: 64, y: 16, w: 256, h: 160 };
export const DIAL = { cx: 172, cy: 52 };
export const PANEL = { x: 252, y: 58, w: 48, h: 116 };

export interface Hit { x: number; y: number; w: number; h: number }
export interface PanelButton extends Hit { id: string; floor?: number; label: string }

const COLS = [257, 281];
const ROW0 = 72;
const ROWH = 11;
const LAYOUT: (string | number)[][] = [
  [11, 12], [9, 10], [7, 8], [5, 6], [3, 4], [1, 2], [0, -1], ['open', 'close'], ['alarm', 'key'],
];

export const BUTTONS: PanelButton[] = [];
LAYOUT.forEach((row, r) => row.forEach((id, c) => {
  const isFloor = typeof id === 'number';
  BUTTONS.push({
    id: isFloor ? `f${id}` : (id as string),
    floor: isFloor ? (id as number) : undefined,
    label: isFloor ? floorLabel(id as number) : '',
    x: COLS[c], y: ROW0 + r * ROWH, w: 14, h: 9,
  });
}));
export const BUTTON_GRID = LAYOUT.map((row) => row.map((id) => (typeof id === 'number' ? `f${id}` : id)));

// Side walls: left quad (0,0)-(64,16)-(64,176)-(0,216); right mirrored.
export function wallY(side: 'L' | 'R', x: number, v: number): number {
  const d = side === 'L' ? x / 64 : (384 - x) / 64;
  const top = 16 * d;
  const bot = 216 - 40 * d;
  return top + v * (bot - top);
}

/** Draw an image onto a side wall with simple per-column perspective. */
export function wallBlit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, side: 'L' | 'R', x0: number, x1: number, v0: number, v1: number): Hit {
  let minY = Infinity, maxY = -Infinity;
  for (let x = x0; x < x1; x++) {
    const u = (x - x0) / (x1 - x0);
    const sx = Math.min(img.width - 1, Math.floor(u * img.width));
    const y0 = Math.round(wallY(side, x, v0));
    const y1 = Math.round(wallY(side, x, v1));
    ctx.drawImage(img, sx, 0, 1, img.height, x, y0, 1, y1 - y0);
    minY = Math.min(minY, y0);
    maxY = Math.max(maxY, y1);
  }
  return { x: x0, y: minY, w: x1 - x0, h: maxY - minY };
}

export const WALL_ITEMS = {
  clock: { side: 'L' as const, x0: 10, x1: 30, v0: 0.13, v1: 0.24 },
  cert: { side: 'L' as const, x0: 34, x1: 54, v0: 0.24, v1: 0.42 },
  phone: { side: 'L' as const, x0: 30, x1: 50, v0: 0.48, v1: 0.62 },
  log: { side: 'R' as const, x0: 332, x1: 352, v0: 0.42, v1: 0.58 },
  plaque: { side: 'R' as const, x0: 352, x1: 374, v0: 0.2, v1: 0.27 },
};

export function wallItemHit(item: keyof typeof WALL_ITEMS): Hit {
  const w = WALL_ITEMS[item];
  const y0 = Math.min(wallY(w.side, w.x0, w.v0), wallY(w.side, w.x1, w.v0));
  const y1 = Math.max(wallY(w.side, w.x0, w.v1), wallY(w.side, w.x1, w.v1));
  return { x: w.x0 - 2, y: y0 - 2, w: w.x1 - w.x0 + 4, h: y1 - y0 + 4 };
}

// ---------- static shell ----------
let shell: HTMLCanvasElement | null = null;
export function cabShell(): HTMLCanvasElement {
  if (shell) return shell;
  const [cv, ctx] = canvas(SW, SH);
  // ceiling: pressed tin
  quad(ctx, [[0, 0], [SW, 0], [320, 16], [64, 16]], C.shadow);
  for (let x = 0; x < SW; x += 24) line(ctx, x, 0, 64 + (x / SW) * 256, 16, C.night);
  rect(ctx, 64, 15, 256, 1, C.brass1);
  // left wall
  quad(ctx, [[0, 0], [64, 16], [64, 176], [0, 216]], C.wood2);
  // right wall
  quad(ctx, [[SW, 0], [320, 16], [320, 176], [SW, 216]], shade(C.wood2, -0.12));
  for (const side of ['L', 'R'] as const) {
    const xs = side === 'L' ? [0, 14, 30, 44, 56, 64] : [384, 370, 354, 340, 328, 320];
    const base = side === 'L' ? C.wood2 : shade(C.wood2, -0.12);
    // lower wainscot
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i], xb = xs[i + 1];
      const step = xa < xb ? 1 : -1;
      for (let x = xa; x !== xb; x += step) {
        const y0 = wallY(side, x, 0.64), y1 = wallY(side, x, 1);
        rect(ctx, x, y0, 1, y1 - y0, shade(base, -0.35));
      }
      // panel seam
      const ys = wallY(side, xa, 0), ye = wallY(side, xa, 1);
      rect(ctx, xa, ys, 1, ye - ys, shade(base, -0.5));
      // inset panel highlight
      for (let x = xa + 3 * step; x !== xb - 2 * step; x += step) {
        px(ctx, x, wallY(side, x, 0.1), shade(base, 0.12));
        px(ctx, x, wallY(side, x, 0.56), shade(base, -0.4));
      }
    }
    // handrail
    for (let x = side === 'L' ? 0 : 320; x < (side === 'L' ? 64 : 384); x++) {
      const y = wallY(side, x, 0.6);
      rect(ctx, x, y, 1, 2, C.brass2);
      px(ctx, x, y, C.brass4);
      px(ctx, x, y + 2, C.brass0);
    }
  }
  // floor: worn checker linoleum
  const bands = [176, 180, 185, 191, 199, 210, 216];
  for (let b = 0; b < bands.length - 1; b++) {
    for (let y = bands[b]; y < bands[b + 1]; y++) {
      const t = (y - 176) * 1.6;
      const xl = 64 - t, xr = 320 + t;
      for (let c = 0; c < 10; c++) {
        const x0 = xl + ((xr - xl) * c) / 10;
        const x1 = xl + ((xr - xl) * (c + 1)) / 10;
        const col = (b + c) % 2 ? '#2a1214' : '#120c0e';
        rect(ctx, x0, y, x1 - x0 + 1, 1, col);
      }
    }
  }
  // wear path in front of the doors
  for (let y = 177; y < 216; y++) {
    const t = (y - 176) / 40;
    const w = 50 + t * 70;
    dither(ctx, Math.round(172 - w / 2), y, Math.round(w), 1, 'rgba(120,90,70,0.35)', 0.25);
  }
  rect(ctx, 64, 176, 256, 1, C.brass1);

  // front wall: dark wood with vertical panels
  rect(ctx, FRONT.x, FRONT.y, FRONT.w, FRONT.h, C.wood1);
  for (let x = FRONT.x; x < FRONT.x + FRONT.w; x += 32) {
    rect(ctx, x, FRONT.y, 1, FRONT.h, C.wood0);
    rect(ctx, x + 1, FRONT.y, 1, FRONT.h, shade(C.wood1, 0.1));
  }
  // dial surround
  rect(ctx, 104, 16, 136, 38, C.wood0);
  rect(ctx, 104, 52, 136, 2, C.brass1);
  // brass door frame
  rect(ctx, DOOR.x - 5, DOOR.y - 5, DOOR.w + 10, DOOR.h + 5, C.brass1);
  rect(ctx, DOOR.x - 5, DOOR.y - 5, DOOR.w + 10, 1, C.brass3);
  rect(ctx, DOOR.x - 5, DOOR.y - 5, 1, DOOR.h + 5, C.brass3);
  rect(ctx, DOOR.x - 2, DOOR.y - 2, DOOR.w + 4, DOOR.h + 2, C.brass0);
  // panel plate
  rect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, C.brass1);
  rect(ctx, PANEL.x + 1, PANEL.y + 1, PANEL.w - 2, PANEL.h - 2, C.brass2);
  rect(ctx, PANEL.x + 1, PANEL.y + 1, PANEL.w - 2, 1, C.brass3);
  rect(ctx, PANEL.x + PANEL.w - 2, PANEL.y + 1, 1, PANEL.h - 2, C.brass1);
  for (const [sx, sy] of [[3, 3], [PANEL.w - 4, 3], [3, PANEL.h - 4], [PANEL.w - 4, PANEL.h - 4]]) {
    px(ctx, PANEL.x + sx, PANEL.y + sy, C.brass0);
  }
  rect(ctx, PANEL.x + 6, PANEL.y + 4, PANEL.w - 12, 8, C.brass0);
  drawText(ctx, TINY, 'CARROW', PANEL.x + 13, PANEL.y + 6, C.brass3);
  // cut the door opening
  ctx.clearRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  shell = cv;
  return cv;
}

// ---------- doors ----------
let doorPanel: HTMLCanvasElement | null = null;
function doorPanelImg(): HTMLCanvasElement {
  if (doorPanel) return doorPanel;
  const [cv, ctx] = canvas(64, DOOR.h);
  rect(ctx, 0, 0, 64, DOOR.h, C.brass1);
  for (let x = 0; x < 64; x++) {
    const k = Math.sin(x * 0.7) * 0.5 + Math.sin(x * 2.3) * 0.3;
    rect(ctx, x, 0, 1, DOOR.h, shade(C.brass2, -0.12 + k * 0.08));
  }
  rect(ctx, 0, 0, 64, 1, C.brass3);
  rect(ctx, 0, DOOR.h - 18, 64, 18, C.brass1);
  rect(ctx, 0, DOOR.h - 18, 64, 1, C.brass3);
  for (let y = 10; y < DOOR.h - 24; y += 22) {
    rect(ctx, 6, y, 52, 16, shade(C.brass2, -0.2));
    rect(ctx, 6, y, 52, 1, C.brass1);
    rect(ctx, 6, y + 15, 52, 1, C.brass3);
    // art-deco chevrons
    for (let i = 0; i < 6; i++) {
      px(ctx, 26 + i, y + 4 + i, C.brass3);
      px(ctx, 37 - i, y + 4 + i, C.brass3);
    }
  }
  doorPanel = cv;
  return cv;
}

export interface Handprint { x: number; y: number; side: 0 | 1; big?: boolean }

export function drawDoors(ctx: CanvasRenderingContext2D, open: number, handprints: Handprint[], gapGlow: number): void {
  const img = doorPanelImg();
  const slide = Math.round(open * 62);
  ctx.save();
  ctx.beginPath();
  ctx.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  ctx.clip();
  // left panel (mirrored)
  ctx.save();
  ctx.translate(DOOR.x + 64 - slide, DOOR.y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  ctx.drawImage(img, DOOR.x + 64 + slide, DOOR.y);
  // panel edges
  rect(ctx, DOOR.x + 63 - slide, DOOR.y, 1, DOOR.h, C.brass0);
  rect(ctx, DOOR.x + 64 + slide, DOOR.y, 1, DOOR.h, C.brass4);
  for (const h of handprints) {
    const ox = h.side === 0 ? DOOR.x + h.x - slide : DOOR.x + 64 + h.x + slide;
    drawHand(ctx, ox, DOOR.y + h.y, h.big);
  }
  if (gapGlow > 0 && open < 0.02) {
    ctx.fillStyle = `rgba(255,236,190,${Math.min(1, gapGlow)})`;
    ctx.fillRect(DOOR_MID - 1, DOOR.y, 2, DOOR.h);
  }
  ctx.restore();
}

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, big?: boolean): void {
  const c = 'rgba(40,20,18,0.55)';
  const s = big ? 2 : 1;
  ctx.fillStyle = c;
  ctx.fillRect(x, y + 4 * s, 6 * s, 6 * s);
  for (let f = 0; f < 4; f++) ctx.fillRect(x + f * 1.5 * s, y + (f === 0 || f === 3 ? 1 : 0) * s, s, 4 * s);
  ctx.fillRect(x + 6 * s, y + 6 * s, 2 * s, s);
}

// ---------- dial ----------
export const DIAL_R = { rx: 64, ry: 33 };

/** Point on the dial fan for a floor position (-1..12), `inset` px inside the rim. */
export function dialPoint(pos: number, inset: number): { x: number; y: number } {
  const { cx, cy } = DIAL;
  const rx = DIAL_R.rx - inset, ry = DIAL_R.ry - inset * 0.7;
  const u = (pos + 1) / 13;
  const x = cx + (u * 2 - 1) * rx * 0.9;
  const k = (x - cx) / rx;
  return { x, y: cy - ry * Math.sqrt(Math.max(0, 1 - k * k)) };
}

export function drawDial(ctx: CanvasRenderingContext2D, pos: number, dir: number, revealB: boolean, reveal13: boolean, lit: number): void {
  const { cx, cy } = DIAL;
  const { rx, ry } = DIAL_R;
  for (let y = -ry; y <= 0; y++) {
    const t = 1 - (y * y) / (ry * ry);
    const hw = Math.round(rx * Math.sqrt(t));
    rect(ctx, cx - hw, cy + y, hw * 2 + 1, 1, y === -ry ? C.brass3 : C.cream2);
  }
  for (let a = 0; a <= 360; a += 1) {
    const r = (a * Math.PI) / 360;
    px(ctx, cx + Math.cos(r) * rx, cy - Math.sin(r) * ry, C.brass1);
  }
  rect(ctx, cx - rx, cy, rx * 2 + 1, 2, C.brass1);
  for (let f = -1; f <= 12; f++) {
    const tick = dialPoint(f, 2);
    px(ctx, tick.x, tick.y, C.cream0);
    const lp = dialPoint(f, 11);
    if ((f === 0 && !revealB) || (f === -1 && !reveal13)) {
      rect(ctx, lp.x - 2, lp.y - 2, 5, 5, shade(C.cream2, -0.08));
      continue;
    }
    const label = floorLabel(f);
    const near = Math.abs(pos - f) < 0.5 && lit > 0.3;
    drawText(ctx, TINY, label, Math.round(lp.x - textWidth(TINY, label) / 2), Math.round(lp.y - 2), f === -1 ? C.red2 : near ? C.red2 : C.ink);
  }
  const tip = dialPoint(pos, 7);
  line(ctx, cx, cy, tip.x, tip.y, C.ink);
  const tip2 = dialPoint(pos, 9);
  line(ctx, cx + 1, cy, tip2.x + 1, tip2.y, C.ink);
  ellipse(ctx, cx, cy, 3, 2, C.brass1);
  px(ctx, cx, cy - 1, C.brass4);
  drawArrow(ctx, 108, 20, true, dir > 0);
  drawArrow(ctx, 230, 20, false, dir < 0);
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, upward: boolean, on: boolean): void {
  const col = on ? C.amber : C.amberDim;
  for (let i = 0; i < 4; i++) {
    const yy = upward ? y + i : y + 3 - i;
    rect(ctx, x + 3 - i, yy, i * 2 + 1, 1, col);
  }
}

// ---------- panel ----------
export interface PanelState {
  lit: Set<number>;
  calls: Set<number>;
  selfLit: Set<number>;
  revealB: boolean;
  reveal13: boolean;
  cursor: string | null;
  pressed: string | null;
  hasKey: boolean;
  keyTurned: boolean;
  dark: Set<string>;
  swapLabels: Record<string, string>;
  t: number;
  finale: boolean;
}

export function drawPanel(ctx: CanvasRenderingContext2D, s: PanelState): void {
  for (const b of BUTTONS) {
    const pressed = s.pressed === b.id;
    const oy = pressed ? 1 : 0;
    if (b.floor === 0 && !s.revealB) { plate(ctx, b); continue; }
    if (b.floor === -1 && !s.reveal13) { plate(ctx, b); continue; }
    const dark = s.dark.has(b.id);
    let lit = b.floor !== undefined && s.lit.has(b.floor);
    const call = b.floor !== undefined && s.calls.has(b.floor) && Math.floor(s.t * 3) % 2 === 0;
    if (b.id === 'key') {
      drawKeySwitch(ctx, b, s.hasKey, s.keyTurned);
    } else if (b.id === 'alarm') {
      pill(ctx, b.x, b.y + oy, b.w, b.h, C.red1, C.red2);
      // bell
      rect(ctx, b.x + 5, b.y + 2 + oy, 4, 3, C.amberHi);
      rect(ctx, b.x + 4, b.y + 5 + oy, 6, 1, C.amberHi);
      px(ctx, b.x + 7, b.y + 6 + oy, C.amberHi);
    } else {
      if (s.finale && b.floor !== undefined && b.floor !== 1 && b.floor !== -1) lit = false;
      const base = dark ? C.ink : lit ? C.amber : call ? C.amberMid : C.ink;
      const hi = dark ? C.ink : lit ? C.amberHi : call ? C.amber : C.steel1;
      pill(ctx, b.x, b.y + oy, b.w, b.h, base, hi);
      if (b.id === 'open' || b.id === 'close') {
        const col = C.cream2;
        const mx = b.x + 7, my = b.y + 4 + oy;
        if (b.id === 'open') {
          px(ctx, mx - 3, my, col); px(ctx, mx - 2, my - 1, col); px(ctx, mx - 2, my + 1, col);
          px(ctx, mx + 3, my, col); px(ctx, mx + 2, my - 1, col); px(ctx, mx + 2, my + 1, col);
          rect(ctx, mx, my - 2, 1, 5, col);
        } else {
          px(ctx, mx - 1, my, col); px(ctx, mx - 2, my - 1, col); px(ctx, mx - 2, my + 1, col);
          px(ctx, mx + 1, my, col); px(ctx, mx + 2, my - 1, col); px(ctx, mx + 2, my + 1, col);
          rect(ctx, mx - 4, my - 2, 1, 5, col);
          rect(ctx, mx + 4, my - 2, 1, 5, col);
        }
      } else {
        const label = s.swapLabels[b.id] ?? b.label;
        const col = dark ? C.ink : lit ? C.ink : b.floor === -1 ? C.red3 : C.cream2;
        drawText(ctx, TINY, label, Math.round(b.x + b.w / 2 - textWidth(TINY, label) / 2), b.y + 2 + oy, col);
      }
      if (b.floor !== undefined && s.selfLit.has(b.floor) && lit && Math.floor(s.t * 8) % 4 === 0) {
        rect(ctx, b.x + 1, b.y + oy, b.w - 2, 1, C.red3);
      }
    }
    if (s.cursor === b.id) {
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3);
    }
  }
}

function plate(ctx: CanvasRenderingContext2D, b: PanelButton): void {
  rect(ctx, b.x, b.y, b.w, b.h, C.brass1);
  rect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, C.brass2);
  px(ctx, b.x + 2, b.y + 4, C.brass0);
  px(ctx, b.x + b.w - 3, b.y + 4, C.brass0);
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, hi: string): void {
  rect(ctx, x + 1, y, w - 2, h, C.brass0);
  rect(ctx, x, y + 1, w, h - 2, C.brass0);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, base);
  rect(ctx, x + 2, y + 1, w - 4, 1, hi);
}

function drawKeySwitch(ctx: CanvasRenderingContext2D, b: PanelButton, hasKey: boolean, turned: boolean): void {
  rect(ctx, b.x + 1, b.y, b.w - 2, b.h, C.red1);
  ellipse(ctx, b.x + 7, b.y + 4, 3, 3, C.brass1);
  ellipse(ctx, b.x + 7, b.y + 4, 2, 2, C.brass3);
  if (turned) rect(ctx, b.x + 5, b.y + 4, 5, 1, C.ink);
  else rect(ctx, b.x + 7, b.y + 2, 1, 5, C.ink);
  if (hasKey && !turned) px(ctx, b.x + 12, b.y + 1, C.amber);
}

// ---------- wall items ----------
export function clockImg(minutes: number, backwards: boolean): HTMLCanvasElement {
  const [cv, ctx] = canvas(18, 18);
  ellipse(ctx, 9, 9, 8, 8, C.brass1);
  ellipse(ctx, 9, 9, 7, 7, C.cream3);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    px(ctx, 9 + Math.sin(a) * 6, 9 - Math.cos(a) * 6, C.cream0);
  }
  const h = (minutes / 60) % 12;
  const m = minutes % 60;
  const ha = (h / 12) * Math.PI * 2 * (backwards ? -1 : 1);
  const ma = (m / 60) * Math.PI * 2 * (backwards ? -1 : 1);
  line(ctx, 9, 9, 9 + Math.sin(ha) * 3.5, 9 - Math.cos(ha) * 3.5, C.ink);
  line(ctx, 9, 9, 9 + Math.sin(ma) * 5.5, 9 - Math.cos(ma) * 5.5, C.ink);
  px(ctx, 9, 9, C.red2);
  return cv;
}

export function certImg(stage: number): HTMLCanvasElement {
  const [cv, ctx] = canvas(20, 26);
  rect(ctx, 0, 0, 20, 26, C.brass1);
  rect(ctx, 1, 1, 18, 24, stage >= 3 ? C.cream1 : C.paper);
  rect(ctx, 3, 3, 14, 2, C.ink);
  for (let i = 0; i < 4; i++) rect(ctx, 3, 7 + i * 2, 10 + ((i * 3) % 4), 1, C.cream0);
  const year = stage === 1 ? '2026' : '1979';
  drawText(ctx, TINY, year, 3, 16, stage >= 2 ? C.red2 : C.ink);
  ellipse(ctx, 15, 22, 2, 2, stage >= 3 ? C.red2 : C.green2);
  return cv;
}

export function phoneImg(ringing: boolean, t: number): HTMLCanvasElement {
  const [cv, ctx] = canvas(16, 20);
  rect(ctx, 0, 0, 16, 20, C.red1);
  rect(ctx, 0, 0, 16, 1, C.red3);
  rect(ctx, 2, 2, 12, 16, C.red2);
  rect(ctx, 4, 4, 8, 3, C.ink);
  rect(ctx, 3, 4, 2, 6, C.ink);
  rect(ctx, 11, 4, 2, 6, C.ink);
  drawText(ctx, TINY, 'SOS', 3, 12, C.cream3);
  if (ringing && Math.floor(t * 6) % 2 === 0) rect(ctx, 13, 1, 2, 2, C.amber);
  return cv;
}

export function logImg(): HTMLCanvasElement {
  const [cv, ctx] = canvas(16, 22);
  rect(ctx, 0, 0, 16, 22, C.wood3);
  rect(ctx, 1, 2, 14, 19, C.paper);
  rect(ctx, 5, 0, 6, 3, C.steel3);
  for (let i = 0; i < 6; i++) rect(ctx, 3, 6 + i * 2, 8 + (i % 3), 1, C.cream0);
  return cv;
}

export function plaqueImg(stage: number): HTMLCanvasElement {
  const [cv, ctx] = canvas(24, 10);
  rect(ctx, 0, 0, 24, 10, C.brass1);
  rect(ctx, 1, 1, 22, 8, C.brass2);
  drawText(ctx, TINY, stage >= 3 ? 'CAP 13' : 'CAP 8', 3, 3, C.brass0);
  return cv;
}

// ---------- ceiling lamp ----------
export function drawCeilingLamp(ctx: CanvasRenderingContext2D, level: number): void {
  const col = level > 0.8 ? C.lamp : level > 0.4 ? C.lampDim : C.cream0;
  quad(ctx, [[140, 0], [244, 0], [232, 10], [152, 10]], C.brass1);
  quad(ctx, [[143, 0], [241, 0], [230, 8], [154, 8]], col);
  if (level > 0.8) for (let x = 156; x < 228; x += 8) rect(ctx, x, 3, 4, 1, C.white);
}

// ---------- overlays ----------
let vignette: HTMLCanvasElement | null = null;
export function vignetteImg(): HTMLCanvasElement {
  if (vignette) return vignette;
  const [cv, ctx] = canvas(SW, SH);
  ctx.fillStyle = C.void;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const dx = (x - SW / 2) / (SW / 2), dy = (y - SH / 2) / (SH / 2);
    const d = Math.sqrt(dx * dx * 0.85 + dy * dy * 0.7);
    const k = Math.max(0, d - 0.74) * 1.7;
    if (k > 0 && ((x * 7 + y * 13) % 16) / 16 < k) ctx.fillRect(x, y, 1, 1);
  }
  vignette = cv;
  return cv;
}
