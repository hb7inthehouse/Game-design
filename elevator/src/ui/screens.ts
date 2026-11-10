// Title, name entry, pause, settings, logbook, endings gallery and the ending card.
import type { App, Scene } from '../core/app';
import { Input, type InputEvent, W, H, isBack, isConfirm, inRect } from '../core/input';
import { Sound } from '../core/audio';
import { Save } from '../core/save';
import { Rng } from '../core/rng';
import { BIG, TINY, drawText, drawTextCentered, textWidth, wrap } from '../core/font';
import { C, rect } from '../art/palette';
import { cabShell, drawCeilingLamp, drawDial, drawDoors, drawPanel, vignetteImg } from '../art/cab';
import { Menu, panel } from './menu';
import { GameScene } from '../game/scene';
import { buildRun } from '../game/encounters';
import { ENDINGS } from '../game/endings';
import { PAGES, clockText, rulesText, type RunState } from '../game/state';
import { floorLabel } from '../game/elevator';

function applyCrt(): void {
  document.getElementById('crt')?.classList.toggle('on', Save.settings.crt);
}

// ------------------------------------------------------------------ title backdrop
function backdrop(ctx: CanvasRenderingContext2D, t: number, dim = 0.55): void {
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, W, H);
  drawDoors(ctx, 0, [], 0);
  ctx.drawImage(cabShell(), 0, 0);
  const flick = Math.sin(t * 13) > 0.97 || Math.sin(t * 3.1 + 1) > 0.995 ? 0.3 : 1;
  drawCeilingLamp(ctx, flick);
  drawDial(ctx, 6 + Math.sin(t * 0.3) * 5.5 + Math.sin(t * 2.1) * 0.2, Math.cos(t * 0.3) > 0 ? 1 : -1, false, Math.sin(t * 0.7) > 0.98, 1);
  drawPanel(ctx, {
    lit: new Set(), calls: new Set(), selfLit: new Set(), revealB: false, reveal13: false, cursor: null, pressed: null, hasKey: false,
    keyTurned: false, dark: new Set(), swapLabels: {}, t, finale: false,
  });
  ctx.fillStyle = `rgba(6,4,8,${flick < 1 ? dim + 0.2 : dim})`;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(vignetteImg(), 0, 0);
}

// ------------------------------------------------------------------ title
export class TitleScene implements Scene {
  app: App;
  menu: Menu;
  t = 0;
  private started = false;

  constructor(app: App) {
    this.app = app;
    const hasSave = () => !!Save.data.checkpoint;
    this.menu = new Menu([
      { label: () => (hasSave() ? 'Continue shift' : 'Continue'), action: () => this.continue(), disabled: () => !hasSave() },
      { label: 'New shift', action: () => this.newShift() },
      { label: () => `Endings  ${Save.data.endings.length}/${ENDINGS.length}`, action: () => app.push(new EndingsScene(app)) },
      { label: 'How to operate', action: () => app.push(new HelpScene(app)) },
      { label: 'Settings', action: () => app.push(new SettingsScene(app)) },
      { label: 'Credits', action: () => app.push(new CreditsScene(app)) },
    ], 132, 118, 120);
    if (!hasSave()) this.menu.sel = 1;
  }

  onEnter(): void {
    applyCrt();
    Input.whenGesture(() => {
      Sound.init();
      if (this.app.top === this) Sound.startMusic('title');
    });
    if (Sound.ctx) Sound.startMusic('title');
    Sound.setAmbience(false);
    Sound.setDrone(0);
  }

  private continue(): void {
    const cp = Save.data.checkpoint;
    if (!cp) return;
    Sound.init();
    startGame(this.app, cp.run as RunState);
  }

  private newShift(): void {
    Sound.init();
    if (Save.data.checkpoint) {
      this.app.push(new ConfirmScene(this.app, 'Start over? Your shift in progress will be lost.', () => this.app.push(new NameScene(this.app))));
    } else this.app.push(new NameScene(this.app));
  }

