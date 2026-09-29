import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, px } from '@/theme';

// Deterministic "starfield" so the backdrop is identical on every render.
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%` as const,
  top: `${(i * 61 + 7) % 100}%` as const,
  size: i % 5 === 0 ? px : px / 2,
  opacity: 0.25 + ((i * 13) % 50) / 100,
}));

export function Starfield() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {STARS.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            backgroundColor: colors.lilac,
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

type Props = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
};

export function Screen({ children, scroll = true, edges = ['top'], contentStyle, footer }: Props) {
  const content = [{ padding: px * 5, gap: px * 5 }, contentStyle];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Starfield />
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView contentContainerStyle={[content, { paddingBottom: px * 12 }]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, content]}>{children}</View>
        )}
        {footer ? <View style={{ paddingHorizontal: px * 5, paddingBottom: px * 4, gap: px * 3 }}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}
