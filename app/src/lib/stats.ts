import { SCORE_KEYS, type ScoreKey, type ThrowRow } from './types';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive days (ending today or yesterday) with at least one analyzed throw. */
export function streakDays(throws: ThrowRow[]): number {
  const days = new Set(throws.map((t) => dayKey(new Date(t.created_at))));
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function average(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

/**
 * Category averages over the most recent `window` throws, and the change versus
 * the `window` throws before that. Input is newest-first.
 */
export function categoryTrends(throws: ThrowRow[], window = 5) {
  const recent = throws.slice(0, window);
  const prior = throws.slice(window, window * 2);
  return SCORE_KEYS.map((key: ScoreKey) => {
    const now = average(recent.map((t) => t.scores[key]));
    const before = average(prior.map((t) => t.scores[key]));
    return { key, value: now ?? 0, delta: now != null && before != null ? now - before : null };
  });
}

/** The category with the lowest recent average: what to work on next. */
export function weakestCategory(throws: ThrowRow[]): ScoreKey | null {
  if (!throws.length) return null;
  const trends = categoryTrends(throws);
  return trends.reduce((min, t) => (t.value < min.value ? t : min)).key;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
