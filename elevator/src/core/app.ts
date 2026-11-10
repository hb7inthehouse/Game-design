// Scene stack + main loop with integer-scaled pixel canvas.
import { Input, W, H, type InputEvent } from './input';

export interface Scene {
  update(dt: number, events: InputEvent[]): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** Lets the scene below keep drawing (overlays/menus). */
  overlay?: boolean;
  onEnter?(): void;
  onExit?(): void;
}

export class App {
  stack: Scene[] = [];
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  private last = 0;
  time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    Input.attach(canvas);
    const refit = () => {
      this.resize();
      // Some phones report the new size a moment after rotating.
      window.setTimeout(() => this.resize(), 250);
    };
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', refit);
    window.visualViewport?.addEventListener('resize', refit);
    document.addEventListener('fullscreenchange', refit);
    this.resize();
  }

  resize(): void {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const fit = Math.min(vw / W, vh / H);
    // Whole-number scaling keeps pixels perfectly even on big screens; on phones
    // (where that would leave the game tiny) fill the screen instead.
    const scale = fit >= 3 ? Math.floor(fit) : fit;
    const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    const crt = document.getElementById('crt');
    if (crt) {
      const r = this.canvas.getBoundingClientRect();
      Object.assign(crt.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${cw}px`, height: `${ch}px` });
      crt.style.backgroundSize = `100% ${Math.max(2, Math.round(scale))}px`;
    }
  }

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  push(s: Scene): void {
    this.stack.push(s);
    s.onEnter?.();
  }

  pop(): void {
    const s = this.stack.pop();
    s?.onExit?.();
  }

  replace(s: Scene): void {
    while (this.stack.length) this.pop();
    this.push(s);
  }

  start(): void {
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
      this.last = now;
      this.time += dt;
      const events = Input.drain();
      const top = this.top;
      if (top) top.update(dt, events);
      // render from the lowest scene that is not covered by an opaque one
      let i = this.stack.length - 1;
      while (i > 0 && this.stack[i].overlay) i--;
      this.ctx.fillStyle = '#050407';
      this.ctx.fillRect(0, 0, W, H);
      for (let j = Math.max(0, i); j < this.stack.length; j++) this.stack[j].render(this.ctx);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
