// The car: position, doors, lit buttons, hall calls. Floors: -1 = "13" (below), 0 = B, 1 = L, 2..12.
import { Sound } from '../core/audio';

export const MIN_FLOOR = -1;
export const MAX_FLOOR = 12;

export function floorLabel(f: number): string {
  if (f === -1) return '13';
  if (f === 0) return 'B';
  if (f === 1) return 'L';
  return String(f);
}

export type DoorState = 'closed' | 'opening' | 'open' | 'closing';

export interface ElevatorEvents {
  arrive?: (floor: number) => void;
  opened?: (floor: number) => void;
  closed?: (floor: number) => void;
  depart?: (floor: number) => void;
  pass?: (floor: number) => void;
  refused?: (reason: string) => void;
}

export class Elevator {
  pos = 1;
  speed = 0;
  dir = 0;
  target: number | null = null;
  door = 0;
  doorState: DoorState = 'closed';
  lit = new Set<number>();
  selfLit = new Set<number>();
  calls = new Set<number>();
  /** Script holds: while >0 doors cannot close. */
  holdOpen = 0;
  /** While >0 doors refuse to open. */
  lockShut = 0;
  /** When >0 the car will not start moving (passengers boarding etc). */
  freeze = 0;
  maxSpeed = 0.95;
  accel = 1.4;
  /** Floors the car will sail past once before coming back. */
  passOnce = new Map<number, number>();
  private openDelay = -1;
  private closeDelay = -1;
  private bounceTarget: number | null = null;
  movedSinceOpen = false;
  lastStopFloor = 1;
  idleTime = 0;
  corrupt = 0;
  enabled = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  ev: ElevatorEvents = {};

  get floor(): number {
    return Math.round(this.pos);
  }

  get moving(): boolean {
    return this.target !== null && this.doorState === 'closed' && this.speed > 0.001;
  }

  get atFloor(): boolean {
    return Math.abs(this.pos - Math.round(this.pos)) < 0.001 && this.target === null;
  }

  pressFloor(f: number, bySelf = false): void {
    if (!this.enabled.has(f)) {
      this.ev.refused?.('disabled');
      return;
    }
    if (!bySelf && this.lit.has(f)) {
      // Pressing a lit button again cancels it (Walter's rule five).
      if (this.target === f && this.moving) {
        // Stop at the next floor in the direction of travel instead.
        const next = this.dir > 0 ? Math.ceil(this.pos + 0.05) : Math.floor(this.pos - 0.05);
        this.lit.delete(f);
        this.selfLit.delete(f);
        this.target = Math.max(MIN_FLOOR, Math.min(MAX_FLOOR, next));
        this.lit.add(this.target);
      } else {
        this.lit.delete(f);
        this.selfLit.delete(f);
      }
      return;
    }
    if (this.atFloor && this.floor === f && !bySelf) {
      this.openDoors();
      return;
    }
    this.lit.add(f);
    if (bySelf) this.selfLit.add(f);
    else this.selfLit.delete(f);
    if (this.doorState === 'open' || this.doorState === 'opening') this.closeDelay = 0.35;
  }

  openDoors(): boolean {
    if (!this.atFloor || this.lockShut > 0) {
      if (this.lockShut > 0) this.ev.refused?.('locked');
      return false;
    }
    if (this.doorState === 'closed' || this.doorState === 'closing') {
      this.doorState = 'opening';
      this.closeDelay = -1;
      Sound.door(true);
    }
    return true;
  }

  closeDoors(): boolean {
    if (this.holdOpen > 0) {
      this.ev.refused?.('held');
      return false;
    }
    if (this.doorState === 'open' || this.doorState === 'opening') {
      this.doorState = 'closing';
      Sound.door(false);
    }
    return true;
  }

  /** Teleport (used when restoring a checkpoint). */
  place(f: number): void {
    this.pos = f;
    this.target = null;
    this.speed = 0;
    this.door = 0;
    this.doorState = 'closed';
    this.lit.clear();
    this.selfLit.clear();
    this.lastStopFloor = f;
  }

  private chooseTarget(): number | null {
    if (this.lit.size === 0) return null;
    let best: number | null = null;
    let bestD = Infinity;
    for (const f of this.lit) {
      const d = Math.abs(f - this.pos);
      // prefer continuing in the same direction
      const penalty = this.dir !== 0 && Math.sign(f - this.pos) !== this.dir ? 0.5 : 0;
      if (d + penalty < bestD) {
        bestD = d + penalty;
        best = f;
      }
    }
    return best;
  }

