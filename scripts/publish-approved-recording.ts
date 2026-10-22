/** Imports existing, founder-approved audio. Deliberately has no generation credentials. */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { serviceRest } from "../src/lib/pundit/service-rest.server";
import { masterNarrationAudio } from "../src/lib/pundit/audio-mastering.server";
import { storeVariantAssets } from "../src/lib/pundit/asset-storage.server";
import { renderPunditShareCard } from "../src/lib/pundit/share-card.server";
import type { PunditVariantCandidate } from "../src/lib/pundit/types";

const dropId = "519f3f12-1f7d-411a-9021-9f128ffd8496";
const variantId = "ceb79a36-7c51-41d8-9c08-eb5e49643e2c";
const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
if (process.env.SUPABASE_URL !== "https://hzadscrqmyilbisexvyz.supabase.co")
  throw Error("Target mismatch");
const [variants, voices, harnesses, drops] = await Promise.all([
  serviceRest<Record<string, unknown>[]>(`pundit_variants?drop_id=eq.${dropId}&select=*`),
  serviceRest<Record<string, unknown>[]>("voice_candidates?pundit_id=eq.zen&select=*"),
  serviceRest<Record<string, unknown>[]>(`harness_runs?variant_id=eq.${variantId}&select=*`),
  serviceRest<Record<string, unknown>[]>(`daily_drops?id=eq.${dropId}&select=*`),
]);
await writeFile(
  "approved-recording-backup.json",
  JSON.stringify({ variants, voices, harnesses, drops }, null, 2),
);
console.log(
  JSON.stringify({
    inspection: true,
    variants: variants.map((v) => ({
      id: v.id,
      pundit: v.pundit_id,
      status: v.status,
      audio: v.audio_url,
    })),
    voices,
    drop: drops.map((d) => ({ id: d.id, status: d.status, match_id: d.match_id })),
  }),
);
if (process.env.APPROVED_RECORDING_MANIFEST) {
  const manifest = JSON.parse(
    Buffer.from(process.env.APPROVED_RECORDING_MANIFEST, "base64").toString("utf8"),
  ) as { candidate: PunditVariantCandidate; audioUrl: string; approved: boolean };
  const candidate = manifest.candidate;
  const scriptSha = sha(candidate.displayScript);
  if (
    !manifest.approved ||
    candidate.punditId !== "zen" ||
    scriptSha !== "f92dc332cdd96e351693619a5ad6e911f33a79f94b44a470516d46abfb438041"
  )
    throw Error("Exact founder approval required");
  const url = new URL(manifest.audioUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "storage.googleapis.com" ||
    !url.pathname.startsWith("/xi-backend/")
  )
    throw Error("Unapproved source host");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw Error(`Approved audio download failed: ${response.status}`);
  const audio = new Uint8Array(await response.arrayBuffer());
  const sourceSha = sha(audio);
  if (
    audio.byteLength > 5_000_000 ||
    sourceSha !== "73a00f243dac120ab9dd5f972e521185175c5f737fa6742056e7e72334702f0d"
  )
    throw Error("Approved recording bytes changed");
  const mastered = await masterNarrationAudio({ audio, script: candidate.displayScript });
  const image = await renderPunditShareCard({
    punditId: "zen",
    title: candidate.thesis.headline,
    portableLine: candidate.outline.portable_line,
    coverageDate: "2026-10-19",
  });
  const assets = await storeVariantAssets({
    dropId,
    punditId: "zen",
    audio: mastered.audio,
    shareImage: image,
  });
  const readback = await fetch(assets.audioUrl);
  const storedSha = sha(new Uint8Array(await readback.arrayBuffer()));
  if (!readback.ok || storedSha !== sha(mastered.audio)) throw Error("Stored recording differs");
  await writeFile(
    "approved-recording-report.json",
    JSON.stringify(
      {
        staged: true,
        published: false,
        sourceSha,
        scriptSha,
        masteredSha: storedSha,
        bytes: mastered.audio.byteLength,
        metrics: mastered.metrics,
        mastering: mastered.mastering,
        assets,
      },
      null,
      2,
    ),
  );
  console.log(
    "Exact approved recording staged and independently hash-verified. No database publication or generation calls.",
  );
} else {
  await writeFile(
    "approved-recording-report.json",
    JSON.stringify(
      { inspection: true, published: false, source: sha(JSON.stringify(variants)) },
      null,
      2,
    ),
  );
}
