import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import Purchases from 'react-native-purchases';

import { deleteAccount } from '@/lib/api';
import { purchasesEnabled } from '@/lib/purchases';
import { useSession } from '@/lib/session';
import type { Handedness, SkillLevel } from '@/lib/types';
import { PixelArt } from '@/pixel/PixelArt';
import { crown } from '@/pixel/sprites';
import { Box } from '@/ui/Box';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Option';
import { Screen } from '@/ui/Screen';
import { Body, Label, Title } from '@/ui/Text';
import { colors, links, px } from '@/theme';

const SKILLS: { value: SkillLevel; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'casual', label: 'Casual' },
  { value: 'league', label: 'League' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'pro', label: 'Pro' },
];

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: px * 3,
            borderBottomWidth: 2,
            borderBottomColor: colors.surfaceHi,
            opacity: pressed ? 0.6 : 1,
          }}>
          <Body color={colors.white}>{label}</Body>
          <Body>{'>'}</Body>
        </View>
      )}
    </Pressable>
  );
}

export default function Settings() {
  const { profile, updateProfile, isPro, refreshPro, setCustomerInfo, retry } = useSession();
  const [restoring, setRestoring] = useState(false);

  const save = (patch: Parameters<typeof updateProfile>[0]) =>
    updateProfile(patch).catch(() => Alert.alert('Could not save', 'Please try again.'));

  const restore = async () => {
    if (!purchasesEnabled) return;
    setRestoring(true);
    try {
      setCustomerInfo(await Purchases.restorePurchases());
      await refreshPro();
    } catch (e) {
      Alert.alert('Restore failed', (e as Error).message);
    } finally {
      setRestoring(false);
    }
  };

  const manage = () => {
    if (purchasesEnabled) Purchases.showManageSubscriptions().catch(() => {});
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, every throw analysis, and all stored frames. Subscriptions must be cancelled separately in your store settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              retry(); // signs in as a fresh anonymous user and restarts onboarding
              router.replace('/');
            } catch {
              Alert.alert('Could not delete', 'Please try again or contact support.');
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <Title size={16}>Settings</Title>

      <Box style={{ gap: px * 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px * 3 }}>
          <PixelArt sprite={crown} scale={3} />
          <Title size={12}>{isPro ? 'DG Caddy Pro' : 'Free plan'}</Title>
        </View>
        <Body>{isPro ? 'Unlimited analyses and full progress trends.' : 'Upgrade for unlimited analyses and progress trends.'}</Body>
        {isPro ? (
          <Button title="Manage subscription" variant="secondary" onPress={manage} />
        ) : (
          <Button title="Upgrade to Pro" onPress={() => router.push('/paywall')} />
        )}
        <Button title={restoring ? 'Restoring...' : 'Restore purchases'} variant="ghost" onPress={restore} disabled={restoring || !purchasesEnabled} />
      </Box>

      <Box style={{ gap: px * 4 }}>
        <Label>YOUR GAME</Label>
        <View style={{ gap: px * 2 }}>
          <Body color={colors.white}>Throwing hand</Body>
          <View style={{ flexDirection: 'row', gap: px * 2 }}>
            {(['right', 'left'] as Handedness[]).map((h) => (
              <Chip key={h} title={h === 'right' ? 'Right' : 'Left'} selected={profile?.handedness === h} onPress={() => save({ handedness: h })} />
            ))}
          </View>
        </View>
        <View style={{ gap: px * 2 }}>
          <Body color={colors.white}>Skill level</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px * 2 }}>
            {SKILLS.map((s) => (
              <Chip key={s.value} title={s.label} selected={profile?.skill_level === s.value} onPress={() => save({ skill_level: s.value })} />
            ))}
          </View>
        </View>
        <Body>Your caddy uses these to tailor its coaching.</Body>
      </Box>

      <Box style={{ gap: 0 }}>
        <Row label="Redo onboarding" onPress={() => save({ onboarded: false }).then(() => router.replace('/onboarding'))} />
        <Row label="Contact support" onPress={() => Linking.openURL(links.support)} />
        <Row label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(links.privacy)} />
        <Row label="Terms of use" onPress={() => WebBrowser.openBrowserAsync(links.terms)} />
      </Box>

      <Button title="Delete account & data" variant="ghost" onPress={confirmDelete} />
      <Label center>VERSION {Constants.expoConfig?.version ?? '1.0.0'}</Label>
    </Screen>
  );
}