  update(dt: number, events: InputEvent[]): void {
    this.t += dt;
    if (!this.started && events.length) this.started = true;
    this.menu.handle(events);
  }

  render(ctx: CanvasRenderingContext2D): void {
    backdrop(ctx, this.t);
    const glitch = Math.sin(this.t * 0.9) > 0.985;
    drawTextCentered(ctx, BIG, 'THE ELEVATOR', W / 2 + (glitch ? 1 : 0), 52, C.cream3, 2, C.void);
    drawTextCentered(ctx, BIG, "DOESN'T STOP", W / 2, 72, glitch ? C.red3 : C.amber, 2, C.void);
    drawTextCentered(ctx, BIG, 'A night shift at the Marlowe Apartments', W / 2, 96, C.steel3);
    panel(ctx, 124, 112, 136, 86);
    this.menu.render(ctx, this.t);
    const nf = Save.data.finished;
    drawText(ctx, TINY, nf ? `SHIFTS SURVIVED: ${nf}` : 'BEST WITH HEADPHONES', 6, H - 9, C.steel1);
    drawText(ctx, TINY, 'V1.0', W - 22, H - 9, C.steel1);
  }
}

export function startGame(app: App, run: RunState): void {
  Sound.stopMusic();
  const g = new GameScene(app, run);
  g.onFinish = (id) => {
    window.setTimeout(() => app.push(new EndingCard(app, g, id)), 600);
  };
  g.openLogbook = () => app.push(new LogbookScene(app, g.run));
  g.openPause = () => app.push(new PauseScene(app, g));
  app.replace(g);
}

// ------------------------------------------------------------------ name entry
export class NameScene implements Scene {
  app: App;
  overlay = true;
  input = document.getElementById('name-input') as HTMLInputElement;
  t = 0;
  private go = { x: 142, y: 136, w: 100, h: 14 };
  private field = { x: 112, y: 104, w: 160, h: 16 };
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); this.begin(); }
    if (e.key === 'Escape') { e.preventDefault(); this.cancel(); }
  };

  constructor(app: App) {
    this.app = app;
  }

  onEnter(): void {
    let last = 'Sam';
    try { last = localStorage.getItem('eds.name') ?? 'Sam'; } catch { /* storage blocked */ }
    this.input.value = last;
    this.input.addEventListener('keydown', this.onKey);
    this.input.focus();
    this.input.select();
  }

  onExit(): void {
    this.input.removeEventListener('keydown', this.onKey);
    this.input.blur();
  }

  private cancel(): void {
    this.app.pop();
  }

  private begin(): void {
    const name = (this.input.value.trim().replace(/[^A-Za-z0-9 .'-]/g, '') || 'Sam').slice(0, 12);
    try { localStorage.setItem('eds.name', name); } catch { /* ignore */ }
    this.input.blur();
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const params = new URLSearchParams(location.search);
    const s = params.get('seed') ? Number(params.get('seed')) : seed;
    const run = buildRun(new Rng(s), name, s);
    Save.data.shifts++;
    Save.write();
    Sound.click();
    startGame(this.app, run);
  }

  update(dt: number, events: InputEvent[]): void {
    this.t += dt;
    for (const e of events) {
      if (e.type === 'down') {
        if (inRect(e.x, e.y, this.go)) this.begin();
        else if (inRect(e.x, e.y, this.field)) { this.input.focus(); }
        else if (!inRect(e.x, e.y, { x: 96, y: 60, w: 192, h: 100 })) this.cancel();
      }
      if (e.type === 'key' && e.key === 'Escape') this.cancel();
      if (e.type === 'key' && e.key === 'Enter') this.begin();
    }
    if (document.activeElement !== this.input && this.t > 0.2 && !Input.mouseActive) this.input.focus();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.7)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 96, 60, 192, 100);
    drawTextCentered(ctx, BIG, 'Sign the night log', W / 2, 68, C.amber);
    drawTextCentered(ctx, BIG, 'Operator, print your name:', W / 2, 86, C.cream1);
    rect(ctx, this.field.x, this.field.y, this.field.w, this.field.h, C.paper);
    rect(ctx, this.field.x, this.field.y + this.field.h - 1, this.field.w, 1, C.cream0);
    const v = this.input.value.slice(0, 12);
    const tw = textWidth(BIG, v);
    drawText(ctx, BIG, v, W / 2 - tw / 2, this.field.y + 4, C.ink);
    if (Math.floor(this.t * 2) % 2 === 0) rect(ctx, W / 2 + tw / 2 + 2, this.field.y + 3, 1, 9, C.ink);
    const hov = Input.mouseActive && inRect(Input.mx, Input.my, this.go);
    rect(ctx, this.go.x, this.go.y, this.go.w, this.go.h, hov ? C.wood3 : C.wood2);
    rect(ctx, this.go.x, this.go.y, this.go.w, 1, C.brass2);
    drawTextCentered(ctx, BIG, 'Begin shift', W / 2, this.go.y + 3, C.amberHi);
    drawTextCentered(ctx, TINY, 'ENTER TO BEGIN  -  ESC TO GO BACK', W / 2, 152, C.steel2);
  }
}

