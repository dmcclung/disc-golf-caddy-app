import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { PixelArt } from '@/pixel/PixelArt';
import { check } from '@/pixel/sprites';
import { colors, px } from '@/theme';
import { Body, Title } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
  compact?: boolean;
};

/** A selectable answer tile used in onboarding and forms. */
export function Option({ title, subtitle, selected, onPress, icon, compact }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onPress();
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: px * 3,
          paddingVertical: compact ? px * 2.5 : px * 4,
          paddingHorizontal: px * 4,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: px - 1,
          borderBottomWidth: px * 2,
          borderColor: colors.outline,
          borderBottomColor: selected ? colors.deep : colors.outline,
        }}>
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
          <Title size={compact ? 10 : 11} color={colors.white}>
            {title}
          </Title>
          {subtitle ? (
            <Body size={20} color={selected ? colors.lilac : colors.lavender}>
              {subtitle}
            </Body>
          ) : null}
        </View>
        <View
          style={{
            width: px * 6,
            height: px * 6,
            borderWidth: px - 1,
            borderColor: colors.outline,
            backgroundColor: selected ? colors.white : colors.bgDeep,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {selected ? <PixelArt sprite={check} scale={2} colors={{ w: colors.primary }} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Small toggle chip for filters and compact choices. */
export function Chip({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      <View
        style={{
          paddingVertical: px * 2,
          paddingHorizontal: px * 3,
          backgroundColor: selected ? colors.white : colors.surface,
          borderWidth: px - 2,
          borderColor: colors.outline,
        }}>
        <Title size={9} color={selected ? colors.primaryDark : colors.lavender}>
          {title}
        </Title>
      </View>
    </Pressable>
  );
}
