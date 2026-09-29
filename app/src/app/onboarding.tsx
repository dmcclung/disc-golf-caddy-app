import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { useSession } from '@/lib/session';
import type { Handedness, Profile, SkillLevel } from '@/lib/types';
import { PixelArt } from '@/pixel/PixelArt';
import { basket, caddy, camera, cloud, disc, flyingDisc, iconChart, tree } from '@/pixel/sprites';
import { Box } from '@/ui/Box';
import { Button } from '@/ui/Button';
import { Option } from '@/ui/Option';
import { Screen } from '@/ui/Screen';
import { Body, Label, Title } from '@/ui/Text';
import { colors, fonts, px } from '@/theme';

const SKILLS: { value: SkillLevel; title: string; subtitle: string }[] = [
  { value: 'new', title: 'Brand new', subtitle: 'Just picked up my first disc' },
  { value: 'casual', title: 'Casual', subtitle: 'I play for fun with friends' },
  { value: 'league', title: 'League player', subtitle: 'Weekly doubles, keeping score' },
  { value: 'advanced', title: 'Advanced', subtitle: 'Tournaments, rated 900+' },
  { value: 'pro', title: 'Touring pro', subtitle: 'Chasing the podium' },
];

const GOALS = [
  'More distance',
  'Better accuracy',
  'Fix my form',
  'Stop rounding',
  'Learn forehand',
  'Consistent putting',
];

const DISTANCES = [
  { value: 150, title: 'Under 200 ft' },
  { value: 250, title: '200 - 300 ft' },
  { value: 350, title: '300 - 400 ft' },
  { value: 450, title: '400 ft +' },
];

type Answers = {
  display_name: string;
  skill_level: SkillLevel | null;
  handedness: Handedness | null;
  primary_throw: Profile['primary_throw'] | null;
  goals: string[];
  typical_distance_ft: number | null;
};

const STEPS = ['welcome', 'name', 'skill', 'hand', 'throw', 'goals', 'distance', 'how', 'building'] as const;
type Step = (typeof STEPS)[number];

function Progress({ index }: { index: number }) {
  // Welcome and the final "building" step don't show progress.
  const total = STEPS.length - 2;
  return (
    <View style={{ flexDirection: 'row', gap: px }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: px * 2,
            backgroundColor: i < index ? colors.white : colors.surfaceHi,
            borderWidth: 1,
            borderColor: colors.outline,
          }}
        />
      ))}
    </View>
  );
}

function Bounce({ children }: { children: React.ReactNode }) {
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -px * 2, duration: 400, easing: Easing.step0, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 400, easing: Easing.step0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  return <Animated.View style={{ transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

function Welcome() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: px * 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <PixelArt sprite={cloud} scale={3} />
        <PixelArt sprite={flyingDisc} scale={3} style={{ marginBottom: px * 6 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: px * 4 }}>
        <PixelArt sprite={tree} scale={5} />
        <Bounce>
          <PixelArt sprite={caddy} scale={7} />
        </Bounce>
        <PixelArt sprite={basket} scale={5} />
      </View>
      <View style={{ gap: px * 4 }}>
        <Title size={22} center>
          DG CADDY
        </Title>
        <Body center size={26}>
          Film your throw. Get coached by AI. Watch your scores climb.
        </Body>
      </View>
    </View>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: px * 5 }}>
      <View style={{ gap: px * 2 }}>
        <Title size={15}>{title}</Title>
        {subtitle ? <Body>{subtitle}</Body> : null}
      </View>
      <View style={{ gap: px * 3 }}>{children}</View>
    </View>
  );
}

function HowItWorks() {
  const steps = [
    { sprite: camera, title: 'Film it', body: 'Prop your phone up to the side, about 30 ft away. Get your whole body in frame.' },
    { sprite: disc, title: 'Get coached', body: 'Your caddy breaks down footwork, reach back, power pocket, release and more.' },
    { sprite: iconChart, title: 'Level up', body: 'Run the drills, film again, and watch your form scores climb.' },
  ];
  return (
    <Question title="How it works">
      {steps.map((s, i) => (
        <Box key={s.title} style={{ flexDirection: 'row', gap: px * 4, alignItems: 'center' }}>
          <View style={{ width: 56, alignItems: 'center' }}>
            <PixelArt sprite={s.sprite} scale={4} tint={colors.white} />
          </View>
          <View style={{ flex: 1, gap: px }}>
            <Label>STEP {i + 1}</Label>
            <Title size={12}>{s.title}</Title>
            <Body size={20}>{s.body}</Body>
          </View>
        </Box>
      ))}
    </Question>
  );
}

function Building({ onDone }: { onDone: () => void }) {
  const lines = ['Reading your answers', 'Picking your first drills', 'Tuning your coach', 'Ready!'];
  const [shown, setShown] = useState(0);
  const [x] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    const id = setInterval(() => setShown((n) => n + 1), 700);
    return () => clearInterval(id);
  }, [x]);

  const done = useRef(false);
  useEffect(() => {
    if (shown > lines.length && !done.current) {
      done.current = true;
      onDone();
    }
  }, [shown, lines.length, onDone]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: px * 8 }}>
      <View style={{ height: 40, overflow: 'hidden' }}>
        <Animated.View
          style={{ transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-80, 400] }) }] }}>
          <PixelArt sprite={flyingDisc} scale={4} />
        </Animated.View>
      </View>
      <Title center size={14}>
        Building your game plan
      </Title>
      <View style={{ gap: px * 2, alignSelf: 'center' }}>
        {lines.slice(0, Math.min(shown, lines.length)).map((l) => (
          <Body key={l} size={24} color={colors.white}>
            {'> '}
            {l}
          </Body>
        ))}
      </View>
    </View>
  );
}

