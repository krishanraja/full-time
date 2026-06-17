import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Anonymous-friendly; falls back to anon insert with NULL user_id.
export const recordListen = createServerFn({ method: "POST" })
  .inputValidator(z.object({ episodeId: z.string().uuid(), completed: z.boolean() }))
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await sb
      .from("listens")
      .insert({ episode_id: data.episodeId, completed: data.completed });
    if (error) {
      // Non-fatal — analytics should never break playback
      console.warn("[listens] insert failed", error.message);
    }
    return { ok: true };
  });
