import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { analyzeThrow, ApiError } from '@/lib/api';
import { extractFrames, frameTimes } from '@/lib/frames';
import { clearPending, getPending } from '@/lib/pending';
import { useSession } from '@/lib/session';
import { PixelArt } from '@/pixel/PixelArt';
import { basket, caddy, flyingDisc } from '@/pixel/sprites';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Body, Label, Title } from '@/ui/Text';
import { colors, px } from '@/theme';

const QUIPS = [
  'Checking your reach back',
  'Measuring hip rotation',
  'Looking for the power pocket',
  'Reading your nose angle',
  'Judging the follow through',
  'Consulting the chains',
  'Writing up your drills',
];

type Phase = 'frames' | 'coach' | 'error';

function FlightAnimation() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);

  // A gentle S-curve flight path toward the basket.
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-40, 200] });
  const translateY = t.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [40, 0, -10, 60] });
  return (
    <View style={{ height: 180, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <PixelArt sprite={caddy} scale={5} />
      <Animated.View style={{ position: 'absolute', left: 40, top: 40, transform: [{ translateX }, { translateY }] }}>
        <PixelArt sprite={flyingDisc} scale={3} />
      </Animated.View>
      <PixelArt sprite={basket} scale={5} />
    </View>
  );
}

export default function Analyzing() {
  const { refreshThrows } = useSession();
  const [phase, setPhase] = useState<Phase>('frames');
  const [quip, setQuip] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    const job = getPending();
    if (!job) {
      router.replace('/record');
      return;
    }
    setError(null);
    try {
      setPhase('frames');
      const frames = await extractFrames(job.videoUri, frameTimes(job.durationSec, job.releaseSec));
      if (frames.length < 3) throw new ApiError('frames', "We couldn't read that video. Try recording it again.");

      setPhase('coach');
      const result = await analyzeThrow({
        frames,
        throwType: job.throwType,
        cameraAngle: job.cameraAngle,
        disc: job.disc,
        notes: job.notes,
      });
      clearPending();
      refreshThrows().catch(() => {});
      router.replace(`/throw/${result.id}`);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('unknown', 'Something went wrong. Please try again.');
      if (err.code === 'paywall') {
        router.replace({ pathname: '/paywall', params: { reason: 'limit' } });
        return;
      }
      console.warn('analysis failed', e);
      setError(err);
      setPhase('error');
    }
  }, [refreshThrows]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  useEffect(() => {
    if (phase !== 'coach') return;
    const id = setInterval(() => setQuip((q) => (q + 1) % QUIPS.length), 2200);
    return () => clearInterval(id);
  }, [phase]);

  if (phase === 'error') {
    const retryable = !['not_a_throw', 'refused', 'daily_limit'].includes(error?.code ?? '');
    return (
      <Screen edges={['top', 'bottom']} scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: px * 5 }}>
          <PixelArt sprite={caddy} scale={7} />
          <Title center size={14}>
            {error?.code === 'not_a_throw' ? 'No throw spotted' : 'Shanked it!'}
          </Title>
          <Body center>{error?.message}</Body>
        </View>
        <View style={{ gap: px * 3, marginTop: px * 6 }}>
          {retryable ? <Button title="Try again" onPress={run} /> : null}
          <Button
            title="Back to record"
            variant={retryable ? 'ghost' : 'primary'}
            onPress={() => {
              clearPending();
              router.replace('/record');
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} scroll={false} contentStyle={{ justifyContent: 'center', gap: px * 8 }}>
      <FlightAnimation />
      <View style={{ gap: px * 3 }}>
        <Label center>{phase === 'frames' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}</Label>
        <Title center size={14}>
          {phase === 'frames' ? 'Scanning your video' : 'Your caddy is watching'}
        </Title>
        <Body center size={24} color={colors.lilac}>
          {phase === 'frames' ? 'Pulling key frames from your throw' : `${QUIPS[quip]}...`}
        </Body>
      </View>
      <Body center>This usually takes under a minute. Keep the app open.</Body>
    </Screen>
  );
}
