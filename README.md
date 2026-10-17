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

Walk up to the couch to sit and read (she faces the TV, so you see her from behind). Her dog tags along behind her and hops up to lie beside her whenever she sits down.

He stands in the kitchen, between the island and the counters: walk up and mash E (or tap KISS) to fill the kiss bar. When it fills he jumps with his arms up and hearts float away, then there's a hidden 5 second cooldown before he'll take more.

Walk up to the door at the top of the apartment and press E (or tap ENTER) to go into the bedroom; you come in through its bottom door. Stand by that door and press E (or tap EXIT) to go back. Your dog comes with you.

The camera is zoomed in and follows her. The dog (a pixel-art sprite sheet in `assets/dog.png`) walks along behind her, and when she stops it stands, sits facing her, lies down and eventually falls asleep. It naps on the couch while she reads and does a play bow when she finishes a chapter or fills the kiss bar.

## Tweaking

Everything lives in `game.js`. Each room in `ROOMS` has its map image, walkable `floor`, furniture `obstacles`, couch `seats` and `doors`, all in that map's pixels, plus a `scale` that sizes the characters to the room. Press **H** in-game to see the floor and furniture boxes. `VIEW_SPAN` sets how far the camera is zoomed in, and the `DOG_*_AFTER` timings set how long the dog waits before sitting, lying down and sleeping.
