import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyFollows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("follows")
      .select("entity_type, entity_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => `${r.entity_type}:${r.entity_id}`);
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      entityType: z.enum(["team", "league"]),
      entityId: z.string().min(1).max(64),
    }),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: existing } = await supabase
      .from("follows")
      .select("entity_id")
      .eq("user_id", userId)
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("user_id", userId)
        .eq("entity_type", data.entityType)
        .eq("entity_id", data.entityId);
      if (error) throw new Error(error.message);
      return { following: false };
    }
    const { error } = await supabase
      .from("follows")
      .insert({ user_id: userId, entity_type: data.entityType, entity_id: data.entityId });
    if (error) throw new Error(error.message);
    return { following: true };
  });
