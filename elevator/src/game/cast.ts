// The people of the Marlowe. Looks are fed to the procedural sprite renderer.
import { C } from '../art/palette';
import type { Look } from '../art/character';

const SKIN = {
  pale: '#e8c8b0', fair: '#d9a98a', tan: '#c08a64', olive: '#a87452', brown: '#7e5236', deep: '#5a3824', ash: '#b9b4ac',
};

export const LOOKS: Record<string, Look> = {
  pruitt: {
    h: 98, build: 28, skin: SKIN.fair, hair: C.steel3, hairStyle: 'short', hat: 'workcap', mustache: true,
    top: '#2f3f5a', topStyle: 'jacket', accent: '#5a6a7a', bottom: '#3a3326', bottomStyle: 'pants', shoes: C.wood1, prop: 'toolbox',
  },
  dev: {
    h: 92, skin: SKIN.brown, hair: '#1a1214', hairStyle: 'bun',
    top: '#3a7a78', topStyle: 'scrubs', bottom: '#3a7a78', bottomStyle: 'pants', shoes: C.white, prop: 'tote',
  },
  halloran: {
    h: 82, build: 22, skin: '#e2bba4', hair: '#e6e2dc', hairStyle: 'curly',
    top: '#5e2a4c', topStyle: 'coat', accent: '#3a1830', bottom: '#5e2a4c', bottomStyle: 'none', shoes: '#2a1a14', stockings: '#b49a84', prop: 'cakeTin',
  },
  okafor: {
    h: 102, build: 26, skin: SKIN.deep, hair: '#141012', hairStyle: 'short', glasses: true,
    top: '#6a4a2a', topStyle: 'coat', accent: '#d8cba0', bottom: '#2a2420', bottomStyle: 'pants', shoes: C.ink,
  },
  tommy: {
    h: 62, skin: SKIN.tan, hair: '#3a2416', hairStyle: 'kid',
    top: '#a83a2e', topStyle: 'stripes', accent: '#e8dcc0', bottom: '#4a5a7a', bottomStyle: 'shorts', shoes: '#e0d8c8', prop: 'leash', stockings: SKIN.tan,
  },
  marisol: {
    h: 90, skin: SKIN.olive, hair: '#24140e', hairStyle: 'long',
    top: '#9a2a34', topStyle: 'dress', bottom: '#9a2a34', bottomStyle: 'none', shoes: C.ink, stockings: '#3a2420', prop: 'bag',
  },
  ben: {
    h: 98, skin: SKIN.fair, hair: '#c8a050', hairStyle: 'short',
    top: '#3e5778', topStyle: 'jacket', accent: '#d8d0c0', bottom: '#2a2a34', bottomStyle: 'pants', shoes: '#4a2a1a',
  },
  lucy: {
    h: 90, skin: '#e9dccf', hair: '#0f0b10', hairStyle: 'long',
    top: '#e0dcd0', topStyle: 'nightgown', bottom: '#e0dcd0', bottomStyle: 'none', shoes: C.ink, barefoot: true,
  },
  grayman: {
    h: 100, build: 24, skin: '#c9c2b8', hair: '#3a3a40', hairStyle: 'slick',
    top: '#5a5c62', topStyle: 'suit', accent: '#3a3c42', bottom: '#5a5c62', bottomStyle: 'pants', shoes: C.ink,
  },
  courier: {
    h: 94, skin: SKIN.olive, hair: '#1a1210', hairStyle: 'short', hat: 'cap',
    top: '#2a3a2a', topStyle: 'hoodie', bottom: '#2a2a2a', bottomStyle: 'pants', shoes: C.white, prop: 'pizza',
  },
  walter: {
    h: 96, build: 25, skin: '#d4a88c', hair: '#d8d4cc', hairStyle: 'short', hat: 'operator', mustache: true,
    top: '#6e1f22', topStyle: 'uniform', bottom: '#241c1c', bottomStyle: 'pants', shoes: C.ink, prop: 'logbook',
  },
  double: {
    h: 96, build: 25, skin: SKIN.fair, hair: '#2a1c14', hairStyle: 'short', hat: 'operator',
    top: '#6e1f22', topStyle: 'uniform', bottom: '#241c1c', bottomStyle: 'pants', shoes: C.ink, prop: 'logbook',
  },
  ruth: {
    h: 80, skin: '#e2bba4', hair: '#d8d0c8', hairStyle: 'bun',
    top: '#3a5a6a', topStyle: 'cardigan', accent: '#d8cba0', bottom: '#4a4038', bottomStyle: 'skirt', shoes: C.ink, stockings: '#b49a84',
  },
  mina: {
    h: 90, skin: SKIN.deep, hair: '#141012', hairStyle: 'bob',
    top: '#c8a050', topStyle: 'dress', bottom: '#c8a050', bottomStyle: 'none', shoes: C.ink, stockings: SKIN.deep,
  },
  tommyMom: {
    h: 90, skin: SKIN.tan, hair: '#2a1a10', hairStyle: 'bob',
    top: '#e0dcd0', topStyle: 'cardigan', accent: '#6a8aa0', bottom: '#2a3a5a', bottomStyle: 'pants', shoes: C.ink,
  },
  dayop: {
    h: 90, skin: '#c08a64', hair: '#3a2416', hairStyle: 'bob',
    top: '#b08a3a', topStyle: 'coat', accent: '#3a2a12', bottom: '#2a2a34', bottomStyle: 'pants', shoes: C.ink, prop: 'umbrella',
  },
};

const CROWD_TOPS = ['#3a3630', '#2e3238', '#3c2e2a', '#30342c', '#3a3238'];
export function crowdLook(i: number): Look {
  return {
    h: 92 + ((i * 7) % 10), skin: '#b8b0a6', hair: '#1e1a1c', hairStyle: i % 2 ? 'short' : 'bob',
    top: CROWD_TOPS[i % CROWD_TOPS.length], topStyle: 'coat', bottom: '#222', bottomStyle: 'pants', shoes: C.ink,
  };
}

for (let i = 0; i < 4; i++) LOOKS[`crowd${i}`] = crowdLook(i);

export const NAMES: Record<string, string> = {
  pruitt: 'Pruitt', dev: 'Dev', halloran: 'Mrs. Halloran', okafor: 'Mr. Okafor', tommy: 'Tommy',
  marisol: 'Marisol', ben: 'Ben', lucy: 'The woman', grayman: 'The man in gray', courier: 'Courier',
  walter: 'Walter', double: '???', ruth: 'Ruth', mina: 'Mina', tommyMom: 'Mrs. Reyes', dayop: 'Day operator', dog: 'Biscuit',
  crowd0: '—', crowd1: '—', crowd2: '—', crowd3: '—',
};

/** Speaking pitch for text blips. */
export const VOICE: Record<string, number> = {
  pruitt: 150, dev: 330, halloran: 420, okafor: 170, tommy: 520, marisol: 360, ben: 210, lucy: 300,
  grayman: 120, courier: 240, walter: 140, double: 200, ruth: 400, mina: 340, tommyMom: 360, phone: 180, you: 260,
};
