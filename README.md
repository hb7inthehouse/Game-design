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

He stands in the kitchen, between the island and the counters. Walk up and press T (or tap the pink TALK button) to chat. Talking has its own key and button, separate from E / the action button that sits, opens doors and so on, so chatting next to the couch never sits you down by accident: they say hi and a menu of things to say pops up (pick with up/down or a tap, confirm with E/NEXT). Whatever you pick, you say it and they answer, and most answers bring up a new menu, so a chat can go a few different ways (`TALK_TREE` in `game.js`). Options in pink with a ♥ lead to a kiss, and each of those kisses has its own lines afterwards (some lead on into more talking or a cuddle). Some chats end with the two of you cuddling on the couch (or the end of the bed in the bedroom) with the dog curled up next to you: hearts drift up, E / KISS gives a little kiss, and moving gets you up. Others end with you taking the dog straight out to the yard. When the two of them are together they use shared art (`assets/couple.png`): chatting face to face shows them in the talk/chat pose, with a little "..." bubble over whoever's line is typing out, kisses and hugs show them kissing or hugging (some talk-menu kisses are forehead kisses), cuddles show them sitting together on the couch or leaning on each other on the bed, "walk with me" has them walk hand in hand: moving, each walks with their own walk cycle in step, holding hands (sideways he's half a step behind her, up or down they're side by side), and standing still they use the holding-hands art (you steer both; E lets go, and doors take you through together). Saying hello at the same moment, they wave together; taking a selfie, they pose for it, "Surprise me" can end in a piggyback ride, and "Hold still, I want a picture" takes a selfie that pops up as a polaroid. Choosing Kiss from the main menu makes them cheer and hop while hearts float away, and then you swap: you play as him (`assets/him.png`) and she waits where you left her. Talk to her and choose Kiss to swap back. After each kiss the two of them have a short chat in the same text box before you swap. Whoever you're not playing moves around the apartment on their own (couch, kitchen, TV, window), and stops to wave when you walk up. She's Sidney, he's Hudson, and the dog is Dude: their names show in the text box and come up all through the dialogue and the dog-walk messages (`NAMES` and `DOG` at the top of `game.js`). Playing as him, the living-room couch is for video games instead of reading: sitting down starts **Forest Falls**, a real side-scrolling platformer (`assets/forest.png`, `assets/forest-bg.jpg`) shown full screen and mirrored on the TV. Run with left/right, jump with Space/Up (or the JUMP button), attack with E/X (or HIT), drop through planks with Down, quit with Esc or the ✕. Stomp or slash slimes, birds and bats, slash the biting plants, collect coins, gems and hearts, and reach the flag. Every third level ends with a stone golem boss. Lose all four hearts and it's game over; your best level is remembered.

Walk up to the door at the top of the apartment and press E (or tap ENTER) to go into the bedroom; you come in through its bottom door. Stand by that door and press E (or tap EXIT) to go back. Your dog comes with you.

She's a pixel-art sprite set (`assets/her.png`): 8 standing directions, a walk animated from her side view (`assets/her-walk.png`: legs swing and bend at the knee, arms swing; legs step when walking straight up or down), idle poses she strikes when you stop (happy, peace sign, arms crossed, phone, backpack), and after a long wait she sits on the floor. She waves when you walk up to him and cheers when the kiss bar fills. On the couch she faces the TV, glances at the dog when you stop reading, and turns around when she finishes a chapter. There's also a seat on the end of the couch and one on the end of the bed.

The camera is zoomed in and follows her. The dog (a pixel-art sprite sheet in `assets/dog.png`) walks along behind her, and when she stops it stands, sits facing her, lies down and eventually falls asleep. It naps on the couch while she reads and does a play bow when she finishes a chapter or fills the kiss bar.

Take Dude out whenever you like from the front door at the bottom of the living room (press E and pick the walk). Outside (`assets/yard.jpg`) he's on a leash and wanders and sniffs until he goes. Pick it up (PICK UP), throw it in the bin (TRASH), then walk off the left edge to go back inside. You can't go back in until you've cleaned up.

## Tweaking

