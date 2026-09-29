import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { deleteThrow, fetchThrow, frameUrls } from '@/lib/api';
import { useSession } from '@/lib/session';
import { formatDate } from '@/lib/stats';
import { SCORE_KEYS, SCORE_LABELS, THROW_TYPE_LABELS, type Fault, type ThrowRow } from '@/lib/types';
import { PixelArt } from '@/pixel/PixelArt';
import { caddy, check } from '@/pixel/sprites';
import { Box } from '@/ui/Box';
import { Button } from '@/ui/Button';
import { Meter, ScoreBadge } from '@/ui/Meter';
import { Screen } from '@/ui/Screen';
import { Body, Label, Title } from '@/ui/Text';
import { colors, px } from '@/theme';

const SEVERITY: Record<Fault['severity'], { label: string; color: string }> = {
  major: { label: 'MAJOR', color: colors.danger },
  moderate: { label: 'MODERATE', color: colors.lavender },
  minor: { label: 'MINOR', color: colors.lilac },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: px * 3 }}>
      <Label>{title}</Label>
      {children}
    </View>
  );
}

function Frame({ uri, height = 220 }: { uri?: string; height?: number }) {
  if (!uri) return null;
  return (
    <Box padded={false} fill={colors.bgDeep}>
      <Image source={{ uri }} style={{ width: '100%', height }} contentFit="contain" transition={150} />
    </Box>
  );
}

export default function ThrowReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { throws, refreshThrows } = useSession();
  const [t, setThrow] = useState<ThrowRow | null>(() => throws.find((x) => x.id === id) ?? null);
  const [frames, setFrames] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const row = t ?? (await fetchThrow(id));
        if (!live) return;
        setThrow(row);
        const urls = await frameUrls(row);
        if (live) setFrames(urls);
      } catch (e) {
        console.warn('load throw failed', e);
        if (live && !t) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
    // Load once per id; `t` is only the initial cache hit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const remove = () =>
    Alert.alert('Delete this throw?', 'The analysis and its frames will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteThrow(id);
            await refreshThrows();
            back();
          } catch {
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);

  if (!t) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
        {failed ? (
          <>
            <Body center>{"Couldn't load this throw."}</Body>
            <Button title="Back" onPress={back} />
          </>
        ) : (
          <ActivityIndicator color={colors.white} />
        )}
      </Screen>
    );
  }

  const shownFrame = selectedFrame ?? t.key_frame;

  return (
    <Screen edges={['top', 'bottom']}>
      <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
        <Label>{'< BACK'}</Label>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: px * 4, alignItems: 'center' }}>
        <ScoreBadge score={t.overall_score} />
        <View style={{ flex: 1, gap: px * 2 }}>
          <Label>
            {THROW_TYPE_LABELS[t.throw_type].toUpperCase()} · {formatDate(t.created_at).toUpperCase()}
            {t.disc ? ` · ${t.disc.toUpperCase()}` : ''}
          </Label>
          <Title size={13}>{t.headline}</Title>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: px * 3, alignItems: 'flex-start' }}>
        <PixelArt sprite={caddy} scale={3} />
        <Body color={colors.white} style={{ flex: 1 }}>
          {t.summary}
        </Body>
      </View>

      <Box fill={colors.white} edge={colors.lavender} style={{ gap: px * 2, alignItems: 'center' }}>
        <Label color={colors.primary}>YOUR FOCUS CUE</Label>
        <Title size={13} color={colors.primaryDark} center>
          &quot;{t.focus_cue}&quot;
        </Title>
      </Box>

      {frames.length ? (
        <Section title={`FRAME ${shownFrame + 1} OF ${frames.length}`}>
          <Frame uri={frames[shownFrame]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: px * 2 }}>
            {frames.map((uri, i) => (
              <Pressable key={uri} onPress={() => setSelectedFrame(i)}>
                <View style={{ borderWidth: px - 1, borderColor: i === shownFrame ? colors.white : colors.outline }}>
                  <Image source={{ uri }} style={{ width: 52, height: 52 }} contentFit="cover" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Section title="FORM BREAKDOWN">
        <Box style={{ gap: px * 4 }}>
          {SCORE_KEYS.map((k) => (
            <Meter key={k} label={SCORE_LABELS[k]} value={t.scores[k]} />
          ))}
        </Box>
      </Section>

      {t.strengths.length ? (
        <Section title="WHAT'S WORKING">
          <Box style={{ gap: px * 3 }}>
            {t.strengths.map((s) => (
              <View key={s} style={{ flexDirection: 'row', gap: px * 3 }}>
                <PixelArt sprite={check} scale={3} style={{ marginTop: px }} />
                <Body color={colors.white} style={{ flex: 1 }}>
                  {s}
                </Body>
              </View>
            ))}
          </Box>
        </Section>
      ) : null}

      <Section title="FIX THESE">
        {t.faults.map((f, i) => (
          <Box key={i} style={{ gap: px * 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: px * 2 }}>
              <Title size={11} style={{ flex: 1 }}>
                {i + 1}. {f.title}
              </Title>
              <Label color={SEVERITY[f.severity].color}>{SEVERITY[f.severity].label}</Label>
            </View>
            <Body color={colors.white}>{f.detail}</Body>
            {frames[f.frame] ? (
              <Pressable onPress={() => setSelectedFrame(f.frame)}>
                <Label color={colors.lilac}>{`SEE FRAME ${f.frame + 1} >`}</Label>
              </Pressable>
            ) : null}
          </Box>
        ))}
      </Section>

      <Section title="DRILLS">
        {t.drills.map((d) => (
          <Box key={d.name} fill={colors.surfaceHi} style={{ gap: px * 2 }}>
            <Title size={11}>{d.name}</Title>
            <Body color={colors.white}>{d.how}</Body>
            <Label color={colors.lilac}>{d.reps.toUpperCase()}</Label>
          </Box>
        ))}
      </Section>

      {t.filming_tip ? (
        <Section title="FILMING TIP">
          <Body>
            {t.confidence === 'low' ? 'Your caddy had trouble seeing parts of this throw. ' : ''}
            {t.filming_tip}
          </Body>
        </Section>
      ) : null}

      <Button title="Film another throw" onPress={() => router.replace('/record')} />
      <Button title="Delete this throw" variant="ghost" onPress={remove} />
    </Screen>
  );
}