// ------------------------------------------------------------------ confirm
export class ConfirmScene implements Scene {
  overlay = true;
  menu: Menu;
  constructor(public app: App, private text: string, onYes: () => void) {
    this.menu = new Menu([
      { label: 'Yes', action: () => { app.pop(); onYes(); } },
      { label: 'No', action: () => app.pop() },
    ], 152, 112, 80);
    this.menu.sel = 1;
    this.menu.onBack = () => app.pop();
  }
  update(_dt: number, events: InputEvent[]): void {
    this.menu.handle(events);
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.7)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 80, 72, 224, 72);
    wrap(BIG, this.text, 200).forEach((l, i) => drawTextCentered(ctx, BIG, l, W / 2, 82 + i * 10, C.cream2));
    this.menu.render(ctx, performance.now() / 1000);
  }
}

// ------------------------------------------------------------------ pause
export class PauseScene implements Scene {
  overlay = true;
  menu: Menu;
  constructor(public app: App, private g: GameScene) {
    Sound.setMotor(0);
    this.menu = new Menu([
      { label: 'Resume', action: () => app.pop() },
      { label: 'Logbook', action: () => app.push(new LogbookScene(app, g.run)) },
      { label: 'How to operate', action: () => app.push(new HelpScene(app)) },
      { label: 'Settings', action: () => app.push(new SettingsScene(app)) },
      {
        label: 'Quit to title',
        action: () => app.push(new ConfirmScene(app, 'Quit to the title? You will continue from the start of this ride.', () => {
          g.abort();
          app.replace(new TitleScene(app));
        })),
      },
    ], 132, 84, 120);
    this.menu.onBack = () => app.pop();
  }
  update(_dt: number, events: InputEvent[]): void {
    this.menu.handle(events);
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.72)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 124, 56, 136, 102);
    drawTextCentered(ctx, BIG, 'PAUSED', W / 2, 64, C.amber);
    drawTextCentered(ctx, TINY, `${clockText(this.g.clockNow)}  ACT ${['', 'I', 'II', 'III'][this.g.run.act]}`, W / 2, 75, C.steel2);
    this.menu.render(ctx, performance.now() / 1000);
  }
}

