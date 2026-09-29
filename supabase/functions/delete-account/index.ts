// Deletes the caller's frames, rows (via cascade) and auth user.
// Required by App Store guideline 5.1.1(v) for apps that create accounts.
import { corsHeaders, fail, json } from "../_shared/http.ts";
import { adminClient, getCaller } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  const admin = adminClient();
  const user = await getCaller(req, admin);
  if (!user) return fail(401, "unauthorized", "Sign in again and retry.");

  const bucket = admin.storage.from("throw-frames");
  const { data: folders } = await bucket.list(user.id, { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`${user.id}/${folder.name}`, { limit: 100 });
    const paths = (files ?? []).map((f) => `${user.id}/${folder.name}/${f.name}`);
    if (paths.length) await bucket.remove(paths);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("delete user failed", error);
    return fail(500, "delete_failed", "Couldn't delete your account. Contact support.");
  }
  return json({ ok: true });
});
