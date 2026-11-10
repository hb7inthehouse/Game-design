// Procedural pixel-art people, drawn from a "look" description at 1:1 pixel scale.
import { C, canvas, ellipse, outline, rect, px, shade, tint } from './palette';

export type HairStyle = 'short' | 'bun' | 'long' | 'bald' | 'curly' | 'bob' | 'slick' | 'kid' | 'none';
export type TopStyle = 'coat' | 'jacket' | 'scrubs' | 'nightgown' | 'suit' | 'shirt' | 'hoodie' | 'uniform' | 'dress' | 'cardigan' | 'stripes';
export type Prop = 'cakeTin' | 'bag' | 'takeout' | 'leash' | 'toolbox' | 'logbook' | 'umbrella' | 'pizza' | 'tote' | 'flowers' | 'none';
export type Face = 'normal' | 'blank' | 'smile' | 'hollow' | 'closed' | 'sad' | 'wide';
export type Facing = 'front' | 'back';

export interface Look {
  h: number;
  build?: number;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  hat?: 'cap' | 'operator' | 'workcap' | 'none';
  top: string;
  topStyle: TopStyle;
  accent?: string;
  bottom: string;
  bottomStyle: 'pants' | 'skirt' | 'shorts' | 'none';
  shoes: string;
  prop?: Prop;
  glasses?: boolean;
  mustache?: boolean;
  barefoot?: boolean;
  stockings?: string;
  tint?: 'sepia' | 'ghost' | 'dark' | 'red' | 'dawn';
}

export const SPRITE_W = 64;
const cache = new Map<string, HTMLCanvasElement>();

/** `scale` grows people as they step toward the camera (1 = at the door). */
export function sprite(look: Look, facing: Facing, frame: number, face: Face, scale = 1): HTMLCanvasElement {
  const h = Math.round(look.h * scale);
  const key = JSON.stringify([look, facing, frame, face, h]);
  let c = cache.get(key);
  if (!c) {
    const k = h / look.h;
    const scaled: Look = { ...look, h, build: look.build ? Math.round(look.build * k) : undefined };
    c = drawPerson(scaled, facing, frame, face, k);
    cache.set(key, c);
  }
  return c;
}

const SKIN_DARK = (s: string) => shade(s, -0.22);

