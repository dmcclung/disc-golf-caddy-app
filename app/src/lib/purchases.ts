import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';

export const PRO_ENTITLEMENT = 'pro';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/** False on web or when no RevenueCat key is set (e.g. local dev without store setup). */
export const purchasesEnabled = Platform.OS !== 'web' && !!apiKey;

let configured = false;

/** Configure once per launch with the Supabase user id so webhooks map to our users. */
export function configurePurchases(userId: string) {
  if (!purchasesEnabled) return;
  if (configured) {
    Purchases.logIn(userId).catch(() => {});
    return;
  }
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: apiKey!, appUserID: userId });
  configured = true;
}

export function hasPro(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements.active[PRO_ENTITLEMENT];
}
