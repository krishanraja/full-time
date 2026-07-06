import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    // All six pundits are open to any signed-in account (the auth middleware
    // is the gate). Anonymous listeners keep their pick in localStorage and
    // never reach this function.
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, voice_style_pref: data.voiceStyle }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
