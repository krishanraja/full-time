// Prints the weekly answer-hub brief as markdown: the checklist, the next
// open questions from src/content/answers/backlog.json, and the posts that
// already exist. Used by .github/workflows/answers-weekly.yml to open an
// issue. Reads committed files only: no network, no model, no spend.
//
//   node scripts/answers-weekly-brief.mjs            # body to stdout
//   node scripts/answers-weekly-brief.mjs --title    # the issue title only
//
// Set BRIEF_DATE=YYYY-MM-DD to render the brief for another week.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const PER_WEEK = 3;

function mondayOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

const now = process.env.BRIEF_DATE ? new Date(`${process.env.BRIEF_DATE}T12:00:00Z`) : new Date();
if (Number.isNaN(now.getTime())) throw new Error("BRIEF_DATE must be YYYY-MM-DD");
const week = mondayOf(now);
const title = `Answer hub brief: week of ${week}`;

if (process.argv.includes("--title")) {
  console.log(title);
  process.exit(0);
}

const backlog = JSON.parse(readFileSync(resolve(root, "src/content/answers/backlog.json"), "utf8"));
const open = backlog.questions.filter((q) => q.status === "open");
const posts = readdirSync(resolve(root, "src/content/answers/posts"))
  .filter((name) => name.endsWith(".ts"))
  .map((name) => name.replace(/\.ts$/, ""))
  .sort();

const candidates = open.slice(0, PER_WEEK);
const lines = [
  `Weekly answer-hub brief for the week of ${week}. Generated from committed files by \`scripts/answers-weekly-brief.mjs\`; no model was called and nothing was spent.`,
  "",
  "The bar, the sourcing rules and how to add a post are in `docs/23-answer-hub.md`. One good post beats three thin ones; skipping a week is fine.",
  "",
  "## Question candidates",
  "",
  ...(candidates.length
    ? candidates.flatMap((q, i) => [
        `${i + 1}. **${q.question}**`,
        `   - Why: ${q.why}`,
        `   - Answer only from: ${q.sources.map((s) => `\`${s}\``).join(", ")}`,
      ])
    : [
        "The backlog has no open questions. Add real questions to `src/content/answers/backlog.json` first.",
      ]),
  "",
  `${open.length} open in the backlog, ${posts.length} published.`,
  "",
  "## Checklist",
  "",
  "- [ ] Pick at most one or two candidates, or add a better question to the backlog first.",
  "- [ ] Confirm every claim against a current source (code, `docs/product-state.json`, the owning doc). Live state beats docs; docs beat memory.",
  "- [ ] Write `src/content/answers/posts/<slug>.ts`: direct answer of 40 to 60 words first, then sections, FAQ, sources, related.",
  "- [ ] British English; say AI Pundit; no invented numbers, dates, prices, leagues or promises.",
  "- [ ] `datePublished` and `dateModified` are today's date for a new post; bump only `dateModified` for a substantive edit.",
  "- [ ] Mark the backlog entry `published` with its slug.",
  "- [ ] Run `pnpm test` (the answer validator), `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`.",
  "- [ ] After deploy, read back `/answers/<slug>`, `/sitemap.xml`, `/answers/feed.xml` and `/llms.txt`.",
  "- [ ] Review older posts against this week's product changes and correct anything stale.",
  "",
  "## Published posts",
  "",
  ...posts.map((slug) => `- https://fulltime.fm/answers/${slug}`),
];

console.log(lines.join("\n"));
