import { View } from 'react-native';

import { colors, px } from '@/theme';
import { Body, Title } from './Text';

/** Ten-segment pixel meter for 1-10 category scores. */
export function Meter({ label, value, delta }: { label: string; value: number; delta?: number | null }) {
  return (
    <View style={{ gap: px }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Body size={22} color={colors.white}>
          {label}
        </Body>
        <View style={{ flexDirection: 'row', gap: px * 2, alignItems: 'baseline' }}>
          {delta != null && delta !== 0 ? (
            <Body size={20} color={delta > 0 ? colors.lilac : colors.danger}>
              {delta > 0 ? '▲' : '▼'}
              {Math.abs(delta).toFixed(1)}
            </Body>
          ) : null}
          <Title size={10}>{value.toFixed(value % 1 ? 1 : 0)}</Title>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: px / 2 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: px * 3,
              backgroundColor: i < Math.round(value) ? (i < 3 ? colors.lavender : i < 7 ? colors.primary : colors.white) : colors.bgDeep,
              borderWidth: 1,
              borderColor: colors.outline,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Big framed score badge, e.g. "78". */
export function ScoreBadge({ score, size = 'lg' }: { score: number; size?: 'lg' | 'sm' }) {
  const lg = size === 'lg';
  return (
    <View
      style={{
        width: lg ? 104 : 56,
        height: lg ? 104 : 56,
        backgroundColor: colors.white,
        borderWidth: px - 1,
        borderColor: colors.outline,
        borderBottomWidth: px * 2,
        borderBottomColor: colors.lavender,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Title size={lg ? 30 : 14} color={colors.primaryDark} style={{ lineHeight: lg ? 38 : 20 }}>
        {score}
      </Title>
      {lg ? (
        <Title size={8} color={colors.primary}>
          /100
        </Title>
      ) : null}
    </View>
  );
}
