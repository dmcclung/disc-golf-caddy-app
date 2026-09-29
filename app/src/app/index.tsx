import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@/lib/session';
import { PixelArt } from '@/pixel/PixelArt';
import { caddy } from '@/pixel/sprites';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Body, Title } from '@/ui/Text';
import { colors } from '@/theme';

/** Entry gate: connection error, onboarding, or the main tabs. */
export default function Index() {
  const { ready, error, profile, retry } = useSession();

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (error || !profile) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
        <PixelArt sprite={caddy} scale={6} />
        <View style={{ gap: 12, alignItems: 'center' }}>
          <Title center>Out of bounds!</Title>
          <Body center>{error ?? 'Something went wrong loading your profile.'}</Body>
        </View>
        <Button title="Try again" onPress={retry} />
      </Screen>
    );
  }

  return <Redirect href={profile.onboarded ? '/home' : '/onboarding'} />;
}
