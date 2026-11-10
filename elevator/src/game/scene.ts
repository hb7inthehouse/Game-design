// The night shift: elevator simulation, rendering, input and the scripting API encounters use.
import type { App, Scene } from '../core/app';
import { Input, type InputEvent, inRect, W, H } from '../core/input';
import { Sound } from '../core/audio';
import { Save } from '../core/save';
import { Rng, rand } from '../core/rng';
import { BIG, TINY, drawText, drawTextCentered, textWidth, wrap } from '../core/font';
import { C, canvas, ellipse, rect, dither } from '../art/palette';
import { sprite, dogSprite, SPRITE_W, type Face, type Facing, type Look } from '../art/character';
import { hallway, type HallVariant } from '../art/hallway';
import {
  BUTTONS, BUTTON_GRID, DOOR, DOOR_MID, PANEL, WALL_ITEMS, cabShell, certImg, clockImg, drawCeilingLamp, drawDial, drawDoors,
  drawPanel, logImg, phoneImg, plaqueImg, vignetteImg, wallBlit, wallItemHit,
} from '../art/cab';
import { Elevator, floorLabel } from './elevator';
import { Dialogue, type DialogueStyle } from '../ui/dialogue';
import { LOOKS, NAMES, VOICE } from './cast';
import { NAMEPLATES, SHIFT_LEN, clockText, type RunState } from './state';
import { ENCOUNTERS, actStart, maybeOvershoot } from './encounters';
import { ambientTick, resetAmbient } from './anomalies';

export interface Actor {
  id: string;
  look: Look | null;
  dog?: boolean;
  x: number;
  y: number;
  facing: Facing;
  face: Face;
  path: { x: number; y: number }[];
  speed: number;
  frame: number;
  frameT: number;
  stepT: number;
  alpha: number;
  name: string;
  voice: number;
  follow?: Actor;
  hidden?: boolean;
}

export interface BotAction {
  press?: number;
  choose?: number;
  close?: boolean;
  open?: boolean;
  phone?: boolean;
  key?: boolean;
  idle?: boolean;
}

export interface Hint {
  key?: string;
  good: BotAction;
  bad?: BotAction;
}

interface Wait {
  pred: () => boolean;
  resolve: (ok: boolean) => void;
  deadline: number;
}

export const SLOTS = [88, 140, 212, 34];
export const CAB_Y = 209;
export const HALL_Y = 172;

const SCARE_KINDS = ['face', 'water', 'double'] as const;
type ScareKind = (typeof SCARE_KINDS)[number];

export class GameScene implements Scene {
  app: App;
  run: RunState;
  rng: Rng;
  car = new Elevator();
  actors: Actor[] = [];
  dlg = new Dialogue();
  t = 0;
  private waits: Wait[] = [];
  private aborted = false;
  hallOverride = new Map<number, HallVariant>();
  onceHall: { floor: number; variant: HallVariant } | null = null;
  light = 1;
  private flickerT = 0;
  private flickerStrength = 0;
  private outT = 0;
  baseLight = 1;
  private shakeT = 0;
  private shakeAmt = 0;
  private scareT = 0;
  private scareKind: ScareKind = 'face';
  gapGlow = 0;
  private toastText: string[] = [];
  private toastT = 0;
  cursor = 'f1';
  keyboardMode = false;
  private pressed: string | null = null;
  private pressedT = 0;
  phoneRinging = false;
  finale = false;
  fallPos: number | null = null;
  panelDark = new Set<string>();
  swapLabels: Record<string, string> = {};
  ambientOn = true;
  hint: Hint | null = null;
  private panelListeners: ((id: string) => void)[] = [];
  private phoneListeners: (() => void)[] = [];
  departSeq = 0;
  openSeq = 0;
  lastOpen = { floor: 1, afterDepart: 0, seq: 0 };
  arriveSeq = 0;
  lastArrive = { floor: 1, seq: 0 };
  private actCard: { act: number; t: number } | null = null;
  private clockMin = 0;
  private bot: { policy: Set<string>; t: number } | null = null;
  timeScale = 1;
  dialDisplay = 1;
  dialTwitch = 0;
  clockBackwards = false;
  private cabLayer: [HTMLCanvasElement, CanvasRenderingContext2D] = canvas(W, H);
  private clockCache: { m: number; img: HTMLCanvasElement } | null = null;
  ending: string | null = null;
  onFinish: ((ending: string) => void) | null = null;
  onQuit: (() => void) | null = null;
  openLogbook: (() => void) | null = null;
  openPause: (() => void) | null = null;
  firstCall = true;
  rainVisible = false;
  sticky: Actor | null = null;
  falling = 0;
  lastSelfArrive = -1;