// ------------------------------------------------------------------ settings
export class SettingsScene implements Scene {
  overlay = true;
  menu: Menu;
  constructor(public app: App) {
    const s = Save.settings;
    const vol = (k: 'master' | 'sfx' | 'ambience') => ({
      left: () => { s[k] = Math.max(0, Math.round((s[k] - 0.1) * 10) / 10); this.changed(); },
      right: () => { s[k] = Math.min(1, Math.round((s[k] + 0.1) * 10) / 10); this.changed(); },
      value: () => '|'.repeat(Math.round(s[k] * 10)).padEnd(10, '.'),
    });
    const tog = (k: 'crt' | 'reduceFlashing' | 'jumpscares' | 'screenShake') => ({
      left: () => { s[k] = !s[k]; this.changed(); },
      right: () => { s[k] = !s[k]; this.changed(); },
      value: () => (s[k] ? 'On' : 'Off'),
    });
    const speeds = ['Slow', 'Normal', 'Fast', 'Instant'];
    this.menu = new Menu([
      { label: 'Master volume', ...vol('master') },
      { label: 'Effects volume', ...vol('sfx') },
      { label: 'Ambience volume', ...vol('ambience') },
      {
        label: 'Text speed',
        left: () => { s.textSpeed = (s.textSpeed + 3) % 4; this.changed(); },
        right: () => { s.textSpeed = (s.textSpeed + 1) % 4; this.changed(); },
        value: () => speeds[s.textSpeed],
      },
      { label: 'Jump scares', ...tog('jumpscares') },
      { label: 'Reduce flashing', ...tog('reduceFlashing') },
      { label: 'Screen shake', ...tog('screenShake') },
      { label: 'Scanlines', ...tog('crt') },
      {
        label: 'Fullscreen',
        action: () => {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen?.().catch(() => undefined);
        },
        value: () => (document.fullscreenElement ? 'On' : 'Off'),
      },
      {
        label: 'Erase all save data',
        action: () => app.push(new ConfirmScene(app, 'Erase endings, stats and the shift in progress? Settings are kept.', () => Save.wipe())),
      },
      { label: 'Back', action: () => app.pop() },
    ], 82, 46, 220, 'left');
    this.menu.onBack = () => app.pop();
  }
  private changed(): void {
    Save.write();
    Sound.applyVolumes();
    applyCrt();
  }
  update(_dt: number, events: InputEvent[]): void {
    this.menu.handle(events);
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.92)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 74, 26, 236, 176);
    drawTextCentered(ctx, BIG, 'SETTINGS', W / 2, 33, C.amber);
    this.menu.render(ctx, performance.now() / 1000);
    drawTextCentered(ctx, TINY, 'LEFT/RIGHT OR CLICK TO CHANGE  -  ESC TO GO BACK', W / 2, 192, C.steel2);
  }
}

// ------------------------------------------------------------------ help
export class HelpScene implements Scene {
  overlay = true;
  constructor(public app: App) {}
  update(_dt: number, events: InputEvent[]): void {
    for (const e of events) if (isBack(e) || isConfirm(e) || e.type === 'down') { Sound.click(0.8); this.app.pop(); return; }
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.85)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 30, 14, 324, 190);
    drawTextCentered(ctx, BIG, 'HOW TO OPERATE THE CAR', W / 2, 22, C.amber);
    const lines = [
      'You are the night operator. Passengers call, you fetch them,',
      'they ask for a floor, you take them there. That is the job.',
      '',
      'Mouse / touch: click buttons on the brass panel. Click the',
      'logbook (right wall) and the red phone (left wall).',
      'Keys: 1-9 = floors (1 = Lobby), 0 = 10, - = 11, = = 12,',
      '   O open doors, C close doors, P phone, L logbook, A alarm.',
      '   Arrows + Enter also work the panel. Esc pauses.',
      'Talking: click, Space or Enter. Choices: arrows or 1-3.',
      '',
      'A blinking button is a call. A lit button is where you are',
      'going. Press a lit button again to cancel it.',
      'Read the logbook. Write-ups of every ride go in it, and',
      'the last operator left you his rules.',
    ];
    lines.forEach((l, i) => drawText(ctx, BIG, l, 40, 38 + i * 11, i >= 3 && i <= 8 ? C.cream1 : C.cream2));
  }
}

