// Collects keyboard and pointer input; scenes read a per-frame event list.
export const W = 384;
export const H = 216;

export type InputEvent =
  | { type: 'key'; key: string; code: string; repeat: boolean }
  | { type: 'down'; x: number; y: number }
  | { type: 'up'; x: number; y: number }
  | { type: 'wheel'; dy: number };

class InputManager {
  events: InputEvent[] = [];
  mx = -1;
  my = -1;
  pointerDown = false;
  lastPointerTime = 0;
  held = new Set<string>();
  private canvas!: HTMLCanvasElement;
  private onFirstGesture: (() => void)[] = [];
  private gestured = false;

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const toLocal = (e: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.focus();
      const p = toLocal(e);
      this.mx = p.x;
      this.my = p.y;
      this.pointerDown = true;
      this.lastPointerTime = performance.now();
      this.events.push({ type: 'down', x: p.x, y: p.y });
      this.gesture();
    });
    window.addEventListener('pointerup', (e) => {
      if (!this.pointerDown) return;
      const p = toLocal(e);
      this.pointerDown = false;
      this.events.push({ type: 'up', x: p.x, y: p.y });
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = toLocal(e);
      this.mx = p.x;
      this.my = p.y;
      if (e.pointerType === 'mouse') this.lastPointerTime = performance.now();
    });
    canvas.addEventListener('pointerleave', () => {
      this.mx = -1;
      this.my = -1;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.events.push({ type: 'wheel', dy: Math.sign(e.deltaY) });
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.id === 'name-input') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab', 'Backspace'].includes(e.key)) e.preventDefault();
      this.held.add(e.code);
      this.events.push({ type: 'key', key: e.key, code: e.code, repeat: e.repeat });
      this.gesture();
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
  }

  whenGesture(fn: () => void): void {
    if (this.gestured) fn();
    else this.onFirstGesture.push(fn);
  }

  private gesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    for (const fn of this.onFirstGesture) fn();
    this.onFirstGesture = [];
  }

  /** True when the mouse was used recently (shows hover states). */
  get mouseActive(): boolean {
    return this.mx >= 0 && performance.now() - this.lastPointerTime < 4000;
  }

  setCursor(c: string): void {
    if (this.canvas.style.cursor !== c) this.canvas.style.cursor = c;
  }

  drain(): InputEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}

export const Input = new InputManager();

export const isConfirm = (e: InputEvent) =>
  e.type === 'key' && !e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z');
export const isBack = (e: InputEvent) => e.type === 'key' && (e.key === 'Escape' || e.key === 'Backspace');
export const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) =>
  x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
