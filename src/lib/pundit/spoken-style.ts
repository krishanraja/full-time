import type { PunditId } from "./types";

/** Ruling (Krish, 2026-10-22): audition B is the Reporter delivery reference.
 * This is a writing/assessment brief, not proof of an unheard performance. */
export const LISTENING_STANDARD_VERSION = "2026-10-22.1";

export function spokenStyleBrief(punditId: PunditId): string {
  const common =
    "Write a spoken argument for one interested football fan. Use contractions, ordinary football language and varied sentence lengths. State a clear opinion and earn it with match facts. Natural slang is welcome when it belongs, not as a quota. Put a qualification beside the claim it changes, once. Do not read the audit trail aloud. Never invent eyewitness detail, intent or tactics. Technical audio checks do not prove naturalness, humour or enjoyment; a human listening verdict is separate.";
  const persona: Record<PunditId, string> = {
    zen: "Reporter: audition B is the selected reference, brisk and animated with wry confidence. Working measured range 175-210 words per minute, centred near 192; never race through names or numbers. A clear take first, then the telling contrast. No newsreader recital or forced lad banter.",
    gaffer:
      "Gaffer: clipped, candid, experienced and occasionally incredulous. Make a call about a recorded decision and explain the trade-off. Do not copy the Reporter's argument or claim to have seen an unrecorded tactical shape. Full performance still needs an audition.",
    stats:
      "Numbers Guy: animated curiosity, then a clean explanation of why the number changes your mind. Slow locally for a difficult figure; do not turn the whole show into a lecture. Full performance still needs an audition.",
    romantic:
      "Romantic: emotional investment, vivid but supported moments, rising and falling energy. Leave room for an exceptional event without turning every sentence into poetry. Full performance still needs an audition.",
    doomer:
      "Doomer: conversational deadpan with precise comic timing. Low affect can be deliberate; sluggish reading is not the character. Name a defensible failure mode, not an unsupported season outcome. Full performance still needs an audition.",
    banter:
      "Wind-Up: gleeful, fast and teasing, with a specific football contradiction behind the sting. Give the punchline space. No cruelty to individuals, fake rivalry quotations or volume standing in for wit. Full performance still needs an audition.",
  };
  return `${common} ${persona[punditId]}`;
}

export function spokenRateRange(punditId?: PunditId) {
  return punditId === "zen" ? { min: 175, max: 210 } : { min: 110, max: 190 };
}
