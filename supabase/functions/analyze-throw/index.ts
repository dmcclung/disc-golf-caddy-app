// POST /functions/v1/analyze-throw
// Body: { frames: base64 JPEG[], frameTimes: number[], throwType, cameraAngle, disc?, notes? }
// Returns: { throw: <throws row> }
import { decodeBase64 } from "jsr:@std/encoding@1/base64";
import { corsHeaders, fail, json } from "../_shared/http.ts";
import { adminClient, getCaller } from "../_shared/supabase.ts";
import { isPro } from "../_shared/entitlements.ts";
import { analyzeThrow, CoachRefusalError, MODEL, type CameraAngle, type ThrowType } from "./coach.ts";

const FREE_ANALYSES = Number(Deno.env.get("FREE_ANALYSES") ?? 3);
const PRO_DAILY_LIMIT = Number(Deno.env.get("PRO_DAILY_LIMIT") ?? 30);
const MIN_FRAMES = 3;
const MAX_FRAMES = 12;
const MAX_FRAME_BASE64 = 1_500_000; // ~1.1 MB per JPEG

const THROW_TYPES: ThrowType[] = ["backhand", "forehand", "putt", "approach"];
const ANGLES: CameraAngle[] = ["side", "behind", "front"];

interface Body {
  frames: string[];
  frameTimes: number[];
  throwType: ThrowType;
  cameraAngle: CameraAngle;
  disc?: string;
  notes?: string;
}

function validate(b: Partial<Body>): string | null {
  if (!Array.isArray(b.frames) || b.frames.length < MIN_FRAMES || b.frames.length > MAX_FRAMES) {
    return `Send between ${MIN_FRAMES} and ${MAX_FRAMES} frames.`;
  }
  if (b.frames.some((f) => typeof f !== "string" || f.length > MAX_FRAME_BASE64)) {
    return "A frame is missing or too large.";
  }
  if (!Array.isArray(b.frameTimes) || b.frameTimes.length !== b.frames.length) {
    return "frameTimes must match frames.";
  }
  if (!THROW_TYPES.includes(b.throwType as ThrowType)) return "Unknown throw type.";
  if (!ANGLES.includes(b.cameraAngle as CameraAngle)) return "Unknown camera angle.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  const admin = adminClient();
  const user = await getCaller(req, admin);
  if (!user) return fail(401, "unauthorized", "Sign in again and retry.");

  let body: Partial<Body>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Body must be JSON.");
  }
  const invalid = validate(body);
  if (invalid) return fail(400, "bad_request", invalid);
  const b = body as Body;

  // Quota: free users get FREE_ANALYSES total; Pro users get a generous daily cap.
  const pro = await isPro(admin, user.id);
  if (pro) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("throws")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= PRO_DAILY_LIMIT) {
      return fail(429, "daily_limit", `You've hit today's limit of ${PRO_DAILY_LIMIT} analyses. Rest that arm!`);
    }
  } else {
    const { data: ent } = await admin
      .from("entitlements")
      .select("analyses_used")
      .eq("user_id", user.id)
      .maybeSingle();
    if ((ent?.analyses_used ?? 0) >= FREE_ANALYSES) {
      return fail(402, "paywall", "You've used your free analyses. Upgrade to Pro to keep improving.");
    }
  }

  const [{ data: profile }, { data: history }] = await Promise.all([
    admin.from("profiles").select("skill_level, handedness, goals").eq("id", user.id).maybeSingle(),
    admin
      .from("throws")
      .select("created_at, overall_score, focus_cue, headline")
      .eq("user_id", user.id)
      .eq("throw_type", b.throwType)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  let analysis;
  try {
    analysis = await analyzeThrow(b.frames, {
      throwType: b.throwType,
      cameraAngle: b.cameraAngle,
      handedness: profile?.handedness ?? "right",
      skillLevel: profile?.skill_level ?? null,
      goals: profile?.goals ?? [],
      disc: b.disc?.slice(0, 80) || null,
      notes: b.notes?.slice(0, 500) || null,
      frameTimes: b.frameTimes,
      history: history ?? [],
    });
  } catch (err) {
    if (err instanceof CoachRefusalError) return fail(422, "refused", err.message);
    console.error("analysis failed", err);
    return fail(502, "analysis_failed", "The caddy couldn't finish that one. Try again in a moment.");
  }

  if (!analysis.is_disc_golf_throw) {
    return fail(422, "not_a_throw", "We couldn't spot a disc golf throw in that clip. Try filming your full body from the side.");
  }

  const throwId = crypto.randomUUID();
  const uploads = await Promise.all(
    b.frames.map((f, i) =>
      admin.storage
        .from("throw-frames")
        .upload(`${user.id}/${throwId}/${String(i).padStart(2, "0")}.jpg`, decodeBase64(f), {
          contentType: "image/jpeg",
          upsert: true,
        })
    ),
  );
  const uploadError = uploads.find((u) => u.error)?.error;
  if (uploadError) console.error("frame upload failed", uploadError);

  const { data: row, error } = await admin
    .from("throws")
    .insert({
      id: throwId,
      user_id: user.id,
      throw_type: b.throwType,
      camera_angle: b.cameraAngle,
      disc: b.disc?.slice(0, 80) || null,
      notes: b.notes?.slice(0, 500) || null,
      overall_score: analysis.overall_score,
      scores: analysis.scores,
      headline: analysis.headline,
      summary: analysis.summary,
      strengths: analysis.strengths,
      faults: analysis.faults,
      drills: analysis.drills,
      focus_cue: analysis.focus_cue,
      confidence: analysis.confidence,
      filming_tip: analysis.filming_tip || null,
      frame_count: uploadError ? 0 : b.frames.length,
      key_frame: analysis.key_frame,
      model: MODEL,
    })
    .select()
    .single();

  if (!error) {
    const { error: countError } = await admin.rpc("increment_analyses", { uid: user.id });
    if (countError) console.error("increment_analyses failed", countError);
  }

  if (error) {
    console.error("insert failed", error);
    return fail(500, "save_failed", "Your analysis finished but couldn't be saved. Try again.");
  }
  return json({ throw: row });
});
