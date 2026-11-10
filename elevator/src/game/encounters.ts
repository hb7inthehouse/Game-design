// Every passenger encounter, the run generator, and the finale with its endings.
import type { Rng } from '../core/rng';
import { Sound } from '../core/audio';
import { floorLabel } from './elevator';
import { DOOR_MID } from '../art/cab';
import type { Actor, GameScene, Hint } from './scene';
import { FLOOR_CLUE, type RunState } from './state';
import { LOOKS } from './cast';
import type { Look } from '../art/character';

export interface Encounter {
  id: string;
  title: string;
  run: (g: GameScene) => Promise<void>;
}

const L = floorLabel;

// ------------------------------------------------------------------ helpers
async function pickup(
  g: GameScene, floor: number, ids: string[],
  opts: { face?: 'normal' | 'blank' | 'smile' | 'hollow' | 'closed' | 'sad' | 'wide'; looks?: Record<string, Look> } = {},
): Promise<Actor[]> {
  const r = await g.call(floor);
  const offs = ids.length === 1 ? [0] : ids.map((_, i) => (i - (ids.length - 1) / 2) * 30);
  const side = Math.random() < 0.5 ? -1 : 1;
  const actors = ids.map((id, i) => {
    const a = g.spawn(id, { zone: 'hall', x: DOOR_MID + offs[i], fromSide: r.alreadyOpen ? side : undefined, face: opts.face, look: opts.looks?.[id] });
    if (id === 'dog') { a.y += 1; a.x += 14; }
    return a;
  });
  g.car.holdOpen++;
  await g.opened(floor);
  await g.until(() => actors.every((a) => a.path.length === 0));
  g.car.holdOpen--;
  return actors;
}

function wrongLine(a: Actor, f: number): string {
  const lines: Record<string, string[]> = {
    halloran: ["Oh, no dear, this isn't Ruth's.", 'This one smells wrong. Not here.'],
    okafor: [`Not ${L(f)}. Close, but no.`, "That's not home, Walt."],
    tommy: ["That's not ours.", 'Nope. Not this one.'],
    dev: [`This is ${L(f)}. I'm going to be so late.`],
    pruitt: ['Funny. Twelve, I said.'],
    default: ["This isn't my floor.", 'Not this one.', "I didn't ask for this floor."],
  };
  const arr = lines[a.id] ?? lines.default;
  return arr[Math.floor(Math.random() * arr.length)];
}

interface DeliverOpts {
  ask?: string;
  nag?: string[];
  maxWrong?: number;
  hintKey?: string;
  bad?: number[];
  during?: () => Promise<void>;
  wrong?: (f: number) => Promise<void>;
}

/** Waits until the passenger is taken to `dest`. Handles wrong floors, nagging and the car stopping by itself. */
async function deliver(g: GameScene, a: Actor, dest: number, o: DeliverOpts = {}): Promise<{ ok: boolean; floor: number }> {
  let wrong = 0;
  const setHint = () => {
    const h: Hint = { good: { press: dest } };
    if (o.hintKey && o.bad && o.bad.length) {
      h.key = o.hintKey;
      h.bad = { press: o.bad[wrong % o.bad.length] };
    }
    g.setHint(h);
  };
  setHint();
  let mark = g.mark();
  if (o.ask) await g.say(a, o.ask);
  let done = false;
  // Passengers get impatient, and eventually press it themselves.
  void (async () => {
    let n = 0;
    const nags = o.nag ?? ['...', `${L(dest)}, please.`];
    while (!done) {
      await g.until(() => done || (g.car.idleTime > 16 && g.car.lit.size === 0 && !g.dlg.busy && g.car.doorState !== 'opening'));
      if (done) break;
      n++;
      if (n <= nags.length) await g.say(a, nags[n - 1]);
      else {
        await g.say(a, "I'll get it.", { auto: 1.2 });
        g.car.pressFloor(dest);
      }
      g.car.idleTime = 0;
    }
  })();
  let duringP: Promise<void> = Promise.resolve();
  if (o.during) {
    const during = o.during;
    duringP = (async () => {
      await g.until(() => g.car.moving);
      await during();
    })();
  }
  try {
    for (;;) {
      const seqBefore = g.arriveSeq;
      const f = await g.nextStop(Infinity, mark);
      mark = g.mark();
      if (f === null) continue;
      if (g.lastSelfArrive > seqBefore) {
        await g.say(a, g.rng.pick(["We're not there yet.", 'Why did it stop here?', "Nobody pressed that."]));
        continue;
      }
      if (f === dest) {
        await duringP;
        return { ok: true, floor: f };
      }
      wrong++;
      if (o.maxWrong !== undefined && wrong > o.maxWrong) {
        await duringP;
        return { ok: false, floor: f };
      }
      if (o.wrong) await o.wrong(f);
      else await g.say(a, wrongLine(a, f));
      setHint();
    }
  } finally {
    done = true;
    g.setHint(null);
  }
}

/** Make sure the doors are shut (closing them ourselves if the player doesn't). */
async function shut(g: GameScene): Promise<void> {
  if (g.car.doorState === 'closed') return;
  g.setHint({ good: { close: true } });
  const ok = await g.until(() => g.car.doorState === 'closed' || g.car.doorState === 'closing', 7);
  g.setHint(null);
  if (!ok) g.car.closeDoors();
  await g.closed();
}

async function enterAll(g: GameScene, actors: Actor[], slots: number[]): Promise<void> {
  let si = 0;
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    if (a.dog) continue;
    const dog = actors[i + 1]?.dog ? actors[i + 1] : undefined;
    await g.enter(a, slots[si++], dog);
  }
}

function homeOf(g: GameScene, who: 'halloran' | 'ruth' | 'okafor' | 'tommy' | 'dev' | 'couple'): number {
  return g.run.floors[who];
}

function randomFloor(g: GameScene, avoid: number[] = []): number {
  const opts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((f) => !avoid.includes(f) && f !== g.car.floor);
  return g.rng.pick(opts);
}

function wrongFloors(dest: number): number[] {
  return [2, 4, 6, 7, 9, 11, 3].filter((f) => f !== dest).slice(0, 3);
}

// ------------------------------------------------------------------ ACT I
const intro: Encounter = {
  id: 'intro', title: 'The new night man',
  run: async (g) => {
    g.ambientOn = false;
    g.car.place(1);
    g.car.door = 1;
    g.car.doorState = 'open';
    const p = g.spawn('pruitt', { zone: 'cab', slot: 2, facing: 'front' });
    await g.wait(1.2);
    await g.say(p, "So you're the new night man. {name}, right? Pruitt. I keep the building from falling down.");
    await g.say(p, "Car's older than both of us put together. Carrow and Sons, 1931. She don't do automatic. That's why there's you.");
    await g.say(p, 'Push a floor, she goes. Doors open on their own when she gets there. Calls blink on the panel. Somebody blinks, you go get them.');
    await g.say(p, "Book's on the hook by the panel. Write down who rides. Walt was religious about it. His rules are taped inside the cover.");
    g.toast('Click a button on the panel, or use the number keys (0 = 10, - = 11, = = 12). L opens the logbook.', 6);
    const res = await deliver(g, p, 12, {
      ask: 'Take me up to twelve. Machine room.',
      nag: ['Twelve, son. Top button.', 'Right-hand column, at the top. The one that says twelve.'],
      during: async () => {
        g.face(p, 'back');
        await g.say(p, 'Walt ran this car thirty-one years. Never missed a night.');
        const c = await g.choose(['What happened to him?', 'Thirty-one years?']);
        if (c === 0) await g.say(p, "Retired, they said. Didn't clean out his locker though. Didn't say goodbye to nobody.");
        else await g.say(p, 'Started in forty-eight. Lived in the building. Some people get built into a place.');
        await g.say(p, "Couple more things. Twelve is the top, lobby's the bottom. Anything else on that panel, you didn't see it.");
        await g.say(p, "And never open the doors between floors. You can't, anyway. But don't.");
      },
    });
    void res;
    g.face(p, 'front');
    await g.say(p, "I'll be up here if she acts up. That red box on the wall is the phone. Night, {name}.");
    await g.exit(p, undefined, 1);
    g.log('Pruitt, L to 12. Machine room. "She acts up."');
    g.toast('The logbook is on the right wall. Walter\'s rules are inside.', 5);
  },
};

