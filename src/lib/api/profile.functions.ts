import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isProProfile, isProVoiceStyle } from "@/lib/entitlement";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, voice_style_pref")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const setVoiceStyle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      voiceStyle: z.enum(["zen", "gaffer", "stats", "romantic", "doomer", "banter"]),
    }),
  )
  .handler(async ({ data, context }) => {
    // Server-side entitlement gate: the extra pundits are Full Time Pro.
    // Enforced here so a lower-tier user cannot set them via a direct RPC.
    if (isProVoiceStyle(data.voiceStyle)) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("plan, subscription_status, current_period_end")
        .eq("id", context.userId)
        .maybeSingle();
      if (!isProProfile(prof)) {
        throw new Error("Full Time Pro is required to choose this pundit.");
      }
    }
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, voice_style_pref: data.voiceStyle }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
