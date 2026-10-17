# Living Room

A free-roam sandbox: walk a character around a top-down living room floor plan. No objective yet.

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

Her dog tags along behind her and hops up to lie beside her whenever she sits down to read.

He stands in the top-right corner: walk up and mash E (or tap KISS) to fill the kiss bar. When it fills he jumps with his arms up and hearts float away, then there's a hidden 5 second cooldown before he'll take more.

## Tweaking

Everything lives in `game.js`. Walls are the `FLOOR` rectangle and furniture is in `OBSTACLES`, both in map-image pixels (1312 x 1199). Press **H** in-game to see them.
