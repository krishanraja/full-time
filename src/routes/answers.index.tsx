// /answers - the answer hub index. Server-rendered, indexable, and not linked
// from the app's navigation, header or footer: it is found through the
// sitemap, llms.txt, the Atom feed and search. Same HTML for every visitor.
// docs/23-answer-hub.md owns the editorial bar; src/lib/answers.ts the rules.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ANSWER_POSTS } from "@/content/answers";
import {
  ANSWERS_DESCRIPTION,
  ANSWERS_FEED_PATH,
  ANSWERS_PATH,
  ANSWERS_TITLE,
  answersIndexJsonLd,
} from "@/lib/answers";
import { SITE_URL } from "@/lib/site-url";
import { ldJson, pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/answers/")({
  head: () => {
    const seo = pageSeo({
      path: ANSWERS_PATH,
      title: `${ANSWERS_TITLE} • Full Time`,
      description: ANSWERS_DESCRIPTION,
    });
    return {
      meta: [...seo.meta, ldJson(answersIndexJsonLd())],
      links: [
        ...seo.links,
        {
          rel: "alternate",
          type: "application/atom+xml",
          title: ANSWERS_TITLE,
          href: `${SITE_URL}${ANSWERS_FEED_PATH}`,
        },
      ],
    };
  },
  component: AnswersIndex,
});

function AnswersIndex() {
  return (
    <article className="py-6 text-[15px] leading-relaxed">
      <nav
        aria-label="Breadcrumb"
        className="text-mono text-[11px] uppercase tracking-[0.16em] text-ink-3"
      >
        <Link to="/" className="hover:text-foreground">
          Full Time
        </Link>{" "}
        / Answers
      </nav>
      <h1 className="serif mt-4 text-[34px] leading-[1.08] text-foreground">{ANSWERS_TITLE}</h1>
      <p className="mt-3 text-ink-2">{ANSWERS_DESCRIPTION}</p>
      <ul className="mt-6 space-y-5">
        {ANSWER_POSTS.map((post) => (
          <li key={post.slug} className="border-t border-white/10 pt-5">
            <h2 className="text-[18px] font-semibold leading-snug text-foreground">
              <Link
                to="/answers/$slug"
                params={{ slug: post.slug }}
                className="underline-offset-4 hover:underline"
              >
                {post.question}
              </Link>
            </h2>
            <p className="mt-1.5 text-ink-2">{post.answer}</p>
            <p className="mt-1.5 text-[12px] text-ink-3">
              Updated <time dateTime={post.dateModified}>{post.dateModified}</time>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[13px] text-ink-3">
        New answers also arrive in the{" "}
        <a href={ANSWERS_FEED_PATH} className="underline underline-offset-4 hover:text-foreground">
          answers feed
        </a>
        .
      </p>
    </article>
  );
}
