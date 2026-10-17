# Living Room

A free-roam sandbox: walk a character around a top-down pixel-art apartment (living room and kitchen). No objective yet.

## Play

Serve the folder and open it in a browser (the map image won't load from `file://` in some browsers):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

- **Arrows / WASD**: move
- **Shift**: run
- **E / Space**: sit on the couch when you're next to it, then mash it to read (arrows get you up)
- **H**: show/hide collision boxes
- **Touch screens**: an on-screen D-pad appears below the map; tap RUN to toggle running, SIT/READ for the couch.

## Play on your phone

A hosted copy runs inside the Claude app: https://claude.ai/artifact/3jkuJWVcY6zxmnhTQKpsD9

Walk up to the couch to sit and read (she faces the TV, so you see her from behind). Her dog tags along behind her and hops up to lie beside her whenever she sits down.

He stands in the kitchen, between the island and the counters: walk up and mash E (or tap KISS) to fill the kiss bar. When it fills he jumps with his arms up and hearts float away, then there's a hidden 5 second cooldown before he'll take more.

## Tweaking

Everything lives in `game.js`. The walkable floor is `FLOOR_AREAS`, furniture is in `OBSTACLES` and couch spots are in `SEATS`, all in map-image pixels (1536 x 1024, `assets/apartment.jpg`). Press **H** in-game to see the floor and furniture boxes.
