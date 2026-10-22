# Living Room

A free-roam sandbox: walk a character around a top-down pixel-art apartment (living room and kitchen) and the bedroom through the door at the top. No objective yet.

## Play

Serve the folder and open it in a browser (the map image won't load from `file://` in some browsers):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

- **Arrows / WASD**: move
- **Shift**: run
- **E / Space**: sit on the couch when you're next to it, then mash it to read (arrows get you up); go through doors when the prompt shows
- **H**: show/hide collision boxes
- **Touch screens**: an on-screen D-pad appears below the map; tap RUN to toggle running, SIT/READ for the couch, ENTER/EXIT at doors.

## Play on your phone

A hosted copy runs inside the Claude app: https://claude.ai/artifact/3jkuJWVcY6zxmnhTQKpsD9

Walk up to the couch to sit and read (she faces the TV, so you see her from behind). Reading opens the book: drag the finger along every line to turn the text from black to yellow before the timer runs out, and the page turns. Read 4 pages to finish the chapter, then she stands up. The dog-walk alert waits while any minigame is going on. Her dog tags along behind her and hops up to lie beside her whenever she sits down.

He stands in the kitchen, between the island and the counters. Walk up and press E (or tap TALK) to chat: they say hi and a menu of things to say pops up (pick with up/down or a tap, confirm with E/NEXT). The conversations branch a little (`TALK_TREE` in `game.js`), and some end in a kiss. Choosing Kiss makes them cheer and hop while hearts float away, and then you swap: you play as him (`assets/him.png`) and she waits where you left her. Talk to her and choose Kiss to swap back. After each kiss the two of them have a short chat in the same text box before you swap, and there's a hidden 5 second cooldown before the next one. Whoever you're not playing moves around the apartment on their own (couch, kitchen, TV, window), and stops to wave when you walk up. Their names are in `NAMES` in `game.js`. Playing as him, the living-room couch is for video games instead of reading: sitting down starts **Forest Falls**, a real side-scrolling platformer (`assets/forest.png`, `assets/forest-bg.jpg`) shown full screen and mirrored on the TV. Run with left/right, jump with Space/Up (or the JUMP button), attack with E/X (or HIT), drop through planks with Down, quit with Esc or the ✕. Stomp or slash slimes, birds and bats, slash the biting plants, collect coins, gems and hearts, and reach the flag. Every third level ends with a stone golem boss. Lose all four hearts and it's game over; your best level is remembered.

Walk up to the door at the top of the apartment and press E (or tap ENTER) to go into the bedroom; you come in through its bottom door. Stand by that door and press E (or tap EXIT) to go back. Your dog comes with you.

She's a pixel-art sprite set (`assets/her.png`): 8 standing directions, a walk animated from her side view (`assets/her-walk.png`: legs swing and bend at the knee, arms swing; legs step when walking straight up or down), idle poses she strikes when you stop (happy, peace sign, arms crossed, phone, backpack), and after a long wait she sits on the floor. She waves when you walk up to him and cheers when the kiss bar fills. On the couch she faces the TV, glances at the dog when you stop reading, and turns around when she finishes a chapter. There's also a seat on the end of the couch and one on the end of the bed.

The camera is zoomed in and follows her. The dog (a pixel-art sprite sheet in `assets/dog.png`) walks along behind her, and when she stops it stands, sits facing her, lies down and eventually falls asleep. It naps on the couch while she reads and does a play bow when she finishes a chapter or fills the kiss bar.

At a random moment every 2 to 4 minutes indoors the dog needs to go out: a banner gives you 10 seconds to reach the front door at the bottom of the living room and press WALK, or he has an accident. Outside (`assets/yard.jpg`) he's on a leash and wanders and sniffs until he goes. Pick it up (PICK UP), throw it in the bin (TRASH), then walk off the left edge to go back inside. You can't go back in until you've cleaned up.

## Tweaking

Everything lives in `game.js`. Each room in `ROOMS` has its map image, walkable `floor`, furniture `obstacles`, couch `seats` and `doors`, all in that map's pixels, plus a `scale` that sizes the characters to the room. Press **H** in-game to see the floor and furniture boxes. `VIEW_SPAN` sets how far the camera is zoomed in, and the `DOG_*_AFTER` timings set how long the dog waits before sitting, lying down and sleeping.
