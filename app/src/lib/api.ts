import { FunctionsHttpError } from '@supabase/supabase-js';

import type { Frame } from './frames';
import { supabase } from './supabase';
import type { CameraAngle, ThrowRow, ThrowType } from './types';

/** Error codes returned by the edge functions; see supabase/functions. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new ApiError(payload?.error ?? 'unknown', payload?.message ?? 'Something went wrong.');
    }
    throw new ApiError('network', "Couldn't reach the caddy. Check your connection and try again.");
  }
  return data as T;
}

export async function analyzeThrow(input: {
  frames: Frame[];
  throwType: ThrowType;
  cameraAngle: CameraAngle;
  disc?: string;
  notes?: string;
}): Promise<ThrowRow> {
  const res = await invoke<{ throw: ThrowRow }>('analyze-throw', {
    frames: input.frames.map((f) => f.base64),
    frameTimes: input.frames.map((f) => f.time),
    throwType: input.throwType,
    cameraAngle: input.cameraAngle,
    disc: input.disc,
    notes: input.notes,
  });
  return res.throw;
}

export async function deleteAccount(): Promise<void> {
  await invoke('delete-account', {});
  await supabase.auth.signOut();
}

export async function fetchThrows(): Promise<ThrowRow[]> {
  const { data, error } = await supabase.from('throws').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data as ThrowRow[];
}

export async function fetchThrow(id: string): Promise<ThrowRow> {
  const { data, error } = await supabase.from('throws').select('*').eq('id', id).single();
  if (error) throw error;
  return data as ThrowRow;
}

export async function deleteThrow(id: string): Promise<void> {
  const { error } = await supabase.from('throws').delete().eq('id', id);
  if (error) throw error;
}

/** Signed URLs for a throw's stored frames, in order. */
export async function frameUrls(t: ThrowRow): Promise<string[]> {
  if (!t.frame_count) return [];
  const paths = Array.from({ length: t.frame_count }, (_, i) => `${t.user_id}/${t.id}/${String(i).padStart(2, '0')}.jpg`);
  const { data, error } = await supabase.storage.from('throw-frames').createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return data.map((d) => d.signedUrl ?? '');
}
