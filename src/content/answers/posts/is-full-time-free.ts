import type { AnswerPost } from "../types";

const post: AnswerPost = {
  slug: "is-full-time-free",
  question: "Is Full Time free, and which leagues does it cover?",
  title: "Is Full Time free, and which leagues does it cover?",
  description:
    "All six Full Time AI Pundits are free during the beta, with no account or card. Coverage is the Premier League only.",
  answer:
    "Yes. All six AI Pundits on Full Time are free during the beta, and you can listen without an account or a card. New subscriptions are paused. Full Time covers the Premier League only: one real match at a time, and the twenty clubs of the current season on Teams. No other leagues are planned.",
  sections: [
    {
      heading: "What free means right now",
      paragraphs: [
        "During the pilot beta every AI Pundit is free and selectable without signing in. New checkout is switched off, so there is nothing to buy. People who subscribed earlier can still manage billing from Settings.",
        "Whether fans would pay for Full Time is a question for after the beta. Nothing is promised about future prices.",
      ],
    },
    {
      heading: "Premier League only",
      paragraphs: [
        "Since 27 September 2026 Full Time covers the Premier League and nothing else. The daily pick, the match data and Teams all follow that rule. A day without a finished Premier League match publishes no new show.",
        "Teams lists the twenty clubs of the current season. Following a club saves your preference; it does not yet build a personal show or club playlist.",
      ],
    },
    {
      heading: "Not a betting app",
      paragraphs: [
        "Full Time is football commentary, not betting advice. Its terms say not to rely on a show for betting, and public forecast scores stay hidden until they pass an approved test.",
      ],
    },
    {
      heading: "How to get it on your phone",
      paragraphs: [
        "Full Time runs in the browser at fulltime.fm and installs as a web app. On iPhone or iPad, tap Share, then Add to Home Screen. On supported Android browsers, choose Install app from the browser menu.",
      ],
    },
  ],
  faq: [
    {
      question: "Do I need a card to listen?",
      answer: "No. There is no paid plan to sign up for during the beta.",
    },
    {
      question: "Will Full Time add the Champions League or other leagues?",
      answer:
        "Not on current plans. The product is Premier League only, and no other competition is coming later.",
    },
    {
      question: "Is there a podcast feed?",
      answer:
        "Yes. The Reporter's shows are published as a podcast RSS feed that podcast apps can read.",
    },
  ],
  sources: [
    { label: "Full Time: Today", url: "/" },
    { label: "Full Time terms", url: "/legal/terms" },
    { label: "Full Time privacy notice", url: "/legal/privacy" },
    { label: "The Reporter podcast feed (RSS)", url: "/api/public/feed.rss" },
  ],
  related: ["what-is-full-time", "who-are-the-six-ai-pundits"],
  datePublished: "2026-10-21",
  dateModified: "2026-10-21",
  keywords: ["Full Time free", "Premier League podcast", "AI football app price", "web app"],
};

export default post;
