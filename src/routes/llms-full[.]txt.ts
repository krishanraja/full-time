// /llms-full.txt - the long companion to /llms.txt (llmstxt.org): the same
// orientation plus every answer-hub post in full, so an agent can read the
// whole public explanation of Full Time in one request. Static: built from
// committed files, no database, so it never fails on a provider outage.

import { createFileRoute } from "@tanstack/react-router";
import { ANSWER_POSTS } from "@/content/answers";
import { ANSWERS_FEED_PATH, ANSWERS_PATH, answersFullMarkdown } from "@/lib/answers";
import { SITE_URL } from "@/lib/site-url";
import { LLMS_NOTES, LLMS_ORIENTATION } from "@/lib/llms";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          ...LLMS_ORIENTATION,
          "",
          ...LLMS_NOTES,
          "",
          "# Answers",
          "",
          `Index: ${SITE_URL}${ANSWERS_PATH}. Atom feed: ${SITE_URL}${ANSWERS_FEED_PATH}. ${ANSWER_POSTS.length} answers, newest first.`,
          "",
          answersFullMarkdown(),
        ].join("\n");
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=600, s-maxage=3600",
          },
        });
      },
    },
  },
});
