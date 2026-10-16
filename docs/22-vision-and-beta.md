# 22 - Vision and the beta

- **Status:** Current
- **Owner:** Founder
- **Purpose:** Say what Full Time is for, where it is going, and how the pilot beta decides whether it releases in December.
- **Last reviewed:** 2026-10-16

Three rulings set this page (Krish, 2026-10-16). Full Time is a B2C product for football fans, now in a pilot beta. Public release is targeted for December 2026, against the written bar below. Testers send feedback to **krish@fulltime.fm**. The [roadmap decision log](./12-roadmap.md) records all three.

What runs today lives in [`product-state.json`](./product-state.json), and [`../NOW.md`](../NOW.md) says where the product is right now. This page says why it exists and where it goes.

## Why it exists

By the morning after a match, every fan already knows the score. What comes next is the same take on repeat: one studio, one panel, one argument, clipped and reposted until every version sounds alike.

Full Time gives the fan a choice of minds instead. One real match, checked once, becomes six complete shows, each written, argued and performed by a different AI Pundit. The Reporter tells you what mattered. The Gaffer spots the choices. The Numbers Guy checks whether the score flatters anyone. The Romantic finds the magic, the Doomer finds the wobble, and the Wind-Up finds the argument.

No human studio can make six full shows about one match before breakfast, every day of the season. AI can, so Full Time puts the machine in front instead of hiding it. The six share the facts and disagree about everything else. When a listener wants to know what a claim rests on, **Show me why** opens the recorded facts and says plainly where they stop: the data shows what happened, but not always why.

## Where it is going

This is direction, not a feature list. Nothing here may be marketed until `product-state.json` records it as shipped.

- **A full rail every match morning.** Today one Premier League match a day gets a show, and an AI Pundit appears only when its edition passes every check. The direction is all six, every morning after a Premier League match.
- **Your club first.** Following a club already saves the choice, but it does not yet change the show. The direction is a morning built around your team: its matches first, told by the AI Pundit you trust ([`12-roadmap.md`](./12-roadmap.md), "After launch, not before").
- **Pundits who live with their calls.** The prediction system is built and switched off. The direction is that every AI Pundit locks its calls before kickoff and keeps them, wrong ones included: what they said, what happened, and the bit they missed. A pundit who has to own last week's call is worth hearing this week.
- **Ask your AI Pundit.** After the show, a listener asks one follow-up question and gets an answer in that pundit's voice from the same checked facts, or an honest "the data can't tell us that". This is a proposal ([`16-ask-your-pundit.md`](./16-ask-your-pundit.md)), not a build.
- **AI-made audio people trust.** Every edition already clears twenty-five named checks before a listener hears it, and every run records what it cost. The direction is a show people trust because its standard is written down and its misses stay visible.
- **A product fans pay for.** Full Time is a B2C monetisation experiment (Ruling, Krish, 2026-10-06). The beta is free and checkout stays off. Once fans come back on their own, the next question is what they would pay for, and that waits for a separate product and legal decision ([`12-roadmap.md`](./12-roadmap.md), 2026-08-08).

The lines stay where the roadmap draws them, whatever happens: no betting, no live commentary, no imitation of a living pundit, no comment section.

## The pilot beta

**Who it is for.** Premier League fans who already know the score by breakfast and want a sharper way to talk about the match. They need no account and pay nothing. Krish invites them himself, one at a time; paid promotion stays off.

**What a tester does.**

1. Opens fulltime.fm from the invite link on a morning after a Premier League match.
2. Picks an AI Pundit and listens to the show.
3. Tries a second AI Pundit on the same match.
4. Comes back another morning, if they want to.
5. Tells us what they think.

**How feedback reaches us.** By email to krish@fulltime.fm. Settings carries a **Send feedback** row that opens an email to that address with the three questions already in it (`src/lib/feedback.ts`). Support answers from the same inbox ([`10-support.md`](./10-support.md)).

**The three questions.** Short enough to answer on a phone:

1. Which AI Pundit did you pick, and would you pick them again tomorrow?
2. Did anything sound wrong: a score, a name, a fact?
3. How would you feel if Full Time went away tomorrow: very disappointed, somewhat disappointed, or not bothered?

The first shows whether the six really feel different. The second catches anything the automated checks let through. The third is the Sean Ellis test, and the release bar reads it.

**Telling testers apart.** Invite links carry `?utm_source=beta`. PostHog captures the page view with its URL (`capture_pageview` in `src/routes/__root.tsx`), which lets the release numbers count testers apart from everyone else. Confirm the tag arrives in PostHog with one test visit before the first invite goes out.

**What we promise testers.** Only what is true today ([`product-state.json`](./product-state.json), `commercialState`): free, no account, and a show on mornings when one passes its checks. Not every AI Pundit appears every day, because Full Time withholds an edition that falls short rather than publishing it. Say so in the invite, so a dimmed AI Pundit reads as the standard working, not the app breaking.

## The December release bar

Release means Full Time stops being an invite-led beta and is marketed openly to football fans. It does not turn on checkout.

December 2026 is the target. The bar decides, not the calendar: if Full Time misses the bar, the release waits and the bar stays where it is ([`00-product.md`](./00-product.md): thresholds do not relax to rescue a date).

These numbers are the first draft of the bar, written on 2026-10-16. Only a ruling from Krish, recorded in the decision log, changes them.

| Test                              | Bar                                                                                                          | Where to read it                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| It shows up                       | At least one AI Pundit edition publishes by 07:00 London on ten Premier League match days in a row           | `daily_drops.status` and `published_at`                     |
| The rail fills                    | A median of four of the six AI Pundits publish across those ten days                                          | `pundit_variants.status` per `drop_id`                      |
| Nothing wrong reaches a listener  | No tester reports a wrong score, name or fact in the last four weeks, and every earlier report is traced to its gate and fixed | the feedback inbox, `harness_runs`                          |
| Enough testers                    | At least thirty testers finish a show                                                                         | PostHog `listen_completed`, `utm_source=beta`               |
| They come back                    | At least 40% of testers who finish a show start another within seven days                                     | PostHog `play_started`                                      |
| They use the idea                 | At least half of returning testers play a second AI Pundit                                                    | PostHog `pundit_switch_committed`                           |
| They would miss it                | At least 40% answer "very disappointed" to question 3                                                         | the feedback inbox                                          |
| Consent is in place               | The PostHog and Google Analytics consent item in [`11-legal.md`](./11-legal.md) is closed before open marketing starts | `11-legal.md`, the live privacy page                        |

The release claims none of the gates the 2026-09-04 override waived. They stay open work, listed in [`19-release-state.md`](./19-release-state.md).

Read the bar every week of the beta from the sources in the table, and record each reading with its date in [`../NOW.md`](../NOW.md).
