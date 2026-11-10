// A small keyboard/mouse/touch menu widget used by every screen.
import { BIG, drawText, textWidth } from '../core/font';
import { C, rect } from '../art/palette';
import { Sound } from '../core/audio';
import { Input, type InputEvent, inRect } from '../core/input';

export interface MenuItem {
  label: string | (() => string);
  action?: () => void;
  left?: () => void;
  right?: () => void;
  disabled?: () => boolean;
  value?: () => string;
}

export class Menu {
  items: MenuItem[];
  sel = 0;
  x: number;
  y: number;
  w: number;
  rowH = 13;
  align: 'left' | 'center';
  onBack?: () => void;
  private rects: { x: number; y: number; w: number; h: number }[] = [];

  constructor(items: MenuItem[], x: number, y: number, w: number, align: 'left' | 'center' = 'center') {
    this.items = items;
    this.x = x;
    this.y = y;
    this.w = w;
    this.align = align;
    this.skipDisabled(1);
  }

  private label(i: MenuItem): string {
    return typeof i.label === 'function' ? i.label() : i.label;
  }

  private skipDisabled(dir: number): void {
    for (let k = 0; k < this.items.length; k++) {
      if (!this.items[this.sel].disabled?.()) return;
      this.sel = (this.sel + dir + this.items.length) % this.items.length;
    }
  }

  handle(events: InputEvent[]): void {
    this.layout();
    if (Input.mouseActive) {
      const i = this.rects.findIndex((r) => inRect(Input.mx, Input.my, r));
      if (i >= 0 && !this.items[i].disabled?.()) this.sel = i;
    }
    for (const e of events) {
      if (e.type === 'key') {
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') { this.sel = (this.sel + this.items.length - 1) % this.items.length; this.skipDisabled(-1); Sound.click(1.4); }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') { this.sel = (this.sel + 1) % this.items.length; this.skipDisabled(1); Sound.click(1.4); }
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { const it = this.items[this.sel]; if (it.left) { it.left(); Sound.click(1.1); } }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { const it = this.items[this.sel]; if (it.right) { it.right(); Sound.click(1.1); } }
        else if ((k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') && !e.repeat) this.activate(this.sel);
        else if (k === 'Escape' || k === 'Backspace') { if (this.onBack) { Sound.click(0.8); this.onBack(); } }
      } else if (e.type === 'down') {
        const i = this.rects.findIndex((r) => inRect(e.x, e.y, r));
        if (i >= 0) {
          this.sel = i;
          const it = this.items[i];
          const r = this.rects[i];
          if (it.left && it.right && !it.action) {
            if (e.x < r.x + r.w / 2) it.left();
            else it.right();
            Sound.click(1.1);
          } else this.activate(i);
        }
      } else if (e.type === 'wheel') {
        const it = this.items[this.sel];
        if (e.dy < 0 && it.right) it.right();
        if (e.dy > 0 && it.left) it.left();
      }
    }
    Input.setCursor(Input.mouseActive && this.rects.some((r) => inRect(Input.mx, Input.my, r)) ? 'pointer' : 'default');
  }

  private activate(i: number): void {
    const it = this.items[i];
    if (it.disabled?.()) {
      Sound.thump(0.05, 140, 0.08);
      return;
    }
    Sound.click(0.9);
    if (it.action) it.action();
    else if (it.right) it.right();
  }

  private layout(): void {
    this.rects = this.items.map((_, i) => ({ x: this.x, y: this.y + i * this.rowH, w: this.w, h: this.rowH - 1 }));
  }

  render(ctx: CanvasRenderingContext2D, t: number): void {
    this.layout();
    this.items.forEach((it, i) => {
      const r = this.rects[i];
      const sel = i === this.sel;
      const dis = it.disabled?.() ?? false;
      const text = this.label(it);
      const val = it.value?.();
      if (sel) {
        rect(ctx, r.x, r.y, r.w, r.h, 'rgba(70,40,26,0.75)');
        rect(ctx, r.x, r.y, 2, r.h, C.amber);
      }
      const col = dis ? C.steel1 : sel ? C.amberHi : C.cream2;
      if (this.align === 'center' && !val) {
        const tw = textWidth(BIG, text);
        drawText(ctx, BIG, text, Math.round(r.x + r.w / 2 - tw / 2), r.y + 2, col);
        if (sel && Math.floor(t * 2) % 2 === 0) drawText(ctx, BIG, '>', Math.round(r.x + r.w / 2 - tw / 2) - 9, r.y + 2, C.amber);
      } else {
        drawText(ctx, BIG, text, r.x + 8, r.y + 2, col);
        if (val !== undefined) {
          const s = it.left ? `< ${val} >` : val;
          const vw = textWidth(BIG, s);
          drawText(ctx, BIG, s, r.x + r.w - vw - 6, r.y + 2, sel ? C.amber : C.brass3);
        }
      }
    });
  }
}

export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(9,8,12,0.95)';
  ctx.fillRect(x, y, w, h);
  rect(ctx, x, y, w, 1, C.brass2);
  rect(ctx, x, y + h - 1, w, 1, C.brass1);
  rect(ctx, x, y, 1, h, C.brass1);
  rect(ctx, x + w - 1, y, 1, h, C.brass1);
}
