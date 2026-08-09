import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { parsePunditId } from "@/lib/api/editorial-public.server";

const bodySchema = z.object({
  pundit: z.enum(["zen", "gaffer", "stats", "romantic", "doomer", "banter"]),
});

function cookieSecret() {
  const secret = process.env.PUNDIT_COOKIE_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("PUNDIT_COOKIE_SECRET must contain at least 32 characters.");
  return secret;
}

function signature(pundit: string) {
  return createHmac("sha256", cookieSecret()).update(pundit).digest("base64url");
}

function signedCookie(pundit: string) {
  return `${pundit}.${signature(pundit)}`;
}

function readPunditCookie(request: Request) {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ft_pundit="))
    ?.slice("ft_pundit=".length);
  if (!raw) return null;
  const [punditValue, provided] = raw.split(".");
  const pundit = parsePunditId(punditValue);
  if (!pundit || !provided) return null;
  const expected = signature(pundit);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? pundit : null;
}

async function syncAuthenticatedProfile(
  request: Request,
  pundit: z.infer<typeof bodySchema>["pundit"],
) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) throw new Error("Invalid authorization token.");
  const { error: writeError } = await supabase
    .from("profiles")
    .upsert({ id: userId, voice_style_pref: pundit }, { onConflict: "id" });
  if (writeError) throw new Error(writeError.message);
  return true;
}

export const Route = createFileRoute("/api/profile/pundit")({
  server: {
    handlers: {
      GET: async ({ request }) => Response.json({ pundit: readPunditCookie(request) }),
      PUT: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid pundit." }, { status: 400 });
        try {
          const synced = await syncAuthenticatedProfile(request, parsed.data.pundit);
          return Response.json(
            { ok: true, pundit: parsed.data.pundit, synced },
            {
              headers: {
                "Set-Cookie": `ft_pundit=${signedCookie(parsed.data.pundit)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
              },
            },
          );
        } catch (error: unknown) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Could not save pundit." },
            { status: 401 },
          );
        }
      },
    },
  },
});
