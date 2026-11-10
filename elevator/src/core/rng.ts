// Small seeded RNG (mulberry32) so a run's encounters can be rebuilt from its seed.
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** Picks n distinct items by weight. */
  weighted<T extends { weight?: number }>(items: T[], n: number): T[] {
    const pool = items.slice();
    const out: T[] = [];
    while (out.length < n && pool.length) {
      const total = pool.reduce((s, it) => s + (it.weight ?? 1), 0);
      let r = this.next() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= pool[idx].weight ?? 1;
        if (r <= 0) break;
      }
      idx = Math.min(idx, pool.length - 1);
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return out;
  }
}

/** Unseeded helper for cosmetic randomness. */
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const randi = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));
