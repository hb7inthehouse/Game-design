# Lottery Simulator: making monkeys reachable, and new gameplay loops

> **Status:** everything below is now in the game (`index.html`). Since this was written the album grew to 9: three new monkeys (Red Lips, Party Chimp, Too Cool) and a legendary, Sidney. Perks for the new ones: Red Lips +10% prizes, Party Chimp 12.5% of wins pay double, Too Cool +20% sell prices, Sidney makes the Banana Meter fill twice as fast. Progress is saved in the browser.

## Why monkeys are hard to get right now

On Normal you start with $20 and each $1 ticket has a 1 in 20 chance. Without a single win you're broke after 20 tickets, and that happens about 36% of the time. A win gives a *random* monkey, so the same common one comes back again and again: the rare Selfie Grin is 1 in 400 tickets. Collecting all five takes a few hundred tickets, but a run usually ends after 20–60.

### Fixes (they combine well)

1. **Banana Meter (pity timer). Recommended.** Every FAIL adds a banana to a meter on the machine. When it's full, the next ticket is a guaranteed monkey. The meter fills after 5 fails on Easy, 15 on Normal, 40 on Hard, and stays off for Real Lottery so that mode still makes its point. The player always sees progress, even while losing.
2. **New monkeys first. Recommended.** Monkeys you haven't found yet are 3× more likely to come up than ones you already own. You collect the set much faster, and duplicates still happen.
3. **Free daily coins.** If you're broke, a "Free $10" button appears once a day (or every 15 minutes), so a run never truly dead-ends.
4. **Lucky streak bonus.** After 10 fails in a row, the odds double for the next 5 tickets ("The machine feels warm…").

---

## Gameplay loops

### 1. Monkey Market: sell your monkeys (core loop)

**Loop:** buy tickets → win monkeys → sell duplicates → buy more tickets.

- A **Market** panel lists a price for each monkey: common ~$8, uncommon ~$25, rare ~$150.
- Prices **drift every few tickets** (up or down 5–30%) and show a little up/down arrow and a sparkline. Deciding when to sell is the game: sell now, or hold for a better price?
- **Market events** from time to time: "Big Nose craze! Big Nose prices ×3 for 20 tickets", "Marmoset crash: commons −50%".
- You can only sell a monkey you own more than one of, *or* you confirm selling your last one (then it shows as "sold" in the album).
- The selling sound is a cash register; coins pour into the tray (reuses the coin animation).

### 2. Shiny monkeys

- Every win has a 1 in 25 chance of a **Shiny** version: gold outline, sparkle overlay, worth 10× at the market.
- The album shows a second slot for each monkey's shiny. That gives 10 collectibles instead of 5, with no new art needed (the shiny effect is done in code).

### 3. Keep or sell: monkey perks

Each monkey you *keep* gives a passive perk, so selling has a real cost:

| Monkey | Perk while owned |
|---|---|
| Finger Hugger | +1 extra banana on the Banana Meter per FAIL |
| Pocket Marmoset | Tickets cost $0.90 instead of $1 |
| Big Nose | "Sniffs out" wins: +10% odds |
| Wild Hair | 1 in 10 FAILs refund your ticket |
| Selfie Grin | All prizes ×2 |

Perks don't stack per copy, so duplicates are for selling and the first copy is for keeping.

### 4. Combine three into one (fusion)

- Trade 3 copies of the same monkey for **1 level-up**: Lv1 → Lv2 → Lv3. A higher level makes its perk stronger and its sell price higher.
- Or trade 5 different commons for a **guaranteed uncommon**, and 3 uncommons for a **guaranteed rare**. This turns bad luck into progress.

### 5. Monkey Zoo (idle income)

- Monkeys you put "in the zoo" earn a trickle of money per minute, even while you're away (rare earns more). The zoo shows them in little pixel habitats.
- Coming back after a break: "Your monkeys earned $46 while you were gone!" That gives a reason to return.

### 6. Albums and series

- Completing the 5-monkey album unlocks **Series 2** (for example "Space Monkeys" or "Pirate Monkeys") with a new machine skin and 5 new monkeys.
- Each series has a set bonus: complete it and get a permanent +5% prize or a new machine colour.

### 7. Machine upgrades shop

Spend money on the machine itself:
- **Better bulbs:** +5% odds (3 levels)
- **Bigger tray:** +20% prize (3 levels)
- **Auto-lever:** plays a ticket every 2 seconds on its own
- **Triple reels mode:** 3 tickets at once
- **Lucky charm:** fills the Banana Meter 20% faster

### 8. Daily quests

Three small goals a day with cash or banana rewards:
- "Pull the lever 30 times"
- "Lose 10 in a row" (a consolation quest, so losing is funny instead of painful)
- "Sell a monkey for over $30"
- "Win on Hard"

### 9. Collector offers (timed decisions)

Now and then a character walks up: "A collector offers **$90** for your Wild Hair. 20 seconds to decide!" Accept or decline. Sometimes the offer is great, sometimes it's a lowball.

### 10. Retire (prestige)

When you have enough money, you can **Retire**: money and upgrades reset, you keep your album, and you get **Golden Bananas** that permanently boost odds or prizes. This is the long-term loop for players who have finished the collection.

### 11. Keep the lottery lesson

- A **"Lifetime: spent $412, won $308"** line in the stats keeps the original point visible: the house always wins.
- Real Lottery mode stays untouched (no pity meter, no perks), as the "this is what it's really like" mode.

---

## Suggested build order

1. **Banana Meter + new monkeys first.** This fixes the "I can't get monkeys" problem right away.
2. **Monkey Market** with drifting prices and selling duplicates. This is the core collect-and-sell loop.
3. **Perks** (keep vs sell) and **shiny** variants.
4. **Fusion** (3 → 1 level-up).
5. **Upgrades shop** and **daily quests**.
6. **Zoo**, **Series 2**, **Retire**.

Steps 1–3 need no new art. The zoo habitats, Series 2 monkeys and collector characters would need new ChatGPT art.