const halloran1: Encounter = {
  id: 'halloran1', title: 'Lemon cake',
  run: async (g) => {
    const home = homeOf(g, 'halloran'), ruth = homeOf(g, 'ruth');
    const [h] = await pickup(g, home, ['halloran']);
    await g.say(h, "Oh! Good evening, dear. You're new.");
    await g.enter(h, 0);
    await deliver(g, h, ruth, {
      ask: `Ruth's, please. Floor ${L(ruth)}. I bring my sister a lemon cake every night at midnight. She can't sleep without it.`,
      during: async () => {
        await g.say(h, 'Walter always knew my floor before I said it. Thirty years of lemon cake.');
        const c = await g.choose(["That's very kind of you.", 'Every night?']);
        if (c === 0) await g.say(h, "She'd do the same for me. She did, once.");
        else await g.say(h, 'Every night. Some promises you keep long after they stop making sense.');
      },
    });
    g.face(h, 'front');
    await g.say(h, "Thank you, dear. Don't ever let it go below the lobby.");
    await g.exit(h);
    g.log(`Mrs. Halloran, ${L(home)} to ${L(ruth)}. Her sister Ruth's. Lemon cake.`);
  },
};

const okafor1: Encounter = {
  id: 'okafor1', title: 'Takeaway',
  run: async (g) => {
    const home = homeOf(g, 'okafor');
    const [o] = await pickup(g, home, ['okafor']);
    await g.say(o, "Walt! I thought you'd... oh. Oh, you're not Walt. Sorry. You stand like him.");
    await g.enter(o, 1);
    await deliver(g, o, 1, {
      ask: "Lobby, please. Mina's craving that terrible chicken place on Delancey. I'm meeting the delivery downstairs.",
      during: async () => {
        await g.say(o, "Mina's due in March. Our first.");
        const c = await g.choose(['Congratulations.', 'Late night for dinner.']);
        if (c === 0) await g.say(o, "Thank you. I'm terrified.");
        else await g.say(o, "She's eating for two. I'm walking for two.");
      },
    });
    await g.say(o, "Back up in ten minutes. If I'm not, send a search party.");
    await g.exit(o);
    g.log(`Mr. Okafor, ${L(home)} to L. Waiting on takeaway. Wife (Mina) expecting.`);
  },
};

const tommy1: Encounter = {
  id: 'tommy1', title: 'Biscuit',
  run: async (g) => {
    const home = homeOf(g, 'tommy');
    const [t, d] = await pickup(g, home, ['tommy', 'dog']);
    await g.say(t, 'Hi. Biscuit needs to go out. Lobby please.');
    await g.enter(t, 3, d);
    const c = await g.choose(["It's past midnight. Where's your mom?", 'Lobby it is.']);
    if (c === 0) await g.say(t, 'Working. She works nights. Like you.');
    else await g.say(t, 'Biscuit says thank you.');
    await deliver(g, t, 1, {
      nag: ['Lobby. The L one.'],
      during: async () => {
        await g.say(t, 'Walter lets Biscuit ride for free.');
        const c2 = await g.choose(['Biscuit can ride for free.', "Who's Walter?"]);
        if (c2 === 0) await g.say(t, "He'll pay you back. He's got a bone saved.");
        else await g.say(t, "Walter. You've got his hat on.");
      },
    });
    await g.say(t, 'Come on, Biscuit.');
    await g.exit(t, d);
    g.log(`A boy (Tommy) and his dog Biscuit, ${L(home)} to L. Alone after midnight.`);
  },
};

const radio: Encounter = {
  id: 'radio', title: 'Radio check',
  run: async (g) => {
    await g.wait(1);
    g.setHint({ good: { phone: true } });
    const answered = await g.ringPhone();
    g.setHint(null);
    if (!answered) {
      g.log("The phone rang. I didn't answer.", 'note');
      return;
    }
    await g.phone("Pruitt. Radio check. She stop anywhere on her own yet?", 'Pruitt');
    const c = await g.choose(['No.', 'Not yet.']);
    await g.phone(c === 0 ? 'Good.' : '"Yet." Ha. You learn quick.', 'Pruitt');
    await g.phone("If a button ever lights up that you didn't press, push it again. Cancels it. Walt's trick. Don't let her pick the floor.", 'Pruitt');
    await g.phone("And if anybody asks for a floor that ain't there, you tell them it ain't there. Over.", 'Pruitt');
    g.log('Pruitt on the phone: if she lights a button herself, press it again.', 'note');
  },
};

const devOut: Encounter = {
  id: 'devOut', title: 'Overnight',
  run: async (g) => {
    const home = homeOf(g, 'dev');
    const [d] = await pickup(g, home, ['dev']);
    await g.say(d, "Oh thank god, it's working. Lobby. I'm late for the overnight at St. Agnes.");
    await g.enter(d, 1);
    await deliver(g, d, 1, {
      during: async () => {
        await g.say(d, 'You replaced Walter? He used to hum. Every ride. Same four notes.');
        const c = await g.choose(['What did he hum?', "I don't hum."]);
        if (c === 0) await g.say(d, 'Da, da, da, dum. Like a doorbell going down the stairs. Drove me mad. I miss it now.');
        else await g.say(d, "Give it time. This car makes you do things.");
        await g.say(d, "There's a picture of him in the lobby. You look kind of like... huh. Anyway.");
      },
    });
    await g.say(d, 'Night!');
    await g.exit(d);
    g.log(`Dev (nurse), ${L(home)} to L. Night shift at St. Agnes.`);
  },
};

const couple: Encounter = {
  id: 'couple', title: 'Six, mate',
  run: async (g) => {
    const dest = homeOf(g, 'couple');
    const [m, b] = await pickup(g, 1, ['marisol', 'ben']);
    await g.say(b, 'Six, mate. Six please.');
    await enterAll(g, [m, b], [0, 1]);
    await g.say(m, `It's not six, Ben. It's ${L(dest)}.`);
    await g.say(b, `${L(dest)}. That's what I said.`);
    await deliver(g, m, dest, {
      wrong: async (f) => {
        if (f === 6) await g.say(m, 'This is six, Ben. Six is the Sorensons.');
        else await g.say(b, "Doesn't look like ours. Does it look like ours?");
      },
      during: async () => {
        await g.say(b, "Did you know this building's got no thirteenth floor? Goes twelve, then roof.");
        await g.say(m, 'Lots of buildings do that.');
        await g.say(b, 'Yeah, but where does the floor GO?');
        await g.say(m, "Ignore him. Hey, were you at Nell's party? No? You look so familiar.");
      },
    });
    await g.exit(m);
    await g.exit(b);
    g.log(`Couple from L to ${L(dest)}. He asked where the thirteenth floor goes.`);
  },
};

