/** Sources beyond the licensed match feed.
 *
 *  Ruling (Krish, 2026-09-21): ingest the free-to-access tier for production
 *  evidence, accepting the rights exposure. I argued against it. The argument
 *  is recorded in docs/11-legal.md and is not relitigated here.
 *
 *  Two things that ruling does not change, and this file exists to hold both.
 *
 *  A number from one of these sources is a model's output, not a count, so it
 *  enters the pack as `kind: "estimate"` with the model named. The rights
 *  posture is about who may use a number; the evidence kind is about what the
 *  number is, and a scraped xG would be a model estimate even with a signed
 *  licence behind it.
 *
 *  And every source records its posture honestly. `research_sources` carries
 *  permission, allowed use, attribution and expiry, and docs/11-legal.md says
 *  the public privacy page must match reality. A row claiming permission that
 *  nobody granted would be a fabricated audit record, and the audit trail is
 *  the whole basis of this product's editorial claim. So these are marked
 *  `unlicensed`, with the restriction written down, and the open data-rights
 *  sign-off stays open by choice rather than by oversight. */

export type RightsPosture = {
  /** "licensed" means a recorded permission or a paid contract exists.
   *  "public-domain" means no permission is needed.
   *  "unlicensed" means access is free and permission was never granted. */
  basis: "licensed" | "public-domain" | "unlicensed";
  /** What the source itself says about automated or commercial use, in plain
   *  words, so nobody has to go and look it up again. */
  restriction: string;
  /** Required wherever the basis allows use only with credit. */
  attribution?: string;
};

/** One match's numbers from one source. Every field optional: a source that
 *  returns half of what it used to must degrade to half, not to an exception. */
export type SourceMatchStats = {
  sourceId: string;
  /** The model that produced the estimates, named for the pack. */
  model: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt?: string;
  homeXg?: number | null;
  awayXg?: number | null;
  homeXgOpenPlay?: number | null;
  awayXgOpenPlay?: number | null;
};

export type SourceAdapter = {
  id: string;
  rights: RightsPosture;
  /** Never throws. A source that is down, rate-limited or has changed shape
   *  returns null, and the pack is built from whatever did arrive. None of
   *  these is load-bearing enough to stop a show being made. */
  fetchMatchStats(input: {
    homeTeam: string;
    awayTeam: string;
    /** ISO date of the match, in UTC. */
    date: string;
  }): Promise<SourceMatchStats | null>;
};
