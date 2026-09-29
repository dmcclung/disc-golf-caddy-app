import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';

export const FRAME_COUNT = 10;
const MAX_EDGE = 768;

/**
 * Picks the timestamps to sample. Claude can't watch video, so we send a short
 * burst of stills. If the player marked the release moment we cluster frames
 * around it (most of the motion happens in the ~1.5s before release);
 * otherwise we spread them across the clip.
 */
export function frameTimes(durationSec: number, releaseSec: number | null, count = FRAME_COUNT): number[] {
  const end = Math.max(0.1, durationSec - 0.05);
  let from = 0;
  let to = end;
  if (releaseSec != null && durationSec > 2.5) {
    from = Math.max(0, releaseSec - 1.4);
    to = Math.min(end, releaseSec + 0.6);
  }
  const step = (to - from) / (count - 1);
  return Array.from({ length: count }, (_, i) => Number((from + step * i).toFixed(3)));
}

export type Frame = { base64: string; time: number };

export async function extractFrames(videoUri: string, times: number[]): Promise<Frame[]> {
  const player = createVideoPlayer(videoUri);
  try {
    const thumbs = await player.generateThumbnailsAsync(times, { maxWidth: MAX_EDGE, maxHeight: MAX_EDGE });
    const frames: Frame[] = [];
    for (const thumb of thumbs) {
      const image = await ImageManipulator.manipulate(thumb).renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      if (saved.base64) frames.push({ base64: saved.base64, time: thumb.actualTime ?? thumb.requestedTime });
    }
    return frames;
  } finally {
    player.release();
  }
}