const emptyCall: Encounter = {
  id: 'emptyCall', title: 'Shoes',
  run: async (g) => {
    const f = randomFloor(g, [g.run.floors.halloran, g.run.floors.okafor]);
    g.setHall(f, 'shoes');
    await g.call(f);
    await g.opened(f);
    await g.wait(1.5);
    await g.narrate('Nobody. Just a pair of shoes, neatly placed, toes pointing into the car.');
    g.log(`Call from ${L(f)}. Nobody there. A pair of shoes.`, 'odd');
    g.setHint({ good: { close: true } });
    await g.until(() => g.car.doorState !== 'open', 10);
    g.setHint(null);
    g.setHall(f, null);
  },
};

const courier: Encounter = {
  id: 'courier', title: '12F',
  run: async (g) => {
    const [c] = await pickup(g, 1, ['courier']);
    await g.say(c, 'Twelve F? Delivery for twelve F.');
    await g.enter(c, 1);
    await deliver(g, c, 12, { nag: ['Twelve, boss.'] });
    await g.wait(1);
    await g.say(c, "There's no F up here. There's no anything. That door says machine room.");
    g.face(c, 'front');
    await g.say(c, '"W. Imrie, 12F. Paid cash." Cash in an envelope. The envelope says 1979.');
    await g.say(c, "You know what, it's yours. You look like you know him.");
    g.addPage('courier');
    g.face(c, 'back');
    await deliver(g, c, 1, { ask: 'Take me back down. Please.' });
    await g.exit(c);
    g.log('A courier with a pizza for "W. Imrie, 12F". There is no 12F.', 'odd');
  },
};

// ------------------------------------------------------------------ ACT II
const halloran2: Encounter = {
  id: 'halloran2', title: 'Lemon cake (again)',
  run: async (g) => {
    const home = homeOf(g, 'halloran'), ruth = homeOf(g, 'ruth');
    const [h] = await pickup(g, home, ['halloran']);
    await g.say(h, "Oh! Good evening, dear. You're new.");
    await g.enter(h, 0);
    await g.say(h, `Ruth's, please. Floor ${L(ruth)}. I bring my sister a lemon cake every night at midnight. She can't sleep without it.`);
    const c = await g.choose(["You already went to Ruth's tonight.", 'Of course.']);
    if (c === 0) {
      g.face(h, 'front');
      await g.say(h, 'Did I?');
      await g.wait(1.2);
      await g.say(h, "Ruth passed in seventy-nine, you know. November. The same night as the...", { auto: 2.2 });
      g.face(h, 'back');
      await g.say(h, `Floor ${L(ruth)}, please.`);
      g.run.flags.halloranAware = true;
    }
    g.setHall(ruth, 'old');
    await deliver(g, h, ruth, {});
    await g.narrate('The hallway is the wrong color. Older. Somewhere a radio plays a song from before you were born.');
    await g.exit(h);
    g.setHall(ruth, null);
    g.log(`Mrs. Halloran AGAIN, ${L(home)} to ${L(ruth)}. Same words, same cake. The hall was old.`, 'odd');
  },
};

const thirteen: Encounter = {
  id: 'thirteen', title: 'Thirteen',
  run: async (g) => {
    const [w] = await pickup(g, 12, ['lucy'], { face: 'closed' });
    const mark = g.mark();
    await g.wait(0.8);
    await g.enter(w, 1);
    await g.say(w, 'Thirteen.');
    g.setHint({ key: 'feed', good: { press: 1 }, bad: { press: -1 } });
    let nag = 0;
    let done = false;
    void (async () => {
      while (!done) {
        await g.until(() => done || (g.car.idleTime > 12 && g.car.lit.size === 0 && !g.dlg.busy));
        if (done) break;
        nag++;
        if (nag === 1) await g.say(w, "It's below. It's always been below.");
        else {
          await g.say(w, '...', { auto: 1 });
          g.car.pressFloor(-1, true);
          Sound.click(0.6);
        }
        g.car.idleTime = 0;
      }
    })();
    const f = await g.nextStop(Infinity, mark);
    done = true;
    g.setHint(null);
    if (f === -1) {
      g.run.fed++;
      g.flicker(1.5, 0.9);
      Sound.stinger(false);
      g.face(w, 'front');
      await g.say(w, 'Thank you, Walter.');
      await g.exit(w);
      g.log('Took a woman in a nightgown to 13. She called me Walter.', 'odd');
      g.car.corrupt = Math.min(1, g.car.corrupt + 0.3);
    } else {
      g.face(w, 'front');
      await g.say(w, "Walter wouldn't take me either.");
      await g.exit(w);
      g.log(`A woman from 12 asked for 13. I let her off at ${L(f ?? 1)} instead.`, 'odd');
    }
  },
};

const pit: Encounter = {
  id: 'pit', title: 'The pit',
  run: async (g) => {
    await g.wait(1);
    g.setHint({ good: { phone: true } });
    const answered = await g.ringPhone();
    if (answered) {
      await g.phone("It's Pruitt. Kid, the pit sensor's tripping. Says there's water in the shaft.", 'Pruitt');
      await g.phone("There's a B on your panel now, isn't there. Don't ask me how. Take her down and tell me what you see.", 'Pruitt');
    } else {
      await g.narrate('The phone stops ringing. A brass plate at the bottom of the panel has fallen away. Under it: B.');
    }
    g.run.revealB = true;
    Sound.thump(0.2, 60, 0.3);
    g.toast('B has appeared on the panel.');
    g.setHint({ key: 'key', good: { press: 0 }, bad: { idle: true } });
    const a0 = g.arriveSeq;
    const reached = await g.until(() => g.arriveSeq > a0 && g.lastArrive.floor === 0, 75);
    g.setHint(null);
    if (!reached) {
      if (answered) await g.phone("...Never mind. Sensor's quiet. Forget the pit, kid.", 'Pruitt');
      g.log('Pruitt asked me to check the pit. I did not go.', 'note');
      return;
    }
    await g.opened(0);
    await keyAtPit(g);
  },
};

export async function keyAtPit(g: GameScene): Promise<void> {
  Sound.water();
  await g.narrate('Black water. A bare bulb. Something brass glints just under the surface, a hand-length from the sill.');
  const c = await g.choose(['Reach for it.', 'Close the doors.'], { key: 'key', good: { choose: 0 }, bad: { choose: 1 } });
  if (c === 0) {
    g.run.flags.figureDist = 3;
    await g.wait(0.8);
    g.scare('water');
    await g.wait(0.9);
    await g.narrate('Something under the water had its eyes open. You are already standing back in the car. In your fist: a brass key on a paper tag. "W.I. - STOP."');
    g.run.hasKey = true;
    g.addPage('pit');
    g.log('Found a key in the pit at B. Tag says W.I. - STOP.', 'note');
    g.toast("You have Walter's key. A page was added to the logbook.");
  } else {
    await g.narrate('You close the doors. The water keeps rising, slowly, in your head.');
    g.log('Saw something in the water at B. Left it.', 'odd');
  }
  g.setHint({ good: { close: true } });
  await g.until(() => g.car.doorState !== 'open', 6);
  g.setHint(null);
}

