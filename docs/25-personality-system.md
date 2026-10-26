# Product-owned personality and voice system

Ruling (Krish, 2026-10-26): learning from the growth creative session belongs in
the actual product's pundit personality and tone architecture. The product is
the source of reusable identity; growth owns scoped creative execution.

## One definition, consumed by the real pipeline

`src/lib/pundit/personality/release.json` pins six independent profile files and
one shared direction/policy file by version and canonical SHA-256. Existing
version files are immutable. `personality/registry.ts` validates their shapes,
compiles selected specs and verifies the release before a writer or narrator
can use it. A character cannot override shared policy by adding arbitrary fields.

| Owner                 | Contents                                                                                 | Actual consumer                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Shared product policy | Existing analytical weights, fact/humour boundaries and editorial floors                 | Existing hard gates and qualitative judges through `getPunditSpec` |
| Shared delivery       | Natural speech, purposeful pace, clear joke targets, an earned sting and no forced slang | Writer and judges through the selected spoken brief                |
| Each profile          | Its own lens, claim preferences, cadence, examples and performance                       | Writer, persona/humour judges and performance planner              |
| Each voice profile    | Symbolic licensed-voice key, safe delivery tags, casting target and listening state      | Narration, pronunciation selection and audition planning           |
| Growth variant        | Ad-only emotional exaggeration, literal script, interruption, setting and visual story   | Growth's pinned creative release, not the product show writer      |

`specs.ts`, `spoken-style.ts` and `spoken-length.ts` remain compatibility APIs.
They read this registry rather than owning separate definitions. Narration's
duplicate voice-key and persona-tag maps have been removed. Product-only fact
licensing remains separate from fictional advertising; a satire line cannot
license an unsupported title, relegation or tactical claim in a product show.

## What was transferred

- People should sound conversational and distinctive, without formal recital,
  forced class caricature or a quota of catchphrases. The joke's target and
  meaning should be clear on first hearing. Profanity is not a substitute for
  a sharp idea, and the writer should stop after the punchline.
- Romantic: warm football affection earned through supported moments, with a
  ceiling on sentimentality. The ad's permission to invent a scene or praise a
  pitch does not create product evidence or permission to invent football lore.
- Doomer: an ordinary grumpy Northern man in his 50s, not a raspy creature or
  a sinister narrator. Product deadpan means low affect with precise timing;
  its old slow default is now measured. The ad's whinier rendition stays an ad
  variant rather than a product-wide performance replacement.
- Wind-Up: gleeful, casual and punchy, with a legible rival contradiction and
  no shouting or cartoon villain delivery. The actual ad's roast belongs to
  that story, not every subsequent show.

Reporter, Gaffer and Numbers Guy keep their existing identities and timing
ranges. Reporter B remains the separately approved recording. Five product
performances still need their own auditions. No profile asserts automated
narration is equivalent to its reference, and no code test approves a voice.

## A script remembers the standard that made it

The writer and every repair receive the selected profile and release hashes.
The candidate carries that `personalityBaseline`. Persistence records it as
`personality_baseline` in the existing `harness_runs` structure; no table or
publication-floor migration is needed. Rehydration reads the stored reference
rather than stamping the current version onto historical work.

Fresh six-persona narration compares the script's recorded baseline with the
current narrator baseline before any provider call. Missing or mismatched data
holds new narration for explicit re-review. Existing approved/published audio
can still be reused unchanged. The controlled existing-recording import path
does not re-narrate the approved Reporter. Older stored scripts without this
metadata do not gain a fictional approval; a new narration needs a recorded
baseline. Legacy recap generation is not certified as a six-persona audition.

## How a future improvement moves

1. Record the exact owner feedback and artifact/version in private review
   evidence. Classify it as reusable core identity/delivery, product-only factual
   policy, or ad-only execution. Ambiguity remains explicit.
2. Add a new version of the smallest owning profile or shared file. A Doomer
   change does not edit the Romantic. A shared change affects all six. Update
   the exact release manifest; never overwrite a prior version.
3. Run the free integrity and six-persona generator-path checks. The same sealed
   match and unchanged non-target characters make a useful comparison. Tests
   prove ownership, routing and safety, not humour or naturalness.
4. Prepare the short targeted auditions and ensemble comparisons under separate
   exact generation/cost approval. Preserve existing approved recordings. Record
   listening judgments by dimension; one improvement cannot offset a regression.
5. Product changes are reviewed and versioned here. Growth imports an exact
   committed core export, reviews its affected variants and pins that snapshot
   in a new creative release. Import alone never changes growth's current release.
6. Deployment, new audio generation, publication and actual listening evidence
   remain distinct states. A merged profile is not a newly approved show.

The private session archive and generic revision/comparison workflow live in
`krishanraja/growth-fulltime`, `creative-system/README.md`, with actual material
under ignored local storage. It is evidence input, not a second owner of the
product personalities. Do not copy raw dialogue or recordings into this public
repository. An authorised product-private evidence derivative belongs in the
ignored `_corpus/personality-system/` directory.

## Commands and continuation

```bash
pnpm run personas:check
pnpm run personas:check BASE_COMMIT_SHA
pnpm run personas:export EXPLICIT_OUTPUT_PATH.json
```

The export refuses an uncommitted core so its source revision is truthful. It
contains all six source profiles and verified hashes, plus a reusable projection
for growth. Growth's `growth.py standards import-product FILE --sha256 HASH`
verifies the export and stores it without activating it. A creative release then
pins the exact imported file. A changed product pin is a declared `product.core`
change and expands the regression review to linked characters.

Run `docs:check`, typecheck, tests, lint and the production build for a change.
The existing Windows Workflow-manifest limitation still applies: Linux CI or a
matching Vercel build is authority for the production build, not a local partial
bundle. This architecture made no paid model, narration or video calls.
