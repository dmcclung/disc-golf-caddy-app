// RevenueCat -> Supabase entitlement sync.
// Configure in RevenueCat: Project settings > Integrations > Webhooks
//   URL:     https://<project>.supabase.co/functions/v1/revenuecat-webhook
//   Signing: enable HMAC signing and store the secret as REVENUECAT_WEBHOOK_SIGNING_SECRET
// Deployed with verify_jwt = false (see supabase/config.toml): RevenueCat can't send a
// Supabase JWT, so the HMAC signature authenticates requests instead.
import { decodeHex } from "jsr:@std/encoding@1/hex";
import { fail, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { PRO_ENTITLEMENT } from "../_shared/entitlements.ts";

/** Reject signatures older than this to block replayed requests. */
const MAX_AGE_SECONDS = 5 * 60;

/**
 * Verifies X-RevenueCat-Webhook-Signature: "t=<unix seconds>,v1=<hex HMAC-SHA256>"
 * over "<t>.<raw body>". crypto.subtle.verify compares in constant time.
 */
async function verifySignature(header: string | null, rawBody: string, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("=", 2));
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k, v]) => k === "v1" && v).map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > MAX_AGE_SECONDS) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const data = enc.encode(`${t}.${rawBody}`);
  for (const sig of signatures) {
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = new Uint8Array(decodeHex(sig));
    } catch {
      continue;
    }
    if (await crypto.subtle.verify("HMAC", key, bytes, data)) return true;
  }
  return false;
}

const GRANTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);
const REVOKES = new Set(["EXPIRATION"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SIGNING_SECRET");
  if (!secret) {
    console.error("REVENUECAT_WEBHOOK_SIGNING_SECRET is not set");
    return fail(500, "misconfigured", "Webhook signing secret is not configured.");
  }

  // The signature covers the exact bytes RevenueCat sent, so verify before parsing.
  const rawBody = await req.text();
  if (!(await verifySignature(req.headers.get("X-RevenueCat-Webhook-Signature"), rawBody, secret))) {
    return fail(401, "unauthorized", "Invalid webhook signature.");
  }

  let event;
  try {
    ({ event } = JSON.parse(rawBody));
  } catch {
    return fail(400, "bad_request", "Body must be JSON.");
  }
  if (!event?.type) return fail(400, "bad_request", "Missing event.");

  // CANCELLATION only turns off auto-renew; access continues until EXPIRATION.
  const grant = GRANTS.has(event.type);
  const revoke = REVOKES.has(event.type);
  const entitlements: string[] = event.entitlement_ids ?? [];
  if ((!grant && !revoke) || (entitlements.length && !entitlements.includes(PRO_ENTITLEMENT))) {
    return json({ ignored: event.type });
  }

  // The app logs into RevenueCat with the Supabase user id, so it appears as app_user_id or an alias.
  const ids: string[] = [event.app_user_id, ...(event.aliases ?? [])].filter((id) => UUID.test(id ?? ""));
  if (!ids.length) return json({ ignored: "no supabase user id" });

  const admin = adminClient();
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const { error } = await admin.from("entitlements").upsert(
    [...new Set(ids)].map((user_id) => ({
      user_id,
      is_pro: grant,
      product_id: event.product_id ?? null,
      expires_at: grant ? expiresAt : null,
      updated_at: new Date().toISOString(),
    })),
  );
  if (error) {
    // Foreign-key errors mean the id isn't one of our users; anything else should be retried.
    console.error("entitlement upsert failed", error);
    return fail(error.code === "23503" ? 200 : 500, "upsert_failed", error.message);
  }
  return json({ ok: true });
});
