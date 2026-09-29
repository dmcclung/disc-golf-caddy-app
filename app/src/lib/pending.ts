import type { CameraAngle, ThrowType } from './types';

/** The clip and options handed from the Record tab to the Analyzing screen. */
export type PendingAnalysis = {
  videoUri: string;
  durationSec: number;
  releaseSec: number | null;
  throwType: ThrowType;
  cameraAngle: CameraAngle;
  disc?: string;
  notes?: string;
};

// Video URIs are long and local, so pass them in memory rather than as route params.
let pending: PendingAnalysis | null = null;

export function setPending(job: PendingAnalysis) {
  pending = job;
}

export function getPending(): PendingAnalysis | null {
  return pending;
}

export function clearPending() {
  pending = null;
}
