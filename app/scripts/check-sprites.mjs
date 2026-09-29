// Verifies every sprite in src/pixel/sprites.ts has rows of equal width
// and only uses palette characters. Run: node scripts/check-sprites.mjs
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/pixel/sprites.ts', import.meta.url), 'utf8');
const palette = new Set([...src.matchAll(/^\s+(\w): '#/gm)].map((m) => m[1]).concat('.'));
let failures = 0;

for (const [, name, body] of src.matchAll(/export const (\w+): Sprite = \[([\s\S]*?)\];/g)) {
  const rows = [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]);
  const width = rows[0].length;
  rows.forEach((row, i) => {
    if (row.length !== width) {
      console.error(`${name} row ${i}: width ${row.length}, expected ${width}`);
      failures++;
    }
    for (const ch of row) {
      if (!palette.has(ch)) {
        console.error(`${name} row ${i}: unknown color '${ch}'`);
        failures++;
      }
    }
  });
}

if (failures) process.exit(1);
console.log('sprites ok');
