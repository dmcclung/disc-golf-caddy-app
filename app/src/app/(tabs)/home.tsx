import { router } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@/lib/session';
import { streakDays, weakestCategory } from '@/lib/stats';
import { SCORE_LABELS } from '@/lib/types';
import { PixelArt } from '@/pixel/PixelArt';
import { basket, caddy, crown, flame, iconRecord, star } from '@/pixel/sprites';
import { Box } from '@/ui/Box';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Body, Label, Title } from '@/ui/Text';
import { ThrowCard } from '@/ui/ThrowCard';
import { colors, px } from '@/theme';

const TIPS = [
  'Film from the side at hip height. Your caddy sees the most from there.',
  'Slow is smooth, smooth is far. Try a 70% throw with clean form.',
  'Your plant foot should point roughly at the target, not across it.',
  'Keep the disc close to your chest as you pull through. Think "pizza tray".',
  'Finish balanced on your front foot. Falling off means something leaked.',
  'Field work beats rounds for form changes. Ten throws, one focus cue.',
  'Grip it loose until the hit. Tension early steals snap.',
];

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <Box fill={colors.white} edge={colors.lavender} style={{ padding: px * 3 }}>
        {children}
      </Box>
      {/* Stepped pixel tail pointing at the mascot. */}
      <View style={{ position: 'absolute', left: -px * 3, bottom: px * 5, width: px * 3, height: px * 3, backgroundColor: colors.white }} />
      <View style={{ position: 'absolute', left: -px * 5, bottom: px * 4, width: px * 2, height: px * 2, backgroundColor: colors.white }} />
    </View>
  );
}

function Stat({ sprite, value, label }: { sprite: typeof star; value: string | number; label: string }) {
  return (
    <Box style={{ flex: 1, alignItems: 'center', gap: px * 2, padding: px * 3 }}>
      <PixelArt sprite={sprite} scale={3} />
      <Title size={14}>{value}</Title>
      <Label>{label}</Label>
    </Box>
  );
}

export default function Home() {
  const { profile, throws, isPro, freeRemaining } = useSession();
  const latest = throws[0];
  const best = throws.reduce((m, t) => Math.max(m, t.overall_score), 0);
  const weakest = weakestCategory(throws);
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const name = profile?.display_name?.split(' ')[0];

  const message = latest
    ? `Next throw, think: "${latest.focus_cue}"`
    : `Hey${name ? ` ${name}` : ''}! Film your first throw and I'll break it down.`;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={14}>DG CADDY</Title>
        {isPro ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px * 2 }}>
            <PixelArt sprite={crown} scale={2} />
            <Label color={colors.white}>PRO</Label>
          </View>
        ) : (
          <Label>
            {freeRemaining} FREE {freeRemaining === 1 ? 'ANALYSIS' : 'ANALYSES'} LEFT
          </Label>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: px * 5 }}>
        <PixelArt sprite={caddy} scale={5} />
        <Bubble>
          <Body size={22} color={colors.primaryDark}>
            {message}
          </Body>
        </Bubble>
      </View>

      <Button
        title="Film a throw"
        icon={<PixelArt sprite={iconRecord} scale={2} colors={{ k: 'transparent' }} />}
        onPress={() => router.push('/record')}
      />

      <View style={{ flexDirection: 'row', gap: px * 3 }}>
        <Stat sprite={flame} value={streakDays(throws)} label="STREAK" />
        <Stat sprite={basket} value={throws.length} label="THROWS" />
        <Stat sprite={star} value={best || '-'} label="BEST" />
      </View>

      {weakest ? (
        <Box fill={colors.primary} edge={colors.deep} style={{ gap: px * 2 }}>
          <Label color={colors.lilac}>WORK ON NEXT</Label>
          <Title size={13}>{SCORE_LABELS[weakest]}</Title>
          <Body color={colors.white}>Your lowest scoring area lately. Check your last report for drills.</Body>
        </Box>
      ) : null}

      {latest ? (
        <View style={{ gap: px * 3 }}>
          <Label>LATEST ANALYSIS</Label>
          <ThrowCard t={latest} />
        </View>
      ) : null}

      <Box style={{ gap: px * 2 }}>
        <Label>CADDY TIP</Label>
        <Body color={colors.white}>{tip}</Body>
      </Box>
    </Screen>
  );
}
