# Lottery Simulator: 16-bit art prompts for ChatGPT

How to use this:

1. Start a new ChatGPT chat and paste the **Style guide** first.
2. Then paste **one asset prompt at a time** (T1, T2, … A1, A2, …). Image generators do much better with one asset per request than with everything at once.
3. For the monkey portraits, upload the matching monkey photo along with the prompt.
4. If a background comes out checkered instead of transparent, ask: "Redo it on a solid flat #FF00FF magenta background."

---

## Style guide (paste this first)

```
I'm making art for a browser game called "Lottery Simulator". Every image I ask for in this chat must follow this style guide.

THE GAME
The player sits in front of a slot machine in a busy casino. Each tap buys a $1 ticket. Almost every time the machine shows a huge red "FAIL". Rarely it pays out and shows a happy monkey. There are 5 collectible monkeys; one, a grinning black crested macaque, is rare.

CAMERA AND LAYOUT
First-person view: we are seated on a stool facing a slot machine. The slot machine cabinet fills the middle of the screen and most of its height. Its glass screen is where the game happens. The casino floor stretches out behind and around the machine: rows of other slot machines, card tables, chandeliers, neon signs, red patterned carpet and patrons seen as silhouettes. Wide 16:9 framing.

ART STYLE
- 16-bit console pixel art, like a mid-1990s SNES / Sega Genesis game.
- Native resolution of 384x216 pixels, scaled up with hard nearest-neighbour edges so every pixel is a crisp square block. No anti-aliasing, no blur, no gradients except dithered ones, no painterly texture.
- Limited palette, about 32 colours per image. Dark outlines (deep purple or near-black, not pure black) around objects.
- Light comes from the slot machine and the neon signs: warm gold and red highlights, deep purple and navy shadows.
- Palette anchors: casino carpet deep red #7A1028 with gold #FFCF33 pattern; walls and shadows navy #141433 and purple #2A1A4A; chrome #C8D0E0 to #6A7090; neon pink #FF4FA8 and cyan #3FE0FF; jackpot gold #FFCF33; FAIL red #FF2424; money green #63D47F.
- Fun and cartoony, not seedy. No real casino names, logos or brands. No readable text unless I ask for it, and any text I ask for must be spelled exactly as written.

SPRITE SHEETS
When I ask for an animation, draw all frames in one image as a single horizontal row, left to right, every frame the same size, evenly spaced, the object in the same position in each frame so the frames line up. Transparent background (or flat #FF00FF magenta if transparency isn't possible). No frame numbers, borders or labels.

Reply "Ready" and wait for my first asset.
```

---

## Textures and still images

### T1. Casino background

```
Asset T1: casino background, 16:9, no slot machine in the foreground (the player's machine is drawn separately on top).
A wide 16-bit pixel-art view of a lively casino floor seen from a seated height. Rows of slot machines with glowing screens recede into the distance on the left and right. In the middle distance: a roulette table and a card table with a dealer, all as small sprites. Crystal chandeliers hang from a dark ceiling. Neon signs in pink and cyan on the back wall (shapes only: stars, cherries, a horseshoe, a banana; no words). Red and gold patterned carpet. A few patrons as dark purple silhouettes. Keep the centre slightly darker and less busy, because the player's slot machine will cover it.
```

### T2. Slot machine cabinet (foreground)

```
Asset T2: the player's slot machine cabinet, front view, transparent background, taller than wide (about 3:4).
A chunky retro slot machine in 16-bit pixel art. Chrome and red body with gold trim. At the top, a light-up marquee box with a row of round bulbs around its edge and a blank space in the middle for a title. In the middle, one large empty screen window filled with flat #FF00FF magenta (the game draws into this window, so keep it a clean rectangle with no reflections). Below the screen: a control deck with an empty panel for buttons, a coin slot and a small empty LED display panel. At the bottom, a coin tray. On the right side, a big pull lever with a red ball on top, in the UP position. A banana-and-monkey motif engraved in the gold trim.
```

### T3. Marquee title sign

```
Asset T3: marquee title sign, wide banner (about 4:1), transparent background.
The words "LOTTERY SIMULATOR" in big chunky 16-bit arcade letters, gold with a dark orange drop shadow and a thin dark outline, sitting on a dark red panel framed by a row of round light bulbs. Spell the words exactly: LOTTERY SIMULATOR.
```

### T4. Buttons

```
Asset T4: slot machine buttons, one sheet, transparent background.
A grid of chunky square arcade push-buttons in 16-bit pixel art, each shown in two states side by side: UP (raised, lit) and PRESSED (pushed in, darker). Rows:
1. "EASY" green button
2. "NORMAL" yellow button
3. "HARD" orange button
4. "REAL" red button
5. Music button with a music-note icon, plus a third version that is dimmed with a slash through the note (muted)
6. Sound button with a speaker icon, plus a third dimmed version with a slash (muted)
Spell the words exactly as written. Leave equal spacing between buttons.
```

