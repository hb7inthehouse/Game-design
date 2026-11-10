// Everything about one night shift that must survive a reload.
export interface LogEntry {
  t: number; // minutes after 23:00
  text: string;
  kind: 'ride' | 'odd' | 'note';
}

export interface RunState {
  seed: number;
  name: string;
  schedule: string[];
  actOf: number[];
  index: number;
  act: number;
  clock: number;
  floors: { halloran: number; ruth: number; okafor: number; tommy: number; dev: number; couple: number };
  flags: Record<string, boolean | number | string>;
  log: LogEntry[];
  pages: string[];
  carFloor: number;
  revealB: boolean;
  reveal13: boolean;
  hasKey: boolean;
  delivered: string[];
  fed: number;
  obeyed: number;
  doubleIn: boolean;
  handprints: { x: number; y: number; side: 0 | 1; big?: boolean }[];
  rides: number;
  used: string[];
  startedAt: number;
  playSeconds: number;
}

export const SHIFT_START = 23 * 60;
export const SHIFT_LEN = 7 * 60;

export function clockText(min: number): string {
  const m = Math.floor(SHIFT_START + min) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export const NAMEPLATES = (r: RunState): Record<number, string> => ({
  [r.floors.halloran]: 'HALLORAN',
  [r.floors.ruth]: 'PIKE',
  [r.floors.okafor]: 'OKAFOR',
  [r.floors.tommy]: 'REYES',
  [r.floors.dev]: 'NAIR',
});

/** What each ghost remembers about the right door, keyed by floor. */
export const FLOOR_CLUE: Record<number, string> = {
  2: 'the little red tricycle in the hall',
  3: 'the flowers on the hall table',
  4: 'the shoe rack by the door',
  6: 'the bottles lined up by the door',
  7: 'the hall light that never works',
  9: 'the umbrella stand and the picture of the lake',
  11: "the child's drawing of the sun",
};

export interface Page {
  id: string;
  title: string;
  text: string;
}

export const PAGES: Record<string, Page> = {
  pit: {
    id: 'pit',
    title: 'Water-stained page',
    text:
      "NOV 10 1979. 23:00 - Car's singing in the shaft again. Told Pruitt's father. He says the cable will hold till morning.\n05:52 - Mrs. Halloran for her sister's. Down to the lobby for Mr. Okafor and his supper, the Reyes boy and the dog. Four aboard, plus me.\n05:58 -",
  },
  phone: {
    id: 'phone',
    title: 'Page torn from the back',
    text:
      "They keep riding. I keep driving. Somebody has to get them home and I can't remember the floors any more.\nWRITE THE FLOORS DOWN. Whoever you are. The book remembers when you don't.",
  },
  walter: {
    id: 'walter',
    title: "Walter's last page",
    text:
      "If you're reading this, she has a new operator. I'm sorry.\nGet them home first. All of them. Then turn the key. Not before - she has to be empty, or she only starts again.\nShe never wanted to fall. She only wanted someone to tell her she could stop. - W.I.",
  },
  courier: {
    id: 'courier',
    title: 'Receipt, folded in the log',
    text: 'ORDER #1110 - DELIVER TO: W. IMRIE, APT 12F. PAID CASH. DATED NOV 10 1979. Somebody has written across it in pencil: "There is no 12F. There is no F."',
  },
};

export function rulesText(act: number, hasKey: boolean): string[] {
  const rules = [
    '1. Take them where they ask.',
    '2. Never open between floors.',
    act >= 2
      ? '3. Twelve is the top. The lobby is the bottom. There is (crossed out) something below the lobby.'
      : '3. Twelve is the top. The lobby is the bottom. There is nothing below the lobby.',
    "4. If they don't say where, you already know. Check the book.",
    '5. If she presses a button herself, press it again.',
  ];
  if (act >= 2) rules.push("6. Don't let anyone in who is already in. (newer ink)");
  if (act >= 3 || hasKey) rules.push("7. When she won't stop, turn the key. (written so hard it tore the paper)");
  return rules;
}
