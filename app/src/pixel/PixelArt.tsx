import { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { PALETTE, type Sprite } from './sprites';

type Props = {
  sprite: Sprite;
  /** Size of one sprite pixel in screen points. */
  scale?: number;
  /** Recolors 'w' pixels, e.g. for tab icons. */
  tint?: string;
  /** Override individual palette entries. */
  colors?: Record<string, string>;
  style?: StyleProp<ViewStyle>;
};

type Run = { x: number; y: number; w: number; color: string };

/** Merges horizontal runs of the same color so a sprite renders as few rects as possible. */
function toRuns(sprite: Sprite, palette: Record<string, string>): Run[] {
  const runs: Run[] = [];
  sprite.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== '.') runs.push({ x, y, w: end - x, color: palette[ch] ?? '#f0f' });
      x = end;
    }
  });
  return runs;
}

export const PixelArt = memo(function PixelArt({ sprite, scale = 4, tint, colors, style }: Props) {
  const width = sprite[0].length;
  const height = sprite.length;
  const runs = useMemo(
    () => toRuns(sprite, { ...PALETTE, ...(tint ? { w: tint } : null), ...colors }),
    [sprite, tint, colors],
  );

  return (
    // Rects are laid out in screen points (not a scaled viewBox) so edges land on whole
    // points and stay crisp without anti-aliased seams between runs.
    <Svg width={width * scale} height={height * scale} style={style}>
      {runs.map((r, i) => (
        <Rect key={i} x={r.x * scale} y={r.y * scale} width={r.w * scale} height={scale} fill={r.color} />
      ))}
    </Svg>
  );
});
