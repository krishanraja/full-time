import { readSnapshot, productFacts } from "../../../scripts/pl-evidence/snapshot.mjs";
import { londonDate } from "@/lib/london-date";
import type { StructuredMatchInput } from "./evidence";

/** Read-only, opt-in. No persistence, publishing, or model calls. A configured
 * but invalid snapshot fails closed before any writer can receive its facts. */
export async function loadIntakeEvidence(match: StructuredMatchInput["match"]): Promise<{
  facts: import("./types").EvidenceItem[];
  unavailable: string[];
}> {
  if (process.env.FT_EVIDENCE_INTAKE_ENABLED !== "true") return { facts: [], unavailable: [] };
  const encoded = process.env.GOOGLE_DRIVE_OAUTH_JSON;
  const folderId = process.env.FT_DRIVE_FOLDER_ID;
  if (!encoded || !folderId)
    throw new Error("Evidence intake enabled without configured Drive access");
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(encoded);
  } catch {
    throw new Error("Evidence intake credentials are invalid JSON");
  }
  const date = londonDate(new Date(match.kickoffAt));
  // A match can belong to up to three scheduled windows. Prefer the first
  // available sealed window so subsequent overlapping runs cannot replace it.
  for (let offset = 0; offset < 3; offset++) {
    const end = new Date(`${date}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + offset);
    const snapshot = await readSnapshot(end.toISOString().slice(0, 10), { credentials, folderId });
    if (snapshot)
      return { facts: productFacts(snapshot.raw, snapshot.normal, match), unavailable: [] };
  }
  return {
    facts: [],
    unavailable: ["Scheduled independent evidence snapshot is not available for this match yet"],
  };
}
