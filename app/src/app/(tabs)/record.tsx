import { useEventListener } from 'expo';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { setPending } from '@/lib/pending';
import { useSession } from '@/lib/session';
import { THROW_TYPE_LABELS, type CameraAngle, type ThrowType } from '@/lib/types';
import { PixelArt } from '@/pixel/PixelArt';
import { camera, disc } from '@/pixel/sprites';
import { Box } from '@/ui/Box';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Option';
import { Screen } from '@/ui/Screen';
import { Scrubber } from '@/ui/Scrubber';
import { Body, Label, Title } from '@/ui/Text';
import { colors, fonts, px } from '@/theme';

const MAX_SECONDS = 20;

const ANGLES: { value: CameraAngle; label: string }[] = [
  { value: 'side', label: 'Side' },
  { value: 'behind', label: 'Behind' },
  { value: 'front', label: 'Front' },
];

const TIPS = [
  'Side view, about 30 ft away',
  'Whole body in frame, head to feet',
  'Start recording before your run-up',
  'Good light, phone propped steady',
];

type Clip = { uri: string; durationSec: number };

function pauseAt(player: VideoPlayer, seconds: number) {
  player.pause();
  player.currentTime = seconds;
}

function ClipEditor({ clip, onAnalyze, onReset }: { clip: Clip; onAnalyze: (durationSec: number, releaseSec: number | null) => void; onReset: () => void }) {
  const [duration, setDuration] = useState(clip.durationSec);
  const [release, setRelease] = useState<number | null>(null);
  const player = useVideoPlayer(clip.uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEventListener(player, 'sourceLoad', ({ duration: d }) => {
    if (d > 0) setDuration(d);
  });

  const seek = (fraction: number) => {
    const t = fraction * duration;
    pauseAt(player, t);
    setRelease(t);
  };

  return (
    <View style={{ gap: px * 4 }}>
      <Box padded={false} fill={colors.bgDeep} style={{ aspectRatio: 9 / 12, overflow: 'hidden' }}>
        <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />
      </Box>

      <Box style={{ gap: px * 3 }}>
        <Label>OPTIONAL · MARK THE RELEASE</Label>
        <Body color={colors.white}>
          Drag to the moment the disc leaves your hand. Your caddy will focus on the throw instead of the walk-up.
        </Body>
        <Scrubber value={release != null && duration ? release / duration : 0} onChange={seek} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label>{release != null ? `RELEASE @ ${release.toFixed(1)}s` : 'NOT SET'}</Label>
          <Label>{duration.toFixed(1)}s</Label>
        </View>
      </Box>

      <Button title="Analyze throw" onPress={() => onAnalyze(duration, release)} />
      <Button title="Choose a different video" variant="ghost" onPress={onReset} />
    </View>
  );
}

export default function Record() {
  const { isPro, freeRemaining, profile } = useSession();
  const [throwType, setThrowType] = useState<ThrowType>(profile?.primary_throw === 'forehand' ? 'forehand' : 'backhand');
  const [angle, setAngle] = useState<CameraAngle>('side');
  const [discName, setDiscName] = useState('');
  const [clip, setClip] = useState<Clip | null>(null);

  const accept = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setClip({ uri: asset.uri, durationSec: (asset.duration ?? 0) / 1000 });
  };

  const recordVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to film your throw, or upload a video instead.');
      return;
    }
    accept(
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: MAX_SECONDS,
        quality: 1,
      }),
    );
  };

  const pickVideo = async () => {
    accept(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true, // lets players trim long clips down to the throw
        videoMaxDuration: 60,
        quality: 1,
      }),
    );
  };

  const analyze = (durationSec: number, releaseSec: number | null) => {
    if (!clip) return;
    if (!isPro && freeRemaining <= 0) {
      router.push({ pathname: '/paywall', params: { reason: 'limit' } });
      return;
    }
    setPending({
      videoUri: clip.uri,
      durationSec,
      releaseSec,
      throwType,
      cameraAngle: angle,
      disc: discName.trim() || undefined,
    });
    setClip(null);
    router.push('/analyzing');
  };

  return (
    <Screen>
      <Title size={16}>Film a throw</Title>

      <View style={{ gap: px * 2 }}>
        <Label>THROW TYPE</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px * 2 }}>
          {(Object.keys(THROW_TYPE_LABELS) as ThrowType[]).map((t) => (
            <Chip key={t} title={THROW_TYPE_LABELS[t]} selected={throwType === t} onPress={() => setThrowType(t)} />
          ))}
        </View>
      </View>

      <View style={{ gap: px * 2 }}>
        <Label>FILMED FROM</Label>
        <View style={{ flexDirection: 'row', gap: px * 2 }}>
          {ANGLES.map((a) => (
            <Chip key={a.value} title={a.label} selected={angle === a.value} onPress={() => setAngle(a.value)} />
          ))}
        </View>
      </View>

      <View style={{ gap: px * 2 }}>
        <Label>DISC (OPTIONAL)</Label>
        <TextInput
          value={discName}
          onChangeText={setDiscName}
          placeholder="e.g. Destroyer, Buzzz"
          placeholderTextColor={colors.lavender}
          maxLength={40}
          style={{
            fontFamily: fonts.body,
            fontSize: 22,
            color: colors.white,
            backgroundColor: colors.bgDeep,
            borderWidth: px - 1,
            borderColor: colors.outline,
            paddingHorizontal: px * 3,
            paddingVertical: px * 2,
          }}
        />
      </View>

      {clip ? (
        <ClipEditor key={clip.uri} clip={clip} onAnalyze={analyze} onReset={() => setClip(null)} />
      ) : (
        <>
          <Box style={{ gap: px * 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px * 3 }}>
              <PixelArt sprite={camera} scale={3} />
              <Title size={11}>Filming tips</Title>
            </View>
            {TIPS.map((t) => (
              <View key={t} style={{ flexDirection: 'row', gap: px * 2 }}>
                <PixelArt sprite={disc} scale={1} style={{ marginTop: px * 1.5 }} />
                <Body color={colors.white} style={{ flex: 1 }}>
                  {t}
                </Body>
              </View>
            ))}
          </Box>
          <Button title="Record video" onPress={recordVideo} />
          <Button title="Upload from library" variant="secondary" onPress={pickVideo} />
          {!isPro ? (
            <Body center>
              {freeRemaining > 0
                ? `${freeRemaining} free ${freeRemaining === 1 ? 'analysis' : 'analyses'} left`
                : 'Free analyses used. Upgrade to keep going.'}
            </Body>
          ) : null}
        </>
      )}
    </Screen>
  );
}
