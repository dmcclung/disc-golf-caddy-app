import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Entitlement lookup key ("pro"), as it appears in webhook events and the app SDK. */
export const PRO_ENTITLEMENT = Deno.env.get("REVENUECAT_ENTITLEMENT_ID") ?? "pro";

function isActive(expiresAt: string | null | undefined): boolean {
  return !expiresAt || new Date(expiresAt).getTime() > Date.now();
}

/**
 * Pro status comes from the entitlements table (kept current by the RevenueCat webhook).
 * Right after a purchase the webhook may not have landed yet, so when the table says
 * "not pro" we ask RevenueCat directly and cache the answer.
 */
export async function isPro(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("entitlements")
    .select("is_pro, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.is_pro && isActive(data.expires_at)) return true;

  // RevenueCat API v2 key with only "Customers Configuration: Read only".
  const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  const projectId = Deno.env.get("REVENUECAT_PROJECT_ID");
  // The v2 API reports entitlements by internal id (entl...), not by lookup key.
  const entitlementId = Deno.env.get("REVENUECAT_PRO_ENTITLEMENT_INTERNAL_ID");
  if (!secret || !projectId || !entitlementId) return false;

  const res = await fetch(
    `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (res.status === 404) return false; // never purchased, so RevenueCat has no customer yet
  if (!res.ok) {
    console.error("RevenueCat lookup failed", res.status, await res.text());
    return false;
  }
  const body = await res.json();
  const items: { entitlement_id: string; expires_at: number | null }[] = body?.active_entitlements?.items ?? [];
  const ent = items.find((e) => e.entitlement_id === entitlementId);
  const expiresAt = ent?.expires_at ? new Date(ent.expires_at).toISOString() : null;
  const active = !!ent && isActive(expiresAt);

  await admin.from("entitlements").upsert({
    user_id: userId,
    is_pro: active,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  return active;
}
