import { useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { PixelArt } from '@/pixel/PixelArt';
import { disc } from '@/pixel/sprites';
import { colors, px } from '@/theme';

type Props = {
  /** 0..1 */
  value: number;
  onChange: (value: number) => void;
};

const THUMB = 36;

/** Pixel-styled horizontal slider with a disc for a thumb. */
export function Scrubber({ value, onChange }: Props) {
  const [width, setWidth] = useState(0);

  const update = (x: number) => {
    if (width > 0) onChange(Math.max(0, Math.min(1, x / width)));
  };

  // runOnJS: the handlers call React state setters and the video player.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-4, 4])
    .onBegin((e) => update(e.x))
    .onUpdate((e) => update(e.x));
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => update(e.x));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: THUMB + px * 2, justifyContent: 'center' }}>
        <View style={{ height: px * 3, backgroundColor: colors.bgDeep, borderWidth: 2, borderColor: colors.outline }}>
          <View style={{ width: `${value * 100}%`, height: '100%', backgroundColor: colors.primary }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', left: 0, right: 0, top: px }}>
          {Array.from({ length: 11 }, (_, i) => (
            <View key={i} style={{ width: 2, height: i % 5 === 0 ? px * 2 : px, backgroundColor: colors.lavender }} />
          ))}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: value * width - THUMB / 2 }}>
          <PixelArt sprite={disc} scale={3} />
        </View>
      </View>
    </GestureDetector>
  );
}
