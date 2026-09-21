// Exports real scripts, evidence packs and claims from the database into a
// fixture file, so gate changes can be regression-tested for nothing.
//
// Every script in the database was paid for: a writer call, fourteen judges,
// and usually several repair rounds. Once written they are a free, permanent
// corpus of real football prose. Testing a gate change against them costs
// nothing and catches the class of fault that has been most expensive here -
// a gate that misreads correct writing.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/export-gate-corpus.mjs
//
// Writes src/lib/pundit/__fixtures__/gate-corpus.json.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

async function rest(path) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return response.json();
}

// Every field below is one the hard gates actually read. A corpus that stores
// the prose but not the pack, the claims and the thesis can only replay the
// gates that are pure functions of text, which are not the ones that have been
// getting this wrong. The join is variant.drop_id -> pack.drop_id ->
// claim.evidence_pack_id, so no fourth query is needed.
const packs = await rest(
  "evidence_packs?select=id,drop_id,match_id,version,created_at,facts,derivations," +
    "unavailable_evidence&order=created_at.desc&limit=40",
);
const variants = await rest(
  "pundit_variants?select=id,drop_id,pundit_id,spec_version,status,display_script,spoken_script," +
    "thesis,beat_outline,performance_plan&display_script=not.is.null&limit=100",
);
const claims = await rest(
  "analysis_claims?select=id,evidence_pack_id,match_id,type,thesis,evidence_refs,confidence," +
    "alternative_explanation,missing_evidence,falsifier,evaluation_rule&limit=600",
);

// The gate verdicts are what makes this a golden set rather than a pile of
// text: they record what the gates concluded at the time, so a change of mind
// is visible rather than silent.
//
// Both directions are kept. Failures alone would catch a gate that goes soft,
// and miss a gate that starts refusing correct writing - which is the fault
// class this file exists for. Qualitative judges are excluded because their
// verdicts are a model's opinion and cannot be replayed deterministically.
const verdicts = await rest(
  "harness_runs?select=variant_id,harness_name,attempt,passed,failure,evidence_span" +
    "&hard_gate=eq.true&limit=4000",
);

const corpus = {
  exportedAt: new Date().toISOString(),
  packs,
  variants,
  claims,
  verdicts,
  counts: {
    packs: packs.length,
    variants: variants.length,
    claims: claims.length,
    hardGateVerdicts: verdicts.length,
    failedVerdicts: verdicts.filter((v) => !v.passed).length,
  },
};

const target = resolve(process.cwd(), "src/lib/pundit/__fixtures__/gate-corpus.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(
  `Wrote ${target}: ${corpus.counts.packs} packs, ${corpus.counts.variants} scripts, ` +
    `${corpus.counts.claims} claims, ${corpus.counts.hardGateVerdicts} hard-gate verdicts ` +
    `(${corpus.counts.failedVerdicts} failed).`,
);