function drawPerson(L: Look, facing: Facing, frame: number, face: Face, k = 1): HTMLCanvasElement {
  const H = L.h + 4;
  const [cv, ctx] = canvas(SPRITE_W, H);
  const child = L.h < 75;
  const cx = SPRITE_W / 2;
  const headH = Math.round(L.h * (child ? 0.22 : 0.17));
  const headW = Math.round(headH * 0.8);
  const neckH = child ? 1 : 2;
  const torsoH = Math.round(L.h * (child ? 0.3 : 0.33));
  const S = L.build ?? Math.round(L.h * (child ? 0.3 : 0.26));
  const hipW = S - 4;
  const armW = Math.round((child ? 4 : 5) * Math.min(1.3, k));
  const armLen = Math.round(torsoH * 1.04);
  const bob = frame === 0 ? 0 : 1;
  const y0 = 2 + bob;
  const headX = Math.round(cx - headW / 2);
  const yT = y0 + headH + neckH;
  const hipY = yT + torsoH;
  const feetY = H - 2;
  const legH = feetY - hipY;
  const front = facing === 'front';
  const side = front ? -1 : 1; // which screen side holds the prop

  const top = L.top;
  const topD = shade(top, -0.3);
  const topL = shade(top, 0.14);
  const skin = L.skin;
  const skinD = SKIN_DARK(skin);

  // ---- Legs ----
  const legW = Math.floor(hipW / 2) - 1;
  const lift = [0, 0];
  if (frame === 1) lift[0] = 2;
  if (frame === 2) lift[1] = 2;
  const legColor = L.bottomStyle === 'pants' ? L.bottom : L.stockings ?? skin;
  for (let i = 0; i < 2; i++) {
    const lx = i === 0 ? Math.round(cx - legW - 1) : Math.round(cx + 1);
    const ly = hipY;
    const lh = legH - 3 - lift[i];
    rect(ctx, lx, ly, legW, lh, legColor);
    rect(ctx, i === 0 ? lx : lx + legW - 1, ly, 1, lh, shade(legColor, -0.28));
    if (L.bottomStyle === 'shorts') {
      rect(ctx, lx, ly, legW, Math.round(legH * 0.3), L.bottom);
      rect(ctx, lx, ly + Math.round(legH * 0.3), legW, 1, shade(L.bottom, -0.3));
    }
    // shoes
    const sy = ly + lh;
    if (L.barefoot) {
      rect(ctx, lx, sy, legW, 3, skin);
      rect(ctx, lx, sy + 2, legW, 1, skinD);
    } else {
      const sw = legW + 1;
      const sx = i === 0 ? lx - 1 : lx;
      rect(ctx, sx, sy, sw, 3, L.shoes);
      rect(ctx, sx, sy, sw, 1, shade(L.shoes, 0.2));
    }
  }
  if (L.bottomStyle === 'pants') rect(ctx, cx - 1, hipY, 2, Math.round(legH * 0.2), shade(L.bottom, -0.35));

  // ---- Skirt / long garments ----
  let hemY = hipY;
  if (L.topStyle === 'coat') hemY = hipY + Math.round(legH * 0.55);
  if (L.topStyle === 'nightgown') hemY = feetY - 6;
  if (L.topStyle === 'dress') hemY = hipY + Math.round(legH * 0.42);
  if (L.bottomStyle === 'skirt') {
    const sk = hipY + Math.round(legH * 0.45);
    for (let y = hipY; y < sk; y++) {
      const t = (y - hipY) / (sk - hipY);
      const w = Math.round(hipW + t * 4);
      rect(ctx, cx - w / 2, y, w, 1, L.bottom);
    }
    rect(ctx, cx - (hipW + 4) / 2, sk - 1, hipW + 4, 1, shade(L.bottom, -0.3));
  }
  if (hemY > hipY) {
    for (let y = hipY; y < hemY; y++) {
      const t = (y - hipY) / (hemY - hipY);
      const w = Math.round(hipW + 1 + t * (L.topStyle === 'nightgown' ? 6 : 4));
      rect(ctx, cx - w / 2, y, w, 1, top);
      rect(ctx, cx - w / 2, y, 1, 1, topD);
      rect(ctx, cx + w / 2 - 1, y, 1, 1, topD);
    }
    const w = Math.round(hipW + 1 + (L.topStyle === 'nightgown' ? 6 : 4));
    rect(ctx, cx - w / 2, hemY - 1, w, 1, topD);
    if (L.topStyle === 'coat' && front) {
      rect(ctx, cx, hipY, 1, hemY - hipY, topD);
    }
    if (L.topStyle === 'nightgown') {
      for (let y = hipY + 4; y < hemY - 2; y += 5) rect(ctx, cx - 3 + ((y / 5) % 2), y, 1, 3, shade(top, -0.15));
    }
  }

  // ---- Arms (behind torso edges) ----
  const armColor = top;
  const shortSleeve = L.topStyle === 'scrubs' || (L.topStyle === 'stripes' && child);
  const holdFront = L.prop === 'cakeTin' || L.prop === 'pizza';
  for (let i = 0; i < 2; i++) {
    const dir = i === 0 ? -1 : 1;
    const ax = dir < 0 ? Math.round(cx - S / 2 - armW + 2) : Math.round(cx + S / 2 - 2);
    const swing = frame === 0 ? 0 : (frame === 1 ? 1 : -1) * dir;
    const ay = yT + 1;
    if (holdFront && front) {
      // Upper arm down, forearm bent toward the middle.
      const upper = Math.round(armLen * 0.55);
      rect(ctx, ax, ay, armW, upper, armColor);
      rect(ctx, dir < 0 ? ax : ax + armW - 1, ay, 1, upper, topD);
      const fx = dir < 0 ? ax + 1 : ax - 5;
      rect(ctx, fx, ay + upper - 3, armW + 4, 4, armColor);
      continue;
    }
    const len = armLen + swing;
    rect(ctx, ax, ay, armW, len, armColor);
    rect(ctx, dir < 0 ? ax : ax + armW - 1, ay, 1, len, topD);
    rect(ctx, ax, ay, armW, 1, topL);
    if (shortSleeve) {
      const sl = Math.round(len * 0.35);
      rect(ctx, ax, ay + sl, armW, len - sl, skin);
      rect(ctx, dir < 0 ? ax : ax + armW - 1, ay + sl, 1, len - sl, skinD);
    }
    if (L.topStyle === 'uniform') rect(ctx, ax, ay + len - 3, armW, 1, C.brass3);
    // hand
    rect(ctx, ax + 1, ay + len, armW - 2, 3, skin);
    rect(ctx, ax + 1, ay + len + 2, armW - 2, 1, skinD);
  }

  // ---- Torso ----
  for (let y = yT; y < hipY; y++) {
    const t = (y - yT) / torsoH;
    let w = Math.round(S - t * (S - hipW));
    if (y === yT) w -= 4;
    else if (y === yT + 1) w -= 2;
    rect(ctx, cx - w / 2, y, w, 1, top);
    rect(ctx, cx - w / 2, y, 1, 1, topD);
    rect(ctx, cx + w / 2 - 1, y, 1, 1, topD);
  }
  rect(ctx, cx - S / 2 + 2, yT, S - 4, 1, topL);

  // garment details
  const st = L.topStyle;
  if (front) {
    if (st === 'coat' || st === 'jacket' || st === 'suit' || st === 'cardigan') {
      const inner = st === 'suit' ? C.white : st === 'cardigan' ? L.accent ?? C.cream2 : L.accent ?? shade(top, -0.45);
      const vDepth = st === 'coat' ? 8 : 12;
      for (let k = 0; k < vDepth; k++) {
        const w = Math.max(1, Math.round(6 - (k * 6) / vDepth));
        rect(ctx, cx - w / 2, yT + k, w, 1, inner);
      }
      if (st === 'suit') rect(ctx, cx - 1, yT + 2, 2, 12, L.accent ?? C.red1);
      // lapels
      rect(ctx, cx - 5, yT + 1, 1, vDepth - 2, topD);
      rect(ctx, cx + 4, yT + 1, 1, vDepth - 2, topD);
      if (st === 'cardigan') {
        rect(ctx, cx - 1, yT + vDepth, 2, torsoH - vDepth, inner);
      } else {
        rect(ctx, cx, yT + vDepth, 1, torsoH - vDepth, topD);
        for (let b = 0; b < 3; b++) px(ctx, cx - 2, yT + vDepth + 3 + b * 6, shade(top, -0.55));
      }
    }
    if (st === 'uniform') {
      for (let k = 0; k < 5; k++) rect(ctx, cx - 3 + Math.floor(k / 2), yT + k, 6 - k, 1, C.cream2);
      for (let b = 0; b < 4; b++) {
        px(ctx, cx - 3, yT + 7 + b * 6, C.brass3);
        px(ctx, cx + 2, yT + 7 + b * 6, C.brass3);
      }
      rect(ctx, cx - S / 2 + 3, yT + 9, 4, 2, C.brass2); // name plate
    }
    if (st === 'scrubs') {
      for (let k = 0; k < 6; k++) rect(ctx, cx - 3 + Math.floor(k / 2), yT + k, 6 - Math.floor(k / 2) * 2, 1, skin);
      rect(ctx, cx + 3, yT + 10, 5, 4, topD);
    }
    if (st === 'nightgown') {
      rect(ctx, cx - 4, yT, 8, 3, skin);
      rect(ctx, cx - 5, yT + 3, 10, 1, shade(top, -0.2));
    }
    if (st === 'dress') rect(ctx, cx - 3, yT, 6, 2, skin);
    if (st === 'hoodie') {
      rect(ctx, cx - 5, yT, 10, 3, topD);
      rect(ctx, cx - 1, yT + 3, 1, 6, C.cream2);
      rect(ctx, cx + 1, yT + 3, 1, 5, C.cream2);
      rect(ctx, cx - 6, hipY - 10, 12, 6, topD);
    }
    if (st === 'shirt') {
      rect(ctx, cx - 2, yT, 4, 2, skin);
      rect(ctx, cx, yT + 2, 1, torsoH - 2, topD);
    }
  } else {
    // back details: collar + seam
    rect(ctx, cx - 4, yT, 8, 2, topD);
    if (st === 'coat' || st === 'uniform' || st === 'suit' || st === 'jacket') rect(ctx, cx, yT + 4, 1, torsoH - 4, topD);
    if (st === 'hoodie') rect(ctx, cx - 6, yT - 2, 12, 5, topD);
    if (st === 'scrubs' || st === 'shirt') rect(ctx, cx - 3, yT, 6, 1, skin);
  }
  if (st === 'stripes') {
    for (let y = yT + 3; y < hipY; y += 4) {
      const t = (y - yT) / torsoH;
      const w = Math.round(S - t * (S - hipW));
      rect(ctx, cx - w / 2, y, w, 2, L.accent ?? C.white);
    }
  }
  // belt line
  if (L.bottomStyle === 'pants' && st !== 'coat' && st !== 'nightgown' && st !== 'dress') rect(ctx, cx - hipW / 2, hipY - 1, hipW, 1, shade(L.bottom, -0.4));

  // ---- Neck & head ----
  rect(ctx, cx - 2, y0 + headH - 1, 5, neckH + 2, front ? skinD : skin);
  drawHead(ctx, L, headX, y0, headW, headH, front, face, child);

  // ---- Props ----
  const handY = yT + 1 + armLen;
  const handX = side < 0 ? Math.round(cx - S / 2 - armW + 3) : Math.round(cx + S / 2 - 1);
  drawProp(ctx, L, front, handX, handY, cx, yT, side, feetY, armLen);

  let out = outline(cv, C.outline);
  if (L.tint) out = tint(out, L.tint);
  return out;
}

