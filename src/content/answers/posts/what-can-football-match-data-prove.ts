import type { AnswerPost } from "../types";

const post: AnswerPost = {
  slug: "what-can-football-match-data-prove",
  question: "What can football match data prove, and what can it not?",
  title: "What can football match data prove, and what can it not?",
  description:
    "Match data shows what happened: goals, shots, cards and timing. It rarely shows why. Here is where Full Time draws that line.",
  answer:
    "Football match data can prove what was recorded: the score and how it changed, goals, cards, substitutions, shots, possession, corners and saves. It cannot prove why: pressing shapes, a player's intent, confidence, effort or what was said in the dressing room. Full Time's AI Pundits are held to that line.",
  sections: [
    {
      heading: "What the data can support",
      paragraphs: ["Structured match data can back claims about:"],
      bullets: [
        "the score, when it changed and the game state at each point;",
        "goals, cards, substitutions and their recorded timing;",
        "shots, shots on target, possession, corners, saves and conversion;",
        "how the result compares with the underlying numbers;",
        "history, where the sample is big enough to mean something;",
        "probabilities and sample sizes, stated as such.",
      ],
    },
    {
      heading: "What it cannot see",
      paragraphs: ["Event data does not observe, so a show cannot claim as fact:"],
      bullets: [
        "pressing triggers or shapes, rest defence, overloads, spacing or off-ball movement;",
        "body shape, scanning, positioning or a decision nobody recorded;",
        "a manager's intent, a player's confidence, effort, desire or leadership;",
        "dressing-room mood, injuries, transfers or finances, without a separate licensed source.",
      ],
    },
    {
      heading: "Why it matters for an AI pundit",
      paragraphs: [
        "An AI writing about football will happily invent the why, because the why is what makes punditry fun. Full Time lets its AI Pundits argue, joke and take sides, but only on top of facts the data can carry. When the honest answer is that the numbers cannot say, the show is allowed to say exactly that.",
        "The short public version: the data shows what happened, but not always why.",
      ],
    },
    {
      heading: "A note on expected goals",
      paragraphs: [
        "Full Time's match data provider stopped sending expected goals on 1 September 2026. Since then the shows read shot quality from where shots were taken, inside or outside the box, rather than quoting an expected-goals figure as a counted fact.",
      ],
    },
  ],
  faq: [
    {
      question: "Why does an AI Pundit sometimes say the data cannot answer something?",
      answer:
        "Because it cannot. Match data records events and numbers; it does not record intent, confidence or positioning. Saying so is deliberate.",
    },
    {
      question: "Can a show say a team pressed well?",
      answer:
        "Not as a fact from event data. It can point at recorded numbers, such as shots or possession, and say what those numbers do and do not show.",
    },
    {
      question: "Where can I see the facts behind a claim?",
      answer:
        "Tap Show me why on Today. Each card shows the claim, the recorded facts behind it and a note on what they cannot prove.",
    },
  ],
  sources: [
    {
      label: "How does Full Time check the facts?",
      url: "/answers/how-does-full-time-check-the-facts",
    },
    { label: "Full Time terms", url: "/legal/terms" },
  ],
  related: ["how-does-full-time-check-the-facts", "who-are-the-six-ai-pundits"],
  datePublished: "2026-10-21",
  dateModified: "2026-10-21",
  keywords: [
    "football match data",
    "football statistics limits",
    "expected goals",
    "AI football analysis",
  ],
};

export default post;
