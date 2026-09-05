/** A fake model, for exercising the pipeline without paying for it.
 *
 *  Most of the faults this pipeline has had were structural rather than
 *  editorial: a response truncated at a token ceiling, a judge returning null
 *  where a string was expected, a database constraint that capped attempts, a
 *  workflow replaying stale steps, an ambiguous event label. None of those
 *  needed a real model to find, and every one of them was found by paying for a
 *  full six-pundit run.
 *
 *  With PUNDIT_MODEL_STUB=true every model call is answered from here instead,
 *  so the whole path - schema parsing, persistence, gates, workflow wiring -
 *  runs end to end for nothing. It says nothing about whether the writing is any
 *  good; that is what the real models are for. */

export function stubEnabled(): boolean {
  if (process.env.PUNDIT_MODEL_STUB !== "true") return false;
  // Placeholder narration must never reach a listener. Publication and the stub
  // are mutually exclusive, and this fails loudly rather than quietly declining
  // to stub, so a misconfigured environment stops instead of shipping filler.
  if (process.env.PUNDIT_PUBLICATION_ENABLED === "true") {
    throw new Error(
      "PUNDIT_MODEL_STUB cannot be used while PUNDIT_PUBLICATION_ENABLED is true: " +
        "the stub writes placeholder narration, which must never be published.",
    );
  }
  return true;
}

type EvidenceLike = {
  id?: string;
  value?: unknown;
};

/** Pulls the names and numbers the hard gates will licence, so the stub script
 *  is built from the same closed world the real writer works in. */
function licensedMaterial(cachedContext: readonly unknown[]) {
  const packHolder = cachedContext.find(
    (segment): segment is { evidencePack?: { facts?: EvidenceLike[] } } =>
      typeof segment === "object" && segment !== null && "evidencePack" in segment,
  );
  const facts = packHolder?.evidencePack?.facts ?? [];
  const byId = (id: string) => facts.find((fact) => fact.id === id)?.value;
  const homeTeam = String(byId("match.home_team") ?? "The home side");
  const awayTeam = String(byId("match.away_team") ?? "The away side");
  const homeScore = Number(byId("match.home_score") ?? 0);
  const awayScore = Number(byId("match.away_score") ?? 0);
  return { homeTeam, awayTeam, homeScore, awayScore };
}

const BEAT_NAMES = [
  "hook",
  "match_story",
  "evidence",
  "explanation",
  "judgment",
  "counterpoint",
  "humour",
  "portable_line",
  "prediction_or_receipt",
  "close",
] as const;

/** The spoken-length gate wants 750 to 1100 words across ten beats, so each beat
 *  is trimmed to a fixed count that lands the whole script in the middle of the
 *  band. Only the two team names appear and no digits at all, so the entity and
 *  numeric licences have nothing to object to. */
const WORDS_PER_BEAT = 85;

function stubBeatText(beat: string, homeTeam: string, awayTeam: string): string {
  const sentence =
    `This is placeholder narration for the ${beat} beat, written by the stub model so the pipeline can run without calling a real one. ` +
    `${homeTeam} and ${awayTeam} are named here because both appear in the evidence pack. ` +
    `No claim is made about either side, and no quantity is asserted, because the point of this text is to exercise the machinery rather than to say anything. `;
  const words = sentence.repeat(3).split(/\s+/).filter(Boolean).slice(0, WORDS_PER_BEAT);
  return `${words.join(" ").replace(/[.,]$/, "")}.`;
}

function stubDraft(cachedContext: readonly unknown[], user: string) {
  const { homeTeam, awayTeam } = licensedMaterial(cachedContext);
  // The writer is handed short claim references; echo the first one back so the
  // thesis points at something that exists.
  const claimRef = /"(c\d+)"/.exec(user)?.[1] ?? "c1";
  return {
    thesis: {
      headline: `Placeholder verdict on ${homeTeam} against ${awayTeam}`,
      judgment: "Placeholder judgment produced by the stub model.",
      selectedClaimIds: [claimRef],
      rejectedClaimIds: [],
      counterpoint: "Placeholder counterpoint produced by the stub model.",
      changeMyMind: "Placeholder falsifier produced by the stub model.",
    },
    beats: BEAT_NAMES.map((name) => ({
      name,
      text: stubBeatText(name, homeTeam, awayTeam),
      intent: "setup",
      pace: "measured",
      energy: 3,
    })),
  };
}

function stubClaims(cachedContext: readonly unknown[]) {
  const { homeTeam, awayTeam } = licensedMaterial(cachedContext);
  return {
    claims: [
      {
        type: "fact",
        thesis: `${homeTeam} played ${awayTeam}.`,
        evidenceRefs: ["match.home_team"],
        confidence: 0.9,
      },
    ],
  };
}

/** Answers a call by the label its caller passed. An unknown label is a
 *  programming error rather than something to guess at. */
export function stubResponse(label: string, cachedContext: readonly unknown[], user: string) {
  if (label === "claim-lab") return stubClaims(cachedContext);
  if (label.startsWith("writer:")) return stubDraft(cachedContext, user);
  if (label.startsWith("judge:")) return { score: 5, failedBeats: [] };
  if (label.startsWith("hard-judge:")) return { passed: true, failedBeats: [] };
  throw new Error(`The stub model has no canned response for "${label}".`);
}
