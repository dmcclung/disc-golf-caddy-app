import { Tabs } from 'expo-router/js-tabs';

import { PixelArt } from '@/pixel/PixelArt';
import { iconChart, iconGear, iconHome, iconRecord, type Sprite } from '@/pixel/sprites';
import { colors, fonts, px } from '@/theme';

function icon(sprite: Sprite) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <PixelArt sprite={sprite} scale={2} tint={focused ? colors.white : colors.primary} colors={{ k: 'transparent' }} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.primary,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopWidth: px - 1,
          borderTopColor: colors.outline,
          paddingTop: px * 2,
        },
        tabBarLabelStyle: { fontFamily: fonts.display, fontSize: 7, marginTop: px },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon(iconHome) }} />
      <Tabs.Screen name="record" options={{ title: 'Record', tabBarIcon: icon(iconRecord) }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon(iconChart) }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon(iconGear) }} />
    </Tabs>
  );
}