Everything lives in `game.js`. Each room in `ROOMS` has its map image, walkable `floor`, furniture `obstacles`, couch `seats` and `doors`, all in that map's pixels, plus a `scale` that sizes the characters to the room. Press **H** in-game to see the floor and furniture boxes. `VIEW_SPAN` sets how far the camera is zoomed in, and the `DOG_*_AFTER` timings set how long the dog waits before sitting, lying down and sleeping.


## Heading out

Press E at the front door (bottom of the living room) and choose where to go:

- **Take Dude for a walk**: a short chat, then out to the yard on the leash. There's no timer any more; walks only happen when you choose one.
- **Go to Walmart**: you call the other one over, you both walk to the door, say bye to Dude (he waits by the door), and head out. You can also suggest it from the talk menu ("What should we do?" → "Want to go to Walmart?").

**Walmart** is six connected parts of the store (`assets/store-*.jpg`): walk off an edge to move to the next part. You walk in hand in hand with a shopping list of five things (always a squeaky toy for Dude, plus four random items from 17 across the store). Things on the list sparkle on the shelves and show up on the mini map of the whole store (`assets/store-map.jpg`, top right), along with where you are. Press E (GRAB) next to one to put it in the cart. When you're done, pay at a register at the front (PAY): if anything's missing, the other one reminds you and you can keep shopping or pay anyway. You get a receipt with the total and your shopping time (your best time is saved), then walk out the front doors to go home, where Dude runs up to greet you. Store collisions are in `store-data.js`: every shelf, rack, register, display and wall is traced from the art as a box (or its outline, where a box would cover a walkway), while thin poles and sign posts are left walkable. Press H in the store to see the blocked areas. The item spots and registers live there too.

All text in the game uses the Pixelify Sans pixel font, to match the art.


## They remember things

Chats react to what just happened and to your history together (`memory` and `OPENERS` in `game.js`, saved in the browser):

- **Openers:** the first line of a chat brings up whatever you just did: finishing a chapter, beating a Forest Falls level, walking Dude, a Walmart trip (and whether you got Dude's toy), a cuddle, a selfie, or a kiss a moment ago. It knows whether you did it or they did.
- **Choices that come and go:** "How's the book going?" (talking to Sidney, once she's read some), "How far are you in Forest Falls?" (talking to Hudson), "Want to go back to Walmart?" (right after a trip), "About that kiss I owe you..." (when you're behind on the staring-contest tab), and "I'm sorry about earlier." (after teasing).
- **Memory:** counts of kisses, hugs, cuddles, walks, trips, selfies, compliments and teases ("Kiss number 10! Yes, I'm counting.", "Trip number 3!", "Again? We were JUST there.").
- **Mood:** sweet things (compliments, kisses, hugs, cuddles, walks, trips, apologies) raise it, with a few hearts; teasing and "Bad Dude!" lower it. A happy partner greets you warmly, a low one is short with you, and after teasing they sulk until you apologize.


## Play fight: Parking Lot Showdown

Talk to the other one and pick "Bet I could take you in a fight." Choose how hard they go (easy, best shot, or no holding back), and the two of you square off in the Walmart parking lot at sunset (`assets/fight-bg.jpg`), Street Fighter style. You play whoever you are right now; they fight back. Best of three rounds, 60 seconds each, with health bars, round pips, a timer, ROUND / FIGHT / K.O. announcements and a victory pose.

- **Keys:** arrows / WASD to move, Up or Space to jump, Down to crouch (ducks punches and energy waves), J or E to punch, K or T to kick, hold L or Shift to block, I or Q for the special, Esc to give up.
- **Touch:** the pad to move, jump and crouch, PUNCH, KICK, and hold BLOCK (the RUN button). Down + PUNCH throws the special.
- **Special:** landing and taking hits fills the special meter. When it flashes, throw an energy wave (purple for Hudson, blue for Sidney).
- **After:** back home, they react to who won, with choices for a victory kiss, a consolation kiss, "You cheated.", or a rematch. Wins and losses are remembered and come up next time you challenge them.

Sprites are cut from the move sheets into `assets/fight-him.png` and `assets/fight-her.png` (idle, walk forward and back, punch, kick, crouch, jump, block, hurt, special, victory). Both face right in the art and are mirrored to face left.
