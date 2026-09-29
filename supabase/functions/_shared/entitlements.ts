import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

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

  const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!secret) return false;

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!res.ok) {
    console.error("RevenueCat lookup failed", res.status, await res.text());
    return false;
  }
  const body = await res.json();
  const ent = body?.subscriber?.entitlements?.[PRO_ENTITLEMENT];
  const active = !!ent && isActive(ent.expires_date);

  await admin.from("entitlements").upsert({
    user_id: userId,
    is_pro: active,
    product_id: ent?.product_identifier ?? null,
    expires_at: ent?.expires_date ?? null,
    updated_at: new Date().toISOString(),
  });
  return active;
}
