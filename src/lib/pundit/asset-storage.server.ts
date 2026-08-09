import { createHash } from "node:crypto";
import type { PunditId } from "./types";

function digest(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 24);
}

async function uploadPublicAsset(input: {
  bucket: "episodes" | "share";
  path: string;
  bytes: Uint8Array;
  contentType: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from(input.bucket).upload(input.path, input.bytes, {
    contentType: input.contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Storage upload ${input.bucket}/${input.path}: ${error.message}`);
  const { data } = supabaseAdmin.storage.from(input.bucket).getPublicUrl(input.path);
  if (!data.publicUrl) throw new Error(`Storage returned no public URL for ${input.path}.`);
  return data.publicUrl;
}

export async function storeVariantAssets(input: {
  dropId: string;
  punditId: PunditId;
  audio: Uint8Array;
  shareImage: Uint8Array;
}) {
  const audioPath = `pundits/${input.dropId}/${input.punditId}/${digest(input.audio)}.mp3`;
  const sharePath = `pundits/${input.dropId}/${input.punditId}/${digest(input.shareImage)}.png`;
  const [audioUrl, shareImageUrl] = await Promise.all([
    uploadPublicAsset({
      bucket: "episodes",
      path: audioPath,
      bytes: input.audio,
      contentType: "audio/mpeg",
    }),
    uploadPublicAsset({
      bucket: "share",
      path: sharePath,
      bytes: input.shareImage,
      contentType: "image/png",
    }),
  ]);
  return { audioUrl, audioPath, shareImageUrl, sharePath };
}
