// The answer hub: plain questions fans and answer engines ask about Full Time,
// each answered directly in its first sentences, with depth, sources and a
// short FAQ underneath. docs/23-answer-hub.md owns the editorial bar.
//
// No cloaking. Every surface built here (the pages, the Atom feed, the
// sitemap entries and the llms.txt lines) serves the same content to every
// visitor, human or crawler; nothing reads the user agent. The hub is simply
// not linked from the app's navigation, header or footer: it is reachable at
// /answers, listed in sitemap.xml, llms.txt, llms-full.txt and
// /answers/feed.xml, and cross-linked post to post.
//
// Everything here is a pure function of the post files so the validator in
// answers.test.ts can prove each post appears on every surface.

import { ANSWER_POSTS, type AnswerPost } from "@/content/answers";
import { SITE_URL, SOCIAL_IMAGE } from "@/lib/site-url";

export const ANSWERS_PATH = "/answers";
export const ANSWERS_FEED_PATH = "/answers/feed.xml";
export const ANSWERS_TITLE = "Answers about Full Time";
export const ANSWERS_DESCRIPTION =
  "Straight answers to the questions people ask about Full Time, its six AI Pundits and how the facts in each show are checked.";

export const ANSWER_WORDS_MIN = 40;
export const ANSWER_WORDS_MAX = 60;

export const answerPath = (slug: string) => `${ANSWERS_PATH}/${slug}`;
export const answerUrl = (slug: string) => `${SITE_URL}${answerPath(slug)}`;
export const absoluteSourceUrl = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The newest dateModified across the posts: the honest lastmod for the index and feed. */
export function latestModified(posts: readonly AnswerPost[] = ANSWER_POSTS): string {
  return posts.reduce(
    (latest, post) => (post.dateModified > latest ? post.dateModified : latest),
    "",
  );
}

export function relatedPosts(post: AnswerPost, posts: readonly AnswerPost[] = ANSWER_POSTS) {
  return post.related
    .map((slug) => posts.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is AnswerPost => Boolean(candidate));
}

// ---------------------------------------------------------------------------
// Validation. Run by answers.test.ts on every `pnpm test`.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// A short list of American spellings that have crept into British copy before.
const AMERICAN =
  /\b(color|colors|favorite|favorites|analyze|analyzed|organize|organized|recognize|recognized|center|centered|defense|offense|apologize)\b/i;

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function allText(post: AnswerPost): string {
  return [
    post.question,
    post.title,
    post.description,
    post.answer,
    ...post.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])]),
    ...post.faq.flatMap((f) => [f.question, f.answer]),
  ].join("\n");
}