function drawHead(ctx: CanvasRenderingContext2D, L: Look, x: number, y: number, w: number, h: number, front: boolean, face: Face, child: boolean): void {
  const skin = L.skin;
  const skinD = SKIN_DARK(skin);
  const hair = L.hair;
  const hairD = shade(hair, -0.35);
  const hairL = shade(hair, 0.18);
  // base skull
  for (let j = 0; j < h; j++) {
    let inset = 0;
    if (j === 0) inset = 3;
    else if (j === 1) inset = 1;
    else if (j >= h - 2) inset = j === h - 1 ? 3 : 1;
    rect(ctx, x + inset, y + j, w - inset * 2, 1, skin);
  }
  // ears
  rect(ctx, x - 1, y + Math.round(h * 0.45), 1, 3, skinD);
  rect(ctx, x + w, y + Math.round(h * 0.45), 1, 3, skinD);
  // jaw/side shading
  rect(ctx, x + w - 1, y + 3, 1, h - 5, skinD);
  if (front) rect(ctx, x + 1, y + h - 2, w - 2, 1, skinD);

  const eyeY = y + Math.round(h * 0.5);
  const lx = x + Math.round(w * 0.27);
  const rx = x + w - 1 - Math.round(w * 0.27);
  const midX = x + Math.floor(w / 2);
  const eyeC = '#1a1016';

  if (front) {
    switch (face) {
      case 'blank':
        break;
      case 'hollow':
        rect(ctx, lx - 1, eyeY - 1, 2, 3, C.void);
        rect(ctx, rx, eyeY - 1, 2, 3, C.void);
        rect(ctx, midX - 1, eyeY + 4, 3, 2, C.void);
        break;
      case 'closed':
        rect(ctx, lx - 1, eyeY + 1, 2, 1, eyeC);
        rect(ctx, rx, eyeY + 1, 2, 1, eyeC);
        rect(ctx, midX - 1, eyeY + 5, 3, 1, shade(skin, -0.4));
        break;
      case 'smile':
        rect(ctx, lx, eyeY - 1, 1, 2, eyeC);
        rect(ctx, rx, eyeY - 1, 1, 2, eyeC);
        rect(ctx, x + 2, eyeY + 4, w - 4, 1, C.void);
        rect(ctx, x + 1, eyeY + 3, 1, 1, C.void);
        rect(ctx, x + w - 2, eyeY + 3, 1, 1, C.void);
        rect(ctx, x + 3, eyeY + 5, w - 6, 1, C.white);
        rect(ctx, x + 3, eyeY + 6, w - 6, 1, C.void);
        break;
      case 'wide':
        rect(ctx, lx - 1, eyeY - 1, 3, 3, C.white);
        rect(ctx, rx - 1, eyeY - 1, 3, 3, C.white);
        px(ctx, lx, eyeY, eyeC);
        px(ctx, rx, eyeY, eyeC);
        rect(ctx, midX - 1, eyeY + 5, 3, 2, C.void);
        break;
      default: {
        rect(ctx, lx, eyeY, 1, 2, eyeC);
        rect(ctx, rx, eyeY, 1, 2, eyeC);
        const browY = eyeY - 2;
        if (face === 'sad') {
          px(ctx, lx - 1, browY + 1, hairD); px(ctx, lx, browY, hairD);
          px(ctx, rx + 1, browY + 1, hairD); px(ctx, rx, browY, hairD);
        } else {
          rect(ctx, lx - 1, browY, 2, 1, hairD);
          rect(ctx, rx, browY, 2, 1, hairD);
        }
        px(ctx, midX, eyeY + 2, skinD);
        if (face === 'sad') {
          rect(ctx, midX - 1, eyeY + 5, 3, 1, shade(skin, -0.45));
          px(ctx, midX - 2, eyeY + 6, shade(skin, -0.45));
          px(ctx, midX + 2, eyeY + 6, shade(skin, -0.45));
        } else rect(ctx, midX - 1, eyeY + 5, 3, 1, shade(skin, -0.45));
        if (L.mustache) rect(ctx, midX - 2, eyeY + 4, 5, 1, L.hair === C.white ? C.steel3 : hairD);
      }
    }
    if (L.glasses && face !== 'blank') {
      const gc = C.steel0;
      rect(ctx, lx - 2, eyeY - 1, 4, 1, gc); rect(ctx, lx - 2, eyeY + 2, 4, 1, gc);
      rect(ctx, lx - 2, eyeY - 1, 1, 4, gc); rect(ctx, lx + 1, eyeY - 1, 1, 4, gc);
      rect(ctx, rx - 1, eyeY - 1, 4, 1, gc); rect(ctx, rx - 1, eyeY + 2, 4, 1, gc);
      rect(ctx, rx - 1, eyeY - 1, 1, 4, gc); rect(ctx, rx + 2, eyeY - 1, 1, 4, gc);
      rect(ctx, lx + 2, eyeY, rx - lx - 3, 1, gc);
    }
  }

  // ---- Hair ----
  const st = L.hairStyle;
  const hairRows = (rows: number) => {
    for (let j = 0; j < rows; j++) {
      let inset = j === 0 ? 3 : j === 1 ? 1 : 0;
      rect(ctx, x - (j > 1 ? 1 : 0) + inset, y + j - 1, w + (j > 1 ? 2 : 0) - inset * 2, 1, hair);
    }
    rect(ctx, x + 2, y - 1, w - 5, 1, hairL);
  };
  if (front) {
    if (st === 'short' || st === 'slick' || st === 'kid' || st === 'bun' || st === 'curly' || st === 'bob' || st === 'long') {
      hairRows(st === 'kid' ? 6 : st === 'slick' ? 4 : 5);
      // sides
      const sideLen = st === 'long' ? h + 10 : st === 'bob' ? h - 2 : Math.round(h * 0.5);
      rect(ctx, x - 1, y + 3, 2, sideLen - 2, hair);
      rect(ctx, x + w - 1, y + 3, 2, sideLen - 2, hair);
      if (st === 'long') {
        rect(ctx, x - 3, y + 8, 3, sideLen - 6, hair);
        rect(ctx, x + w, y + 8, 3, sideLen - 6, hair);
        rect(ctx, x - 3, y + 8, 1, sideLen - 6, hairD);
      }
      if (st === 'kid') {
        for (let i = 0; i < w; i += 2) px(ctx, x + i, y + 5, hair);
      }
      if (st === 'curly') {
        for (let i = -2; i < w + 2; i += 2) px(ctx, x + i, y - 2 + (i % 4 === 0 ? 0 : 1), hair);
        rect(ctx, x - 2, y + 2, 2, 6, hair);
        rect(ctx, x + w, y + 2, 2, 6, hair);
        for (let i = 0; i < w; i += 3) px(ctx, x + i, y + 1, hairL);
      }
      if (st === 'bun') ellipse(ctx, x + w / 2, y - 3, 3, 2, hair);
      if (st === 'slick') rect(ctx, x + 3, y + 1, w - 4, 1, hairL);
      if (st === 'bob') rect(ctx, x + 1, y + 3, Math.round(w * 0.4), 2, hair);
      if (st === 'long' && L.topStyle === 'nightgown') {
        // hair falls over the face
        rect(ctx, x + 1, y + 3, w - 2, 4, hair);
        for (let i = 1; i < w - 1; i += 2) rect(ctx, x + i, y + 7, 1, (i * 7) % 4 + 2, hair);
      }
    } else if (st === 'bald') {
      rect(ctx, x - 1, y + 5, 2, 4, hair);
      rect(ctx, x + w - 1, y + 5, 2, 4, hair);
      rect(ctx, x + 3, y + 1, 3, 1, shade(skin, 0.15));
    }
  } else {
    // back of head: mostly hair
    if (st === 'bald') {
      rect(ctx, x + 2, y + 2, 3, 1, shade(skin, 0.15));
      rect(ctx, x - 1, y + 6, w + 2, 4, hair);
    } else if (st !== 'none') {
      const rows = st === 'long' ? h + 18 : st === 'bob' ? h - 1 : st === 'kid' ? Math.round(h * 0.8) : Math.round(h * 0.7);
      for (let j = 0; j < rows; j++) {
        const inset = j === 0 ? 3 : j === 1 ? 1 : 0;
        const wide = j > 1 ? (st === 'long' ? 2 : st === 'bob' || st === 'curly' ? 1 : 0) : 0;
        const ww = w + wide * 2 - inset * 2;
        rect(ctx, x - wide + inset, y + j - 1, ww, 1, hair);
        if (j > 2) {
          rect(ctx, x - wide + inset, y + j - 1, 1, 1, hairD);
          rect(ctx, x - wide + inset + ww - 1, y + j - 1, 1, 1, hairD);
        }
      }
      // ragged hairline over the nape
      if (st !== 'long' && st !== 'bob') for (let i = 1; i < w - 1; i += 2) px(ctx, x + i, y + rows - 1, hair);
      // strands
      for (let j = 3; j < rows - 2; j += 3) for (let i = 2; i < w - 2; i += 4) px(ctx, x + i + (j % 2), y + j, hairD);
      rect(ctx, x + 2, y, w - 5, 1, hairL);
      rect(ctx, x + 3, y + 1, w - 7, 1, hairL);
      if (st === 'bun') {
        ellipse(ctx, x + w / 2, y + 4, 3, 3, hair);
        ellipse(ctx, x + w / 2, y + 4, 1, 1, hairD);
      }
      if (st === 'curly') for (let i = 0; i < w; i += 2) px(ctx, x + i, y + 3 + (i % 3), hairL);
    }
  }

  // ---- Hats ----
  if (L.hat === 'cap' || L.hat === 'workcap') {
    const col = L.hat === 'cap' ? C.red1 : C.blue1;
    rect(ctx, x - 1, y - 2, w + 2, 5, col);
    rect(ctx, x, y - 3, w, 1, col);
    rect(ctx, x, y - 2, w, 1, shade(col, 0.2));
    if (front) rect(ctx, x - 2, y + 3, w + 4, 1, shade(col, -0.35));
  }
  if (L.hat === 'operator') {
    const col = C.red1;
    rect(ctx, x - 2, y - 4, w + 4, 6, col);
    rect(ctx, x - 2, y - 4, w + 4, 1, shade(col, 0.25));
    rect(ctx, x - 1, y + 1, w + 2, 2, C.brass2);
    if (front) {
      rect(ctx, x - 1, y + 3, w + 2, 2, C.ink);
      px(ctx, x + Math.floor(w / 2), y - 1, C.brass4);
    }
  }
  void child;
}

