// /answers/<slug> - one answer-hub post, server-rendered from its file in
// src/content/answers/posts/. The direct answer comes first, then depth, a
// short FAQ, sources and related answers. Same HTML for every visitor; the
// page is not linked from the app's navigation. See docs/23-answer-hub.md.

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getAnswerPost } from "@/content/answers";
import {
  ANSWERS_FEED_PATH,
  ANSWERS_TITLE,
  absoluteSourceUrl,
  answerJsonLd,
  answerPath,
  relatedPosts,
} from "@/lib/answers";
import { SITE_URL } from "@/lib/site-url";
import { ldJson, pageSeo } from "@/lib/seo";

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export const Route = createFileRoute("/answers/$slug")({
  loader: ({ params }) => {
    const post = getAnswerPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Answer not found • Full Time" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const post = loaderData;
    const seo = pageSeo({
      path: answerPath(post.slug),
      title: `${post.title} • Full Time`,
      description: post.description,
      type: "article",
    });
    return {
      meta: [
        ...seo.meta,
        { property: "article:published_time", content: post.datePublished },
        { property: "article:modified_time", content: post.dateModified },
        { name: "keywords", content: post.keywords.join(", ") },
        ldJson(answerJsonLd(post)),
      ],
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
  component: AnswerPage,
});

function AnswerPage() {
  const post = Route.useLoaderData();
  const related = relatedPosts(post);

  return (
    <article className="py-6 text-[15px] leading-relaxed">
      <nav
        aria-label="Breadcrumb"
        className="text-mono text-[11px] uppercase tracking-[0.16em] text-ink-3"
      >
        <Link to="/" className="hover:text-foreground">
          Full Time
        </Link>{" "}
        /{" "}
        <Link to="/answers" className="hover:text-foreground">
          Answers
        </Link>
      </nav>

      <h1 className="serif mt-4 text-[34px] leading-[1.08] text-foreground">{post.question}</h1>
      <p className="mt-2 text-[12px] text-ink-3">
        Published <time dateTime={post.datePublished}>{dateLabel(post.datePublished)}</time>
        {post.dateModified !== post.datePublished && (
          <>
            {" "}
            · Updated <time dateTime={post.dateModified}>{dateLabel(post.dateModified)}</time>
          </>
        )}{" "}
        · Full Time
      </p>

      {/* The direct answer: the first thing on the page, 40 to 60 words. */}
      <p className="mt-5 border-l-2 border-lime pl-4 text-[17px] leading-relaxed text-foreground">
        {post.answer}
      </p>

      {post.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-[20px] font-semibold leading-snug text-foreground">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-3 text-ink-2">
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold leading-snug text-foreground">
          Questions people also ask
        </h2>
        <dl className="mt-3 space-y-4">
          {post.faq.map((faq) => (
            <div key={faq.question}>
              <dt className="font-semibold text-foreground">{faq.question}</dt>
              <dd className="mt-1 text-ink-2">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-[16px] font-semibold text-foreground">Sources</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-ink-2">
          {post.sources.map((source) => (
            <li key={source.url}>
              <a
                href={absoluteSourceUrl(source.url)}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[16px] font-semibold text-foreground">Related answers</h2>
          <ul className="mt-2 space-y-1.5 text-[14px]">
            {related.map((other) => (
              <li key={other.slug}>
                <Link
                  to="/answers/$slug"
                  params={{ slug: other.slug }}
                  className="text-ink-2 underline underline-offset-4 hover:text-foreground"
                >
                  {other.question}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-[13px] text-ink-3">
        <Link to="/answers" className="underline underline-offset-4 hover:text-foreground">
          All answers
        </Link>{" "}
        · Spotted something wrong? Email{" "}
        <a
          href="mailto:krish@fulltime.fm"
          className="underline underline-offset-4 hover:text-foreground"
        >
          krish@fulltime.fm
        </a>
        .
      </p>
    </article>
  );
}