/** Every rule a post must meet. Returns human-readable failures; empty means valid. */
export function validateAnswerPosts(
  posts: readonly AnswerPost[],
  options: { files?: ReadonlyArray<{ file: string; post: AnswerPost }>; today?: string } = {},
): string[] {
  const failures: string[] = [];
  const slugs = new Set<string>();
  const known = new Set(posts.map((post) => post.slug));

  for (const post of posts) {
    const at = `answers/${post.slug || "(no slug)"}`;
    if (!SLUG.test(post.slug))
      failures.push(`${at}: slug must be lowercase words joined by hyphens`);
    if (slugs.has(post.slug)) failures.push(`${at}: duplicate slug`);
    slugs.add(post.slug);

    if (!post.question.trim().endsWith("?")) failures.push(`${at}: question must end with "?"`);
    if (!post.title.trim()) failures.push(`${at}: title is empty`);
    if (post.description.length < 70 || post.description.length > 160) {
      failures.push(`${at}: description is ${post.description.length} characters, needs 70 to 160`);
    }
    const words = countWords(post.answer);
    if (words < ANSWER_WORDS_MIN || words > ANSWER_WORDS_MAX) {
      failures.push(
        `${at}: direct answer is ${words} words, needs ${ANSWER_WORDS_MIN} to ${ANSWER_WORDS_MAX}`,
      );
    }
    if (post.sections.length < 2) failures.push(`${at}: needs at least two sections of depth`);
    for (const section of post.sections) {
      if (!section.heading.trim() || section.paragraphs.length === 0) {
        failures.push(`${at}: every section needs a heading and a paragraph`);
      }
    }
    if (post.faq.length < 2) failures.push(`${at}: needs at least two FAQ entries`);
    for (const faq of post.faq) {
      if (!faq.question.trim().endsWith("?") || !faq.answer.trim()) {
        failures.push(`${at}: FAQ entries need a question ending in "?" and an answer`);
      }
    }
    if (post.sources.length === 0) failures.push(`${at}: needs at least one source`);
    for (const source of post.sources) {
      if (!/^(?:https:\/\/|\/)/.test(source.url) || !source.label.trim()) {
        failures.push(
          `${at}: source "${source.label}" needs a label and an https or site-relative URL`,
        );
      }
      const internal = source.url.match(/^\/answers\/([^/?#]+)$/);
      if (internal && !known.has(internal[1])) {
        failures.push(`${at}: source links to missing post ${internal[1]}`);
      }
    }
    if (post.related.length === 0) failures.push(`${at}: needs at least one related post`);
    for (const slug of post.related) {
      if (slug === post.slug) failures.push(`${at}: relates to itself`);
      else if (!known.has(slug)) failures.push(`${at}: related post ${slug} does not exist`);
    }
    if (!isRealDate(post.datePublished)) failures.push(`${at}: datePublished must be YYYY-MM-DD`);
    if (!isRealDate(post.dateModified)) failures.push(`${at}: dateModified must be YYYY-MM-DD`);
    if (post.dateModified < post.datePublished) {
      failures.push(`${at}: dateModified is earlier than datePublished`);
    }
    if (options.today && post.datePublished > options.today) {
      failures.push(`${at}: datePublished ${post.datePublished} is in the future`);
    }
    if (options.today && post.dateModified > options.today) {
      failures.push(`${at}: dateModified ${post.dateModified} is in the future`);
    }
    if (post.keywords.length === 0) failures.push(`${at}: needs at least one keyword`);
    const american = allText(post).match(AMERICAN);
    if (american) failures.push(`${at}: American spelling "${american[0]}"; write British English`);
  }

  for (const { file, post } of options.files ?? []) {
    const name = file.split("/").pop()?.replace(/\.ts$/, "");
    if (name !== post.slug) failures.push(`${file}: file name must equal the slug (${post.slug})`);
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Structured data.

const ORG = { "@id": `${SITE_URL}/#organization` };

function breadcrumb(items: Array<{ name: string; url: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function answerJsonLd(post: AnswerPost) {
  const url = answerUrl(post.slug);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        abstract: post.answer,
        url,
        mainEntityOfPage: url,
        image: SOCIAL_IMAGE.url,
        datePublished: post.datePublished,
        dateModified: post.dateModified,
        inLanguage: "en-GB",
        keywords: post.keywords.join(", "),
        author: ORG,
        publisher: ORG,
        isPartOf: { "@id": `${SITE_URL}${ANSWERS_PATH}#collection` },
        citation: post.sources.map((source) => absoluteSourceUrl(source.url)),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        url,
        inLanguage: "en-GB",
        mainEntity: [{ question: post.question, answer: post.answer }, ...post.faq].map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      breadcrumb([
        { name: "Full Time", url: `${SITE_URL}/` },
        { name: "Answers", url: `${SITE_URL}${ANSWERS_PATH}` },
        { name: post.title, url },
      ]),
    ],
  };
}

export function answersIndexJsonLd(posts: readonly AnswerPost[] = ANSWER_POSTS) {
  const url = `${SITE_URL}${ANSWERS_PATH}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        name: ANSWERS_TITLE,
        description: ANSWERS_DESCRIPTION,
        url,
        inLanguage: "en-GB",
        dateModified: latestModified(posts),
        publisher: ORG,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: posts.map((post, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: answerUrl(post.slug),
            name: post.question,
          })),
        },
      },
      breadcrumb([
        { name: "Full Time", url: `${SITE_URL}/` },
        { name: "Answers", url },
      ]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Feed, sitemap and llms surfaces.

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const escapeHtml = (input: string) =>
  input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function postHtml(post: AnswerPost): string {
  const parts = [`<p><strong>${escapeHtml(post.answer)}</strong></p>`];
  for (const section of post.sections) {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    for (const paragraph of section.paragraphs) parts.push(`<p>${escapeHtml(paragraph)}</p>`);
    if (section.bullets?.length) {
      parts.push(`<ul>${section.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`);
    }
  }
  parts.push("<h2>Questions people also ask</h2>");
  for (const faq of post.faq) {
    parts.push(`<h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`);
  }
  return parts.join("");
}

/** Atom 1.0 feed of every post, newest first. */
export function answersFeedXml(posts: readonly AnswerPost[] = ANSWER_POSTS): string {
  const updated = `${latestModified(posts) || "2026-10-21"}T00:00:00Z`;
  const entries = posts.map((post) =>
    [
      "<entry>",
      `<id>${escapeXml(answerUrl(post.slug))}</id>`,
      `<title>${escapeXml(post.title)}</title>`,
      `<link rel="alternate" type="text/html" href="${escapeXml(answerUrl(post.slug))}"/>`,
      `<published>${post.datePublished}T00:00:00Z</published>`,
      `<updated>${post.dateModified}T00:00:00Z</updated>`,
      `<summary>${escapeXml(post.answer)}</summary>`,
      `<content type="html">${escapeXml(postHtml(post))}</content>`,
      ...post.keywords.map((keyword) => `<category term="${escapeXml(keyword)}"/>`),
      "</entry>",
    ].join(""),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-GB">',
    `<id>${SITE_URL}${ANSWERS_PATH}</id>`,
    `<title>${escapeXml(ANSWERS_TITLE)}</title>`,
    `<subtitle>${escapeXml(ANSWERS_DESCRIPTION)}</subtitle>`,
    `<link rel="self" type="application/atom+xml" href="${SITE_URL}${ANSWERS_FEED_PATH}"/>`,
    `<link rel="alternate" type="text/html" href="${SITE_URL}${ANSWERS_PATH}"/>`,
    `<updated>${updated}</updated>`,
    `<author><name>Full Time</name><uri>${SITE_URL}/</uri></author>`,
    `<icon>${SITE_URL}/favicon.svg</icon>`,
    `<logo>${SITE_URL}/icon-512.png</logo>`,
    ...entries,
    "</feed>",
  ].join("\n");
}

/** Sitemap rows for the hub: the index plus one per post, each with an honest lastmod. */
export function answerSitemapEntries(
  posts: readonly AnswerPost[] = ANSWER_POSTS,
): Array<{ path: string; lastmod: string }> {
  return [
    { path: ANSWERS_PATH, lastmod: latestModified(posts) },
    ...posts.map((post) => ({ path: answerPath(post.slug), lastmod: post.dateModified })),
  ];
}

/** The `## Answers` block of /llms.txt: one line per post. */
export function answersLlmsLines(posts: readonly AnswerPost[] = ANSWER_POSTS): string[] {
  return [
    "## Answers",
    "",
    `- [All answers](${SITE_URL}${ANSWERS_PATH}): index of the questions below. Atom feed: ${SITE_URL}${ANSWERS_FEED_PATH}`,
    ...posts.map(
      (post) =>
        `- [${post.question}](${answerUrl(post.slug)}): ${post.answer.replace(/\s+/g, " ")}`,
    ),
  ];
}

/** Every post in full, as markdown, for /llms-full.txt. */
export function answersFullMarkdown(posts: readonly AnswerPost[] = ANSWER_POSTS): string {
  return posts
    .map((post) => {
      const lines = [
        `## ${post.question}`,
        "",
        `URL: ${answerUrl(post.slug)}`,
        `Published: ${post.datePublished}. Updated: ${post.dateModified}.`,
        "",
        post.answer,
        "",
      ];
      for (const section of post.sections) {
        lines.push(`### ${section.heading}`, "");
        for (const paragraph of section.paragraphs) lines.push(paragraph, "");
        if (section.bullets?.length) {
          lines.push(...section.bullets.map((bullet) => `- ${bullet}`), "");
        }
      }
      lines.push("### Questions people also ask", "");
      for (const faq of post.faq) lines.push(`**${faq.question}** ${faq.answer}`, "");
      lines.push(
        "Sources:",
        ...post.sources.map((s) => `- [${s.label}](${absoluteSourceUrl(s.url)})`),
        "",
      );
      return lines.join("\n");
    })
    .join("\n");
}
