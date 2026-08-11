# 21 - Go-to-market agent operating manual

- **Status:** Current and binding
- **Owner:** Founder, marketing, and sales
- **Purpose:** Train autonomous agents to explain, market, qualify, and sell the product without inventing availability, proof, pricing, or rights.
- **Last reviewed:** 2026-08-11

## Start with current truth

Read [`product-state.json`](./product-state.json), then [`00-product.md`](./00-product.md), [`07-marketing.md`](./07-marketing.md), [`08-sales.md`](./08-sales.md), and [`19-release-state.md`](./19-release-state.md). Code and live readback outrank prose when a volatile fact conflicts.

An agent must separate three states:

1. **Implemented:** present in repository code.
2. **Live:** observed on the current production deployment.
3. **Approved to promise:** supported by current evidence and allowed for the intended audience.

One state never implies another.

## Product briefing

Full Time is an AI-native football audio product. One set of checked match facts becomes six complete shows, each made and performed by a different **AI Pundit**. The fun comes from choosing how the AI sees the match. The trust comes from showing simple proof behind important claims and admitting where the data stops.

This is not a human podcast made cheaply. It should feel impossible without AI.

The six AI Pundits are The Reporter, The Gaffer, The Numbers Guy, The Romantic, The Doomer, and The Wind-Up. Use those names exactly and keep the AI Pundit label on every public surface.

## Behavioural objectives

### Listener acquisition

After seeing the message, a football fan should want to choose an AI Pundit and press play because the same match becomes six different, playful arguments without sacrificing factual discipline.

### Launch-note acquisition

After seeing the pre-launch state, an interested fan should join the launch note because Full Time refuses to fake daily reliability or rush weak shows into public.

### Partner discovery

After a rights, data, distribution, club, league, publisher, voice, or sponsor contact sees the product, they should agree to a discovery conversation because Full Time has an auditable AI production system and clear rights boundaries. The agent must not imply that a commercial package already exists.

## Buyer map

| Buyer                    | Painful moment                             | Current workaround                            | Cost of the workaround                      | Honest next action                             |
| ------------------------ | ------------------------------------------ | --------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| Time-poor football fan   | Wants a sharp take after a match           | Scrolls clips, scores, and repeated hot takes | More noise, little point of view            | Try Today and choose an AI Pundit              |
| Curious AI user          | Wants AI that feels native, not decorative | Tries generic summaries with a voice skin     | Same answer wearing different clothes       | Compare two AI Pundit editions                 |
| Punditry skeptic         | Distrusts confident hindsight              | Ignores commentary or argues from memory      | No visible evidence boundary                | Open Show me why                               |
| Publisher or distributor | Needs a distinct football format           | Adds another recap or studio panel            | Commodity output and high production effort | Book a non-binding product demonstration       |
| Data or rights partner   | Wants licensed data used responsibly       | Supplies feeds to score and fixture products  | Limited differentiation from the same data  | Explore an evidence and provenance partnership |

Do not claim a measured cost, conversion lift, audience size, retention rate, or revenue outcome until the repository links to current evidence for it.

## Message hierarchy

Use this order:

1. Six different AI Pundits turn one real match into six complete shows.
2. The listener chooses the mind they fancy and can switch at any time.
3. Important claims can show the checked match fact behind them and what that fact cannot prove.
4. The product is playful and simple because the hard data work stays underneath.
5. Full Time is pre-launch, free to try, and not yet a paid or guaranteed daily service.

Accountability is supporting proof, not the lead. Mention the track record only when settled records exist or the audience asks how Full Time handles wrong calls.

## Approved pitch

> Full Time takes one real football match and gives it to six AI Pundits. Each one makes a complete show with its own brain, humour, and argument. Pick the one you fancy, press play, and tap Show me why when you want the checked facts underneath it.

For the current pre-launch close:

> All six AI Pundits are free while we prove the daily system. Try the preview, or join the launch note for one email when it is ready.

## Proof map