export default function Onboarding() {
  const { profile, updateProfile, isPro } = useSession();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    display_name: profile?.display_name ?? '',
    skill_level: profile?.skill_level ?? null,
    handedness: null,
    primary_throw: null,
    goals: [],
    typical_distance_ft: null,
  });
  const step: Step = STEPS[index];
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  const canContinue: Record<Step, boolean> = {
    welcome: true,
    name: true,
    skill: !!answers.skill_level,
    hand: !!answers.handedness,
    throw: !!answers.primary_throw,
    goals: answers.goals.length > 0,
    distance: !!answers.typical_distance_ft,
    how: true,
    building: false,
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile({
        display_name: answers.display_name.trim() || null,
        skill_level: answers.skill_level,
        handedness: answers.handedness ?? 'right',
        primary_throw: answers.primary_throw ?? 'backhand',
        goals: answers.goals,
        typical_distance_ft: answers.typical_distance_ft,
        onboarded: true,
      });
    } catch (e) {
      console.warn('saving onboarding failed', e);
    }
    router.replace('/home');
    if (!isPro) router.push({ pathname: '/paywall', params: { from: 'onboarding' } });
  };

  const footer =
    step === 'building' ? null : (
      <>
        <Button
          title={step === 'welcome' ? "Let's go" : step === 'how' ? 'Build my plan' : 'Continue'}
          disabled={!canContinue[step]}
          onPress={next}
        />
        {index > 0 ? <Button title="Back" variant="ghost" onPress={back} /> : null}
      </>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} scroll={step !== 'welcome' && step !== 'building'} footer={footer}>
        {step !== 'welcome' && step !== 'building' ? <Progress index={index} /> : null}

        {step === 'welcome' && <Welcome />}

        {step === 'name' && (
          <Question title="What should your caddy call you?" subtitle="Optional. You can change it later.">
            <TextInput
              value={answers.display_name}
              onChangeText={(display_name) => set({ display_name })}
              placeholder="Your name"
              placeholderTextColor={colors.lavender}
              autoCapitalize="words"
              maxLength={30}
              returnKeyType="next"
              onSubmitEditing={next}
              style={{
                fontFamily: fonts.body,
                fontSize: 28,
                color: colors.white,
                backgroundColor: colors.bgDeep,
                borderWidth: px - 1,
                borderColor: colors.outline,
                borderBottomWidth: px * 2,
                borderBottomColor: colors.primary,
                padding: px * 4,
              }}
            />
          </Question>
        )}

        {step === 'skill' && (
          <Question title="How would you describe your game?">
            {SKILLS.map((s) => (
              <Option
                key={s.value}
                title={s.title}
                subtitle={s.subtitle}
                selected={answers.skill_level === s.value}
                onPress={() => set({ skill_level: s.value })}
              />
            ))}
          </Question>
        )}

        {step === 'hand' && (
          <Question title="Which hand do you throw with?">
            <Option title="Right-handed" selected={answers.handedness === 'right'} onPress={() => set({ handedness: 'right' })} />
            <Option title="Left-handed" selected={answers.handedness === 'left'} onPress={() => set({ handedness: 'left' })} />
          </Question>
        )}

        {step === 'throw' && (
          <Question title="What's your go-to throw?">
            <Option
              title="Backhand"
              subtitle="Reach back across the body"
              selected={answers.primary_throw === 'backhand'}
              onPress={() => set({ primary_throw: 'backhand' })}
            />
            <Option
              title="Forehand"
              subtitle="Sidearm flick"
              selected={answers.primary_throw === 'forehand'}
              onPress={() => set({ primary_throw: 'forehand' })}
            />
            <Option
              title="Both"
              subtitle="I throw whatever the hole needs"
              selected={answers.primary_throw === 'both'}
              onPress={() => set({ primary_throw: 'both' })}
            />
          </Question>
        )}

        {step === 'goals' && (
          <Question title="What do you want to improve?" subtitle="Pick as many as you like.">
            {GOALS.map((g) => {
              const on = answers.goals.includes(g);
              return (
                <Option
                  key={g}
                  compact
                  title={g}
                  selected={on}
                  onPress={() => set({ goals: on ? answers.goals.filter((x) => x !== g) : [...answers.goals, g] })}
                />
              );
            })}
          </Question>
        )}

        {step === 'distance' && (
          <Question title="How far is your best drive?" subtitle="Rough guess is fine. We'll track it as you improve.">
            {DISTANCES.map((d) => (
              <Option
                key={d.value}
                title={d.title}
                selected={answers.typical_distance_ft === d.value}
                onPress={() => set({ typical_distance_ft: d.value })}
              />
            ))}
          </Question>
        )}

        {step === 'how' && <HowItWorks />}

        {step === 'building' && <Building onDone={finish} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}
