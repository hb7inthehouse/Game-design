// Persistent data in localStorage: settings, unlocked endings, stats and a mid-shift checkpoint.
const KEY = 'eds.save.v1';

export interface Settings {
  master: number;
  sfx: number;
  ambience: number;
  textSpeed: number; // 0 slow, 1 normal, 2 fast, 3 instant
  crt: boolean;
  reduceFlashing: boolean;
  jumpscares: boolean;
  screenShake: boolean;
}

export interface Checkpoint {
  version: number;
  run: unknown;
  savedAt: number;
}

export interface SaveData {
  settings: Settings;
  endings: string[];
  shifts: number;
  finished: number;
  checkpoint: Checkpoint | null;
  bestDelivered: number;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  sfx: 0.9,
  ambience: 0.8,
  textSpeed: 1,
  crt: true,
  reduceFlashing: false,
  jumpscares: true,
  screenShake: true,
};

function fresh(): SaveData {
  return { settings: { ...DEFAULT_SETTINGS }, endings: [], shifts: 0, finished: 0, checkpoint: null, bestDelivered: 0 };
}

let data: SaveData = load();

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = fresh();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      endings: Array.isArray(parsed.endings) ? parsed.endings : [],
    };
  } catch {
    return fresh();
  }
}

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable (private mode); the game still runs */
  }
}

export const Save = {
  get data(): SaveData {
    return data;
  },
  get settings(): Settings {
    return data.settings;
  },
  write: save,
  unlockEnding(id: string): boolean {
    if (data.endings.includes(id)) return false;
    data.endings.push(id);
    save();
    return true;
  },
  setCheckpoint(run: unknown): void {
    data.checkpoint = { version: 1, run: JSON.parse(JSON.stringify(run)), savedAt: Date.now() };
    save();
  },
  clearCheckpoint(): void {
    data.checkpoint = null;
    save();
  },
  wipe(): void {
    const settings = data.settings;
    data = fresh();
    data.settings = settings;
    save();
  },
};
