/** Imports existing, founder-approved audio. Deliberately has no generation credentials. */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { serviceRest } from "../src/lib/pundit/service-rest.server";

const dropId = "519f3f12-1f7d-411a-9021-9f128ffd8496";
const variantId = "ceb79a36-7c51-41d8-9c08-eb5e49643e2c";
const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
if (process.env.SUPABASE_URL !== "https://hzadscrqmyilbisexvyz.supabase.co") throw Error("Target mismatch");
const [variants, voices, harnesses, drops] = await Promise.all([
  serviceRest<Record<string, unknown>[]>(`pundit_variants?drop_id=eq.${dropId}&select=*`),
  serviceRest<Record<string, unknown>[]>("voice_candidates?pundit_id=eq.zen&select=*"),
  serviceRest<Record<string, unknown>[]>(`harness_runs?variant_id=eq.${variantId}&select=*`),
  serviceRest<Record<string, unknown>[]>(`daily_drops?id=eq.${dropId}&select=*`),
]);
await writeFile("approved-recording-backup.json", JSON.stringify({ variants, voices, harnesses, drops }, null, 2));
console.log(JSON.stringify({ inspection: true, variants: variants.map(v => ({ id: v.id, pundit: v.pundit_id, status: v.status, audio: v.audio_url })), voices, drop: drops.map(d => ({ id: d.id, status: d.status, match_id: d.match_id })) }));
if (process.env.APPROVED_RECORDING_MANIFEST) throw Error("Publication manifest support is not yet enabled; inspection only");
await writeFile("approved-recording-report.json", JSON.stringify({ inspection: true, published: false, source: sha(JSON.stringify(variants)) }, null, 2));
