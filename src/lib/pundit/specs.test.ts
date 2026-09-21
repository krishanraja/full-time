import { describe, expect, it } from "vitest";
import { getPunditSpec, PUNDIT_SPECS } from "./specs";
import { PUNDIT_IDS } from "./types";

describe("six complete pundit specifications", () => {
  it("defines every persona with launch floors and a separate voice", () => {
    expect(Object.keys(PUNDIT_SPECS).sort()).toEqual([...PUNDIT_IDS].sort());
    const voices = new Set(PUNDIT_IDS.map((id) => PUNDIT_SPECS[id].voiceEnvKey));
    expect(voices.size).toBe(6);
    for (const id of PUNDIT_IDS) {
      const spec = PUNDIT_SPECS[id];
      expect(spec.requiredThresholds.insight).toBe(4);
      expect(spec.requiredThresholds.humour).toBe(3);
      expect(spec.positiveExamples.length).toBeGreaterThan(0);
      expect(spec.antiExamples.length).toBeGreaterThan(0);
      expect(spec.prohibitedHumourTargets).toContain("personal humiliation");
    }
  });

  it("does not collapse the personas into the same lens or humour", () => {
    expect(new Set(PUNDIT_IDS.map((id) => PUNDIT_SPECS[id].lens)).size).toBe(6);
    expect(new Set(PUNDIT_IDS.map((id) => PUNDIT_SPECS[id].sentenceCadence)).size).toBe(6);
  });
});

/** Six pundits share one evidence pack and one claim set. Nothing made them
 *  diverge: preferredClaimTypes was defined for all six and read by nothing, so
 *  on 2026-09-04 all six built on the same mechanism and five of six were failed
 *  for a truism. Divergence needs two things, and both are pinned here: the
 *  preferences have to actually differ, and the writer has to be told to use
 *  them. */
describe("six pundits that can write six different shows", () => {
  it("gives the six meaningfully different claim preferences", () => {
    const lists = PUNDIT_IDS.map((id) => getPunditSpec(id).preferredClaimTypes);
    for (const list of lists) expect(list.length).toBeGreaterThan(2);
    // No two pundits reach for the same material in the same order.
    const signatures = lists.map((list) => list.join(">"));
    expect(new Set(signatures).size).toBe(PUNDIT_IDS.length);
    // And the six between them cover more than one kind of claim.
    expect(new Set(lists.flat()).size).toBeGreaterThan(3);
  });

  it("tells the writer to use its own preferences rather than the obvious reading", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/pundit/pundit-generator.server.ts", "utf8"),
    );
    expect(source).toContain("preferredClaimTypes: build your argument on claims of those types");
    expect(source).toContain("the one every other pundit is already taking");
  });
});

/** A persona spec is not decoration. It rides in the cached prompt prefix and
 *  the persona judge grades every variant against it, so a spec that asks for a
 *  statistic the evidence pack cannot produce is a standing instruction to
 *  reach for a number the numeric licence will then refuse.
 *
 *  That is not hypothetical. The provider stopped sending expected goals on
 *  1 September 2026. The Numbers Guy went on being told its lens was "probability,
 *  xG, variance" for three weeks afterwards, and The Reporter went on listing xG
 *  among the evidence it should prefer.
 *
 *  When a statistic is withdrawn, add it here in the same change that removes it
 *  from the specs. The list is the record of what the pack cannot say. */
const WITHDRAWN_OR_UNAVAILABLE_STATISTICS = [
  // Withdrawn by the provider on 2026-09-01. The pack substitutes shot location
  // share and conversion, both of which are observed counts rather than a model.
  /\bxg\b/,
  /\bxgot\b/,
  /\bexpected goals\b/,
  // Never available at this evidence tier: they need tracking or event data the
  // structured feed does not carry.
  /\bppda\b/,
  /\bprogressive (?:passes|carries)\b/,
  /\bfield tilt\b/,
];

describe("no persona is asked for a statistic the pack cannot produce", () => {
  it("keeps withdrawn and unavailable statistics out of every spec", () => {
    const offences: string[] = [];
    for (const id of PUNDIT_IDS) {
      const text = JSON.stringify(PUNDIT_SPECS[id]).toLowerCase();
      for (const pattern of WITHDRAWN_OR_UNAVAILABLE_STATISTICS) {
        const hit = text.match(pattern);
        if (hit) offences.push(`${id}: ${hit[0]}`);
      }
    }
    expect(offences).toEqual([]);
  });
});