// ------------------------------------------------------------------ credits
export class CreditsScene implements Scene {
  overlay = true;
  constructor(public app: App) {}
  update(_dt: number, events: InputEvent[]): void {
    for (const e of events) if (isBack(e) || isConfirm(e) || e.type === 'down') { Sound.click(0.8); this.app.pop(); return; }
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.85)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 70, 40, 244, 136);
    const lines = [
      ["THE ELEVATOR DOESN'T STOP", C.amber],
      ['', C.cream2],
      ['A short psychological horror game.', C.cream2],
      ['Pixel art, sound and words made for this game.', C.cream2],
      ['Everything you hear is synthesized as you play.', C.cream2],
      ['', C.cream2],
      ['Built with TypeScript, Vite and Canvas.', C.steel3],
      ['', C.cream2],
      ['In memory of Walter Imrie, night operator,', C.cream1],
      ['the Marlowe Apartments, 1948 - 1979.', C.cream1],
    ] as const;
    lines.forEach(([l, c], i) => drawTextCentered(ctx, BIG, l, W / 2, 50 + i * 11, c));
  }
}

// ------------------------------------------------------------------ endings gallery
export class EndingsScene implements Scene {
  overlay = true;
  sel = 0;
  constructor(public app: App) {}
  update(_dt: number, events: InputEvent[]): void {
    for (const e of events) {
      if (isBack(e) || (e.type === 'down' && !inRect(e.x, e.y, { x: 30, y: 30, w: 324, h: 160 }))) { Sound.click(0.8); this.app.pop(); return; }
      if (e.type === 'key' && e.key === 'ArrowUp') this.sel = (this.sel + ENDINGS.length - 1) % ENDINGS.length;
      if (e.type === 'key' && e.key === 'ArrowDown') this.sel = (this.sel + 1) % ENDINGS.length;
      if (e.type === 'down') {
        const i = Math.floor((e.y - 44) / 24);
        if (i >= 0 && i < ENDINGS.length) this.sel = i;
      }
      if (isConfirm(e)) { Sound.click(0.8); this.app.pop(); return; }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.85)';
    ctx.fillRect(0, 0, W, H);
    panel(ctx, 30, 20, 324, 180);
    drawTextCentered(ctx, BIG, `ENDINGS  ${Save.data.endings.length}/${ENDINGS.length}`, W / 2, 28, C.amber);
    ENDINGS.forEach((e, i) => {
      const got = Save.data.endings.includes(e.id);
      const y = 44 + i * 24;
      if (i === this.sel) rect(ctx, 34, y - 2, 316, 23, 'rgba(70,40,26,0.6)');
      const col = e.tone === 'good' ? C.amber : e.tone === 'bad' ? C.red3 : C.cream2;
      drawText(ctx, BIG, got ? e.name : '? ? ?', 40, y, got ? col : C.steel1);
      const sub = got ? e.text : `Hint: ${e.hint}`;
      drawText(ctx, TINY, wrap(TINY, sub.toUpperCase(), 300)[0], 40, y + 11, got ? C.cream1 : C.steel2);
      const l2 = wrap(TINY, sub.toUpperCase(), 300)[1];
      if (l2) drawText(ctx, TINY, l2, 40, y + 17, got ? C.cream1 : C.steel2);
    });
  }
}

