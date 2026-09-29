import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { average, categoryTrends, formatDate, streakDays } from '@/lib/stats';
import { SCORE_LABELS, THROW_TYPE_LABELS, type ThrowRow, type ThrowType } from '@/lib/types';
import { PixelArt } from '@/pixel/PixelArt';
import { caddy, lock } from '@/pixel/sprites';
import { Box } from '@/ui/Box';
import { Button } from '@/ui/Button';
import { Meter } from '@/ui/Meter';
import { Chip } from '@/ui/Option';
import { Starfield } from '@/ui/Screen';
import { Body, Label, Title } from '@/ui/Text';
import { ThrowCard } from '@/ui/ThrowCard';
import { colors, px } from '@/theme';

const CHART_BARS = 12;
const CHART_HEIGHT = 140;

/** Overall score for the last CHART_BARS throws, oldest on the left. */
function TrendChart({ throws }: { throws: ThrowRow[] }) {
  const recent = throws.slice(0, CHART_BARS).reverse();
  return (
    <View style={{ gap: px * 2 }}>
      <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: px }}>
        {/* Guide lines at 25/50/75. */}
        {[25, 50, 75].map((g) => (
          <View
            key={g}
            style={{ position: 'absolute', left: 0, right: 0, bottom: (g / 100) * CHART_HEIGHT, height: 1, backgroundColor: colors.surfaceHi }}
          />
        ))}
        {recent.map((t, i) => {
          const last = i === recent.length - 1;
          return (
            <Pressable key={t.id} style={{ flex: 1 }} onPress={() => router.push(`/throw/${t.id}`)}>
              <View
                style={{
                  height: Math.max(px * 2, (t.overall_score / 100) * CHART_HEIGHT),
                  backgroundColor: last ? colors.white : colors.primary,
                  borderWidth: 2,
                  borderColor: colors.outline,
                }}
              />
            </Pressable>
          );
        })}
        {Array.from({ length: CHART_BARS - recent.length }, (_, i) => (
          <View key={`empty-${i}`} style={{ flex: 1 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label>{recent[0] ? formatDate(recent[0].created_at).toUpperCase() : ''}</Label>
        <Label>LATEST</Label>
      </View>
    </View>
  );
}

function Locked({ children }: { children: React.ReactNode }) {
  return (
    <View>
      <View style={{ opacity: 0.25 }} pointerEvents="none">
        {children}
      </View>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', gap: px * 3 }}>
        <PixelArt sprite={lock} scale={4} />
        <Title size={11} center>
          Trends are a Pro feature
        </Title>
        <Button title="Unlock Pro" onPress={() => router.push('/paywall')} />
      </View>
    </View>
  );
}

export default function Progress() {
  const { throws, isPro, refreshThrows } = useSession();
  const [filter, setFilter] = useState<ThrowType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshThrows().catch(() => {});
    }, [refreshThrows]),
  );

  const filtered = useMemo(() => (filter === 'all' ? throws : throws.filter((t) => t.throw_type === filter)), [throws, filter]);
  const types = useMemo(() => [...new Set(throws.map((t) => t.throw_type))], [throws]);
  const avg5 = average(filtered.slice(0, 5).map((t) => t.overall_score));
  const prev5 = average(filtered.slice(5, 10).map((t) => t.overall_score));
  const best = filtered.reduce((m, t) => Math.max(m, t.overall_score), 0);
  const trends = categoryTrends(filtered);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshThrows().catch(() => {});
    setRefreshing(false);
  };

  const charts = (
    <View style={{ gap: px * 5 }}>
      <Box style={{ gap: px * 3 }}>
        <Label>OVERALL SCORE</Label>
        <TrendChart throws={filtered} />
      </Box>
      <Box style={{ gap: px * 4 }}>
        <Label>FORM · LAST 5 VS PREVIOUS 5</Label>
        {trends.map((c) => (
          <Meter key={c.key} label={SCORE_LABELS[c.key]} value={c.value} delta={c.delta} />
        ))}
      </Box>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Starfield />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: px * 5, gap: px * 5, paddingBottom: px * 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}>
          <Title size={16}>Progress</Title>

          {!throws.length ? (
            <Box style={{ alignItems: 'center', gap: px * 4 }}>
              <PixelArt sprite={caddy} scale={5} />
              <Title size={11} center>
                No throws yet
              </Title>
              <Body center>Film your first throw and your progress will show up here.</Body>
              <Button title="Film a throw" onPress={() => router.push('/record')} />
            </Box>
          ) : (
            <>
              {types.length > 1 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px * 2 }}>
                  <Chip title="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
                  {types.map((t) => (
                    <Chip key={t} title={THROW_TYPE_LABELS[t]} selected={filter === t} onPress={() => setFilter(t)} />
                  ))}
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: px * 3 }}>
                <Box style={{ flex: 1, gap: px * 2, padding: px * 3 }}>
                  <Label>AVG (LAST 5)</Label>
                  <Title size={18}>{avg5 != null ? Math.round(avg5) : '-'}</Title>
                  {avg5 != null && prev5 != null ? (
                    <Body size={20} color={avg5 >= prev5 ? colors.lilac : colors.danger}>
                      {avg5 >= prev5 ? '▲' : '▼'} {Math.abs(avg5 - prev5).toFixed(1)} vs before
                    </Body>
                  ) : null}
                </Box>
                <Box style={{ flex: 1, gap: px * 2, padding: px * 3 }}>
                  <Label>BEST</Label>
                  <Title size={18}>{best}</Title>
                  <Body size={20}>{streakDays(throws)} day streak</Body>
                </Box>
              </View>

              {isPro ? charts : <Locked>{charts}</Locked>}

              <View style={{ gap: px * 3 }}>
                <Label>HISTORY · {filtered.length}</Label>
                {filtered.map((t) => (
                  <ThrowCard key={t.id} t={t} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