  constructor(app: App, run: RunState) {
    this.app = app;
    this.run = run;
    this.rng = new Rng(run.seed * 7919 + run.index * 31);
    this.car.place(run.carFloor);
    this.car.enabled.add(0);
    this.car.enabled.add(-1);
    this.dialDisplay = run.carFloor;
    this.clockMin = run.clock;
    const params = new URLSearchParams(location.search);
    const botParam = params.get('bot');
    if (botParam !== null) {
      this.bot = { policy: new Set(botParam.split(',').filter((s) => s && s !== '1')), t: 0 };
      this.timeScale = Number(params.get('speed') ?? '6');
    }
    this.car.ev = {
      arrive: (f) => this.onArrive(f),
      opened: (f) => {
        this.openSeq++;
        this.lastOpen = { floor: f, afterDepart: this.departSeq, seq: this.openSeq };
        this.car.calls.delete(f);
      },
      closed: () => {
        if (this.onceHall) this.onceHall = null;
      },
      depart: () => {
        this.departSeq++;
      },
      pass: () => {
        this.gapGlow = 1;
        Sound.click(0.4);
      },
      refused: (why) => {
        if (why === 'held') Sound.buzzer();
        else Sound.thump(0.08, 120, 0.1);
      },
    };
    resetAmbient();
    if (run.act >= 3) this.car.corrupt = 0.6;
    if (run.doubleIn) {
      const d = this.spawn('double', { zone: 'cab', slot: 2, facing: 'back' });
      this.sticky = d;
    }
  }

  // ------------------------------------------------------------------ lifecycle
  onEnter(): void {
    Sound.setAmbience(true);
    Sound.stopMusic();
    Sound.setDrone(this.run.act - 1);
    void this.runShift();
  }

  abort(): void {
    this.aborted = true;
    this.waits = [];
    Sound.stopAll();
    Sound.setAmbience(false);
  }

  private async runShift(): Promise<void> {
    const r = this.run;
    while (!this.aborted && r.index < r.schedule.length) {
      const id = r.schedule[r.index];
      const enc = ENCOUNTERS[id];
      const act = r.actOf[r.index];
      this.run.clock = Math.max(this.run.clock, this.slotTime(r.index));
      this.clockMin = Math.max(this.clockMin, this.run.clock);
      if (act !== r.act || (r.index === 0 && !r.flags.started)) {
        r.act = act;
        r.flags.started = true;
        await this.showActCard(act);
        actStart(this, act);
      }
      r.carFloor = this.car.floor;
      if (!this.finale) Save.setCheckpoint(r);
      this.hallOverride.clear();
      this.hint = null;
      this.ambientOn = true;
      if (!r.used.includes(id)) r.used.push(id);
      try {
        await enc.run(this);
      } catch (e) {
        if (this.aborted) return;
        console.error('encounter failed', id, e);
      }
      if (this.aborted || this.ending) return;
      r.index++;
      r.rides++;
      this.hint = null;
      await this.wait(rand(2.5, 4.5));
    }
  }

  slotTime(i: number): number {
    const n = this.run.schedule.length - 1;
    return Math.min(SHIFT_LEN - 8, (i / Math.max(1, n)) * (SHIFT_LEN - 8));
  }

  get clockNow(): number {
    return this.clockMin;
  }

  private async showActCard(act: number): Promise<void> {
    Sound.setDrone(act - 1);
    if (act > 1) Sound.swell();
    this.actCard = { act, t: 0 };
    await this.until(() => this.actCard === null);
  }

  // ------------------------------------------------------------------ waiting
  until(pred: () => boolean, timeout = Infinity): Promise<boolean> {
    if (this.aborted) return new Promise(() => {});
    if (pred()) return Promise.resolve(true);
    return new Promise((resolve) => this.waits.push({ pred, resolve, deadline: this.t + timeout }));
  }

  wait(s: number): Promise<void> {
    const end = this.t + s;
    return this.until(() => this.t >= end).then(() => undefined);
  }

  // ------------------------------------------------------------------ elevator helpers
  /** A hall call. Resolves when the car is at `floor` and its doors are starting to open. */
  async call(floor: number, opts: { quiet?: boolean } = {}): Promise<{ alreadyOpen: boolean }> {
    if (this.car.atFloor && this.car.floor === floor && this.car.doorState === 'open') {
      return { alreadyOpen: true };
    }
    this.car.calls.add(floor);
    if (!opts.quiet) Sound.buzzer();
    if (this.firstCall && this.run.index <= 1) {
      this.toast(`A call from ${floorLabel(floor)}. Press its button on the panel (or its number key).`);
      this.firstCall = false;
    }
    this.hint = { good: { press: floor } };
    const a0 = this.arriveSeq;
    await this.until(
      () => (this.arriveSeq > a0 && this.lastArrive.floor === floor) ||
        (this.car.atFloor && this.car.floor === floor && this.car.doorState === 'opening'),
    );
    this.car.calls.delete(floor);
    this.hint = null;
    return { alreadyOpen: false };
  }

  opened(floor?: number): Promise<boolean> {
    return this.until(() => this.car.doorState === 'open' && (floor === undefined || this.car.floor === floor));
  }

  closed(): Promise<boolean> {
    return this.until(() => this.car.doorState === 'closed');
  }

  /** Floor of the next door opening that follows a departure after `since` (a departSeq mark). */
  async nextStop(timeout = Infinity, since = this.lastOpen.afterDepart): Promise<number | null> {
    const ok = await this.until(() => this.lastOpen.afterDepart > since && this.car.doorState !== 'closed' && this.car.atFloor, timeout);
    return ok ? this.lastOpen.floor : null;
  }

  /** Mark used with nextStop so stops that happen during dialogue aren't missed. */
  mark(): number {
    return this.lastOpen.afterDepart;
  }

  onPanel(fn: (id: string) => void): () => void {
    this.panelListeners.push(fn);
    return () => {
      this.panelListeners = this.panelListeners.filter((f) => f !== fn);
    };
  }

