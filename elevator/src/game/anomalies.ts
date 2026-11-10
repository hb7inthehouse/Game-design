// Ambient anomalies that drift through the shift between and during encounters.
import { Sound } from '../core/audio';
import type { GameScene } from './scene';

let timer = 0;
let busy = false;

export function resetAmbient(): void {
  timer = 8;
  busy = false;
}

type Ambient = { id: string; act: number; weight: number; run: (g: GameScene) => void | Promise<void> };

const AMBIENTS: Ambient[] = [
  { id: 'flicker', act: 1, weight: 3, run: (g) => g.flicker(0.4 + Math.random() * 0.8, 0.6) },
  { id: 'creak', act: 1, weight: 3, run: () => Sound.creak() },
  { id: 'knock', act: 2, weight: 1, run: () => Sound.knock(2, 0.12) },
  {
    id: 'selfpress', act: 2, weight: 3,
    run: (g) => {
      if (g.car.lit.size > 1 || g.car.selfLit.size) return;
      const options = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((f) => f !== g.car.floor && !g.car.lit.has(f));
      const f = options[Math.floor(Math.random() * options.length)];
      g.car.pressFloor(f, true);
      Sound.click(0.7);
      if (!g.run.flags.selfHint) {
        g.run.flags.selfHint = true;
        g.toast(`The ${f} button lit up by itself. (Pressing a lit button again cancels it.)`, 5);
      }
    },
  },
  { id: 'twitch', act: 2, weight: 2, run: (g) => { g.dialTwitch = 0.6; Sound.click(0.3); } },
  {
    id: 'ring', act: 2, weight: 1,
    run: async (g) => {
      if (g.phoneRinging) return;
      Sound.startRing();
      await g.wait(1.4);
      Sound.stopRing();
    },
  },
  { id: 'whisper', act: 3, weight: 2, run: () => Sound.whisper() },
  {
    id: 'hand', act: 3, weight: 2,
    run: (g) => {
      if (g.run.handprints.length > 7) return;
      g.run.handprints.push({ x: 8 + Math.floor(Math.random() * 44), y: 20 + Math.floor(Math.random() * 70), side: Math.random() < 0.5 ? 0 : 1 });
      Sound.thump(0.18, 70, 0.2, 0.4);
    },
  },
  { id: 'gap', act: 3, weight: 2, run: (g) => { if (!g.car.moving) { g.gapGlow = 1; Sound.click(0.4); } } },
  {
    id: 'dark', act: 3, weight: 1,
    run: async (g) => {
      if (g.actors.length > 1) return;
      const ghost = g.spawn('lucy', { zone: 'cab', slot: 3, facing: 'front', face: 'hollow' });
      ghost.alpha = 0.85;
      await g.lightsOut(1.4);
      g.remove(ghost);
      Sound.stinger(false);
    },
  },
];

export function ambientTick(g: GameScene, dt: number): void {
  if (busy) return;
  timer -= dt;
  if (timer > 0) return;
  const act = g.run.act;
  timer = act === 1 ? 22 + Math.random() * 20 : act === 2 ? 12 + Math.random() * 14 : 8 + Math.random() * 10;
  if (g.dlg.choice) return;
  const pool = AMBIENTS.filter((a) => a.act <= act);
  const total = pool.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  let pick = pool[0];
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) { pick = a; break; }
  }
  const res = pick.run(g);
  if (res instanceof Promise) {
    busy = true;
    void res.then(() => { busy = false; });
  }
}
