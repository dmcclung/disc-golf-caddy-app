import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import Purchases, { PACKAGE_TYPE, type PurchasesError, type PurchasesPackage } from 'react-native-purchases';

import { hasPro, purchasesEnabled } from '@/lib/purchases';
import { useSession } from '@/lib/session';
import { FREE_ANALYSES } from '@/lib/supabase';
import { PixelArt } from '@/pixel/PixelArt';
import { caddy, check, crown } from '@/pixel/sprites';
import { Box } from '@/ui/Box';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Body, Label, Title } from '@/ui/Text';
import { colors, links, px } from '@/theme';

const FEATURES = [
  'Unlimited throw analysis',
  'Personalized drills for every fault',
  'Progress trends for every part of your form',
  'A coach that remembers your last sessions',
];

const ORDER: Partial<Record<PACKAGE_TYPE, number>> = {
  [PACKAGE_TYPE.ANNUAL]: 0,
  [PACKAGE_TYPE.MONTHLY]: 1,
  [PACKAGE_TYPE.WEEKLY]: 2,
  [PACKAGE_TYPE.LIFETIME]: 3,
};

const PERIOD_LABEL: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.ANNUAL]: 'Yearly',
  [PACKAGE_TYPE.MONTHLY]: 'Monthly',
  [PACKAGE_TYPE.WEEKLY]: 'Weekly',
  [PACKAGE_TYPE.LIFETIME]: 'Lifetime',
};

const PER: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.ANNUAL]: '/year',
  [PACKAGE_TYPE.MONTHLY]: '/month',
  [PACKAGE_TYPE.WEEKLY]: '/week',
};

function trialText(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

export default function Paywall() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { setCustomerInfo, refreshPro } = useSession();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(
    purchasesEnabled ? null : 'Purchases are not configured in this build. Add your RevenueCat keys to app/.env.',
  );

  useEffect(() => {
    if (!purchasesEnabled) return;
    Purchases.getOfferings()
      .then((o) => {
        const list = [...(o.current?.availablePackages ?? [])].sort(
          (a, b) => (ORDER[a.packageType] ?? 9) - (ORDER[b.packageType] ?? 9),
        );
        setPackages(list);
        setSelected(list[0] ?? null);
        if (!list.length) setLoadError('No plans are available right now. Please try again later.');
      })
      .catch(() => setLoadError("Couldn't load plans. Check your connection and try again."));
  }, []);

  // "Save 58%" on the annual plan, measured against paying monthly for a year.
  const annualSavings = useMemo(() => {
    const annual = packages?.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
    const monthly = packages?.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
    if (!annual || !monthly || !monthly.product.price) return null;
    const pct = Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);
    return pct > 0 ? pct : null;
  }, [packages]);

  const buy = async () => {
    if (!selected) return;
    setBusy('buy');
    try {
      const { customerInfo } = await Purchases.purchasePackage(selected);
      setCustomerInfo(customerInfo);
      if (hasPro(customerInfo)) {
        refreshPro().catch(() => {});
        close();
      }
    } catch (e) {
      const err = e as PurchasesError;
      if (!err.userCancelled) Alert.alert('Purchase failed', err.message);
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      if (hasPro(info)) {
        refreshPro().catch(() => {});
        close();
      } else {
        Alert.alert('Nothing to restore', "We couldn't find an active DG Caddy Pro subscription for this account.");
      }
    } catch (e) {
      Alert.alert('Restore failed', (e as PurchasesError).message);
    } finally {
      setBusy(null);
    }
  };

  const trial = selected ? trialText(selected) : null;
  const headline =
    reason === 'limit' ? `You've used your ${FREE_ANALYSES} free analyses` : 'Unlock your full potential';

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button
            title={trial ? 'Start free trial' : 'Continue'}
            onPress={buy}
            loading={busy === 'buy'}
            disabled={!selected || busy !== null}
          />
          <Body size={18} center>
            {selected
              ? trial
                ? `${trial}, then ${selected.product.priceString}${PER[selected.packageType] ?? ''}. Cancel anytime.`
                : 'Renews automatically. Cancel anytime in your store settings.'
              : ' '}
          </Body>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: px * 6 }}>
            <Pressable onPress={restore} disabled={busy !== null || !purchasesEnabled}>
              <Label>{busy === 'restore' ? 'RESTORING...' : 'RESTORE'}</Label>
            </Pressable>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(links.terms)}>
              <Label>TERMS</Label>
            </Pressable>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(links.privacy)}>
              <Label>PRIVACY</Label>
            </Pressable>
          </View>
        </>
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={16}>
          <Title size={14} color={colors.lavender}>
            X
          </Title>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', gap: px * 3 }}>
        <PixelArt sprite={crown} scale={4} />
        <PixelArt sprite={caddy} scale={6} />
        <Label color={colors.white}>DG CADDY PRO</Label>
        <Title size={16} center>
          {headline}
        </Title>
      </View>

      <Box style={{ gap: px * 3 }}>
        {FEATURES.map((f) => (
          <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: px * 3 }}>
            <PixelArt sprite={check} scale={3} />
            <Body size={22} color={colors.white} style={{ flex: 1 }}>
              {f}
            </Body>
          </View>
        ))}
      </Box>

      {loadError ? (
        <Body center>{loadError}</Body>
      ) : !packages ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={{ gap: px * 3 }}>
          {packages.map((pkg) => {
            const on = selected?.identifier === pkg.identifier;
            const annual = pkg.packageType === PACKAGE_TYPE.ANNUAL;
            const t = trialText(pkg);
            return (
              <Pressable key={pkg.identifier} onPress={() => setSelected(pkg)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <Box
                  fill={on ? colors.white : colors.surface}
                  edge={on ? colors.lavender : colors.outline}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: px * 3 }}>
                  <View style={{ flex: 1, gap: px }}>
                    <Title size={11} color={on ? colors.primaryDark : colors.white}>
                      {PERIOD_LABEL[pkg.packageType] ?? pkg.product.title}
                    </Title>
                    <Body size={20} color={on ? colors.primary : colors.lavender}>
                      {t ?? (annual && pkg.product.pricePerMonthString ? `Just ${pkg.product.pricePerMonthString}/mo` : ' ')}
                    </Body>
                  </View>
                  <Title size={12} color={on ? colors.primaryDark : colors.white}>
                    {pkg.product.priceString}
                  </Title>
                  {annual && annualSavings ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -px * 7,
                        right: px * 2,
                        backgroundColor: colors.primary,
                        borderWidth: 2,
                        borderColor: colors.outline,
                        paddingHorizontal: px * 2,
                        paddingVertical: px,
                      }}>
                      <Label color={colors.white}>SAVE {annualSavings}%</Label>
                    </View>
                  ) : null}
                </Box>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