  ringPhone(): Promise<boolean> {
    this.phoneRinging = true;
    Sound.startRing();
    return new Promise((resolve) => {
      let done = false;
      const fn = () => {
        if (done) return;
        done = true;
        resolve(true);
      };
      this.phoneListeners.push(fn);
      void this.wait(22).then(() => {
        if (done) return;
        done = true;
        this.phoneListeners = this.phoneListeners.filter((f) => f !== fn);
        this.phoneRinging = false;
        Sound.stopRing();
        resolve(false);
      });
    });
  }

  private answerPhone(): void {
    if (!this.phoneRinging) return;
    this.phoneRinging = false;
    Sound.stopRing();
    Sound.click(0.5);
    const ls = this.phoneListeners;
    this.phoneListeners = [];
    ls.forEach((f) => f());
  }

  // ------------------------------------------------------------------ actors
  spawn(id: string, opts: { zone?: 'hall' | 'cab'; slot?: number; x?: number; facing?: Facing; face?: Face; look?: Look; fromSide?: number; alpha?: number } = {}): Actor {
    const look = opts.look ?? (id === 'dog' ? null : LOOKS[id] ?? LOOKS.pruitt);
    const zone = opts.zone ?? 'hall';
    const x = opts.x ?? (zone === 'cab' ? SLOTS[opts.slot ?? 0] : DOOR_MID);
    const a: Actor = {
      id, look, dog: id === 'dog', x, y: zone === 'cab' ? CAB_Y + (opts.slot === 3 ? 4 : 0) : HALL_Y,
      facing: opts.facing ?? (zone === 'hall' ? 'front' : 'back'), face: opts.face ?? 'normal',
      path: [], speed: 46, frame: 0, frameT: 0, stepT: 0, alpha: opts.alpha ?? 1,
      name: NAMES[id] ?? id, voice: VOICE[id] ?? 220,
    };
    if (opts.fromSide) {
      const targetX = a.x;
      a.x = targetX + opts.fromSide * 90;
      a.path.push({ x: targetX, y: a.y });
    }
    if (a.dog) a.y = zone === 'cab' ? CAB_Y + 2 : HALL_Y + 1;
    this.actors.push(a);
    return a;
  }

  remove(a: Actor): void {
    this.actors = this.actors.filter((x) => x !== a);
    if (this.sticky === a) this.sticky = null;
  }

  walk(a: Actor, pts: { x: number; y: number }[]): Promise<boolean> {
    a.path.push(...pts);
    return this.until(() => a.path.length === 0 || !this.actors.includes(a));
  }

  async enter(a: Actor, slot: number, dog?: Actor): Promise<void> {
    this.car.holdOpen++;
    try {
      a.facing = 'front';
      if (dog) dog.follow = a;
      const sx = SLOTS[slot];
      await this.walk(a, [{ x: DOOR_MID + (sx - DOOR_MID) * 0.2, y: 186 }, { x: sx, y: CAB_Y + (slot === 3 ? 4 : 0) }]);
      a.facing = 'back';
      if (dog) {
        dog.follow = undefined;
        await this.walk(dog, [{ x: sx + 18, y: CAB_Y + 3 }]);
      }
    } finally {
      this.car.holdOpen--;
    }
  }

  async exit(a: Actor, dog?: Actor, side = Math.random() < 0.5 ? -1 : 1): Promise<void> {
    this.car.holdOpen++;
    try {
      a.facing = 'back';
      if (dog) dog.follow = a;
      await this.walk(a, [{ x: DOOR_MID + (a.x - DOOR_MID) * 0.3, y: 184 }, { x: DOOR_MID, y: HALL_Y }]);
      await this.walk(a, [{ x: DOOR_MID + side * 100, y: HALL_Y - 2 }]);
      this.remove(a);
      if (dog) this.remove(dog);
    } finally {
      this.car.holdOpen--;
    }
  }

  face(a: Actor, f: Facing): void {
    a.facing = f;
  }

  // ------------------------------------------------------------------ dialogue
  async say(who: Actor | string | null, text: string, opts: { style?: DialogueStyle; auto?: number } = {}): Promise<void> {
    if (this.aborted) return new Promise(() => {});
    text = text.replace(/\{name\}/g, this.run.name);
    let speaker: string | null = null;
    let pitch = 220;
    if (who && typeof who === 'object') {
      speaker = who.name;
      pitch = who.voice;
    } else if (typeof who === 'string') {
      speaker = NAMES[who] ?? who;
      pitch = VOICE[who] ?? 220;
    }
    while (this.dlg.busy) await this.until(() => !this.dlg.busy);
    const auto = this.bot && !opts.auto ? 0.25 : opts.auto ?? 0;
    await this.dlg.say(speaker, text, opts.style ?? (speaker ? 'speech' : 'narration'), pitch, auto);
  }

  narrate(text: string, auto = 0): Promise<void> {
    return this.say(null, text, { style: 'narration', auto });
  }

  phone(text: string, who = 'Walter'): Promise<void> {
    return this.say(who, text, { style: 'phone' });
  }

  async choose(options: string[], hint?: Hint): Promise<number> {
    while (this.dlg.choice) await this.until(() => !this.dlg.choice);
    const prev = this.hint;
    this.hint = hint ?? { good: { choose: 0 } };
    const i = await this.dlg.ask(options.map((o) => o.replace(/\{name\}/g, this.run.name)));
    this.hint = prev;
    return i;
  }

  // ------------------------------------------------------------------ state
  log(text: string, kind: 'ride' | 'odd' | 'note' = 'ride'): void {
    this.run.log.push({ t: Math.round(this.clockMin), text: text.replace(/\{name\}/g, this.run.name), kind });
  }

