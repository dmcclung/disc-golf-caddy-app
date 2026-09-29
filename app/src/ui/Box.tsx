import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, px } from '@/theme';

type Props = {
  children?: ReactNode;
  /** Fill color. */
  fill?: string;
  /** Color of the thick bottom "3D" edge. */
  edge?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/**
 * The basic pixel panel: square corners, a thick outline, and a heavier bottom
 * edge that reads as a raised block.
 */
export function Box({ children, fill = colors.surface, edge = colors.outline, style, padded = true }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: fill,
          borderWidth: px - 1,
          borderColor: colors.outline,
          borderBottomWidth: px * 2,
          borderBottomColor: edge,
        },
        padded && { padding: px * 4 },
        style,
      ]}>
      {children}
    </View>
  );
}