function drawProp(
  ctx: CanvasRenderingContext2D, L: Look, front: boolean, hx: number, hy: number, cx: number, yT: number, side: number, feetY: number, armLen: number,
): void {
  const p = L.prop ?? 'none';
  if (p === 'none') return;
  if (p === 'cakeTin') {
    if (!front) {
      rect(ctx, cx - 9, yT + armLen * 0.55 - 2, 2, 5, C.red2);
      rect(ctx, cx + 7, yT + armLen * 0.55 - 2, 2, 5, C.red2);
      return;
    }
    const ty = Math.round(yT + armLen * 0.55 - 6);
    rect(ctx, cx - 7, ty, 14, 7, C.red2);
    rect(ctx, cx - 7, ty, 14, 2, C.red3);
    rect(ctx, cx - 7, ty + 6, 14, 1, C.red1);
    for (let i = 0; i < 4; i++) px(ctx, cx - 5 + i * 3, ty + 4, C.cream3);
    return;
  }
  if (p === 'pizza') {
    if (!front) return;
    const ty = Math.round(yT + armLen * 0.55 - 4);
    rect(ctx, cx - 9, ty, 18, 4, C.cream2);
    rect(ctx, cx - 9, ty, 18, 1, C.paper);
    rect(ctx, cx - 3, ty + 1, 6, 2, C.red2);
    return;
  }
  const x = side < 0 ? hx - 3 : hx - 1;
  if (p === 'bag' || p === 'tote') {
    const col = p === 'bag' ? C.wood2 : C.teal1;
    rect(ctx, x + 1, hy, 1, 2, C.ink);
    rect(ctx, x - 1, hy + 2, 8, 9, col);
    rect(ctx, x - 1, hy + 2, 8, 1, shade(col, 0.25));
    rect(ctx, x - 1, hy + 10, 8, 1, shade(col, -0.3));
  } else if (p === 'takeout') {
    rect(ctx, x - 1, hy + 2, 7, 9, C.cream1);
    rect(ctx, x - 1, hy + 2, 7, 2, C.cream2);
    rect(ctx, x + 1, hy + 6, 3, 2, C.red2);
  } else if (p === 'toolbox') {
    rect(ctx, x - 3, hy + 2, 12, 7, C.red2);
    rect(ctx, x - 3, hy + 2, 12, 1, C.red3);
    rect(ctx, x + 1, hy, 4, 2, C.steel1);
    rect(ctx, x - 3, hy + 5, 12, 1, C.red1);
  } else if (p === 'logbook') {
    rect(ctx, x - 1, hy - 4, 6, 9, C.wood1);
    rect(ctx, x - 1, hy - 4, 6, 1, C.wood3);
    rect(ctx, x + 4, hy - 3, 1, 7, C.paper);
  } else if (p === 'umbrella') {
    rect(ctx, x + 1, hy - 2, 2, 2, C.wood3);
    rect(ctx, x + 1, hy, 2, feetY - hy - 3, C.ink);
    rect(ctx, x, hy + 4, 4, feetY - hy - 12, C.blue1);
    rect(ctx, x + 1, feetY - 3, 1, 3, C.steel3);
  } else if (p === 'leash') {
    const dir = side;
    for (let i = 0; i < 18; i++) px(ctx, x + 2 + dir * Math.round(i * 0.4), hy + 2 + i, C.red2);
  } else if (p === 'flowers') {
    rect(ctx, x + 1, hy, 2, 10, C.green2);
    for (const [dx, dy, c] of [[-1, -3, C.rose3], [2, -4, C.amber], [4, -2, C.rose2], [0, -1, C.white]] as const) {
      rect(ctx, x + dx, hy + dy, 2, 2, c);
    }
  }
}