const okaforDouble: Encounter = {
  id: 'okaforDouble', title: 'Already in',
  run: async (g) => {
    const home = homeOf(g, 'okafor');
    const [o] = await pickup(g, 1, ['okafor'], { looks: { okafor: { ...LOOKS.okafor, prop: 'takeout' } } });
    const mark = g.mark();
    await g.say(o, `Walt. Back up, please. ${L(home)}. The chicken's getting cold.`);
    await g.enter(o, 1);
    // He requests his floor; on the way up the car stops by itself.
    g.setHint({ good: { press: home } });
    await g.until(() => g.car.moving && g.car.speed > 0.3);
    const mid = Math.max(2, Math.min(12, g.car.dir > 0 ? Math.ceil(g.car.pos + 0.6) : Math.floor(g.car.pos - 0.6)));
    g.car.lit.add(mid);
    g.car.target = mid;
    const f = await g.nextStop(Infinity, mark);
    g.car.lit.clear();
    g.setHint(null);
    void f;
    const other = g.spawn('okafor', { zone: 'hall', face: 'blank' });
    await g.wait(0.4);
    Sound.stinger(false);
    g.face(o, 'front');
    await g.say(o, "Don't let him in.");
    await g.say(other, "Walt. Don't let him in.", { auto: 1.6 });
    g.setHint({ key: 'okafor', good: { close: true }, bad: { idle: true } });
    // He steps closer, slowly. Close the doors before he's aboard.
    void g.walk(other, [{ x: DOOR_MID, y: 176 }]);
    other.speed = 6;
    const closed = await g.until(() => g.car.doorState === 'closing' || g.car.doorState === 'closed', 7);
    g.setHint(null);
    if (closed) {
      g.remove(other);
      await g.closed();
      Sound.knock(3, 0.3);
      g.shake(1.5, 0.4);
      await g.wait(1);
      g.face(o, 'back');
      await g.say(o, '...Thank you.');
      await deliver(g, o, home, {});
      await g.say(o, "Mina doesn't like it when I'm late. Goodnight, Walt.");
      await g.exit(o);
      g.log(`Mr. Okafor, L to ${L(home)}. At ${L(mid)} there was another one of him. I closed the doors.`, 'odd');
    } else {
      other.speed = 46;
      g.car.holdOpen++;
      await g.walk(other, [{ x: 140, y: 205 }]);
      g.car.holdOpen--;
      await g.lightsOut(1.2);
      g.remove(o);
      g.face(other, 'front');
      other.face = 'smile';
      await g.wait(0.5);
      g.run.flags.okaforSwapped = true;
      await g.narrate("When the light comes back there's only one of him. The bag of takeaway is on the floor.");
      g.face(other, 'back');
      const mark2 = g.mark();
      await g.say(other, 'Thirteen, please.');
      g.setHint({ key: 'feed', good: { press: home }, bad: { press: -1 } });
      const stop = await g.nextStop(Infinity, mark2);
      g.setHint(null);
      if (stop === -1) {
        g.run.fed++;
        g.run.flags.okaforLost = true;
        g.flicker(1.2, 0.9);
        await g.exit(other);
        g.log("Let the second Mr. Okafor in. The first one is gone. Took him to 13.", 'odd');
      } else {
        await g.exit(other);
        g.log("Let the second Mr. Okafor in. The first one is gone. He wanted 13.", 'odd');
      }
    }
  },
};

const knowsYou: Encounter = {
  id: 'knowsYou', title: 'The man in gray',
  run: async (g) => {
    const f = randomFloor(g);
    const [m] = await pickup(g, f, ['grayman'], { face: 'smile' });
    await g.say(m, '{name}.');
    await g.enter(m, 1);
    await g.say(m, "You don't remember me. That's all right. I remember you.");
    await deliver(g, m, 1, {
      ask: 'Lobby.',
      during: async () => {
        await g.say(m, "You signed the book at eleven o'clock tonight. You signed it at eleven o'clock last night, too.");
        await g.say(m, "Every night is the first night. Isn't it?");
        if (g.run.reveal13) {
          g.car.pressFloor(-1, true);
          Sound.click(0.6);
          await g.say(m, 'Oh, look. Somebody wants to go down.', { auto: 2 });
        }
        const c = await g.choose(['Who are you?', 'Get out at the next floor.']);
        if (c === 0) await g.say(m, "I'm the one who presses thirteen when you aren't looking.");
        else await g.say(m, 'Gladly. Every floor is the next floor.');
      },
    });
    await g.exit(m);
    g.log(`A man in gray, ${L(f)} to L. He knew my name. He said every night is the first night.`, 'odd');
  },
};

const wrongHall: Encounter = {
  id: 'wrongHall', title: 'The other car',
  run: async (g) => {
    const f = randomFloor(g);
    g.setHall(f, 'cab');
    const r = await g.call(f);
    const fig = g.spawn('double', { zone: 'hall', facing: 'back', fromSide: r.alreadyOpen ? 1 : undefined });
    fig.x = DOOR_MID + 6;
    await g.opened(f);
    g.setHint({ good: { close: true } });
    const t0 = g.t;
    const shutA = await g.until(() => g.car.doorState === 'closing' || g.car.doorState === 'closed', 5.5);
    if (!shutA) {
      g.face(fig, 'front');
      fig.face = 'smile';
      Sound.whisper();
      const shut2 = await g.until(() => g.car.doorState === 'closing' || g.car.doorState === 'closed', 2.5);
      if (!shut2) {
        g.scare('double');
        g.remove(fig);
        g.setHall(f, 'normal');
        g.run.flags.stared = true;
        await g.wait(1);
        await g.narrate('The hallway is just a hallway. The doors stay open a long time.');
      }
    }
    void t0;
    g.setHint(null);
    await g.closed();
    g.remove(fig);
    g.setHall(f, null);
    g.log(`Called to ${L(f)}. The hallway was this car. Someone was standing at the panel.`, 'odd');
  },
};

const phoneWalter: Encounter = {
  id: 'phoneWalter', title: 'Long distance',
  run: async (g) => {
    await g.wait(1);
    g.setHint({ good: { phone: true } });
    const ok = await g.ringPhone();
    g.setHint(null);
    if (!ok) {
      g.log("The phone rang a long time. I didn't answer.", 'note');
      return;
    }
    Sound.whisper();
    await g.phone("...who's in my car?");
    const c = await g.choose(['{name}. The new operator.', 'Who is this?']);
    if (c === 0) await g.phone("There's no new operator. There's only the car, and whoever's standing in it.");
    else await g.phone("Imrie. Night operator. It's the tenth of November and I can't find the bottom.");
    await g.phone("Listen. When they don't say where, you already know. Check the book. You wrote it down. I didn't.");
    await g.phone("And when she won't stop... the key. Don't let her take you down without...");
    Sound.noiseBurst(0.6, 2000, 0.1, 'highpass');
    await g.narrate('The line fills with water noise, then nothing.');
    g.addPage('phone');
    g.log('Walter called the car phone. "Check the book."', 'odd');
  },
};

const crowd: Encounter = {
  id: 'crowd', title: 'Full car',
  run: async (g) => {
    const people = await pickup(g, 1, ['crowd0', 'crowd1', 'crowd2', 'crowd3'], { face: 'blank' });
    const mark = g.mark();
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      await g.enter(p, [0, 1, 3, 2][i]);
      g.face(p, 'front');
    }
    Sound.buzzer();
    await g.wait(0.3);
    Sound.buzzer();
    await g.narrate('The overload buzzer sounds twice, then stops. Nobody presses anything. They are all facing you.');
    g.setHint({ key: 'feed', good: { press: 8 }, bad: { press: -1 } });
    const f = await g.nextStop(25, mark);
    g.setHint(null);
    if (f === null) {
      await g.lightsOut(1.5);
      people.forEach((p) => g.remove(p));
      await g.narrate('When the light comes back, the car is empty. It smells like wet wool.');
      g.log('Four people got on at L and never pressed anything. Then they were gone.', 'odd');
      return;
    }
    if (f === -1) {
      g.run.fed += 2;
      g.flicker(1.2, 0.9);
    }
    for (const p of people) {
      g.face(p, 'back');
      void g.exit(p);
      await g.wait(0.5);
    }
    await g.until(() => !g.actors.some((a) => people.includes(a)));
    g.log(`Four silent passengers from L to ${L(f)}. They watched me the whole way.`, 'odd');
  },
};

