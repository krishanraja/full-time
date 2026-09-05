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

const packs = await rest(
  "evidence_packs?select=id,match_id,facts,derivations,unavailable_evidence&order=created_at.desc&limit=10",
);
const variants = await rest(
  "pundit_variants?select=id,drop_id,pundit_id,status,display_script&display_script=not.is.null&limit=100",
);
const claims = await rest(
  "analysis_claims?select=id,match_id,type,thesis,evidence_refs,confidence&limit=300",
);

// The gate verdicts are what makes this a golden set rather than a pile of
// text: they record what the gates concluded at the time, so a change of mind
// is visible rather than silent.
const verdicts = await rest(
  "harness_runs?select=variant_id,harness_name,attempt,passed,failure,evidence_span&passed=eq.false&limit=2000",
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
    failedVerdicts: verdicts.length,
  },
};

const target = resolve(process.cwd(), "src/lib/pundit/__fixtures__/gate-corpus.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(
  `Wrote ${target}: ${corpus.counts.packs} packs, ${corpus.counts.variants} scripts, ` +
    `${corpus.counts.claims} claims, ${corpus.counts.failedVerdicts} failed verdicts.`,
);
