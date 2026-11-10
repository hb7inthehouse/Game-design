// Shared palette and low-level pixel helpers.
export const C = {
  void: '#050407',
  black: '#09080c',
  ink: '#110e15',
  night: '#18131d',
  shadow: '#211a24',
  dusk: '#2c2330',
  plum0: '#2a1726', plum1: '#4a2440', plum2: '#6e3a5c',
  wood0: '#1e110d', wood1: '#2e1a12', wood2: '#46281a', wood3: '#633922', wood4: '#86502f',
  brass0: '#3a2a12', brass1: '#6a4e20', brass2: '#a07b32', brass3: '#d2ad5c', brass4: '#f3dc96',
  steel0: '#1d1f25', steel1: '#363944', steel2: '#575c69', steel3: '#868c99', steel4: '#bcc2cc',
  cream0: '#5b5140', cream1: '#8f8264', cream2: '#c4b58e', cream3: '#e7dcb8', paper: '#efe6cb',
  red0: '#2c0b0e', red1: '#5c1519', red2: '#912126', red3: '#cf4038', red4: '#ff7a5c',
  green0: '#0f1f19', green1: '#1c3a2f', green2: '#2f5c49', green3: '#4f8a69',
  teal0: '#0e2226', teal1: '#1b3d42', teal2: '#2f6468', teal3: '#5a9a94',
  blue0: '#0e1424', blue1: '#1a2640', blue2: '#2e4468', blue3: '#4f6f9a', blue4: '#8fb0d4',
  olive0: '#1f2112', olive1: '#3a3d20', olive2: '#5f6334',
  mustard0: '#3a2c0e', mustard1: '#6b5218', mustard2: '#a07d28',
  rose0: '#3a1a22', rose1: '#6a3040', rose2: '#9a5468', rose3: '#c98a96',
  amber: '#ffb84a', amberHi: '#ffe2a0', amberDim: '#6e420e', amberMid: '#b4701c',
  lamp: '#fff1c6', lampDim: '#b8a676',
  exit: '#e0402e', exitGlow: '#5a1410',
  white: '#f4f0e6',
  ash: '#b9b4ac',
  outline: '#0a080d',
};

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Filled pixel ellipse (no anti-aliasing). */
export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry + 0.0001);
    if (t < 0) continue;
    const hw = Math.round(rx * Math.sqrt(t));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
  }
}

export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  ctx.fillStyle = color;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 2000; i++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Fills a convex quad defined by 4 points, scanline by scanline. */
export function quad(ctx: CanvasRenderingContext2D, pts: [number, number][], color: string): void {
  ctx.fillStyle = color;
  const ys = pts.map((p) => p[1]);
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y < y1; y++) {
    const yc = y + 0.5;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((yc >= ay && yc < by) || (yc >= by && yc < ay)) {
        const x = ax + ((yc - ay) / (by - ay)) * (bx - ax);
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    }
    if (lo <= hi) ctx.fillRect(Math.round(lo), y, Math.round(hi) - Math.round(lo), 1);
  }
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** Ordered-dither fill: pixels where bayer < density get the color. */
export function dither(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, density: number): void {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (bayer(x + i, y + j) < density) ctx.fillRect(x + i, y + j, 1, 1);
  }
}

/** Adds a 1px outline of `color` around all opaque pixels. */
export function outline(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const sctx = src.getContext('2d')!;
  const img = sctx.getImageData(0, 0, w, h);
  const [out, octx] = canvas(w, h);
  octx.fillStyle = color;
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y) > 0) continue;
    if (a(x - 1, y) > 0 || a(x + 1, y) > 0 || a(x, y - 1) > 0 || a(x, y + 1) > 0) octx.fillRect(x, y, 1, 1);
  }
  octx.drawImage(src, 0, 0);
  return out;
}

/** Returns a recolored copy (sepia / ghost tints) via pixel math. */
export function tint(src: HTMLCanvasElement, mode: 'sepia' | 'ghost' | 'dark' | 'red' | 'dawn'): HTMLCanvasElement {
  const [out, octx] = canvas(src.width, src.height);
  octx.drawImage(src, 0, 0);
  const img = octx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    if (mode === 'sepia') { d[i] = Math.min(255, l * 1.08 + 18); d[i + 1] = l * 0.92 + 8; d[i + 2] = l * 0.7; }
    else if (mode === 'ghost') { d[i] = l * 0.8 + r * 0.1; d[i + 1] = l * 0.9 + g * 0.1; d[i + 2] = Math.min(255, l * 1.05 + 14); }
    else if (mode === 'dark') { d[i] = r * 0.35; d[i + 1] = g * 0.33; d[i + 2] = b * 0.4; }
    else if (mode === 'red') { d[i] = Math.min(255, l * 0.9 + 30); d[i + 1] = l * 0.25; d[i + 2] = l * 0.25; }
    else if (mode === 'dawn') { d[i] = Math.min(255, r * 1.05 + 24); d[i + 1] = Math.min(255, g * 0.98 + 10); d[i + 2] = b * 0.85; }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
