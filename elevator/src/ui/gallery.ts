// Developer view (?gallery): every hallway variant and every character, for art review.
import type { Scene } from '../core/app';
import { W, H, type InputEvent } from '../core/input';
import { hallway, type HallVariant } from '../art/hallway';
import { sprite, dogSprite } from '../art/character';
import { LOOKS } from '../game/cast';
import { TINY, drawText } from '../core/font';
import { C } from '../art/palette';

const HALLS: [number, HallVariant][] = [
  [1, 'normal'], [2, 'normal'], [3, 'normal'], [4, 'normal'], [5, 'normal'], [6, 'normal'], [7, 'normal'], [8, 'normal'],
  [9, 'normal'], [10, 'normal'], [11, 'normal'], [12, 'normal'], [0, 'pit'], [-1, 'thirteen'], [1, 'dawn'], [1, 'lobbydark'],
  [7, 'infinite'], [9, 'brick'], [10, 'cab'], [6, 'flooded'], [3, 'old'], [9, 'ceiling'], [8, 'samedoors'], [5, 'figure'],
  [4, 'dark'], [7, 'stairs'], [-1, 'thirteen_crowd'], [3, 'opendoor'], [7, 'leash'], [11, 'mirror'], [9, 'shoes'], [2, 'old'],
];

export class GalleryScene implements Scene {
  page = 0;
  update(_dt: number, events: InputEvent[]): void {
    for (const e of events) if (e.type === 'down' || e.type === 'key') this.page = (this.page + 1) % 5;
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    if (this.page < 4) {
      const items = HALLS.slice(this.page * 8, this.page * 8 + 8);
      items.forEach(([f, v], i) => {
        const x = (i % 4) * 96, y = Math.floor(i / 4) * 108;
        const img = hallway({ floor: f, variant: v, act: v === 'normal' && f === 9 ? 2 : 1, names: { 9: 'HALLORAN', 3: 'PIKE', 11: 'OKAFOR', 2: 'REYES' }, keyGlint: true, figureDist: 2.5 });
        ctx.drawImage(img, 0, 0, 128, 120, x, y, 96, 90);
        drawText(ctx, TINY, `${f} ${v}`, x + 2, y + 94, C.amber);
      });
      return;
    }
    const ids = Object.keys(LOOKS);
    ids.forEach((id, i) => {
      const x = (i % 12) * 32 - 16, y = Math.floor(i / 12) * 100;
      const front = i % 2 === 0;
      ctx.drawImage(sprite(LOOKS[id], front ? 'front' : 'back', 0, id === 'grayman' ? 'smile' : 'normal'), x, y);
      drawText(ctx, TINY, id.slice(0, 7), x + 18, y + 100 - 8, C.amber);
    });
    ctx.drawImage(dogSprite(0, true), 340, 190);
  }
}
