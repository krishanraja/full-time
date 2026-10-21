import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ANSWER_POSTS, ANSWER_POST_FILES, type AnswerPost } from "@/content/answers";
import {
  ANSWER_WORDS_MAX,
  ANSWER_WORDS_MIN,
  answerJsonLd,
  answerPath,
  answerSitemapEntries,
  answerUrl,
  answersFeedXml,
  answersFullMarkdown,
  answersIndexJsonLd,
  answersLlmsLines,
  countWords,
  validateAnswerPosts,
} from "./answers";

const today = new Date().toISOString().slice(0, 10);
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("answer hub posts", () => {
  it("has at least three posts", () => {
    expect(ANSWER_POSTS.length).toBeGreaterThanOrEqual(3);
  });

  it("every post meets the editorial rules", () => {
    expect(validateAnswerPosts(ANSWER_POSTS, { files: ANSWER_POST_FILES, today })).toEqual([]);
  });

  it("every direct answer is 40 to 60 words", () => {
    for (const post of ANSWER_POSTS) {
      const words = countWords(post.answer);
      expect(words, post.slug).toBeGreaterThanOrEqual(ANSWER_WORDS_MIN);
      expect(words, post.slug).toBeLessThanOrEqual(ANSWER_WORDS_MAX);
    }
  });
});

describe("answer hub validator negative controls", () => {
  const base = ANSWER_POSTS[0];
  const variant = (patch: Partial<AnswerPost>): AnswerPost => ({ ...base, ...patch });

  it("rejects a short answer, a long one, a duplicate slug and a dangling link", () => {
    const failures = validateAnswerPosts([
      variant({ answer: "Too short." }),
      variant({ answer: Array.from({ length: 61 }, () => "word").join(" ") }),
      variant({ related: ["no-such-post"] }),
    ]);
    expect(failures.some((f) => f.includes("direct answer is 2 words"))).toBe(true);
    expect(failures.some((f) => f.includes("direct answer is 61 words"))).toBe(true);
    expect(failures.some((f) => f.includes("duplicate slug"))).toBe(true);
    expect(failures.some((f) => f.includes("related post no-such-post does not exist"))).toBe(true);
  });

  it("rejects dishonest dates, a bad slug, American spelling and a misnamed file", () => {
    const failures = validateAnswerPosts(
      [
        variant({ slug: "Bad Slug", related: [] }),
        variant({
          slug: "future",
          datePublished: "2999-01-01",
          dateModified: "2999-01-01",
          related: [],
        }),
        variant({ slug: "backwards", dateModified: "2000-01-01", related: [] }),
        variant({
          slug: "spelling",
          description: `${base.description} Our favorite color.`,
          related: [],
        }),
      ],
      { today: "2026-10-21", files: [{ file: "./posts/wrong-name.ts", post: base }] },
    );
    expect(failures.some((f) => f.includes("slug must be lowercase"))).toBe(true);
    expect(failures.some((f) => f.includes("is in the future"))).toBe(true);
    expect(failures.some((f) => f.includes("earlier than datePublished"))).toBe(true);
    expect(failures.some((f) => f.includes("American spelling"))).toBe(true);
    expect(failures.some((f) => f.includes("file name must equal the slug"))).toBe(true);
  });
});

describe("every post appears on every discovery surface", () => {
  const sitemapPaths = answerSitemapEntries().map((entry) => entry.path);
  const feed = answersFeedXml();
  const llms = answersLlmsLines().join("\n");
  const full = answersFullMarkdown();

  it.each(ANSWER_POSTS.map((post) => [post.slug, post] as const))("%s", (_slug, post) => {
    expect(sitemapPaths).toContain(answerPath(post.slug));
    expect(feed).toContain(`<id>${answerUrl(post.slug)}</id>`);
    expect(llms).toContain(`](${answerUrl(post.slug)})`);
    expect(full).toContain(`URL: ${answerUrl(post.slug)}`);
  });

  it("lists the index in the sitemap with the newest dateModified", () => {
    const index = answerSitemapEntries().find((entry) => entry.path === "/answers");
    const newest = ANSWER_POSTS.map((p) => p.dateModified)
      .sort()
      .at(-1);
    expect(index?.lastmod).toBe(newest);
  });

  it("produces one Atom entry per post with a self link", () => {
    expect(feed.match(/<entry>/g)?.length).toBe(ANSWER_POSTS.length);
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom"');
    expect(feed).toContain('rel="self"');
  });

  it("wires the routes to the same builders", () => {
    expect(read("src/routes/sitemap[.]xml.ts")).toContain("answerSitemapEntries()");
    expect(read("src/routes/llms[.]txt.ts")).toContain("answersLlmsLines()");
    expect(read("src/routes/llms-full[.]txt.ts")).toContain("answersFullMarkdown()");
    expect(read("src/routes/answers.feed[.]xml.ts")).toContain("answersFeedXml()");
  });
});

