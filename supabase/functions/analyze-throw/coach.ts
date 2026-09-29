import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";

export const MODEL = "claude-opus-5-5";

export const SCORE_KEYS = [
  "footwork",
  "reach_back",
  "power_pocket",
  "weight_shift",
  "release",
  "follow_through",
] as const;

export type ThrowType = "backhand" | "forehand" | "putt" | "approach";
export type CameraAngle = "side" | "behind" | "front";

export interface ThrowContext {
  throwType: ThrowType;
  cameraAngle: CameraAngle;
  handedness: "right" | "left";
  skillLevel: string | null;
  goals: string[];
  disc: string | null;
  notes: string | null;
  /** Seconds from the start of the clip, one per frame. */
  frameTimes: number[];
  /** Recent sessions, newest first, so coaching builds on itself. */
  history: { created_at: string; overall_score: number; focus_cue: string; headline: string }[];
}

export interface Analysis {
  is_disc_golf_throw: boolean;
  confidence: "low" | "medium" | "high";
  overall_score: number;
  scores: Record<(typeof SCORE_KEYS)[number], number>;
  headline: string;
  summary: string;
  strengths: string[];
  faults: { title: string; detail: string; severity: "minor" | "moderate" | "major"; frame: number }[];
  drills: { name: string; how: string; reps: string }[];
  focus_cue: string;
  filming_tip: string;
  key_frame: number;
}

const str = { type: "string" } as const;
const int = { type: "integer" } as const;

// Structured-output schema. Numeric ranges are stated in descriptions and clamped in code.
const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "is_disc_golf_throw", "confidence", "overall_score", "scores", "headline", "summary",
    "strengths", "faults", "drills", "focus_cue", "filming_tip", "key_frame",
  ],
  properties: {
    is_disc_golf_throw: {
      type: "boolean",
      description: "False if the frames do not show a person throwing or putting a disc.",
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    overall_score: { ...int, description: "0-100 form score." },
    scores: {
      type: "object",
      additionalProperties: false,
      required: [...SCORE_KEYS],
      properties: Object.fromEntries(
        SCORE_KEYS.map((k) => [k, { ...int, description: "1-10" }]),
      ),
    },
    headline: { ...str, description: "Under 60 characters. The single biggest takeaway." },
    summary: { ...str, description: "2-4 sentences, spoken like a coach standing next to them." },
    strengths: { type: "array", items: str, description: "1-3 things they do well." },
    faults: {
      type: "array",
      description: "1-4 faults, most important first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "severity", "frame"],
        properties: {
          title: str,
          detail: { ...str, description: "What you see, why it costs them, and what to feel instead." },
          severity: { type: "string", enum: ["minor", "moderate", "major"] },
          frame: { ...int, description: "0-based index of the frame that best shows it." },
        },
      },
    },
    drills: {
      type: "array",
      description: "1-3 drills targeting the top faults.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "how", "reps"],
        properties: { name: str, how: str, reps: str },
      },
    },
    focus_cue: { ...str, description: "A 2-6 word swing thought for their next throw." },
    filming_tip: { ...str, description: "How to film better next time, or empty string if the video was fine." },
    key_frame: { ...int, description: "0-based index of the most instructive frame." },
  },
} as const;

const SYSTEM_PROMPT = `You are DG Caddy, an expert disc golf coach who has taught thousands of players, from first-timers to touring pros. You review a player's throw from frames sampled out of their phone video and give them honest, specific, encouraging coaching.

How to read the input:
- You receive frames in chronological order, each labelled with its index and timestamp. Frames are sampled at intervals, so the exact moment of release may fall between frames; reason about motion across frames and don't over-claim what a single frame shows.
- Camera angle and handedness are given. Mirror your language for left-handed players (e.g. "left hip").

What to evaluate (score each 1-10, where 5 is a typical recreational player and 9-10 is touring-pro level):
- footwork: stance, x-step or approach timing, plant foot position and direction.
- reach_back: disc path and depth, shoulder turn, keeping the disc on plane.
- power_pocket: pulling the disc close to the chest, elbow leading, delayed arm extension.
- weight_shift: moving weight from back to front, hip lead, bracing on the plant leg.
- release: nose angle, hyzer/anyzer angle for the intended line, wrist snap, grip hold.
- follow_through: rotating through the brace, balance at the finish, no "arm only" deceleration.
For putts and approach shots, interpret the same six categories for that motion (e.g. footwork is stance and stagger, reach_back is the draw back).

The overall score is 0-100 and should track the category scores, weighted toward whatever limits distance and accuracy most.

Coaching style:
- Lead with the one change that will help most. Prioritize root causes over symptoms (a rounding fault often starts with the plant foot).
- Be concrete about body positions and what to feel. Avoid jargon without a quick explanation for new players; with advanced players you can be technical.
- Drills must be doable alone in a field or backyard.
- If the player has prior sessions, note progress or recurring faults in the summary.
- If the video is too dark, cropped, far away, or misses key parts of the throw, lower your confidence, score only what you can see, and give a filming tip.
- If the frames are not a disc golf throw at all, set is_disc_golf_throw to false and fill the other fields with neutral placeholder values.`;

function contextText(ctx: ThrowContext): string {
  const lines = [
    `Throw type: ${ctx.throwType}`,
    `Camera angle: filmed from the ${ctx.cameraAngle}`,
    `Handedness: ${ctx.handedness}-handed`,
    `Self-described skill level: ${ctx.skillLevel ?? "unknown"}`,
  ];
  if (ctx.goals.length) lines.push(`Goals: ${ctx.goals.join(", ")}`);
  if (ctx.disc) lines.push(`Disc: ${ctx.disc}`);
  if (ctx.notes) lines.push(`Player's note: ${ctx.notes}`);
  if (ctx.history.length) {
    lines.push("", "Recent sessions (newest first):");
    for (const h of ctx.history) {
      lines.push(`- ${h.created_at.slice(0, 10)}: ${h.overall_score}/100, "${h.headline}", focus cue "${h.focus_cue}"`);
    }
  }
  lines.push("", `There are ${ctx.frameTimes.length} frames above. Analyze the throw.`);
  return lines.join("\n");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : lo)));
}

export class CoachRefusalError extends Error {}

export async function analyzeThrow(framesBase64: string[], ctx: ThrowContext): Promise<Analysis> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  framesBase64.forEach((data, i) => {
    content.push({ type: "text", text: `Frame ${i} (t=${ctx.frameTimes[i]?.toFixed(2) ?? "?"}s)` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  content.push({ type: "text", text: contextText(ctx) });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new CoachRefusalError("The coach could not analyze this video.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Analysis was cut off before it finished.");
  }

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const a = JSON.parse(text) as Analysis;

  // Keep the model's numbers inside the ranges the app renders.
  const last = Math.max(0, framesBase64.length - 1);
  a.overall_score = clamp(a.overall_score, 0, 100);
  for (const k of SCORE_KEYS) a.scores[k] = clamp(a.scores[k], 1, 10);
  a.key_frame = clamp(a.key_frame, 0, last);
  a.faults = a.faults.slice(0, 4).map((f) => ({ ...f, frame: clamp(f.frame, 0, last) }));
  a.drills = a.drills.slice(0, 3);
  a.strengths = a.strengths.slice(0, 3);
  return a;
}