// ------------------------------------------------------------------ logbook
export class LogbookScene implements Scene {
  overlay = true;
  tab = 0;
  scroll = 0;
  private tabs = ['Tonight', 'Rules', 'Pages'];
  constructor(public app: App, private run: RunState) {
    Sound.noiseBurst(0.15, 3000, 0.05, 'highpass');
  }
  private tabRect(i: number) {
    return { x: 40 + i * 70, y: 14, w: 66, h: 12 };
  }
  update(_dt: number, events: InputEvent[]): void {
    for (const e of events) {
      if (isBack(e) || (e.type === 'key' && (e.key === 'l' || e.key === 'L' || e.key === 'Tab'))) { this.close(); return; }
      if (e.type === 'key') {
        if (e.key === 'ArrowLeft') { this.tab = (this.tab + 2) % 3; this.scroll = 0; Sound.click(1.2); }
        if (e.key === 'ArrowRight') { this.tab = (this.tab + 1) % 3; this.scroll = 0; Sound.click(1.2); }
        if (e.key === 'ArrowUp') this.scroll = Math.max(0, this.scroll - 1);
        if (e.key === 'ArrowDown') this.scroll++;
        if (isConfirm(e)) { this.close(); return; }
      }
      if (e.type === 'wheel') this.scroll = Math.max(0, this.scroll + e.dy);
      if (e.type === 'down') {
        const t = [0, 1, 2].find((i) => inRect(e.x, e.y, this.tabRect(i)));
        if (t !== undefined) { this.tab = t; this.scroll = 0; Sound.click(1.2); continue; }
        if (!inRect(e.x, e.y, { x: 24, y: 12, w: 336, h: 196 })) { this.close(); return; }
        if (e.y > 110) this.scroll++;
        else this.scroll = Math.max(0, this.scroll - 1);
      }
    }
  }
  private close(): void {
    Sound.noiseBurst(0.12, 3000, 0.04, 'highpass');
    this.app.pop();
  }
  private lines(): { text: string; color: string }[] {
    const out: { text: string; color: string }[] = [];
    const push = (t: string, color: string) => wrap(BIG, t, 300).forEach((l) => out.push({ text: l, color }));
    if (this.tab === 0) {
      push(`NIGHT LOG - THE MARLOWE - NOV 10. Operator: ${this.run.name}.`, C.wood2);
      push(`23:00 - Shift begins. Signed: ${this.run.name}.`, C.ink);
      if (!this.run.log.length) push('(Nothing else written yet.)', C.cream0);
      for (const e of this.run.log) push(`${clockText(e.t)} - ${e.text}`, e.kind === 'odd' ? C.red1 : e.kind === 'note' ? C.blue2 : C.ink);
    } else if (this.tab === 1) {
      push('RULES OF THE CAR  -  W.I.  (taped inside the cover)', C.wood2);
      out.push({ text: '', color: C.ink });
      for (const r of rulesText(this.run.act, this.run.hasKey)) {
        push(r, r.startsWith('6') || r.startsWith('7') ? C.red1 : C.ink);
        out.push({ text: '', color: C.ink });
      }
      push(`Residents I know of: ${residentNotes(this.run)}`, C.cream0);
    } else {
      if (!this.run.pages.length) push('No loose pages yet. Walter must have kept more than one book.', C.cream0);
      for (const id of this.run.pages) {
        const p = PAGES[id];
        if (!p) continue;
        push(p.title.toUpperCase(), C.wood2);
        for (const para of p.text.split('\n')) push(para, C.ink);
        out.push({ text: '', color: C.ink });
      }
    }
    return out;
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5,4,7,0.8)';
    ctx.fillRect(0, 0, W, H);
    // book
    rect(ctx, 24, 24, 336, 184, C.wood1);
    rect(ctx, 28, 28, 328, 176, C.paper);
    for (let y = 46; y < 200; y += 10) rect(ctx, 32, y + 8, 320, 1, '#d8ccaa');
    rect(ctx, 46, 28, 1, 176, '#d8a0a0');
    this.tabs.forEach((t, i) => {
      const r = this.tabRect(i);
      const on = i === this.tab;
      rect(ctx, r.x, r.y, r.w, r.h + (on ? 2 : 0), on ? C.paper : C.cream1);
      const label = i === 2 ? `Pages (${this.run.pages.length})` : t;
      drawTextCentered(ctx, BIG, label, r.x + r.w / 2, r.y + 2, on ? C.ink : C.cream0);
    });
    const lines = this.lines();
    const per = 16;
    this.scroll = Math.min(this.scroll, Math.max(0, lines.length - per));
    lines.slice(this.scroll, this.scroll + per).forEach((l, i) => drawText(ctx, BIG, l.text, 52, 34 + i * 10, l.color));
    if (this.scroll > 0) drawText(ctx, BIG, '▲', 344, 32, C.wood2);
    if (this.scroll + per < lines.length) drawText(ctx, BIG, '▼', 344, 192, C.wood2);
    drawTextCentered(ctx, TINY, 'ARROWS / WHEEL TO READ  -  ESC OR L TO CLOSE', W / 2, 210, C.steel2);
  }
}