  addPage(id: string): void {
    if (!this.run.pages.includes(id)) {
      this.run.pages.push(id);
      this.toast('A page was added to the logbook. (L)');
    }
  }

  toast(text: string, secs = 4): void {
    this.toastText = wrap(BIG, text, 300).slice(0, 3);
    this.toastT = secs;
  }

  // ------------------------------------------------------------------ effects
  flicker(dur: number, strength = 0.7): void {
    this.flickerT = Math.max(this.flickerT, dur);
    this.flickerStrength = strength;
  }

  lightsOut(dur: number): Promise<void> {
    this.outT = dur;
    Sound.thump(0.12, 50, 0.2);
    return this.wait(dur);
  }

  shake(amt: number, dur: number): void {
    if (!Save.settings.screenShake) amt = Math.min(amt, 0.5);
    this.shakeAmt = amt;
    this.shakeT = dur;
  }

  scare(kind: ScareKind = 'face'): void {
    if (!Save.settings.jumpscares) {
      Sound.stinger(false);
      this.flicker(0.6, 0.5);
      return;
    }
    this.scareKind = kind;
    this.scareT = 0.75;
    Sound.stinger(true);
    this.shake(4, 0.6);
  }

  setHall(floor: number, v: HallVariant | null): void {
    if (v) this.hallOverride.set(floor, v);
    else this.hallOverride.delete(floor);
  }

  setHint(h: Hint | null): void {
    this.hint = h;
  }

  finish(ending: string): void {
    this.ending = ending;
    Save.clearCheckpoint();
    this.onFinish?.(ending);
  }

  // ------------------------------------------------------------------ elevator events
  private onArrive(f: number): void {
    this.arriveSeq++;
    this.lastArrive = { floor: f, seq: this.arriveSeq };
    this.run.carFloor = f;
    if (this.car.consumeSelf(f)) {
      // The car chose this floor. Nobody pressed it.
      this.lastSelfArrive = this.arriveSeq;
      this.run.obeyed++;
      const v = this.rng.pick<HallVariant>(['infinite', 'dark', 'figure', 'ceiling', 'stairs', 'flooded', 'brick', 'mirror']);
      this.onceHall = { floor: f, variant: v };
      this.log(`Stopped at ${floorLabel(f)}. I didn't press ${floorLabel(f)}.`, 'odd');
      void this.wait(1.6).then(() => {
        if (!this.dlg.busy) void this.narrate('Nobody called this floor. The car chose it.', 2.5);
      });
    }
  }

  hallSpecFor(floor: number) {
    let variant: HallVariant = 'normal';
    const o = this.hallOverride.get(floor);
    if (this.onceHall && this.onceHall.floor === floor) variant = this.onceHall.variant;
    else if (o) variant = o;
    else if (this.run.act >= 3 && floor >= 2 && (floor * 7 + this.run.index) % 6 === 0) variant = 'dark';
    return {
      floor, variant, act: this.run.act, names: NAMEPLATES(this.run),
      keyGlint: floor === 0 && !this.run.hasKey, figureDist: Number(this.run.flags.figureDist ?? 6),
    };
  }

  // ------------------------------------------------------------------ input
  private pressButton(id: string): void {
    const b = BUTTONS.find((x) => x.id === id);
    if (!b) return;
    this.pressed = id;
    this.pressedT = 0.15;
    if (b.floor !== undefined) {
      if ((b.floor === 0 && !this.run.revealB) || (b.floor === -1 && !this.run.reveal13)) {
        Sound.thump(0.06, 140, 0.08);
        return;
      }
      if (this.panelDark.has(id) || (this.finale && b.floor !== 1 && b.floor !== -1)) {
        Sound.thump(0.06, 140, 0.08);
        this.panelListeners.forEach((f) => f(id));
        return;
      }
      Sound.click();
      if (!this.finale) {
        const wasLit = this.car.lit.has(b.floor);
        this.car.pressFloor(b.floor);
        if (!wasLit && this.car.lit.has(b.floor)) maybeOvershoot(this, b.floor);
      }
    } else if (id === 'open') {
      Sound.click(0.8);
      if (!this.finale) this.car.openDoors();
    } else if (id === 'close') {
      Sound.click(0.8);
      if (!this.finale) this.car.closeDoors();
    } else if (id === 'alarm') {
      Sound.alarm();
    } else if (id === 'key') {
      Sound.click(0.6);
      if (!this.finale) {
        if (this.run.hasKey) this.toast("Walter's key fits the switch. Not yet. Rule seven: when she won't stop.");
        else this.toast('A keyhole marked STOP. You have no key.');
      }
    }
    this.panelListeners.forEach((f) => f(id));
  }

