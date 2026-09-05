import { describe, expect, it } from "vitest";
import { approvedPunditsOf, failedByEveryVariant } from "./editorial-repository.server";
import type { GeneratedPunditVariant } from "./pundit-generator.server";
import type { HarnessResult } from "./types";

/** The signal that has twice explained a lost show.
 *
 *  Six pundits share one evidence pack and one claim set. A fault in either
 *  reaches all of them at once and shows up as the same harness failing six
 *  times, which is not six writers having a bad day. Both times it happened
 *  (a claim that miscounted its substitutions, then one that miscounted its
 *  yellow cards) it was found afterwards by reading judge prose, because the
 *  run never said so. */

const variant = (failing: string[]): GeneratedPunditVariant =>
  ({
    results: [
      { harness: "insight", hardGate: false, passed: !failing.includes("insight") },
      { harness: "humour", hardGate: false, passed: !failing.includes("humour") },
      { harness: "probability", hardGate: false, passed: !failing.includes("probability") },
    ] as HarnessResult[],
  }) as GeneratedPunditVariant;

describe("spotting a fault that reached every pundit", () => {
  it("names a harness every variant failed", () => {
    expect(
      failedByEveryVariant([
        variant(["probability", "insight"]),
        variant(["probability"]),
        variant(["probability", "humour"]),
      ]),
    ).toEqual(["probability"]);
  });

  it("says nothing when one variant passed it", () => {
    expect(
      failedByEveryVariant([variant(["probability"]), variant(["probability"]), variant([])]),
    ).toEqual([]);
  });

  it("names every shared failure, in a stable order", () => {
    expect(
      failedByEveryVariant([variant(["probability", "humour"]), variant(["humour", "probability"])]),
    ).toEqual(["humour", "probability"]);
  });

  it("says nothing when every variant passed", () => {
    expect(failedByEveryVariant([variant([]), variant([])])).toEqual([]);
  });

  it("copes with no variants at all", () => {
    expect(failedByEveryVariant([])).toEqual([]);
  });
});

/** What gets narrated, which is where the money after the writing is spent. */
const scripted = (punditId: string, status: "approved" | "quarantined"): GeneratedPunditVariant =>
  ({ status, candidate: { punditId } }) as GeneratedPunditVariant;

describe("choosing what to narrate", () => {
  it("narrates only the pundits that passed", () => {
    expect(
      approvedPunditsOf([
        scripted("romantic", "approved"),
        scripted("zen", "quarantined"),
        scripted("stats", "approved"),
      ]),
    ).toEqual(["romantic", "stats"]);
  });

  // Paying ElevenLabs to voice a script that cannot publish is money spent on
  // nothing, and a quarantined variant carrying audio reads as ready.
  it("narrates nobody when nobody passed", () => {
    expect(approvedPunditsOf([scripted("zen", "quarantined")])).toEqual([]);
  });

  it("narrates all six when all six passed", () => {
    const all = ["zen", "gaffer", "stats", "romantic", "doomer", "banter"];
    expect(approvedPunditsOf(all.map((id) => scripted(id, "approved")))).toEqual(all);
  });
});