function residentNotes(r: RunState): string {
  const seen = (id: string) => r.used.includes(id);
  const parts: string[] = [];
  if (seen('halloran1')) parts.push(`Halloran ${floorLabel(r.floors.halloran)}, sister Ruth ${floorLabel(r.floors.ruth)}`);
  if (seen('okafor1')) parts.push(`Okafor ${floorLabel(r.floors.okafor)}`);
  if (seen('tommy1')) parts.push(`Reyes boy ${floorLabel(r.floors.tommy)}`);
  if (seen('devOut')) parts.push(`Dev ${floorLabel(r.floors.dev)}`);
  return parts.length ? parts.join('; ') + '.' : 'none yet.';
}

// ------------------------------------------------------------------ ending card
export class EndingCard implements Scene {
  t = 0;
  fresh: boolean;
  constructor(public app: App, private g: GameScene, private id: string) {
    this.fresh = Save.unlockEnding(id);
    Save.data.finished++;
    Save.data.bestDelivered = Math.max(Save.data.bestDelivered, g.run.delivered.length);
    Save.clearCheckpoint();
    Save.write();
    g.abort();
    Sound.startMusic(id === 'true' || id === 'morning' ? 'dawn' : 'dark');
  }
  update(dt: number, events: InputEvent[]): void {
    this.t += dt;
    if (this.t < 2.5) return;
    for (const e of events) {
      if (e.type === 'down' || isConfirm(e) || isBack(e)) {
        Sound.click();
        this.app.replace(new TitleScene(this.app));
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    const info = ENDINGS.find((e) => e.id === this.id)!;
    const a = Math.min(1, this.t / 1.5);
    ctx.fillStyle = C.void;
    ctx.fillRect(0, 0, W, H);
    if (this.id === 'true' || this.id === 'morning') {
      for (let y = 0; y < H; y++) {
        const k = y / H;
        ctx.fillStyle = `rgba(${Math.round(60 + k * 120)},${Math.round(30 + k * 60)},${Math.round(40 + k * 10)},${0.5 * a})`;
        ctx.fillRect(0, y, W, 1);
      }
    }
    ctx.globalAlpha = a;
    drawTextCentered(ctx, TINY, `ENDING ${ENDINGS.indexOf(info) + 1} OF ${ENDINGS.length}`, W / 2, 40, C.steel3);
    const col = info.tone === 'good' ? C.amber : info.tone === 'bad' ? C.red3 : C.cream3;
    drawTextCentered(ctx, BIG, info.name.toUpperCase(), W / 2, 54, col, 2, C.void);
    wrap(BIG, info.text, 300).forEach((l, i) => drawTextCentered(ctx, BIG, l, W / 2, 84 + i * 11, C.cream2));
    const r = this.g.run;
    const mins = Math.floor(r.playSeconds / 60);
    const stats = [
      `Rides: ${r.rides}    Passengers home: ${r.delivered.length}/3    Time on shift: ${mins} min`,
      `Times the car chose: ${r.obeyed}    Trips to thirteen: ${r.fed}    Pages found: ${r.pages.length}`,
    ];
    stats.forEach((s, i) => drawTextCentered(ctx, TINY, s.toUpperCase(), W / 2, 134 + i * 9, C.steel3));
    drawTextCentered(ctx, BIG, `Endings found: ${Save.data.endings.length}/${ENDINGS.length}${this.fresh ? '  (new)' : ''}`, W / 2, 162, C.brass3);
    if (this.t > 2.5 && Math.floor(this.t * 2) % 2 === 0) drawTextCentered(ctx, BIG, 'Click or press Enter', W / 2, 190, C.steel2);
    ctx.globalAlpha = 1;
  }
}