describe("answer hub structured data", () => {
  it("emits Article, FAQPage and BreadcrumbList with honest dates", () => {
    for (const post of ANSWER_POSTS) {
      const graph = answerJsonLd(post)["@graph"] as Array<Record<string, unknown>>;
      const types = graph.map((node) => node["@type"]);
      expect(types).toEqual(["Article", "FAQPage", "BreadcrumbList"]);
      expect(graph[0].datePublished).toBe(post.datePublished);
      expect(graph[0].dateModified).toBe(post.dateModified);
      const faq = graph[1].mainEntity as unknown[];
      expect(faq.length).toBe(post.faq.length + 1);
    }
  });

  it("indexes every post on the collection page", () => {
    const graph = answersIndexJsonLd()["@graph"] as Array<Record<string, unknown>>;
    const list = (graph[0].mainEntity as { itemListElement: unknown[] }).itemListElement;
    expect(list.length).toBe(ANSWER_POSTS.length);
  });
});

describe("the hub stays out of the app's navigation, without cloaking", () => {
  it("is not linked from the nav, header or footer", () => {
    for (const path of [
      "src/components/BottomNav.tsx",
      "src/components/AppHeader.tsx",
      "src/components/CompanyNote.tsx",
    ]) {
      expect(read(path), path).not.toMatch(/\/answers/);
    }
  });

  it("never branches on the user agent", () => {
    for (const path of [
      "src/routes/answers.index.tsx",
      "src/routes/answers.$slug.tsx",
      "src/routes/answers.feed[.]xml.ts",
      "src/lib/answers.ts",
    ]) {
      expect(read(path), path).not.toMatch(/user-agent|userAgent/i);
    }
  });
});

describe("robots.txt", () => {
  const robots = read("public/robots.txt");
  const agents = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "meta-externalagent",
    "Amazonbot",
    "CCBot",
    "DuckAssistBot",
    "MistralAI-User",
  ];

  it.each(agents)("names %s", (agent) => {
    expect(robots).toMatch(new RegExp(`^User-agent: ${agent}$`, "m"));
  });

  it("keeps private paths blocked in both groups and points at the sitemap", () => {
    for (const path of ["/settings", "/auth", "/following", "/api/"]) {
      expect(robots.match(new RegExp(`^Disallow: ${path}$`, "gm"))?.length).toBe(2);
    }
    expect(robots).not.toMatch(/^Disallow: \/answers/m);
    expect(robots).toMatch(/^Sitemap: https:\/\/fulltime\.fm\/sitemap\.xml$/m);
  });
});

describe("question backlog", () => {
  const backlog = JSON.parse(read("src/content/answers/backlog.json")) as {
    questions: Array<{ question: string; sources: string[]; status: string; slug?: string }>;
  };

  it("names a real repository source for every question", () => {
    for (const entry of backlog.questions) {
      expect(entry.question.endsWith("?"), entry.question).toBe(true);
      expect(entry.sources.length, entry.question).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(() => read(source), `${entry.question}: ${source}`).not.toThrow();
      }
      expect(["open", "published", "dropped"]).toContain(entry.status);
    }
  });

  it("marks every published post, and only real ones, as published", () => {
    const published = backlog.questions.filter((q) => q.status === "published").map((q) => q.slug);
    expect([...published].sort()).toEqual(ANSWER_POSTS.map((p) => p.slug).sort());
  });
});
