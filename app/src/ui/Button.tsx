import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, px } from '@/theme';
import { Title } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

const variants: Record<Variant, { fill: string; edge: string; text: string }> = {
  primary: { fill: colors.primary, edge: colors.deep, text: colors.white },
  secondary: { fill: colors.white, edge: colors.lavender, text: colors.primaryDark },
  ghost: { fill: 'transparent', edge: 'transparent', text: colors.lavender },
};

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, style }: Props) {
  const v = variants[variant];
  const ghost = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={style}>
      {({ pressed }) => {
        const down = pressed && !ghost;
        return (
          <View
            style={{
              opacity: disabled ? 0.45 : 1,
              backgroundColor: v.fill,
              borderWidth: ghost ? 0 : px - 1,
              borderColor: colors.outline,
              // Pressing "sinks" the block by moving the bottom edge into a top margin.
              borderBottomWidth: ghost ? 0 : down ? px - 1 : px * 2,
              marginTop: down ? px + 1 : 0,
              borderBottomColor: down ? colors.outline : v.edge,
              paddingVertical: px * 4,
              paddingHorizontal: px * 5,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px * 3,
            }}>
            {loading ? <ActivityIndicator color={v.text} /> : icon}
            <Title size={12} color={v.text} center>
              {title}
            </Title>
          </View>
        );
      }}
    </Pressable>
  );
}
