# The Elevator Doesn't Stop

A short psychological horror game (about 20–30 minutes a shift) set inside one old elevator. You're the new night operator at the Marlowe Apartments. Residents call the car, you fetch them, they ask for a floor, you take them there. Over seven hours of night shift the building's routines start slipping: floors that shouldn't exist, passengers who ride twice, buttons that press themselves, hallways that open onto the wrong place, and people who seem to know you already.

Built with TypeScript, Vite and HTML5 Canvas. All pixel art is drawn in code at 384×216 and scaled up by whole numbers, and all sound is synthesized live with WebAudio. Nothing is loaded from outside.

## Run it

```sh
cd elevator
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then writes a static build to dist/
npm run preview    # serves dist/
```

`dist/` is fully static (relative paths), so it can be hosted anywhere.

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Press a floor | Click the button on the brass panel | `1`–`9` (1 = Lobby), `0` = 10, `-` = 11, `=` = 12, `B`, `T` (13) |
| Open / close doors | ◁▷ / ▷◁ buttons | `O` / `C` |
| Work the panel by cursor | — | Arrow keys + `Enter` |
| Advance dialogue | Click anywhere off the panel | `Space` / `Enter` |
| Choose a reply | Click it | Arrows + `Enter`, or `1`–`3` |
| Logbook | Clipboard on the right wall | `L` or `Tab` |
| Car phone | Red box on the left wall | `P` |
| Alarm / key switch | Bell / keyhole buttons | `A` / `K` |
| Pause | — | `Esc` |

A blinking button is a hall call. A lit button is where the car is heading. Pressing a lit button again cancels it, and that matters later.

## How it's put together

- **Three acts, 23 scheduled encounters out of 27.** *Routine* (23:00–01:10), *Drift* (01:10–03:40) and *Descent* (03:40–05:58), then the finale. Each act mixes fixed story beats with ones drawn by weight from a pool, so no two shifts run the same (`buildRun` in `src/game/encounters.ts`).
- **Randomized building.** Every run reshuffles which floor each resident lives on (Mrs. Halloran, her sister Ruth, Mr. Okafor, Tommy Reyes, Dev, the couple). The last act asks you to get the ghosts home *without* telling you the floor. You have to remember, check the logbook (every ride is written into it), or recognise the hallway each ghost describes.
- **Ambient anomalies** (`src/game/anomalies.ts`) keep drifting in by act: flickers, cable creaks, knocking, the dial twitching to 13, the phone ringing once, whispers, handprints on the inside of the doors, the light going out with someone in the car, and buttons that press themselves. Most are harmless. Letting the car reach a floor it chose for itself is not.
- **Consequences.** Choices are tracked across the run: taking people to 13, obeying the car, letting doubles aboard, picking up Walter's key in the flooded pit, which ghosts you actually get home. Together they decide which of the six endings you reach.
- **Environmental storytelling.** The inspection certificate, the capacity plaque, the wall clock, the lobby portrait, the hallway wallpaper and door nameplates all change as the night goes on. Walter's rules (inside the logbook cover) gain new lines. Loose pages turn up.
- **Saving.** Settings, unlocked endings and stats persist in `localStorage`. A checkpoint is written at the start of every ride, so *Continue* picks up where you left off.

### Endings

Six of them: one good, two uneasy, three bad. The endings gallery on the title screen shows a hint for each one you haven't found.

### Settings

Volume (master / effects / ambience), text speed, jump scares on/off (the few jump scares become a sting and a flicker), reduce flashing, screen shake, scanlines, fullscreen, and erase save data.

## Source map

```
src/core/      app loop + scene stack, input, bitmap fonts, WebAudio synth, saves, seeded RNG
src/art/       palette & pixel helpers, procedural people, the car interior, hallway renderer
src/game/      elevator simulation, the GameScene scripting API, encounters, anomalies, cast, endings
src/ui/        dialogue box, menus, title/pause/settings/logbook/endings screens, art gallery
```

Encounters are plain `async` functions written against the `GameScene` API (`call`, `pickup`, `say`, `choose`, `deliver`, `nextStop`, `setHall`, `scare`, …). A new one only needs registering in `ENCOUNTERS` and adding to a pool in `buildRun`.

### Testing hooks

- `?bot=1&speed=10` plays a whole shift automatically (used for the end-to-end tests). Pass decision keys to make it choose badly, e.g. `?bot=double` (lets your double in), `?bot=obey,feed`, `?bot=deliver&finale=key`, `?bot=key` (skips the key); `finale=l|13|key|none` forces the last choice. `seed=N` fixes the run.
- `?gallery` shows every hallway variant and every character for art review (click to page).
