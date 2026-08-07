import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isProVoiceStyle, isProProfile } from "@/lib/entitlement";

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
    // Two pundits are open to anyone; the other four are Pro. Enforced HERE,
    // server-side, not just in the UI: the client could otherwise post any of
    // the six. Anonymous listeners keep their pick in localStorage and never
    // reach this function.
    if (isProVoiceStyle(data.voiceStyle)) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("plan, subscription_status, current_period_end")
        .eq("id", context.userId)
        .maybeSingle();
      if (!isProProfile(prof)) {
        throw new Error("That pundit is part of Full Time Pro.");
      }
    }

    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, voice_style_pref: data.voiceStyle }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
