// Every answer-hub post, collected from ./posts/*.ts at build time.
// Adding a post is adding a file to ./posts/; nothing here needs editing.
// Newest first by datePublished, then by slug, so the order is stable.

import type { AnswerPost } from "./types";

export type { AnswerPost, AnswerFaq, AnswerSection, AnswerSource } from "./types";

const modules = import.meta.glob<{ default: AnswerPost }>("./posts/*.ts", { eager: true });

export const ANSWER_POSTS: readonly AnswerPost[] = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => b.datePublished.localeCompare(a.datePublished) || a.slug.localeCompare(b.slug));

/** The file each post came from, for the validator's slug-matches-filename rule. */
export const ANSWER_POST_FILES: ReadonlyArray<{ file: string; post: AnswerPost }> = Object.entries(
  modules,
).map(([file, module]) => ({ file, post: module.default }));

export function getAnswerPost(slug: string): AnswerPost | undefined {
  return ANSWER_POSTS.find((post) => post.slug === slug);
}
