// RevenueCat -> Supabase entitlement sync.
// Configure in RevenueCat: Project settings > Integrations > Webhooks
//   URL:    https://<project>.supabase.co/functions/v1/revenuecat-webhook
//   Header: Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>
// Deployed with verify_jwt = false (see supabase/config.toml); the shared secret authenticates instead.
import { fail, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { PRO_ENTITLEMENT } from "../_shared/entitlements.ts";

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
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expected || req.headers.get("Authorization") !== `Bearer ${expected}`) {
    return fail(401, "unauthorized", "Bad webhook secret.");
  }

  const { event } = await req.json();
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