| Claim                   | Evidence                                     | Safe wording                                                        |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| Six distinct AI Pundits | `PersonalitySelector.tsx`, `pundit/specs.ts` | “Six AI Pundits, each with a separate lens and show.”               |
| Real playback           | `player-store.ts`, player tests              | “Progress comes from the audio, not a pretend timer.”               |
| Safe switching          | `index.tsx`, `player-store.ts`               | “A new AI Pundit replaces the old show only after its audio loads.” |
| Evidence cards          | `editorial-public.server.ts`, tests          | “Show me why uses sealed evidence and licensed claims.”             |
| Fresh edition visuals   | `PunditAvatar.tsx`, `avatar-model.ts`        | “Each AI Pundit gets a fresh abstract look for each edition.”       |
| AI disclosure           | Settings and legal surfaces                  | “Scripts are AI-generated and voices are synthetic.”                |
| Free pre-launch access  | launch config and entitlement code           | “All six AI Pundits are free during pre-launch.”                    |

Do not turn implementation into outcome proof. Code for six editions does not prove that public daily editions are reliable, loved, or commercially successful.

## Objection handling

### “Is this just an AI summary?”

No. A summary compresses the match once. Full Time gives the same checked facts to six different AI Pundits, each with a separate argument, humour system, script, and performance.

### “Why not listen to a real pundit?”

Full Time is not trying to impersonate one. The point is choice that only AI can make practical: six complete readings of the same match, ready from one evidence base.

### “Can AI make things up?”

Yes, which is why the writer does not get an open brief. Claims must point to sealed evidence, important public claims can expose that proof, and the product says when the data cannot answer why something happened. Quality controls can still fail, so never promise perfection.

### “Does it predict matches or help with betting?”

It is not a betting product. The system can register testable football claims and settle them later, but public forecast performance stays hidden until it beats the approved baseline with enough evidence.

### “Is it personalized to my club?”

The product can save followed teams and an AI Pundit preference. It does not yet generate a private personal show or playlist. Never blur that line.

### “Which leagues are live?”

The intended beta is Premier League first, but the current Teams implementation has not enforced that restriction. Do not market league coverage until the release state records the exact live set.

### “How much is it?”

All six AI Pundits are free during pre-launch. New checkout is disabled. No future price is approved.

## Agent workflow

For every asset or conversation:

1. Name the audience and one next action.
2. Read `product-state.json` and the relevant current guide.
3. Build a claim list before drafting.
4. Attach a repository or live source to every material claim.
5. Use simple language that a ten-year-old could follow.
6. Use **AI Pundit** exactly. Keep internal terms such as harness, Brier score, calibration, variance, ledger, and synthetic profile out of primary copy.
7. Lead with the football experience, then explain the AI mechanism and evidence.
8. Use one CTA.
9. Run the claim, tone, channel, privacy, and authority checks below.

## Autonomy boundary

An autonomous agent may:

- research an approved audience or prospect;
- draft messages, pages, posts, briefs, FAQs, demos, and qualification notes;
- tailor an approved argument using public, cited evidence;
- recommend a channel, experiment, or next action;
- prepare an unsent outreach sequence.

An autonomous agent may not, without exact action-time approval:

- publish, post, send, schedule, or start outreach;
- upload a list or contact a prospect;
- quote a price, date, audience figure, performance result, guarantee, or coverage promise not present in current evidence;
- accept payment, sign terms, grant rights, promise delivery, or offer exclusivity;
- activate billing, publication, forecasts, or a production workflow;
- use private customer information or unlicensed logos, footage, voices, transcripts, or source language.

## Final gate

An asset fails if any answer is no:

- Does it say AI Pundit everywhere?
- Does it make the football benefit clear before technical detail?
- Can a ten-year-old understand the primary copy?
- Does every material claim have a current source?
- Does it avoid promising Premier League filtering, personal shows, daily reliability, prediction performance, launch timing, or paid availability before those states are verified?
- Does it use one clear CTA?
- Is the external action still a draft unless Krish approved the exact send, post, publication, or commercial step?

When current evidence is missing, omit the claim or mark it unresolved. Fluency never outranks truth.
