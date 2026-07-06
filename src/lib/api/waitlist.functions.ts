import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WaitlistStatus = {
  joined: boolean;
  // 1-based place in line, computed from joined_at ordering. Only present
  // when joined: we never render a position that is not backed by a row.
  position: number | null;
  joinedAt: string | null;
};

// Compute the caller's waitlist status. Position counts everyone who joined
// at or before them, which needs a service_role read (user RLS is own-row-only);
// it returns a single integer, no one else's data.
async function statusFor(userId: string): Promise<WaitlistStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("waitlist")
    .select("joined_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return { joined: false, position: null, joinedAt: null };
  const { count, error: countErr } = await supabaseAdmin
    .from("waitlist")
    .select("user_id", { count: "exact", head: true })
    .lte("joined_at", row.joined_at);
  if (countErr) throw new Error(countErr.message);
  return { joined: true, position: count ?? null, joinedAt: row.joined_at };
}

export const getWaitlistStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WaitlistStatus> => statusFor(context.userId));

export const joinWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      source: z.enum(["waitlist_page", "settings", "today", "auth_redirect"]),
    }),
  )
  .handler(async ({ data, context }): Promise<WaitlistStatus> => {
    // Idempotent: user_id is the PK, a second join is a no-op.
    const { error } = await context.supabase
      .from("waitlist")
      .upsert({ user_id: context.userId, source: data.source }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return statusFor(context.userId);
  });
