import type { AnswerPost } from "../types";

const post: AnswerPost = {
  slug: "how-does-full-time-check-the-facts",
  question: "How does Full Time check the facts in an AI football show?",
  title: "How does Full Time check the facts in an AI football show?",
  description:
    "Every Full Time show is written from a sealed set of match facts, then passes automated fact, number, name and audio checks before it publishes.",
  answer:
    "Full Time seals the match facts before any AI writes a word. Writers may only use claims licensed from those facts. Each show then faces twenty-five checks, from exact numbers and names to independent quality judges, plus audio checks. A show that fails is held back, not published. The checks can still miss things.",
  sections: [
    {
      heading: "Step one: seal the facts",
      paragraphs: [
        "Each day starts from structured match data: the score and how it changed, goals, cards, substitutions, shots, corners, saves and similar recorded events. Those facts are sealed into one evidence pack, so every AI Pundit and every check reads exactly the same record.",
        "A separate step then decides which claims that pack can support. A writer cannot reach for a fact that is not in the pack, or a claim that was not licensed from it.",
      ],
    },
    {
      heading: "Step two: twenty-five checks per show",
      paragraphs: [
        "Each AI Pundit's script must pass twenty-five named checks before it can be published. Some are fixed rules that run without a model: every number must be licensed, every name must match the record, and the score has to be the score. The rest are independent judges, each scoring one quality such as insight, clarity, judgement or restraint against a written standard, with four out of five as the floor.",
        "If a script falls short, it gets a targeted repair and is checked again. If it still fails, that edition is withheld.",
      ],
    },
    {
      heading: "Step three: check the audio as well",
      paragraphs: [
        "A script that passes is narrated with a synthetic voice, and the audio is checked too: a transcript has to match the approved script, loudness and peaks must sit within limits, and at least 99 per cent of proper names must be verified as pronounced correctly before the show goes out.",
      ],
    },
    {
      heading: "Publish what passed, hold back what did not",
      paragraphs: [
        "Since 5 September 2026, each AI Pundit's edition is judged on its own. A drop publishes every edition that passed all of its checks and withholds the rest. If none pass, nothing publishes that day, and Today keeps showing the latest checked show with its real date.",
      ],
    },
    {
      heading: "What the checks do not promise",
      paragraphs: [
        "Checks reduce mistakes; they do not abolish them. Full Time's terms say plainly that it does not promise every claim will be correct. If you hear a wrong score, name or fact, report it: it is treated as a top-priority fix and answered the same day.",
      ],
    },
  ],
  faq: [
    {
      question: "What is a Show me why card?",
      answer:
        "A card behind an important claim. It shows the claim, up to three recorded facts that support it, and what those facts cannot prove. It comes from the sealed evidence, not from a new AI answer made when you tap.",
    },
    {
      question: "Does an AI write the fact checks too?",
      answer:
        "Partly. The number, name and score checks are fixed rules with no model involved. The quality judges are AI models scoring against written standards.",
    },
    {
      question: "How do I report a wrong fact?",
      answer:
        "Email krish@fulltime.fm with the match, the AI Pundit and the sentence you heard, or use Send feedback in Settings.",
    },
  ],
  sources: [
    { label: "Full Time terms", url: "/legal/terms" },
    {
      label: "What can football match data prove?",
      url: "/answers/what-can-football-match-data-prove",
    },
  ],
  related: ["what-can-football-match-data-prove", "what-is-full-time"],
  datePublished: "2026-10-21",
  dateModified: "2026-10-21",
  keywords: ["AI fact checking", "AI football show accuracy", "evidence pack", "Show me why"],
};

export default post;
