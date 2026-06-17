// Web Push fan-out. Server-only; loaded dynamically by the cron route.
// Uses the `web-push` package via VAPID. If keys are missing, no-ops.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fanoutMorningPush(count: number): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@fulltime.app";
  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID keys not configured — skipping fan-out");
    return;
  }

  const { default: webpush } = await import("web-push");
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) throw error;

  const payload = JSON.stringify({
    title: "Full Time",
    body: `Today's recaps are live. ${count} match${count === 1 ? "" : "es"}, about ${Math.max(1, Math.round(count * 1.2))} min total.`,
    url: "/",
  });

  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
    } catch (err) {
      const e = err as { statusCode?: number };
      if (e.statusCode === 404 || e.statusCode === 410) {
        // Subscription gone — clean up
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.warn("[push] send failed", err);
      }
    }
  }
}