const buttons: Encounter = {
  id: 'buttons', title: 'Two sevens',
  run: async (g) => {
    g.swapLabels = { f8: '7', f4: '7' };
    Sound.thump(0.1, 120, 0.1);
    await g.narrate('You look at the panel. There are three sevens on it now.');
    const f = 8;
    g.setHall(f, 'samedoors');
    await g.call(f);
    await g.opened(f);
    await g.wait(1.5);
    await g.narrate('Every door in the hallway is numbered thirteen.');
    g.setHint({ good: { close: true } });
    await g.until(() => g.car.doorState !== 'open', 10);
    g.setHint(null);
    await g.closed();
    g.swapLabels = {};
    g.setHall(f, null);
    g.log('The buttons were wrong. Three sevens. Every door on 8 said 13.', 'odd');
  },
};

const tommy2: Encounter = {
  id: 'tommy2', title: 'Seven',
  run: async (g) => {
    const home = homeOf(g, 'tommy');
    const [t] = await pickup(g, home, ['tommy'], { face: 'sad', looks: { tommy: { ...LOOKS.tommy, prop: 'none' } } });
    await g.say(t, 'Biscuit ran off. He went out on seven, I heard him bark. Can we look? Please?');
    await g.enter(t, 3);
    const c = await g.choose(["Let's go look.", "It's late. Go back to bed."], { good: { choose: 0 } });
    if (c === 1) {
      await g.say(t, '...Okay.');
      await g.exit(t);
      g.run.flags.biscuitLost = true;
      g.log(`Tommy, looking for his dog. I sent him back to bed at ${L(home)}.`);
      return;
    }
    g.setHall(7, 'leash');
    await deliver(g, t, 7, {});
    await g.say(t, 'Biscuit?');
    g.setHall(7, null);
    await g.exit(t, undefined, -1);
    await g.wait(2);
    Sound.knock(1, 0.05);
    const [t2, d] = [g.spawn('tommy', { zone: 'hall', fromSide: -1 }), g.spawn('dog', { zone: 'hall', fromSide: -1 })];
    t2.look = { ...LOOKS.tommy, prop: 'leash' };
    d.x += 14;
    await g.until(() => t2.path.length === 0);
    await g.say(t2, 'Found him! He was sitting by the stairs. The stairs go up into the ceiling there.');
    await g.enter(t2, 3, d);
    await deliver(g, t2, home, { ask: 'Home now.' });
    await g.exit(t2, d);
    g.run.flags.biscuitFound = true;
    g.log(`Tommy found Biscuit on 7. Took them home to ${L(home)}.`);
  },
};

const devReturn: Encounter = {
  id: 'devReturn', title: 'Still Tuesday',
  run: async (g) => {
    const home = homeOf(g, 'dev');
    const [d] = await pickup(g, 1, ['dev']);
    await g.say(d, "Oh thank god, it's working. Lobby. I'm late for the overnight at St. Agnes.");
    await g.enter(d, 1);
    g.face(d, 'front');
    await g.wait(1);
    await g.say(d, "...We're in the lobby. I already went. Didn't I? I came back.");
    await g.say(d, "Nobody on the ward knew me. My badge didn't open the door. Is it still Tuesday?");
    const c = await g.choose(["It's Tuesday.", "I don't know."]);
    await g.say(d, c === 0 ? 'Okay. Okay. Tuesday.' : "Me neither. That's the first honest thing anyone's said all night.");
    g.face(d, 'back');
    await deliver(g, d, home, { ask: `Take me home. ${L(home)}.` });
    await g.exit(d);
    g.log(`Dev came back from a shift she never worked. L to ${L(home)}.`, 'odd');
  },
};

// ------------------------------------------------------------------ ACT III
function clueFor(f: number): string {
  return FLOOR_CLUE[f] ?? 'the door I always came home to';
}

async function lastRide(g: GameScene, who: 'halloran' | 'okafor' | 'tommy'): Promise<void> {
  const r = g.run;
  if (who === 'halloran') {
    const home = r.floors.halloran, ruth = r.floors.ruth;
    const [h] = await pickup(g, home, ['halloran'], { looks: { halloran: { ...LOOKS.halloran, tint: 'sepia' } } });
    await g.say(h, "I don't think I ever got to Ruth's, dear. Not really. Not that night.");
    await g.enter(h, 0);
    await g.say(h, "Will you take me? I can't remember the floor anymore. Walter always knew.");
    g.setHall(ruth, 'opendoor');
    const res = await deliver(g, h, ruth, {
      maxWrong: 1, hintKey: 'deliver', bad: wrongFloors(ruth),
      nag: [`I remember ${clueFor(ruth)}.`, 'Did you write it down, dear? Walter never wrote anything down.'],
      wrong: async () => {
        await g.say(h, `No... this isn't it. Ruth's floor had ${clueFor(ruth)}.`);
      },
    });
    if (res.ok) {
      const ruthA = g.spawn('ruth', { zone: 'hall', x: DOOR_MID - 10, fromSide: -1 });
      ruthA.look = { ...LOOKS.ruth, tint: 'sepia' };
      await g.until(() => ruthA.path.length === 0);
      await g.say(ruthA, 'Ada. You\'re late.');
      g.face(h, 'front');
      await g.say(h, 'I brought the cake. Thank you, dear. Thank Walter for me.');
      await g.exit(h);
      g.remove(ruthA);
      r.delivered.push('halloran');
      g.log(`Mrs. Halloran, last ride. ${L(home)} to ${L(ruth)}. Ruth was waiting.`);
    } else {
      await g.say(h, "I'll walk from here. It can't be far.");
      await g.exit(h);
      g.log(`Mrs. Halloran couldn't remember Ruth's floor. Neither could I. She got off at ${L(res.floor)}.`, 'odd');
    }
    g.setHall(ruth, null);
  } else if (who === 'okafor') {
    const home = r.floors.okafor;
    if (r.flags.okaforLost) {
      g.setHall(1, 'lobbydark');
      await g.call(1);
      await g.opened(1);
      await g.narrate('The lobby is dark. On the sill of the car: a paper bag of cold takeaway. Nobody comes for it.');
      g.log('A bag of takeaway at L. Mr. Okafor did not come. I took the other one to 13.', 'odd');
      g.setHall(1, null);
      return;
    }
    const [o] = await pickup(g, 1, ['okafor'], { looks: { okafor: { ...LOOKS.okafor, prop: 'takeout', tint: 'sepia' } } });
    await g.say(o, 'I never made it back up, did I, Walt? Mina waited all night with the light on.');
    await g.enter(o, 1);
    if (r.flags.okaforSwapped) await g.say(o, 'You let the other one ride in my place. I had to wait a long time for another car.');
    await g.say(o, 'Take me home. You know the floor. I keep forgetting it.');
    g.setHall(home, 'opendoor');
    const res = await deliver(g, o, home, {
      maxWrong: 1, hintKey: 'deliver', bad: wrongFloors(home),
      nag: [`Our hall has ${clueFor(home)}. I remember that.`, "It's in your book, isn't it?"],
      wrong: async () => {
        await g.say(o, `Not this one. Ours has ${clueFor(home)}.`);
      },
    });
    if (res.ok) {
      const mina = g.spawn('mina', { zone: 'hall', x: DOOR_MID - 10, fromSide: 1 });
      mina.look = { ...LOOKS.mina, tint: 'sepia' };
      await g.until(() => mina.path.length === 0);
      await g.say(mina, 'Lionel. Where have you been?');
      await g.say(o, 'Getting dinner. Sorry. The elevator was slow.');
      await g.exit(o);
      g.remove(mina);
      r.delivered.push('okafor');
      g.log(`Mr. Okafor, last ride. L to ${L(home)}. Mina opened the door.`);
    } else {
      await g.say(o, "I'll take the stairs. I should have taken the stairs.");
      await g.exit(o);
      g.log(`Mr. Okafor couldn't find his floor. Got off at ${L(res.floor)}.`, 'odd');
    }
    g.setHall(home, null);
  } else {
    const home = r.floors.tommy;
    const withDog = !r.flags.biscuitLost;
    const ids = withDog ? ['tommy', 'dog'] : ['tommy'];
    const [t, d] = await pickup(g, 1, ids, {
      looks: { tommy: { ...LOOKS.tommy, tint: 'sepia', prop: withDog ? 'leash' : 'none' }, dog: { ...LOOKS.tommy, tint: 'sepia' } },
    });
    await g.say(t, withDog ? "Mom's home by now. Biscuit's tired. Can we go home?" : "I never found Biscuit. Mom's home by now. Can I go home?");
    await g.enter(t, 3, d);
    await g.say(t, 'I forget which one is ours. They all look the same at night.');
    g.setHall(home, 'opendoor');
    const res = await deliver(g, t, home, {
      maxWrong: 1, hintKey: 'deliver', bad: wrongFloors(home),
      nag: [`Ours has ${clueFor(home)}.`, 'Mom says if I get lost, look for the tricycle. Or... something.'],
      wrong: async () => {
        await g.say(t, `That's not ours. Ours has ${clueFor(home)}.`);
      },
    });
    if (res.ok) {
      const mom = g.spawn('tommyMom', { zone: 'hall', x: DOOR_MID - 10, fromSide: -1 });
      mom.look = { ...LOOKS.tommyMom, tint: 'sepia' };
      await g.until(() => mom.path.length === 0);
      await g.say(mom, 'Tommy! Mijo, where have you been? I looked everywhere.');
      await g.say(t, 'The elevator man brought me.');
      await g.exit(t, d);
      g.remove(mom);
      r.delivered.push('tommy');
      g.log(`Tommy, last ride. L to ${L(home)}. His mom was home.`);
    } else {
      await g.say(t, "I'll find it. I'm big now.");
      await g.exit(t, d);
      g.log(`Tommy got off at ${L(res.floor)}. Not his floor.`, 'odd');
    }
    g.setHall(home, null);
  }
}

