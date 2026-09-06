import type { QualitativeHarness } from "./types";

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
    "A listener resolves every image the first time they hear it, with no rewinding. A metaphor whose parts cannot be mapped onto the football (who is holding whom, and what does that stand for) costs more than it gives. Prefer the concrete.",
  judgment:
    "One defensible editorial call, made in your own voice, with the reason attached. Surveying both sides and declining to choose is not judgment.",
  outcome_separation:
    "Tell the causes of the result apart from each other, and apart from luck. Two distinct drivers merged into one undifferentiated cause is the common failure. Surface the symmetric figure that would weaken your reading rather than leaving it out.",
  probability:
    "Attach an explicit likelihood to a named outcome: a percentage, or odds, or a plainly stated more-likely-than-not. Conditional English is not a probability. Where two readings compete, say which is the more probable and why, even tentatively; parking in symmetry is a refusal to judge. Never upgrade an uncertain inference into a confident verdict, and never state as near-fact something a licensed claim holds at low confidence.",
  independence:
    "Your own weighing of the evidence. Building on a licensed claim is expected and is not the failure; stopping at it is. Bring at least one figure the claim itself does not cite, use it to test the claim rather than to decorate it, and say what that figure would have to show for your verdict to be wrong. Repeating the pack's own alternative explanation or counterpoint as though it were your own is not independence, and neither is the most conventional reading of the scoreline.",
  story:
    "One arc that holds for ten beats. Consecutive paragraphs of sequential statistics flatten it, and abandoning your own premise halfway to process figures in list form breaks the momentum you built.",
  persona:
    "The cadence, vocabulary and mechanisms your own spec lists, sustained across the script rather than sampled once. A measured analytical register in a playful persona is a miss even when the analysis is sound.",
  humour:
    "Two to four separate moments, each built from a mechanism your own spec lists. The surprise lands in the final clause. Never announce a joke and never explain one afterwards.",
  memorability:
    "One portable line a listener could repeat word for word, placed where it lands and left to stand. Several candidate lines competing in the same beat dilute each other, and wordy restatement around a good line buries it.",
  restraint:
    "Say less than you could. Every sentence earns its place, no observation is made twice in different words, and a claim the evidence cannot carry is not made at all.",
  prediction_accountability:
    "The forward-looking call is specific enough to be settled later: a named outcome, a measurable condition, and a window. A prediction nobody could mark is not accountable.",
};

/** The dimensions a writer must satisfy, as one block for the writer prompt. */
export function dimensionBrief(): string {
  return Object.entries(DIMENSION_STANDARDS)
    .map(([dimension, standard]) => `${dimension}: ${standard}`)
    .join("\n");
}