### T5. Displays and panels

```
Asset T5: display panels, one sheet, transparent background, 16-bit pixel art.
1. A wide LED money display: black glass, green glowing 7-segment digits showing "$20".
2. The same display with no digits (empty, for the game to write into).
3. Four small brass stat plaques with dark recessed centres, empty (the game will write the numbers on them).
4. A long thin brass plate, empty, for a one-line message.
```

### T6. Big result text

```
Asset T6: result text graphics, one sheet, transparent background, chunky 16-bit arcade lettering with thick dark outlines.
1. "FAIL" in huge bright red #FF2424 letters with a dark red 3D drop and a red glow made of dithered pixels.
2. "JACKPOT!" in gold #FFCF33 with orange shading and white sparkle pixels.
3. "RARE MONKEY!" in gold with a rainbow shimmer outline.
4. "BROKE!" in red on a cracked look.
Spell every word exactly as written.
```

### T7. Collection card frames

```
Asset T7: collectible card frames, one sheet, transparent background, 16-bit pixel art, all frames the same size (portrait, about 3:4).
1. COMMON frame: silver-grey border.
2. UNCOMMON frame: blue border with small gem studs in the corners.
3. RARE frame: gold border with gems and little sparkles.
4. LOCKED card: dark card with a big pixel "?" in the middle and a padlock.
Each frame has an empty square window at the top for a portrait and an empty strip at the bottom for a name. No text.
```

### T8. Monkey portraits (one prompt per monkey, upload the photo with it)

Use this template five times, swapping the description.

```
Asset T8: 16-bit pixel-art portrait of the monkey in the photo I've attached, square, transparent background. Keep its real colours, pose and expression so it's recognisable, but redraw it fully as SNES-era pixel art with the style guide's palette and outlines. Head and shoulders, filling the square.
Monkey: <DESCRIPTION>
```

Descriptions:

- **Finger Hugger (common):** a tiny grey pygmy marmoset with big round dark eyes hugging a human finger, black striped tail curled underneath.
- **Pocket Marmoset (common):** a tiny grey pygmy marmoset clinging to a fingertip, looking at the camera.
- **Big Nose (uncommon):** a proboscis monkey in side profile, orange fur, a huge droopy pink nose and a little smile.
- **Wild Hair (uncommon):** a scruffy baby marmoset with wild sticking-up tan hair and big shiny black eyes, sitting in a hand.
- **Selfie Grin (rare):** a black crested macaque with amber eyes and a huge toothy grin, looking straight at us, as if taking a selfie. Add a subtle gold glow around the edge because it's the rare one.

---

## Animation sprite sheets

Frame sizes are in native pixels before scaling up.

### A1. Lever pull (8 frames, plays once per ticket)

```
Asset A1: sprite sheet, 8 frames in one horizontal row, transparent background. The slot machine's pull lever from asset T2, by itself.
Frames: 1 lever up at rest; 2-4 the lever swings down in an arc; 5 lever fully down with a small white impact spark; 6-7 it springs back up and overshoots slightly; 8 back at rest.
```

### A2. Spinning reels (drawing animation)

```
Asset A2: two sprite sheets in one image, each a horizontal row, transparent background. One slot reel strip (a vertical window showing about 3 symbols).
Row 1, SPIN LOOP, 4 frames: the reel spinning fast, symbols smeared into vertical motion-blur streaks drawn with pixel speed lines. Symbols: banana, cherry, gold coin, monkey face, red X.
Row 2, STOP, 6 frames: the reel slows down, overshoots, bounces back and lands with one symbol centred.
```

### A3. Marquee lights (4 frames, loop)

```
Asset A3: sprite sheet, 4 frames in a row, transparent background. The light-bulb border from the marquee sign (T3) with no text inside. The lit bulbs chase around the border clockwise: in each frame every 4th bulb is lit gold and the others are dim, shifting one bulb per frame so it loops smoothly.
```

### A4. FAIL slam (6 frames, plays once)

```
Asset A4: sprite sheet, 6 frames in a row, transparent background. The red "FAIL" text from T6 slamming onto the screen.
Frames: 1 huge and semi-transparent (dithered); 2 smaller; 3 squashed flat on impact with a burst of red pixel dust; 4 stretched tall; 5 settling; 6 at rest, normal size.
```

### A5. Sad trombone droop (4 frames, loop while FAIL shows)

```
Asset A5: sprite sheet, 4 frames in a row, transparent background. A tiny 16-bit cartoon trombone made of brass pixels, droopy and sad, slide pushing out and back with little musical notes drooping downward. Small sprite (about 32x32 per frame).
```

### A6. Jackpot lights (4 frames, loop)

```
Asset A6: sprite sheet, 4 frames in a row, transparent background. A rotating beacon / siren light that sits on top of the slot machine: gold dome with a light beam sweeping around, flashing red, gold, pink, cyan.
```