/** A small dog (Biscuit), side view. */
export function dogSprite(frame: number, facingLeft: boolean, tinted?: Look['tint']): HTMLCanvasElement {
  const key = `dog${frame}${facingLeft}${tinted}`;
  let c = cache.get(key);
  if (c) return c;
  const [cv, ctx] = canvas(24, 16);
  const body = C.cream3, patch = C.wood3, dark = C.wood1;
  rect(ctx, 6, 6, 12, 5, body);
  rect(ctx, 6, 10, 12, 1, shade(body, -0.2));
  rect(ctx, 11, 6, 4, 3, patch);
  rect(ctx, 2, 3, 6, 5, body); // head
  rect(ctx, 1, 6, 2, 2, body); // snout
  px(ctx, 0, 6, C.ink);
  px(ctx, 4, 5, C.ink);
  rect(ctx, 5, 2, 2, 4, patch); // ear
  const legs = frame % 2 === 0 ? [7, 9, 15, 17] : [6, 10, 14, 18];
  for (const lx of legs) rect(ctx, lx, 11, 1, 3, body);
  rect(ctx, 18, frame % 2 === 0 ? 4 : 5, 2, 2, body); // tail
  px(ctx, 20, frame % 2 === 0 ? 3 : 5, body);
  rect(ctx, 4, 8, 3, 1, C.red2); // collar
  void dark;
  let out = outline(cv, C.outline);
  if (!facingLeft) {
    const [m, mctx] = canvas(24, 16);
    mctx.translate(24, 0);
    mctx.scale(-1, 1);
    mctx.drawImage(out, 0, 0);
    out = m;
  }
  if (tinted) out = tint(out, tinted);
  cache.set(key, out);
  return out;
}

/** A distant figure for long hallways: a simple silhouette of the given height. */
export function farFigure(h: number, color: string, faceColor?: string): HTMLCanvasElement {
  const key = `far${h}${color}${faceColor}`;
  let c = cache.get(key);
  if (c) return c;
  const w = Math.max(3, Math.round(h * 0.32));
  const [cv, ctx] = canvas(w + 2, h + 1);
  const head = Math.max(2, Math.round(h * 0.18));
  const cx = (w + 2) / 2;
  rect(ctx, cx - head / 2, 0, head, head, faceColor ?? color);
  rect(ctx, cx - w / 2, head, w, Math.round(h * 0.42), color);
  const legY = head + Math.round(h * 0.42);
  rect(ctx, cx - w / 2 + 1, legY, Math.max(1, Math.floor(w / 2) - 1), h - legY, color);
  rect(ctx, cx + 1, legY, Math.max(1, Math.floor(w / 2) - 1), h - legY, color);
  c = cv;
  cache.set(key, c);
  return c;
}