  private clickWall(item: keyof typeof WALL_ITEMS): void {
    const act = this.run.act;
    if (item === 'phone') {
      if (this.phoneRinging) this.answerPhone();
      else {
        Sound.click(0.5);
        this.toast(act === 1 ? 'The emergency phone. A dial tone.' : act === 2 ? 'The emergency phone. A dial tone, and under it, breathing.' : 'The phone is dead. It is still warm.');
      }
    } else if (item === 'log') {
      this.openLogbook?.();
    } else if (item === 'cert') {
      this.toast(
        act === 1 ? 'CERTIFICATE OF INSPECTION. Carrow & Sons. Inspected Nov 9, 2026. Capacity 8 persons. Signed: illegible.'
          : act === 2 ? 'CERTIFICATE OF INSPECTION. Carrow & Sons. Inspected Nov 9, 1979. Inspector: W. Imrie. That is not what it said before.'
            : 'CERTIFICATE OF INSPECTION. Inspected: tonight. Capacity: everyone. Signed in your handwriting.',
        6,
      );
    } else if (item === 'clock') {
      this.toast(act < 3 ? `The clock says ${clockText(this.clockMin)}.` : `The clock says ${clockText(this.clockMin)}. Its hands are going the wrong way.`);
    } else if (item === 'plaque') {
      this.toast(act < 3 ? 'CARROW & SONS ELEVATOR CO. 1931. CAPACITY 8 PERSONS.' : 'CARROW & SONS ELEVATOR CO. 1931. CAPACITY 13 PERSONS.');
    }
  }

  private hotkey(e: InputEvent & { type: 'key' }): boolean {
    const k = e.key.toLowerCase();
    const map: Record<string, string> = {
      '1': 'f1', '2': 'f2', '3': 'f3', '4': 'f4', '5': 'f5', '6': 'f6', '7': 'f7', '8': 'f8', '9': 'f9', '0': 'f10', '-': 'f11', '=': 'f12',
      b: 'f0', t: 'f-1', o: 'open', c: 'close', a: 'alarm', k: 'key',
    };
    if (this.dlg.choice) return false;
    if (map[k]) {
      this.pressButton(map[k]);
      return true;
    }
    if (k === 'p') { this.clickWall('phone'); return true; }
    if (k === 'l' || e.key === 'Tab') { this.openLogbook?.(); return true; }
    return false;
  }

  private moveCursor(dx: number, dy: number): void {
    let r = BUTTON_GRID.findIndex((row) => row.includes(this.cursor));
    let c = r >= 0 ? BUTTON_GRID[r].indexOf(this.cursor) : 0;
    if (r < 0) r = 5;
    r = (r + dy + BUTTON_GRID.length) % BUTTON_GRID.length;
    c = (c + dx + 2) % 2;
    this.cursor = BUTTON_GRID[r][c];
    Sound.click(1.6);
  }

  update(dtReal: number, events: InputEvent[]): void {
    const dt = dtReal * this.timeScale;
    // Input
    if (this.actCard) {
      for (const e of events) {
        if ((e.type === 'down' || (e.type === 'key' && (e.key === 'Enter' || e.key === ' '))) && this.actCard.t > 1.2) this.actCard.t = Math.max(this.actCard.t, 4.2);
      }
    } else {
      this.handleInput(events);
    }
    if (Input.mouseActive) {
      this.keyboardMode = false;
      const overBtn = BUTTONS.some((b) => inRect(Input.mx, Input.my, { x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 4 }));
      const overWall = (Object.keys(WALL_ITEMS) as (keyof typeof WALL_ITEMS)[]).some((k) => inRect(Input.mx, Input.my, wallItemHit(k)));
      const overChoice = this.dlg.hover(Input.mx, Input.my);
      Input.setCursor(overBtn || overWall || overChoice ? 'pointer' : 'default');
    }

    this.t += dt;
    // Act card timing
    if (this.actCard) {
      this.actCard.t += dtReal;
      if (this.actCard.t > 5) this.actCard = null;
    }
    this.car.update(dt);
    this.updateActors(dt);
    this.dlg.update(dtReal, this.bot ? 8 : 1);
    if (this.toastT > 0) this.toastT -= dtReal;
    if (this.pressedT > 0) {
      this.pressedT -= dtReal;
      if (this.pressedT <= 0) this.pressed = null;
    }
    // clock
    const nextSlot = this.slotTime(this.run.index + 1);
    if (!this.finale) this.clockMin = Math.min(nextSlot - 0.5, this.clockMin + dt * 0.24);
    this.run.playSeconds += dtReal;

    // light
    let target = this.baseLight;
    if (this.flickerT > 0) {
      this.flickerT -= dt;
      const s = Save.settings.reduceFlashing ? this.flickerStrength * 0.4 : this.flickerStrength;
      if (Math.random() < (Save.settings.reduceFlashing ? 0.08 : 0.3)) this.light = 1 - Math.random() * s;
      target = this.light;
    }
    if (this.outT > 0) {
      this.outT -= dt;
      target = 0.04;
    }
    if (this.flickerT <= 0) this.light += (target - this.light) * Math.min(1, dt * 10);
    else this.light = target;
    Sound.setBuzz(this.flickerT > 0 ? 1 - this.light : 0);
    this.gapGlow = Math.max(0, this.gapGlow - dt * 3);
    if (this.shakeT > 0) this.shakeT -= dtReal;
    if (this.scareT > 0) this.scareT -= dtReal;

    // dial
    const goalDial = this.fallPos ?? this.car.pos;
    this.dialDisplay += (goalDial - this.dialDisplay) * Math.min(1, dt * 8);
    if (this.dialTwitch > 0) this.dialTwitch -= dt;
    if (this.falling > 0 && this.fallPos !== null) {
      const before = this.fallPos;
      this.fallPos -= dt * this.falling;
      if (Math.floor(before) !== Math.floor(this.fallPos)) {
        this.gapGlow = 1;
        Sound.click(0.4);
      }
      if (this.fallPos < -1.4) this.fallPos = 12.4;
      Sound.setMotor(0.85, 1);
    }

    // rain when the lobby doors are visible
    const rain = this.car.door > 0.2 && this.car.floor === 1 ? 1 : 0;
    if ((rain > 0) !== this.rainVisible) {
      this.rainVisible = rain > 0;
      Sound.setRain(rain);
    }

    // ambient anomalies
    if (this.ambientOn && !this.finale && !this.actCard) ambientTick(this, dt);

    // waits
    if (this.waits.length) {
      const ready: Wait[] = [];
      const keep: Wait[] = [];
      for (const w of this.waits) {
        if (w.pred()) ready.push(w);
        else if (this.t >= w.deadline) {
          w.resolve(false);
        } else keep.push(w);
      }
      this.waits = keep;
      for (const w of ready) w.resolve(true);
    }
    if (this.bot) this.botTick(dt);
  }