const lastHalloran: Encounter = { id: 'lastHalloran', title: "Ruth's", run: (g) => lastRide(g, 'halloran') };
const lastOkafor: Encounter = { id: 'lastOkafor', title: 'Supper', run: (g) => lastRide(g, 'okafor') };
const lastTommy: Encounter = { id: 'lastTommy', title: 'Home', run: (g) => lastRide(g, 'tommy') };

const doubleYou: Encounter = {
  id: 'doubleYou', title: 'Shift change',
  run: async (g) => {
    // The car stops by itself; the doors open on you.
    await shut(g);
    const f = randomFloor(g);
    g.car.lit.add(f);
    const a0 = g.arriveSeq;
    await g.until(() => g.arriveSeq > a0);
    g.car.lit.clear();
    const d = g.spawn('double', { zone: 'hall', facing: 'front', face: 'normal' });
    await g.opened();
    await g.wait(0.6);
    await g.say(d, "You're early. It's my shift.");
    g.setHint({ key: 'double', good: { close: true }, bad: { idle: true } });
    d.speed = 5;
    void g.walk(d, [{ x: DOOR_MID, y: 177 }]);
    const slammed = await g.until(() => g.car.doorState === 'closing' || g.car.doorState === 'closed', 8);
    g.setHint(null);
    if (slammed) {
      g.remove(d);
      await g.closed();
      await g.wait(0.3);
      Sound.knock(4, 0.45);
      g.shake(3, 0.8);
      g.run.handprints.push({ x: 20, y: 30, side: 0, big: true }, { x: 26, y: 36, side: 1, big: true });
      await g.wait(0.8);
      g.scare('double');
      await g.wait(0.8);
      await g.say('double', "{name}. Let me in. It's my shift.", { style: 'narration' });
      await g.wait(1);
      await g.narrate('Then nothing. The handprints on the doors are on the inside.');
      g.log(`At ${L(f)} the doors opened on me. My uniform. My book. I didn't let him in.`, 'odd');
    } else {
      d.speed = 40;
      g.car.holdOpen++;
      await g.walk(d, [{ x: 212, y: 209 }]);
      g.car.holdOpen--;
      g.face(d, 'back');
      g.run.doubleIn = true;
      g.sticky = d;
      await g.narrate('He stands at the panel, where you stand. He does not look at you again.');
      g.log(`At ${L(f)} I let myself in.`, 'odd');
    }
  },
};

const walterLast: Encounter = {
  id: 'walterLast', title: 'Machine room',
  run: async (g) => {
    const [w] = await pickup(g, 12, ['walter']);
    w.look = { ...LOOKS.walter, tint: 'ghost' };
    w.alpha = 0.9;
    await g.wait(1);
    await g.say(w, "So you're the one riding my car.");
    await g.say(w, "I took them down that night. Ada, Lionel, the Reyes boy and his dog. Cable went at 5:58. We never hit the bottom. We just... kept going.");
    await g.say(w, "Get them home, son. Every one of them. You wrote the floors down. I never did. That's why they're still riding.");
    const c = await g.choose(['What about you?', 'Why me?']);
    if (c === 0) await g.say(w, "I'll get off where I got on.");
    else await g.say(w, 'Because you stand like me. Because you signed the book.');
    if (!g.run.hasKey) {
      await g.say(w, "Then turn the key. Under the panel. I dropped mine in the pit that night. It's still down there, at B.");
      g.run.revealB = true;
    } else {
      await g.say(w, "Then turn the key. You found it already. Good. Not before they're home. She has to be empty.");
    }
    g.addPage('walter');
    await g.say(w, 'Close the doors now. I never liked goodbyes.');
    g.setHint({ good: { close: true } });
    await g.until(() => g.car.doorState === 'closing' || g.car.doorState === 'closed', 15);
    g.setHint(null);
    await g.closed();
    g.remove(w);
    g.log('Walter was waiting on 12. Get them home, then turn the key.', 'odd');
  },
};