  update(dt: number): void {
    // Doors
    if (this.doorState === 'opening') {
      this.door = Math.min(1, this.door + dt / 0.9);
      if (this.door >= 1) {
        this.doorState = 'open';
        this.movedSinceOpen = false;
        this.ev.opened?.(this.floor);
      }
    } else if (this.doorState === 'closing') {
      if (this.holdOpen > 0) {
        this.doorState = 'opening';
      } else {
        this.door = Math.max(0, this.door - dt / 0.9);
        if (this.door <= 0) {
          this.doorState = 'closed';
          this.ev.closed?.(this.floor);
        }
      }
    }
    // Other floors are waiting: close up on our own after a while.
    if (this.doorState === 'open' && this.closeDelay < 0 && [...this.lit].some((f) => f !== this.floor)) this.closeDelay = 5;
    if (this.closeDelay >= 0 && this.doorState === 'open') {
      this.closeDelay -= dt;
      if (this.closeDelay < 0 && this.lit.size > 0 && !(this.lit.size === 1 && this.lit.has(this.floor))) {
        if (this.holdOpen <= 0) this.closeDoors();
        else this.closeDelay = 0.3;
      }
    }
    if (this.openDelay >= 0) {
      this.openDelay -= dt;
      if (this.openDelay < 0) this.openDoors();
    }

    // Movement
    if (this.target === null && this.doorState === 'closed' && this.freeze <= 0 && this.openDelay < 0) {
      const t = this.chooseTarget();
      if (t !== null) {
        if (t === this.pos) {
          this.lit.delete(t);
          this.openDoors();
        } else {
          this.target = t;
          this.dir = Math.sign(t - this.pos);
          this.ev.depart?.(this.floor);
        }
      }
    }
    if (this.target !== null && this.doorState === 'closed') {
      const goal = this.bounceTarget ?? this.target;
      const dist = Math.abs(goal - this.pos);
      const dir = Math.sign(goal - this.pos) || this.dir;
      this.dir = dir;
      const stopDist = (this.speed * this.speed) / (2 * this.accel);
      if (dist <= stopDist + 0.01) this.speed = Math.max(0.12, this.speed - this.accel * dt);
      else this.speed = Math.min(this.maxSpeed, this.speed + this.accel * dt);
      const before = this.pos;
      let step = this.speed * dt * dir;
      if (Math.abs(step) > dist) step = goal - this.pos;
      this.pos += step;
      this.movedSinceOpen = true;
      this.idleTime = 0;
      // passing floors
      const a = Math.min(before, this.pos), b = Math.max(before, this.pos);
      for (let f = Math.ceil(a + 1e-6); f <= Math.floor(b - 1e-6); f++) this.ev.pass?.(f);
      if (Math.abs(goal - this.pos) < 1e-4) {
        this.pos = goal;
        if (this.bounceTarget !== null) {
          this.bounceTarget = null;
          this.dir = Math.sign(this.target - this.pos);
          this.speed = 0.2;
          this.ev.pass?.(goal);
        } else {
          const passes = this.passOnce.get(goal) ?? 0;
          if (passes > 0) {
            // The car doesn't stop. It sails on, then comes back.
            this.passOnce.set(goal, passes - 1);
            this.bounceTarget = Math.max(MIN_FLOOR, Math.min(MAX_FLOOR, goal + (this.dir || 1) * 2));
            if (this.bounceTarget === goal) this.bounceTarget = goal - (this.dir || 1) * 2;
            this.speed = Math.max(this.speed, 0.6);
            this.ev.pass?.(goal);
          } else {
            this.arrive(goal);
          }
        }
      }
    } else if (this.doorState !== 'closed') {
      this.speed = 0;
    }
    if (!this.moving) this.idleTime += dt;
    Sound.setMotor(this.moving ? this.speed / this.maxSpeed : 0, this.corrupt);
  }

  private arrive(f: number): void {
    this.target = null;
    this.speed = 0;
    this.dir = 0;
    this.lit.delete(f);
    this.calls.delete(f);
    this.lastStopFloor = f;
    Sound.ding(this.corrupt);
    this.ev.arrive?.(f);
    this.openDelay = 0.45;
  }

  /** Remove a self-pressed button marker after the car arrives. */
  consumeSelf(f: number): boolean {
    const had = this.selfLit.has(f);
    this.selfLit.delete(f);
    return had;
  }
}
