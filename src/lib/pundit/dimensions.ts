import type { QualitativeHarness } from "./types";
import { getSharedPersonality } from "./personality/registry";

/** What each judged dimension actually requires.
 *
 *  Twelve dimensions decide whether a script publishes, and until now neither
 *  side was told what any of them meant. The judge received the bare word
 *  ("Judge only probability") and invented a standard; the writer was never
 *  told the dimension existed. Writer and judge were optimising different
 *  private targets, and the gap between them is most of the failure rate.
 *
 *  Every line below is taken from what the judges actually rejected, not from
 *  what a rubric ought to say. "A truism rather than an insight", "names the
 *  fork without committing to a likelihood", "reproduces the pack's own
 *  alternative explanation", "candidate lines compete and dilute each other":
 *  these are recorded verdicts on real scripts, turned into the standard both
 *  sides now read. */
export const DIMENSION_STANDARDS: Record<QualitativeHarness, string> = {
  insight:
    "A non-obvious inference this match's own numbers support. A football truism (conversion beats volume, early goals settle games) is not an insight however well phrased, and neither is a standard mechanism applied to any match. Raising a possibility and then retreating from it without committing is not an insight either: name what you think is happening and say what would change your mind.",
  clarity:
    "A listener resolves every image the first time they hear it, with no rewinding. A metaphor whose parts cannot be mapped onto the football (who is holding whom, and what does that stand for) costs more than it gives. Prefer the concrete. Assess spoken language, not polished report prose: contractions and short fragments are welcome, while repeated methodology caveats interrupt the listen. Do not mistake formal wording for clarity. " +
    (getSharedPersonality().spokenWriting?.reviewStandard ?? ""),
  judgment:
    "One defensible editorial call, made in your own voice, with the reason attached. Surveying both sides and declining to choose is not judgment.",
  outcome_separation:
    "Tell the causes of the result apart from each other, and apart from luck. Two distinct drivers merged into one undifferentiated cause is the common failure. Surface the symmetric figure that would weaken your reading rather than leaving it out.",
  probability:
    "Calibrate the strength of a match reading to the evidence. Choose the better-supported explanation and name the uncertainty that matters; do not claim that a full-match aggregate proves how play unfolded in a particular spell. An explicit likelihood is optional. If one clarifies a genuinely contestable outcome, state it in words; that is not a weakness, because a percentage the pack does not carry is refused by an earlier gate. A forced next-match forecast, empty coin-toss phrase, or confident near-certainty is weaker than a clear present-tense judgment. Never upgrade a low-confidence licensed claim into fact.",
  independence:
    "Your own weighing of the evidence. Building on a licensed claim is expected and is not the failure; stopping at it is. Bring at least one figure the claim itself does not cite, use it to test the claim rather than to decorate it, and say what that figure would have to show for your verdict to be wrong. Repeating the pack's own alternative explanation or counterpoint as though it were your own is not independence, and neither is the most conventional reading of the scoreline.",
  story:
    "One spoken argument that a listener follows on first hearing. The ten stored beats must join invisibly; a hook, evidence, counterpoint and close should sound like one pundit thinking through this match. Consecutive statistics, announced pivots and repeated verdicts break that flow.",
  persona:
    "A recognisable analytical lens and natural register, sustained through what the pundit notices, argues and says. Personality serves the match analysis. A playful persona can make a measured point; do not demand catchphrases, exaggerated character performance or comic detours to prove identity.",
  humour:
    "Humour is optional in a two-to-three-minute product review. A relevant, safe joke can sharpen a specific football observation, but a review with no joke is not weaker when a joke would interrupt useful analysis. Judge restraint as well as effect; forced comic detours, punchline labels and explanatory tags weaken the listen.",
  memorability:
    "A clear match-specific idea remains with the listener because it was explained well. A plain sentence can be memorable; a manufactured slogan, portable-line performance or repeated metaphor is not required and can bury the argument.",
  restraint:
    "Say less than you could. Every sentence earns its place, no observation is made twice in different words, and a claim the evidence cannot carry is not made at all.",
  prediction_accountability:
    "If a pre-kickoff prediction exists, settle it honestly. If the pundit volunteers a forward-looking call, it must name a measurable outcome and window that the evidence makes useful to discuss. With no prior prediction and no useful new forecast, a precise receipt about this match is fully accountable; do not penalise the absence of a forced next-match call.",
};

/** What each score on the one-to-five scale means.
 *
 *  This is the missing half of the rubric, and its absence was expensive. The
 *  standards above say what a dimension is; nothing said what a four was. A
 *  judge given a dimension, a floor it cannot see, and no anchor scores against
 *  its own idea of excellent, and four out of five becomes a bar reserved for
 *  writing with nothing left to criticise.
 *
 *  Measured on 2026-09-06, against the one show that has ever published. Judged
 *  on 5 September without these standards it scored twelve of twelve, mostly
 *  fours. Re-judged with the standards and no anchor, the same script against
 *  the same evidence scored three of twelve: insight 2, probability 2,
 *  independence 2, and 3s across judgment, story, memorability, restraint and
 *  prediction accountability. Two professional match reports of the same game,
 *  put through the same judges, averaged 1.7 on the ten craft dimensions.
 *
 *  A bar that rejects both the show it published and the professional press is
 *  not measuring quality, and every paid run since 5 September has been failing
 *  against it. The floors are not the problem and are unchanged. The scale is
 *  the problem, so the scale is now stated: four is the standard of a good
 *  professional match report, not the standard of a flawless one. */
export const SCORE_ANCHORS = [
  "5: better than the professional standard on this dimension. Rare, and not required.",
  "4: the standard of a good professional match report or broadcast pundit segment. It does the job well and a fair critic can still name something they would have done differently. Real shortcomings that do not undermine the dimension belong at 4, not at 3. This is what the script is being asked for.",
  "3: competent but generic. It gestures at the dimension without doing it, or it does it in a way any writer covering any match could have produced.",
  "2: attempted and missed. The dimension is visibly aimed at and the attempt does not land.",
  "1: absent, or actively working against the script.",
].join("\n");

/** How the judge is told to use the scale. Sits with the anchors, because an
 *  anchor a judge is free to reinterpret is not an anchor. */
export const SCORING_INSTRUCTION =
  "Score against the anchors, not against an ideal script. Grade what is on the page relative to a good professional writer covering this fixture, and reserve 1 and 2 for a dimension that genuinely misses. Naming a real flaw does not by itself put a script below 4: say the flaw and still score it where it sits on the scale. Do not lower a score to seem rigorous.";

/** The dimensions a writer must satisfy, as one block for the writer prompt. */
export function dimensionBrief(): string {
  return Object.entries(DIMENSION_STANDARDS)
    .map(([dimension, standard]) => `${dimension}: ${standard}`)
    .join("\n");
}
