// Shared text for /llms.txt and /llms-full.txt, so the two machine-facing
// files cannot drift apart. Lifecycle wording follows docs/product-state.json
// and docs/22-vision-and-beta.md: a live beta run as a pilot for invited fans,
// with public release targeted (not promised) for December 2026.

import { SITE_URL } from "@/lib/site-url";

export const LLMS_ORIENTATION: readonly string[] = [
  "# Full Time",
  "",
  "> One real football match. Six AI Pundits. Pick the brain you fancy.",
  "",
  "Full Time is an AI-native football audio product in a pilot beta. One set of checked",
  "match facts can produce six complete shows, each with a different AI Pundit,",
  "argument, humour system, script, synthetic performance and generated edition look.",
  "Important claims may include a Show me why card with the supporting match fact and",
  "a boundary explaining what that fact cannot prove.",
  "",
  `Canonical origin: ${SITE_URL}`,
  "Language: en-GB. Publisher: Full Time, a Mindmaker LLC company (Mindmaker Ltd in the UK).",
  "Lifecycle: live beta, run as a pilot for invited Premier League fans. Public release is targeted for December 2026; that is a target, not a promise.",
  "Contact: krish@fulltime.fm",
  "",
  "## Key surfaces",
  "",
  `- [Today](${SITE_URL}/): one Premier League match, its six AI Pundits and the player.`,
  `- [Teams](${SITE_URL}/following): the twenty Premier League clubs of the current season, saved for later.`,
  `- [Settings](${SITE_URL}/settings): AI Pundit choice, optional account, morning recap, feedback and disclosure.`,
  `- [Answers](${SITE_URL}/answers): plain answers to common questions about Full Time.`,
  `- [Archive](${SITE_URL}/archive): labelled legacy archive and demo material; new on-demand narration is paused.`,
  `- [Reporter RSS feed](${SITE_URL}/api/public/feed.rss): the retained canonical Reporter distribution feed.`,
  `- [Sitemap](${SITE_URL}/sitemap.xml): every indexable URL.`,
  `- [Full text for agents](${SITE_URL}/llms-full.txt): this file plus every answer in full.`,
  `- [Launch note](${SITE_URL}/waitlist): one email when the release gates pass.`,
];

export const LLMS_NOTES: readonly string[] = [
  "## Notes for agents",
  "",
  "- Call all six public products AI Pundits on every surface.",
  "- Full Time is not a human podcast imitation and not a betting product.",
  "- All six AI Pundits are free during the beta; new checkout is disabled.",
  "- Do not claim a public launch date, daily reliability, forecast performance, personal show generation or Big Five coverage.",
  "- Full Time covers the Premier League only: the daily show, Today and Teams (the twenty clubs of the current season). Do not claim other leagues.",
  "- Today has no track-record entry; the direct receipts page still has a legacy ledger interface.",
  "- Scores, team names and competitions on legacy episode pages come from match data, not narration.",
  "- Personalised surfaces are noindex and carry no public editorial catalogue.",
];
