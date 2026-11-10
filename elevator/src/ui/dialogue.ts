// Dialogue box with typewriter text, speaker tag and choice lists.
import { BIG, drawText, textWidth, wrap } from '../core/font';
import { C, rect } from '../art/palette';
import { Sound } from '../core/audio';
import { Save } from '../core/save';
import { type InputEvent, inRect } from '../core/input';

export type DialogueStyle = 'speech' | 'narration' | 'phone' | 'system';

const BOX = { x: 6, y: 178, w: 372, h: 35 };
const TEXT_W = BOX.w - 14;

interface Line {
  speaker: string | null;
  text: string;
  lines: string[];
  style: DialogueStyle;
  pitch: number;
  auto: number;
  resolve: () => void;
}

interface Choice {
  options: string[];
  resolve: (i: number) => void;
  sel: number;
  rects: { x: number; y: number; w: number; h: number }[];
}

export class Dialogue {
  line: Line | null = null;
  choice: Choice | null = null;
  shown = 0;
  private timer = 0;
  private holdT = 0;
  private blipT = 0;
  hidden = false;

  get busy(): boolean {
    return this.line !== null || this.choice !== null;
  }

  get waiting(): boolean {
    return this.line !== null && this.shown >= this.total;
  }

  private get total(): number {
    return this.line ? this.line.lines.join('').length : 0;
  }

  say(speaker: string | null, text: string, style: DialogueStyle, pitch: number, auto = 0): Promise<void> {
    return new Promise((resolve) => {
      // Text longer than the box is split into pages of three lines.
      const all = wrap(BIG, text, TEXT_W);
      const pages: string[][] = [];
      for (let i = 0; i < all.length; i += 3) pages.push(all.slice(i, i + 3));
      let p = 0;
      const next = () => {
        if (p >= pages.length) {
          this.line = null;
          resolve();
          return;
        }
        const lines = pages[p++];
        this.line = { speaker, text, lines, style, pitch, auto, resolve: next };
        this.shown = 0;
        this.timer = 0;
        this.holdT = 0;
      };
      next();
    });
  }

  ask(options: string[]): Promise<number> {
    return new Promise((resolve) => {
      this.choice = { options, resolve, sel: 0, rects: [] };
      this.layoutChoices();
    });
  }

  private layoutChoices(): void {
    if (!this.choice) return;
    const n = this.choice.options.length;
    const w = Math.max(...this.choice.options.map((o) => textWidth(BIG, o))) + 24;
    const h = 11;
    const x = Math.round(192 - Math.min(360, w) / 2);
    const y0 = BOX.y - 6 - n * h;
    this.choice.rects = this.choice.options.map((_, i) => ({ x, y: y0 + i * h, w: Math.min(360, w), h }));
  }

  advance(): void {
    if (!this.line) return;
    if (this.shown < this.total) {
      this.shown = this.total;
      return;
    }
    const l = this.line;
    l.resolve();
  }

