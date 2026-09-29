export type SkillLevel = 'new' | 'casual' | 'league' | 'advanced' | 'pro';
export type Handedness = 'right' | 'left';
export type ThrowType = 'backhand' | 'forehand' | 'putt' | 'approach';
export type CameraAngle = 'side' | 'behind' | 'front';

export type Profile = {
  id: string;
  display_name: string | null;
  skill_level: SkillLevel | null;
  handedness: Handedness;
  primary_throw: 'backhand' | 'forehand' | 'both';
  goals: string[];
  typical_distance_ft: number | null;
  onboarded: boolean;
};

export const SCORE_KEYS = ['footwork', 'reach_back', 'power_pocket', 'weight_shift', 'release', 'follow_through'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export const SCORE_LABELS: Record<ScoreKey, string> = {
  footwork: 'Footwork',
  reach_back: 'Reach back',
  power_pocket: 'Power pocket',
  weight_shift: 'Weight shift',
  release: 'Release',
  follow_through: 'Follow through',
};

export type Fault = { title: string; detail: string; severity: 'minor' | 'moderate' | 'major'; frame: number };
export type Drill = { name: string; how: string; reps: string };

export type ThrowRow = {
  id: string;
  user_id: string;
  created_at: string;
  throw_type: ThrowType;
  camera_angle: CameraAngle;
  disc: string | null;
  notes: string | null;
  overall_score: number;
  scores: Record<ScoreKey, number>;
  headline: string;
  summary: string;
  strengths: string[];
  faults: Fault[];
  drills: Drill[];
  focus_cue: string;
  confidence: 'low' | 'medium' | 'high';
  filming_tip: string | null;
  frame_count: number;
  key_frame: number;
  model: string;
};

export const THROW_TYPE_LABELS: Record<ThrowType, string> = {
  backhand: 'Backhand',
  forehand: 'Forehand',
  approach: 'Approach',
  putt: 'Putt',
};