const knocking: Encounter = {
  id: 'knocking', title: 'Between floors',
  run: async (g) => {
    await shut(g);
    const target = randomFloor(g);
    g.car.lit.add(target);
    await g.until(() => g.car.moving);
    await g.wait(0.5);
    g.car.freeze++;
    const saved = g.car.maxSpeed;
    g.car.maxSpeed = 0.0001;
    Sound.thump(0.3, 45, 0.4);
    g.shake(2, 0.4);
    await g.wait(1.5);
    Sound.knock(3, 0.3);
    await g.narrate('The car stops between floors. Someone knocks on the outside of the doors. There is no outside. There is only shaft.');
    const c = await g.choose(['Knock back.', 'Stay quiet.', 'Ring the alarm.'], { good: { choose: 1 } });
    if (c === 0) {
      Sound.knock(2, 0.2);
      await g.wait(1);
      Sound.knock(2, 0.35);
      await g.wait(0.6);
      Sound.whisper();
      g.run.obeyed++;
      g.run.handprints.push({ x: 30, y: 50, side: 1 });
      await g.narrate('It knocks back exactly the way you did. Then it says your name, very close to the gap.');
      g.log('Stuck between floors. Something knocked. I knocked back. It knows my name.', 'odd');
    } else if (c === 1) {
      await g.wait(2);
      Sound.knock(1, 0.1);
      await g.narrate('The knocking moves away. Down. A long way down.');
      g.log('Stuck between floors. Something knocked. I kept quiet.', 'odd');
    } else {
      Sound.alarm();
      await g.wait(0.6);
      Sound.alarm();
      await g.narrate('The bell is very loud in the shaft. When it stops, the knocking has stopped too.');
      g.log('Stuck between floors. Rang the alarm. The knocking stopped.', 'odd');
    }
    g.car.maxSpeed = saved;
    g.car.freeze--;
    await g.nextStop();
  },
};

// ------------------------------------------------------------------ FINALE
const finale: Encounter = {
  id: 'finale', title: '5:58',
  run: async (g) => {
    const r = g.run;
    g.ambientOn = false;
    g.car.holdOpen = 0;
    await shut(g);
    g.car.lit.clear();
    await g.wait(1);
    g.flicker(2, 0.9);
    Sound.thump(0.4, 40, 0.8);
    g.shake(3, 1);
    await g.narrate('05:58. Something above you lets go with a sound like a held breath.');
    g.finale = true;
    g.fallPos = g.car.pos;
    g.falling = 0.9;
    await g.narrate('The car is going down. Not falling. Being lowered, floor after floor after floor. The needle passes L and keeps going.');
    await g.narrate(r.hasKey ? 'Every button goes dark but two: L and 13. Under them, the keyhole marked STOP is warm.' : 'Every button goes dark but two: L and 13.');
    if (r.doubleIn) {
      const d = g.sticky ?? g.spawn('double', { zone: 'cab', slot: 2 });
      g.face(d, 'front');
      d.face = 'smile';
      await g.say(d, 'My shift.');
      g.face(d, 'back');
      Sound.click();
      await g.wait(0.6);
      await endReplacement(g, d);
      return;
    }
    const clean = r.delivered.length >= 3 && r.fed < 2;
    g.setHint({ good: r.hasKey && clean ? { key: true } : { press: 1 } });
    applyBotFinale(g);
    const choice = await new Promise<string>((resolve) => {
      let done = false;
      const off = g.onPanel((id) => {
        if (done) return;
        if (id === 'f1' || id === 'f-1' || (id === 'key' && r.hasKey)) {
          done = true;
          off();
          resolve(id);
        }
      });
      void g.wait(55).then(() => {
        if (done) return;
        done = true;
        off();
        resolve('none');
      });
    });
    g.setHint(null);
    if (choice === 'f-1') return endThirteen(g);
    if (choice === 'key') return clean ? endTrue(g) : endBetween(g);
    if (choice === 'f1' && r.fed < 2 && r.obeyed < 3) return endMorning(g);
    return endLoop(g, choice === 'none');
  },
};

function applyBotFinale(g: GameScene): void {
  const params = new URLSearchParams(location.search);
  const want = params.get('finale');
  if (!want) return;
  const map: Record<string, Hint['good']> = { l: { press: 1 }, '13': { press: -1 }, key: { key: true }, none: { idle: true } };
  if (map[want]) g.setHint({ good: map[want] });
}

async function settleAt(g: GameScene, floor: number): Promise<void> {
  g.falling = 0;
  g.fallPos = floor;
  await g.wait(1.2);
  g.car.place(floor);
  g.fallPos = null;
  Sound.ding(floor === -1 ? 1 : 0);
  await g.wait(0.5);
  g.car.door = 0;
  g.car.doorState = 'opening';
  Sound.door(true);
  await g.opened();
}

async function endMorning(g: GameScene): Promise<void> {
  await g.narrate('You press L. The car hesitates. Then, impossibly, it rises, and settles, and the needle stops on L like it never meant anything else.');
  g.setHall(1, 'dawn');
  g.baseLight = 1;
  await settleAt(g, 1);
  const op = g.spawn('dayop', { zone: 'hall' });
  op.look = LOOKS.dayop;
  op.name = 'Day operator';
  await g.wait(1);
  await g.say(op, "Morning. You must be the new night man. How was it?");
  const c = await g.choose(['Quiet.', "It doesn't stop."]);
  await g.say(op, c === 0 ? "It's always quiet. That's the trouble with it." : "Ha. Walter used to say that. Go home, get some sleep.");
  await g.narrate('You sign out. In the logbook, under tonight, there is already an entry for tomorrow. In your handwriting. "23:00. Shift begins."');
  g.finish('morning');
}

async function endThirteen(g: GameScene): Promise<void> {
  await g.narrate('You press 13. For the first time all night the car does exactly what it is told.');
  g.setHall(-1, 'thirteen_crowd');
  await settleAt(g, -1);
  Sound.stinger(false);
  await g.narrate('Thirteen. They are all here. Everyone who ever rode with Walter, standing with their backs to you, waiting for the doors to close.');
  await g.narrate("There's room for one more. You step out, and the doors close behind you, and the car goes up without you.");
  await g.lightsOut(2);
  await g.narrate('It has a new operator by eleven.');
  g.finish('thirteen');
}

async function endLoop(g: GameScene, timedOut: boolean): Promise<void> {
  if (timedOut) await g.narrate('You do nothing. The car does not need you to.');
  else await g.narrate('You press L. The needle passes L. Passes B. Passes 13. The dial was never long enough.');
  g.falling = 2.5;
  Sound.stinger(true);
  await g.wait(3);
  await g.lightsOut(2.5);
  g.falling = 0;
  g.fallPos = null;
  g.car.place(1);
  g.actors.forEach((a) => g.remove(a));
  g.finale = false;
  g.panelDark.clear();
  await g.narrate('23:00.');
  g.car.door = 0;
  g.car.doorState = 'opening';
  const p = g.spawn('pruitt', { zone: 'hall' });
  await g.opened();
  await g.say(p, "So you're the new night man. {name}, right? Pruitt. I keep the building from falling down.");
  g.finish('loop');
}

