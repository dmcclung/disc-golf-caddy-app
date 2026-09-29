import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { formatDate } from '@/lib/stats';
import { THROW_TYPE_LABELS, type ThrowRow } from '@/lib/types';
import { colors, px } from '@/theme';
import { Box } from './Box';
import { ScoreBadge } from './Meter';
import { Body, Label } from './Text';

/** One row in a throw history list; opens the full report. */
export function ThrowCard({ t }: { t: ThrowRow }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/throw/${t.id}`)}>
      {({ pressed }) => (
        <Box
          fill={pressed ? colors.surfaceHi : colors.surface}
          style={{ flexDirection: 'row', alignItems: 'center', gap: px * 4, padding: px * 3 }}>
          <ScoreBadge score={t.overall_score} size="sm" />
          <View style={{ flex: 1, gap: px }}>
            <Label>
              {THROW_TYPE_LABELS[t.throw_type].toUpperCase()} · {formatDate(t.created_at).toUpperCase()}
            </Label>
            <Body size={21} color={colors.white} numberOfLines={2}>
              {t.headline}
            </Body>
          </View>
        </Box>
      )}
    </Pressable>
  );
}