  private handleInput(events: InputEvent[]): void {
    for (const e of events) {
      if (e.type === 'key' && e.key === 'Escape') {
        this.openPause?.();
        return;
      }
      if (this.dlg.handle(e, Input.mx, Input.my)) continue;
      if (e.type === 'key') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          this.keyboardMode = true;
          this.moveCursor(e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0, e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0);
          continue;
        }
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          if (this.keyboardMode) this.pressButton(this.cursor);
          continue;
        }
        this.hotkey(e);
      } else if (e.type === 'down') {
        const b = BUTTONS.find((x) => inRect(e.x, e.y, { x: x.x - 2, y: x.y - 2, w: x.w + 4, h: x.h + 4 }));
        if (b) {
          this.cursor = b.id;
          this.pressButton(b.id);
          continue;
        }
        const item = (Object.keys(WALL_ITEMS) as (keyof typeof WALL_ITEMS)[]).find((k) => inRect(e.x, e.y, wallItemHit(k)));
        if (item) {
          this.clickWall(item);
          continue;
        }
        if (this.dlg.line) this.dlg.advance();
      }
    }
  }

  private updateActors(dt: number): void {
    for (const a of this.actors) {
      if (a.follow) {
        const tx = a.follow.x + 16, ty = a.follow.y + 2;
        if (Math.abs(tx - a.x) + Math.abs(ty - a.y) > 2) {
          a.path = [{ x: tx, y: ty }];
        }
      }
      if (a.path.length) {
        const p = a.path[0];
        const dx = p.x - a.x, dy = p.y - a.y;
        const d = Math.hypot(dx, dy);
        const step = a.speed * dt;
        if (d <= step) {
          a.x = p.x;
          a.y = p.y;
          a.path.shift();
        } else {
          a.x += (dx / d) * step;
          a.y += (dy / d) * step;
        }
        a.frameT += dt;
        if (a.frameT > 0.16) {
          a.frameT = 0;
          a.frame = a.frame === 1 ? 2 : 1;
          if (!a.dog) Sound.step(a.y > 176 ? 0.05 : 0.025);
        }
      } else {
        a.frame = 0;
      }
    }
  }

  // ------------------------------------------------------------------ bot (automated playtesting)
  private botTick(dt: number): void {
    const b = this.bot!;
    b.t -= dt;
    if (b.t > 0) return;
    b.t = 0.35;
    if (this.actCard) return;
    if (this.dlg.choice) {
      const act = this.botAction();
      this.dlg.pick(act?.choose ?? 0);
      return;
    }
    if (this.dlg.waiting) {
      this.dlg.advance();
      return;
    }
    const act = this.botAction();
    if (!act) {
      // Rule five: cancel buttons the car pressed itself.
      if (!b.policy.has('obey')) for (const f of this.car.selfLit) { this.pressButton(`f${f}`); return; }
      if (this.car.calls.size) {
        const f = [...this.car.calls][0];
        if (!this.car.lit.has(f)) this.pressButton(`f${f}`);
      }
      return;
    }
    if (act.phone && this.phoneRinging) this.answerPhone();
    if (act.close && this.car.doorState !== 'closed' && this.car.doorState !== 'closing') this.pressButton('close');
    if (act.open) this.pressButton('open');
    if (act.key) this.pressButton('key');
    if (act.press !== undefined) {
      const f = act.press;
      const here = this.car.atFloor && this.car.floor === f && this.car.doorState !== 'closed';
      if (this.finale) {
        if (!this.pressed) this.pressButton(`f${f}`);
      } else if (!this.car.lit.has(f) && !here && !(this.car.atFloor && this.car.floor === f && this.car.doorState === 'opening')) {
        this.pressButton(`f${f}`);
      }
    }
    if (!b.policy.has('obey')) for (const f of this.car.selfLit) if (f !== act.press) { this.pressButton(`f${f}`); break; }
  }

  private botAction(): BotAction | null {
    const h = this.hint;
    if (!h) return null;
    if (h.key && h.bad && this.bot!.policy.has(h.key)) return h.bad;
    return h.good;
  }

  // ------------------------------------------------------------------ rendering
  render(main: CanvasRenderingContext2D): void {
    const shake = this.shakeT > 0 ? this.shakeAmt * (this.shakeT > 0.2 ? 1 : this.shakeT / 0.2) : this.car.moving ? 0.35 : 0;
    const sx = Math.round((Math.random() - 0.5) * 2 * shake);
    const sy = Math.round((Math.random() - 0.5) * 2 * shake);
    main.save();
    main.translate(sx, sy);

    // 1. the hallway behind the doors
    if (this.car.door > 0.001 && this.car.atFloor) {
      const spec = this.hallSpecFor(this.car.floor);
      main.drawImage(hallway(spec), DOOR.x, DOOR.y);
      main.save();
      main.beginPath();
      main.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
      main.clip();
      const hallActors = this.actors.filter((a) => a.y <= 176).sort((a, b) => a.y - b.y);
      for (const a of hallActors) this.drawActor(main, a);
      if (this.car.floor === 1 && spec.variant === 'normal') this.drawRain(main);
      main.restore();
    } else {
      rect(main, DOOR.x, DOOR.y, DOOR.w, DOOR.h, C.void);
    }

    // 2. the car, on its own layer so it can be lit separately
    const [cab, cctx] = this.cabLayer;
    cctx.clearRect(0, 0, W, H);
    drawDoors(cctx, this.car.door, this.run.handprints, this.gapGlow);
    cctx.drawImage(cabShell(), 0, 0);
    drawCeilingLamp(cctx, this.light);
    let dialPos = this.dialDisplay;
    if (this.dialTwitch > 0) dialPos = -1 + Math.sin(this.t * 40) * 0.1;
    drawDial(cctx, dialPos, this.fallPos !== null ? -1 : this.car.moving ? this.car.dir : 0, this.run.revealB, this.run.reveal13, this.light);
    drawPanel(cctx, {
      lit: this.car.lit, calls: this.car.calls, selfLit: this.car.selfLit, revealB: this.run.revealB, reveal13: this.run.reveal13,
      cursor: this.keyboardMode ? this.cursor : null, pressed: this.pressed, hasKey: this.run.hasKey,
      keyTurned: this.ending === 'true' || this.ending === 'between', dark: this.panelDark, swapLabels: this.swapLabels, t: this.t, finale: this.finale,
    });
    this.drawWallItems(cctx);
    const cabActors = this.actors.filter((a) => a.y > 176).sort((a, b) => a.y - b.y);
    for (const a of cabActors) this.drawActor(cctx, a);
    // lighting
    const dark = Math.min(0.92, (1 - this.light) * 0.9 + 0.08 + (this.run.act - 1) * 0.04);
    cctx.globalCompositeOperation = 'source-atop';
    cctx.fillStyle = `rgba(6,4,8,${dark.toFixed(2)})`;
    cctx.fillRect(0, 0, W, H);
    cctx.globalCompositeOperation = 'source-over';
    // emissive bits survive the dark
    if (this.light < 0.6) this.drawEmissive(cctx);
    main.drawImage(cab, 0, 0);
    main.drawImage(vignetteImg(), 0, 0);
    if (this.scareT > 0) this.drawScare(main);
    main.restore();

    this.drawHud(main);
    this.dlg.render(main, this.t);
    if (this.actCard) this.drawActCard(main);
  }

  private drawActor(ctx: CanvasRenderingContext2D, a: Actor): void {
    if (a.hidden) return;
    ctx.globalAlpha = a.alpha;
    if (a.dog) {
      const img = dogSprite(a.frame, a.path.length ? a.path[0].x < a.x : true, a.look?.tint);
      ctx.drawImage(img, Math.round(a.x - 12), Math.round(a.y - 15));
    } else if (a.look) {
      const depth = Math.max(0, Math.min(1, (a.y - HALL_Y) / (CAB_Y - HALL_Y)));
      const img = sprite(a.look, a.facing, a.frame, a.face, 1 + depth * 0.3);
      ctx.drawImage(img, Math.round(a.x - SPRITE_W / 2), Math.round(a.y - img.height + 2));
    }
    ctx.globalAlpha = 1;
  }

  private drawRain(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(143,176,212,0.5)';
    for (let i = 0; i < 10; i++) {
      const x = DOOR.x + 42 + ((i * 17 + Math.floor(this.t * 60) * 3) % 44);
      const y = DOOR.y + 20 + ((i * 29 + Math.floor(this.t * 200)) % 52);
      ctx.fillRect(x, y, 1, 3);
    }
  }

  private drawWallItems(ctx: CanvasRenderingContext2D): void {
    const m = Math.floor(this.clockMin);
    const back = this.run.act >= 3;
    if (!this.clockCache || this.clockCache.m !== m) this.clockCache = { m, img: clockImg(back ? 4 * 60 - m * 3 : SHIFT_START_MIN + m, back) };
    const w = WALL_ITEMS;
    wallBlit(ctx, this.clockCache.img, w.clock.side, w.clock.x0, w.clock.x1, w.clock.v0, w.clock.v1);
    wallBlit(ctx, certImg(this.run.act), w.cert.side, w.cert.x0, w.cert.x1, w.cert.v0, w.cert.v1);
    wallBlit(ctx, phoneImg(this.phoneRinging, this.t), w.phone.side, w.phone.x0, w.phone.x1, w.phone.v0, w.phone.v1);
    wallBlit(ctx, logImg(), w.log.side, w.log.x0, w.log.x1, w.log.v0, w.log.v1);
    wallBlit(ctx, plaqueImg(this.run.act), w.plaque.side, w.plaque.x0, w.plaque.x1, w.plaque.v0, w.plaque.v1);
  }

  private drawEmissive(ctx: CanvasRenderingContext2D): void {
    for (const b of BUTTONS) {
      if (b.floor !== undefined && (this.car.lit.has(b.floor) || this.car.calls.has(b.floor))) {
        rect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, C.amber);
      }
      if (this.finale && (b.floor === 1 || b.floor === -1)) rect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, b.floor === -1 ? C.red3 : C.amber);
    }
    if (this.phoneRinging && Math.floor(this.t * 6) % 2 === 0) rect(ctx, 46, 112, 2, 2, C.amber);
  }

  private drawScare(ctx: CanvasRenderingContext2D): void {
    const k = this.scareT / 0.75;
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.drawImage(scareImg(this.scareKind), Math.round(W / 2 - 64 + (Math.random() - 0.5) * 6), Math.round(H / 2 - 76 + (Math.random() - 0.5) * 6));
    ctx.globalAlpha = 1;
    if (!Save.settings.reduceFlashing && Math.random() < 0.3) {
      ctx.fillStyle = 'rgba(120,10,10,0.25)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    const time = clockText(this.clockMin);
    rect(ctx, 3, 3, textWidth(BIG, time) + 8, 11, 'rgba(5,4,7,0.7)');
    drawText(ctx, BIG, time, 7, 5, this.run.act >= 3 ? C.red3 : C.amber);
    const actLabel = ['', 'I', 'II', 'III'][this.run.act] ?? '';
    drawText(ctx, TINY, `ACT ${actLabel}`, 7, 17, C.steel2);
    // logbook hint
    if (this.run.index === 0 && !this.dlg.busy && this.t < 400) {
      // nothing; Pruitt explains
    }
    if (this.toastT > 0 && this.toastText.length) {
      const a = Math.min(1, this.toastT * 2);
      ctx.globalAlpha = a;
      const w = Math.max(...this.toastText.map((l) => textWidth(BIG, l))) + 12;
      const h = this.toastText.length * 10 + 6;
      const x = Math.round(W / 2 - w / 2);
      rect(ctx, x, 20, w, h, 'rgba(9,8,12,0.92)');
      rect(ctx, x, 20, w, 1, C.steel1);
      rect(ctx, x, 20 + h - 1, w, 1, C.steel1);
      this.toastText.forEach((l, i) => drawText(ctx, BIG, l, x + 6, 23 + i * 10, C.cream2));
      ctx.globalAlpha = 1;
    }
    if (this.bot) drawText(ctx, TINY, `BOT ${[...this.bot.policy].join(',') || 'GOOD'} X${this.timeScale}`, 300, 4, C.steel2);
  }

  private drawActCard(ctx: CanvasRenderingContext2D): void {
    const t = this.actCard!.t;
    const a = t < 0.8 ? t / 0.8 : t > 4.2 ? Math.max(0, (5 - t) / 0.8) : 1;
    ctx.fillStyle = `rgba(5,4,7,${Math.min(1, a * 1.2)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    const act = this.actCard!.act;
    const titles = ['', 'ROUTINE', 'DRIFT', 'DESCENT'];
    const subs = ['', 'Night shift, the Marlowe Apartments.', 'Some floors are not where you left them.', "The elevator doesn't stop."];
    drawTextCentered(ctx, BIG, `ACT ${['', 'I', 'II', 'III'][act]}`, W / 2, 78, C.steel3, 1);
    drawTextCentered(ctx, BIG, titles[act], W / 2, 92, act === 3 ? C.red3 : C.amber, 2, C.void);
    drawTextCentered(ctx, BIG, subs[act], W / 2, 120, C.cream1);
    drawTextCentered(ctx, BIG, clockText(this.slotTime(this.run.index)), W / 2, 136, C.steel2);
    ctx.globalAlpha = 1;
  }
}

const SHIFT_START_MIN = 23 * 60;

const scareCache = new Map<string, HTMLCanvasElement>();
function scareImg(kind: ScareKind): HTMLCanvasElement {
  let c = scareCache.get(kind);
  if (c) return c;
  const [cv, ctx] = canvas(128, 152);
  const skin = kind === 'water' ? '#8a9a9a' : kind === 'double' ? '#d9a98a' : '#b9b4ac';
  ellipse(ctx, 64, 80, 46, 64, skin);
  dither(ctx, 18, 16, 92, 128, 'rgba(10,8,12,0.5)', 0.25);
  // hollow eyes
  ellipse(ctx, 44, 68, 10, 12, C.void);
  ellipse(ctx, 84, 68, 10, 12, C.void);
  if (kind === 'double') {
    rect(ctx, 41, 66, 3, 3, C.white);
    rect(ctx, 81, 66, 3, 3, C.white);
    rect(ctx, 22, 8, 84, 22, C.red1);
    rect(ctx, 22, 28, 84, 6, C.brass2);
  }
  // mouth
  ellipse(ctx, 64, 116, kind === 'double' ? 28 : 14, kind === 'double' ? 6 : 18, C.void);
  if (kind === 'double') for (let x = 40; x < 90; x += 5) rect(ctx, x, 112, 3, 4, C.white);
  if (kind === 'water') for (let i = 0; i < 30; i++) rect(ctx, 20 + ((i * 37) % 90), 20 + ((i * 53) % 120), 1, 4 + (i % 5), '#2a3a40');
  // hair
  if (kind !== 'double') for (let i = 0; i < 40; i++) rect(ctx, 18 + i * 2.3, 14 + ((i * 7) % 10), 2, 30 + ((i * 13) % 40), C.void);
  c = cv;
  scareCache.set(kind, c);
  return c;
}

export { PANEL };
