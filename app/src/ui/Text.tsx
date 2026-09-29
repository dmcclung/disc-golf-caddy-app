import { Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme';

type Props = TextProps & { color?: string; center?: boolean };

/** 8-bit display text for titles, numbers and buttons. */
export function Title({ style, color = colors.white, center, size = 16, ...rest }: Props & { size?: number }) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.6, color },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

/** Small uppercase label in the display face. */
export function Label({ style, color = colors.lavender, center, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts.display, fontSize: 9, lineHeight: 14, letterSpacing: 1, color },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

/** Readable pixel body copy. */
export function Body({ style, color = colors.lilac, center, size = 22, ...rest }: Props & { size?: number }) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts.body, fontSize: size, lineHeight: size * 1.1, color },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
