// Renders the pixel sprites in src/pixel/sprites.ts into the app icon, splash,
// favicon and website images. Run: node scripts/generate-icons.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const root = new URL('..', import.meta.url);
const src = readFileSync(new URL('src/pixel/sprites.ts', root), 'utf8');

const palette = Object.fromEntries([...src.matchAll(/^\s+(\w): '#([0-9A-Fa-f]{6})'/gm)].map((m) => [m[1], m[2]]));
const sprites = Object.fromEntries(
  [...src.matchAll(/export const (\w+): Sprite = \[([\s\S]*?)\];/g)].map(([, name, body]) => [
    name,
    [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]),
  ]),
);

const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
const BG = hex('1A0B3B');
const PURPLE = hex('7C3AED');
const STAR = hex('DDD6FE');

function canvas(w, h, fill = [0, 0, 0, 0]) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(fill, i * 4);
  return { w, h, data };
}

function rect(c, x, y, w, h, color) {
  x = Math.floor(x);
  y = Math.floor(y);
  for (let yy = Math.max(0, y); yy < Math.min(c.h, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(c.w, x + w); xx++) c.data.set(color, (yy * c.w + xx) * 4);
  }
}

function blit(c, name, x, y, scale, override = {}) {
  sprites[name].forEach((row, sy) => {
    [...row].forEach((ch, sx) => {
      if (ch === '.') return;
      const color = override[ch] ?? hex(palette[ch]);
      rect(c, x + sx * scale, y + sy * scale, scale, scale, color);
    });
  });
}

function center(c, name, scale, dy = 0, override) {
  const s = sprites[name];
  blit(c, name, Math.round((c.w - s[0].length * scale) / 2), Math.round((c.h - s.length * scale) / 2) + dy, scale, override);
}

function stars(c, count, size) {
  for (let i = 0; i < count; i++) {
    rect(c, ((i * 379) % 97) / 97 * c.w, ((i * 613 + 71) % 89) / 89 * c.h, size, size, STAR);
  }
}

// Minimal PNG encoder (RGBA, no filtering).
const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(c) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0);
  ihdr.writeUInt32BE(c.h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((c.w * 4 + 1) * c.h);
  for (let y = 0; y < c.h; y++) Buffer.from(c.data.buffer, y * c.w * 4, c.w * 4).copy(raw, y * (c.w * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function save(path, c) {
  const url = new URL(path, root);
  mkdirSync(new URL('.', url), { recursive: true });
  writeFileSync(url, png(c));
  console.log('wrote', path);
}

// App icon: mascot on the night-sky purple.
let c = canvas(1024, 1024, BG);
stars(c, 30, 16);
center(c, 'caddy', 44, 24);
save('assets/images/icon.png', c);

// Android adaptive icon layers. Foreground must sit inside the central ~66% safe zone.
c = canvas(1024, 1024);
center(c, 'caddy', 32, 16);
save('assets/images/android-icon-foreground.png', c);
c = canvas(1024, 1024, BG);
stars(c, 30, 16);
save('assets/images/android-icon-background.png', c);
c = canvas(1024, 1024);
center(c, 'caddy', 32, 16, Object.fromEntries(Object.keys(palette).map((k) => [k, k === 'k' ? [255, 255, 255, 255] : [0, 0, 0, 0]])));
save('assets/images/android-icon-monochrome.png', c);

// Splash: mascot only; app.json sets the background color.
c = canvas(512, 512);
center(c, 'caddy', 24);
save('assets/images/splash-icon.png', c);

c = canvas(48, 48, BG);
center(c, 'caddy', 3);
save('assets/images/favicon.png', c);

// Website images.
c = canvas(64, 64, BG);
center(c, 'caddy', 4);
save('../website/assets/favicon.png', c);

c = canvas(1200, 630, BG);
stars(c, 60, 8);
rect(c, 0, 560, 1200, 70, PURPLE);
blit(c, 'tree', 90, 560 - 16 * 16, 16);
blit(c, 'caddy', 480, 560 - 16 * 15, 15);
blit(c, 'basket', 880, 560 - 20 * 14, 14);
blit(c, 'flyingDisc', 700, 140, 10);
blit(c, 'cloud', 150, 70, 10);
save('../website/assets/og-image.png', c);

// 1x sprite sheets for the website (scaled up in CSS with image-rendering: pixelated).
for (const name of ['caddy', 'disc', 'flyingDisc', 'basket', 'tree', 'cloud', 'camera', 'star', 'crown', 'flame', 'check', 'lock']) {
  const s = sprites[name];
  c = canvas(s[0].length, s.length);
  blit(c, name, 0, 0, 1);
  save(`../website/assets/sprites/${name}.png`, c);
}