async function endTrue(g: GameScene): Promise<void> {
  const r = g.run;
  await g.narrate("You turn Walter's key. Something deep in the building lets out a breath it has been holding since 1979.");
  g.falling = 0;
  g.shake(2, 0.6);
  Sound.thump(0.4, 40, 0.8);
  await g.wait(1.5);
  await g.lightsOut(1.5);
  const ghosts: Actor[] = [];
  const h = g.spawn('halloran', { zone: 'cab', slot: 0 });
  h.look = { ...LOOKS.halloran, tint: 'sepia' };
  const o = g.spawn('okafor', { zone: 'cab', slot: 1 });
  o.look = { ...LOOKS.okafor, tint: 'sepia', prop: 'takeout' };
  const t = g.spawn('tommy', { zone: 'cab', slot: 3 });
  t.look = { ...LOOKS.tommy, tint: 'sepia', prop: r.flags.biscuitLost ? 'none' : 'leash' };
  ghosts.push(h, o, t);
  let dog: Actor | undefined;
  if (!r.flags.biscuitLost) {
    dog = g.spawn('dog', { zone: 'cab', x: 52 });
    dog.look = { ...LOOKS.tommy, tint: 'sepia' };
  }
  const w = g.spawn('walter', { zone: 'cab', slot: 2 });
  w.look = { ...LOOKS.walter, tint: 'sepia' };
  await g.wait(0.5);
  await g.narrate('When the light comes back, they are all in the car. They were always in the car. Every ride tonight, every night, they were here.');
  g.setHall(1, 'dawn');
  await settleAt(g, 1);
  await g.wait(0.8);
  g.face(h, 'front');
  await g.say(h, 'Thank you, dear. Ruth will want to meet you.');
  await g.exit(h);
  g.face(o, 'front');
  await g.say(o, 'Tell Pruitt the chicken place on Delancey closed in eighty-two. Mina will laugh.');
  await g.exit(o);
  g.face(t, 'front');
  await g.say(t, dog ? 'Bye! Biscuit says bye.' : 'Bye. If you see a dog, his name is Biscuit.');
  await g.exit(t, dog);
  g.face(w, 'front');
  await g.say(w, 'End of shift, {name}. Sign out. Go home. Sleep. Don\'t come back tonight.');
  await g.exit(w);
  r.reveal13 = false;
  r.revealB = false;
  await g.narrate('The blank plates are back at the bottom of the panel. The car hums, the ordinary hum of a machine at rest.');
  await g.narrate('Outside the lobby glass, it is morning.');
  g.finish('true');
}

async function endBetween(g: GameScene): Promise<void> {
  await g.narrate("You turn Walter's key. The car jerks to a stop so hard your teeth click.");
  g.falling = 0;
  g.shake(4, 0.6);
  Sound.thump(0.5, 35, 0.9);
  g.fallPos = 0.5;
  await g.wait(1.5);
  await g.narrate('She stopped. But she isn\'t empty. Somewhere above and below you, people are still waiting for a car that will never come.');
  g.setHall(0, 'brick');
  g.car.place(0);
  g.fallPos = 0.5;
  g.car.door = 0;
  g.car.doorState = 'opening';
  Sound.door(true);
  await g.opened();
  await g.narrate('The doors open on brick. You wait. At 9:40, Pruitt pries open a hatch in the ceiling. "Car\'s been empty all night," he says. "Where were you?"');
  await g.narrate('That night, from the street, you watch the dial in the lobby window. At 11:00 exactly, the needle starts to move.');
  g.finish('between');
}

async function endReplacement(g: GameScene, d: Actor): Promise<void> {
  g.setHall(1, 'dawn');
  await settleAt(g, 1);
  await g.narrate('He pressed L. The car obeyed him immediately.');
  await g.exit(d, undefined, 1);
  await g.narrate('He signs the logbook with your name and walks out into the grey morning. You try to follow. Your feet will not move.');
  g.car.doorState = 'closing';
  Sound.door(false);
  await g.closed();
  await g.lightsOut(2.5);
  await g.narrate('23:00. The doors open.');
  g.setHall(9, null);
  g.car.place(g.run.floors.halloran);
  g.car.door = 0;
  g.car.doorState = 'opening';
  const h = g.spawn('halloran', { zone: 'hall' });
  await g.opened();
  await g.say(h, 'Oh! Good evening, Walter dear.');
  g.finish('replacement');
}

// ------------------------------------------------------------------ registry & schedule
export const ENCOUNTERS: Record<string, Encounter> = Object.fromEntries(
  [
    intro, halloran1, okafor1, tommy1, radio, devOut, couple, emptyCall, courier,
    halloran2, thirteen, pit, okaforDouble, knowsYou, wrongHall, phoneWalter, crowd, buttons, tommy2, devReturn,
    lastHalloran, lastOkafor, lastTommy, doubleYou, walterLast, knocking, finale,
  ].map((e) => [e.id, e]),
);

export function buildRun(rng: Rng, name: string, seed: number): RunState {
  const halloran = rng.pick([9, 7, 6]);
  const ruth = rng.pick([3, 4, 2]);
  const okafor = rng.pick([11, 9, 7].filter((f) => f !== halloran));
  const tommy = rng.pick([2, 4, 6].filter((f) => f !== ruth && f !== halloran));
  const dev = rng.pick([2, 3, 4, 6, 7, 9, 11].filter((f) => ![halloran, ruth, okafor, tommy].includes(f)));
  const couple = rng.pick([5, 10, 8]);

  // Act I
  const core = rng.shuffle(['halloran1', 'okafor1', 'tommy1']);
  const fill1 = rng.weighted([{ id: 'devOut', weight: 3 }, { id: 'couple', weight: 2 }, { id: 'emptyCall', weight: 2 }, { id: 'courier', weight: 2 }], 2).map((x) => x.id);
  const a1 = rng.shuffle([...core, ...fill1]);
  a1.splice(rng.int(2, a1.length), 0, 'radio');
  const act1 = ['intro', ...a1];

  // Act II
  const pool2 = [
    { id: 'okaforDouble', weight: 3 }, { id: 'knowsYou', weight: 2 }, { id: 'wrongHall', weight: 2 }, { id: 'phoneWalter', weight: 3 },
    { id: 'crowd', weight: 2 }, { id: 'buttons', weight: 1 }, { id: 'tommy2', weight: 3 },
  ];
  if (act1.includes('devOut')) pool2.push({ id: 'devReturn', weight: 3 });
  const fill2 = rng.weighted(pool2, 5).map((x) => x.id);
  const act2 = rng.shuffle(['halloran2', 'thirteen', 'pit', ...fill2]);

  // Act III
  const leftovers = pool2.filter((p) => !fill2.includes(p.id) && ['knowsYou', 'wrongHall', 'crowd', 'phoneWalter', 'buttons'].includes(p.id));
  const fill3 = rng.weighted([{ id: 'knocking', weight: 4 }, ...leftovers], 2).map((x) => x.id);
  const rest3 = rng.shuffle(['lastHalloran', 'lastOkafor', 'lastTommy', 'doubleYou', ...fill3]);
  const act3 = [...rest3.slice(0, 1), 'walterLast', ...rest3.slice(1)];
  if (act3.indexOf('doubleYou') < 2) {
    act3.splice(act3.indexOf('doubleYou'), 1);
    act3.splice(3, 0, 'doubleYou');
  }

  const schedule = [...act1, ...act2, ...act3, 'finale'];
  const actOf = [...act1.map(() => 1), ...act2.map(() => 2), ...act3.map(() => 3), 3];
  return {
    seed, name, schedule, actOf, index: 0, act: 1, clock: 0,
    floors: { halloran, ruth, okafor, tommy, dev, couple },
    flags: {}, log: [], pages: [], carFloor: 1, revealB: false, reveal13: false, hasKey: false, delivered: [],
    fed: 0, obeyed: 0, doubleIn: false, handprints: [], rides: 0, used: [], startedAt: Date.now(), playSeconds: 0,
  };
}

/** Called after each act card. */
export function actStart(g: GameScene, act: number): void {
  if (act === 2 && !g.run.reveal13) {
    g.run.reveal13 = true;
    g.toast('There is a button at the bottom of the panel that was not there before. It says 13.', 6);
    Sound.thump(0.25, 55, 0.4);
  }
  if (act === 3) {
    g.car.corrupt = Math.max(g.car.corrupt, 0.6);
    g.toast('The car hums lower now. Floors are harder to stop at.', 5);
  }
}

/** In Act III the car sometimes sails past the floor you asked for. */
export function maybeOvershoot(g: GameScene, f: number): void {
  if (g.run.act >= 3 && Math.random() < 0.35) g.car.passOnce.set(f, 1);
}
