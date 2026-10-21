// The shape of one answer-hub post. A post is one file in ./posts/ that
// default-exports an AnswerPost; src/content/answers/index.ts collects every
// file in that folder, so adding a post means adding a file and nothing else.
//
// The rules a post must meet (answer length, unique slug, honest dates,
// working cross-links) are enforced by src/lib/answers.test.ts, not by
// convention. docs/23-answer-hub.md explains the editorial bar.

export type AnswerSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type AnswerFaq = {
  question: string;
  answer: string;
};

export type AnswerSource = {
  label: string;
  /** Absolute https URL, or a site path beginning with "/". */
  url: string;
};

export type AnswerPost = {
  /** Lowercase words joined by hyphens; becomes /answers/<slug>. */
  slug: string;
  /** The question exactly as a fan or an answer engine would ask it. */
  question: string;
  /** Page title. Usually the question. */
  title: string;
  /** Meta description, 70 to 160 characters. */
  description: string;
  /** The direct answer, first thing on the page: 40 to 60 words. */
  answer: string;
  sections: AnswerSection[];
  faq: AnswerFaq[];
  sources: AnswerSource[];
  /** Slugs of other posts to cross-link. Each must exist. */
  related: string[];
  /** YYYY-MM-DD, the day the post first went into the repository. */
  datePublished: string;
  /** YYYY-MM-DD, the day its substance last changed. Never earlier than datePublished. */
  dateModified: string;
  keywords: string[];
};
