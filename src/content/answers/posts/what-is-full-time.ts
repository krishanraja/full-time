import type { AnswerPost } from "../types";

const post: AnswerPost = {
  slug: "what-is-full-time",
  question: "What is Full Time?",
  title: "What is Full Time?",
  description:
    "Full Time turns one real Premier League match into six complete audio shows, each made by a different AI Pundit from the same checked facts.",
  answer:
    "Full Time is a football audio app. It takes one real Premier League match, checks the facts, and hands them to six AI Pundits. Each one writes and performs its own complete show, with its own argument and humour. You pick the one you fancy. It is free during the beta and needs no account.",
  sections: [
    {
      heading: "One match, six complete shows",
      paragraphs: [
        "Most match recaps give you one take. Full Time gives you six. Every AI Pundit starts from the same checked facts about the same match, then makes a separate show: its own thesis, its own choice of what matters, its own jokes and its own synthetic voice.",
        "Switching AI Pundit is not a different voice reading the same script. Each edition is written from scratch, so switching starts the new show from the beginning.",
      ],
    },
    {
      heading: "What you see when you open it",
      paragraphs: [
        "Today shows one Premier League match on one screen: the competition and date, both clubs with their crests, the score, and the six AI Pundits as a row you can tap. An AI Pundit that made no show for that match is dimmed rather than hidden.",
        "Teams lists the twenty clubs of the current Premier League season, so you can save the ones you follow. Settings holds your AI Pundit choice, an optional account and a way to send feedback.",
      ],
    },
    {
      heading: "Made by AI, and honest about it",
      paragraphs: [
        "AI writes every show from checked, structured match data, and the voices are synthetic. Full Time uses no broadcast audio and does not copy a living pundit's words, style or voice.",
        "Important claims can carry a Show me why card: the claim in plain English, the recorded facts behind it, and a short note on what those facts cannot prove.",
      ],
    },
    {
      heading: "Where it is now",
      paragraphs: [
        "Full Time is in a pilot beta for invited Premier League fans. Public release is targeted for December 2026; that is a target, not a promise, and it waits on a written bar about turning up every match morning and getting the facts right.",
      ],
    },
  ],
  faq: [
    {
      question: "Is Full Time a human podcast?",
      answer:
        "No. Every show is written by AI and performed with a synthetic voice. Full Time says so on the page and in Settings.",
    },
    {
      question: "Do I need an account to listen?",
      answer:
        "No. You can open Today and play any of the six AI Pundits without signing in. An account is optional.",
    },
    {
      question: "How do I send feedback?",
      answer: "Tap Send feedback in Settings, or email krish@fulltime.fm. Every message is read.",
    },
  ],
  sources: [
    { label: "Full Time: Today", url: "/" },
    { label: "Full Time terms", url: "/legal/terms" },
    { label: "Full Time for language models (llms.txt)", url: "/llms.txt" },
  ],
  related: ["who-are-the-six-ai-pundits", "how-does-full-time-check-the-facts"],
  datePublished: "2026-10-21",
  dateModified: "2026-10-21",
  keywords: ["Full Time", "AI football podcast", "Premier League audio", "AI Pundit"],
};

export default post;