### A7. Coins pouring into the tray (8 frames, loop while paying out)

```
Asset A7: sprite sheet, 8 frames in a row, transparent background. The slot machine's coin tray seen from the front with a stream of gold coins pouring down into it from a chute above, the pile in the tray growing a little each frame, coins bouncing and glinting.
```

### A8. Spinning coin (6 frames, loop)

```
Asset A8: sprite sheet, 6 frames in a row, transparent background. A single gold coin with a banana stamped on it, spinning: face-on, three-quarter, edge-on, three-quarter back, back face, three-quarter. About 16x16 pixels per frame.
```

### A9. Confetti and bananas (particles)

```
Asset A9: particle sprite sheet, transparent background, three rows.
Row 1: a cartoon banana tumbling, 6 frames rotating through a full spin.
Row 2: a piece of confetti fluttering, 4 frames (flat, tilted, edge-on, tilted), in gold.
Row 3: the same confetti 4 frames, in pink, cyan and green versions next to each other.
Small sprites, about 16x16 per frame.
```

### A10. Monkey reveal (8 frames, plays once on a win; one sheet per monkey)

```
Asset A10: sprite sheet, 8 frames in a row, transparent background, using the pixel monkey portrait I made in T8 (<MONKEY NAME>).
The monkey pops up into the slot machine screen: 1 just the top of its head peeking up from the bottom; 2-3 rising fast; 4 jumping up past its rest position, stretched; 5 squashed as it lands; 6 bounce; 7 settling; 8 at rest, smiling, with two sparkle pixels near its eyes.
```

### A11. Monkey happy idle (4 frames, loop after the reveal; one sheet per monkey)

```
Asset A11: sprite sheet, 4 frames in a row, transparent background, the same pixel monkey from T8 (<MONKEY NAME>).
A gentle happy loop: it tilts its head left, back to centre, tilts right, back to centre, with a blink in one frame.
```

### A12. Rare monkey gold sparkle (6 frames, loop, overlay)

```
Asset A12: sprite sheet, 6 frames in a row, transparent background. A ring of gold and white 4-point pixel star sparkles that twinkle on and off around an empty square space (to sit around the rare monkey's portrait), plus a soft dithered gold aura that pulses brighter and dimmer.
```

### A13. Broke / game over (8 frames, plays once)

```
Asset A13: sprite sheet, 8 frames in a row, transparent background. A brown leather wallet in 16-bit pixel art: 1 closed; 2-3 it flips open; 4 shows it's empty; 5-7 a little moth flutters out of it and flies up; 8 the wallet hangs open and limp.
```

### A14. Casino ambience loops (background details)

```
Asset A14: sprite sheet, transparent background, four rows, each a loop.
Row 1, 3 frames: a pink neon sign shaped like a banana flickering (on, half-on, off).
Row 2, 4 frames: a background slot machine (small, far away) with its screen blinking colours.
Row 3, 4 frames: a dark purple patron silhouette sitting at a slot machine, pulling its lever.
Row 4, 4 frames: a chandelier's crystals twinkling.
```

### A15. Button press glow (2 frames)

```
Asset A15: sprite sheet, 2 frames, transparent background. A soft gold pixel glow ring that appears around a square arcade button when it is pressed: frame 1 bright and tight, frame 2 wider and fading.
```

---

## Checklist

| ID | Asset | Kind | Frames |
|---|---|---|---|
| T1 | Casino background | Still | 1 |
| T2 | Slot machine cabinet | Still | 1 |
| T3 | Marquee title sign | Still | 1 |
| T4 | Buttons (up / pressed / muted) | Still sheet | — |
| T5 | Money display and stat plaques | Still sheet | — |
| T6 | FAIL / JACKPOT! / RARE MONKEY! / BROKE! text | Still sheet | — |
| T7 | Collection card frames | Still sheet | — |
| T8 | 5 monkey portraits | Still ×5 | 1 each |
| A1 | Lever pull | Animation | 8 |
| A2 | Reels spinning and stopping | Animation | 4 + 6 |
| A3 | Marquee lights chase | Loop | 4 |
| A4 | FAIL slam | Animation | 6 |
| A5 | Sad trombone | Loop | 4 |
| A6 | Jackpot siren light | Loop | 4 |
| A7 | Coins pouring into tray | Loop | 8 |
| A8 | Spinning coin | Loop | 6 |
| A9 | Banana and confetti particles | Loop | 6 / 4 / 4 |
| A10 | Monkey reveal (×5) | Animation | 8 each |
| A11 | Monkey happy idle (×5) | Loop | 4 each |
| A12 | Rare monkey sparkle | Loop | 6 |
| A13 | Broke wallet | Animation | 8 |
| A14 | Casino ambience | Loops | 3 / 4 / 4 / 4 |
| A15 | Button press glow | Animation | 2 |