  /** Returns true when the event was consumed. */
  handle(e: InputEvent, mx: number, my: number): boolean {
    if (this.choice) {
      const ch = this.choice;
      if (e.type === 'key') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { ch.sel = (ch.sel + ch.options.length - 1) % ch.options.length; Sound.click(1.3); return true; }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { ch.sel = (ch.sel + 1) % ch.options.length; Sound.click(1.3); return true; }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= ch.options.length) { this.pick(n - 1); return true; }
        if ((e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') && !e.repeat) { this.pick(ch.sel); return true; }
        return false;
      }
      if (e.type === 'down') {
        const i = ch.rects.findIndex((r) => inRect(e.x, e.y, r));
        if (i >= 0) { this.pick(i); return true; }
        return false;
      }
      void mx; void my;
      return false;
    }
    if (this.line) {
      if (e.type === 'key' && !e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z')) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  pick(i: number): void {
    if (!this.choice) return;
    const ch = this.choice;
    this.choice = null;
    Sound.click(0.9);
    ch.resolve(i);
  }

  hover(mx: number, my: number): boolean {
    if (!this.choice) return false;
    const i = this.choice.rects.findIndex((r) => inRect(mx, my, r));
    if (i >= 0) this.choice.sel = i;
    return i >= 0;
  }

  update(dt: number, speedMul = 1): void {
    if (!this.line) return;
    const speeds = [28, 50, 95, 10000];
    const cps = speeds[Save.settings.textSpeed] * speedMul;
    const total = this.total;
    if (this.shown < total) {
      this.timer += dt * cps;
      const before = this.shown;
      this.shown = Math.min(total, Math.floor(this.timer));
      if (this.shown > before && this.line.style !== 'system') {
        this.blipT -= this.shown - before;
        if (this.blipT <= 0) {
          this.blipT = 2;
          const flat = this.line.lines.join('');
          const ch = flat[this.shown - 1];
          if (ch && ch !== ' ') Sound.blip(this.line.style === 'narration' ? 110 : this.line.pitch);
        }
      }
    } else if (this.line.auto > 0) {
      this.holdT += dt;
      if (this.holdT >= this.line.auto) this.line.resolve();
    }
  }

  render(ctx: CanvasRenderingContext2D, t: number): void {
    if (this.hidden) return;
    if (this.line) {
      const l = this.line;
      const narr = l.style === 'narration';
      const phone = l.style === 'phone';
      ctx.fillStyle = narr ? 'rgba(5,4,7,0.88)' : 'rgba(9,8,12,0.94)';
      ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
      const border = phone ? C.red2 : narr ? C.steel1 : C.brass1;
      rect(ctx, BOX.x, BOX.y, BOX.w, 1, border);
      rect(ctx, BOX.x, BOX.y + BOX.h - 1, BOX.w, 1, border);
      rect(ctx, BOX.x, BOX.y, 1, BOX.h, border);
      rect(ctx, BOX.x + BOX.w - 1, BOX.y, 1, BOX.h, border);
      if (l.speaker) {
        const tw = textWidth(BIG, l.speaker) + 8;
        rect(ctx, BOX.x + 6, BOX.y - 10, tw, 10, border);
        rect(ctx, BOX.x + 7, BOX.y - 9, tw - 2, 9, C.ink);
        drawText(ctx, BIG, l.speaker, BOX.x + 10, BOX.y - 8, phone ? C.red3 : C.brass3);
      }
      let remaining = this.shown;
      const col = narr ? C.cream2 : phone ? C.rose3 : C.paper;
      for (let i = 0; i < l.lines.length; i++) {
        const s = l.lines[i];
        const part = s.slice(0, Math.max(0, remaining));
        remaining -= s.length;
        let x = BOX.x + 7;
        const y = BOX.y + 4 + i * 10;
        if (phone) {
          // a little static jitter on the phone line
          x += Math.random() < 0.05 ? 1 : 0;
        }
        drawText(ctx, BIG, part, x, y, col);
        if (remaining <= 0) break;
      }
      if (this.waiting && l.auto <= 0 && Math.floor(t * 2) % 2 === 0) {
        rect(ctx, BOX.x + BOX.w - 10, BOX.y + BOX.h - 7, 5, 1, C.brass3);
        rect(ctx, BOX.x + BOX.w - 9, BOX.y + BOX.h - 6, 3, 1, C.brass3);
        rect(ctx, BOX.x + BOX.w - 8, BOX.y + BOX.h - 5, 1, 1, C.brass3);
      }
    }
    if (this.choice) {
      const ch = this.choice;
      const r0 = ch.rects[0];
      const last = ch.rects[ch.rects.length - 1];
      ctx.fillStyle = 'rgba(9,8,12,0.95)';
      ctx.fillRect(r0.x - 2, r0.y - 3, r0.w + 4, last.y + last.h - r0.y + 5);
      rect(ctx, r0.x - 2, r0.y - 3, r0.w + 4, 1, C.brass2);
      rect(ctx, r0.x - 2, last.y + last.h + 1, r0.w + 4, 1, C.brass2);
      ch.options.forEach((o, i) => {
        const r = ch.rects[i];
        const sel = i === ch.sel;
        if (sel) rect(ctx, r.x, r.y, r.w, r.h - 1, C.wood1);
        drawText(ctx, BIG, sel ? '>' : `${i + 1}`, r.x + 4, r.y + 1, sel ? C.amber : C.steel2);
        drawText(ctx, BIG, o, r.x + 14, r.y + 1, sel ? C.amberHi : C.cream2);
      });
    }
  }
}
