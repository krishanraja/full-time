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
ranges. Reporter B remains the separately approved recording. Five short
product auditions have now been generated and heard by Krish; the feedback
below separates casting from performance acceptance. No profile asserts
automated narration is equivalent to its reference, and no code test approves a voice.

## Owner feedback after the five auditions, 26 October 2026

Krish finds all five voice choices acceptable, but the performances still sound
synthetic and insufficiently fluid. The writing is too equivocal in how it
applies the characters to the job. This is acceptance of the casting direction,
not acceptance of these recordings as finished product performances, exact
pronunciation approval, or a change to the active versioned release.

The requested direction depends on the listening context:

- Organic content and advertising should be hilarious, blunt and designed to
  travel. Growth owns that execution. Virality remains an observed outcome,
  never a property certified by a prompt or creative approval.
- Product pundits should focus on the match, explain supported causes and
  consequences, and offer sharp opinions. Their personalities should shape
  analytical judgment and delivery rather than become the subject of the show.
- Conversational fluidity is still unresolved. Keeping the casts does not
  establish that the writing, turn structure or synthesis now sounds natural.

Krish then clarified the sequence: the alpha is a single pundit delivering
quick, valuable analysis and opinion, with a confirmed two-to-three-minute target.
Pundit-to-pundit questions and discussion
belong to a paid expansion after reliable solo quality and adoption. The
[roadmap ruling](./12-roadmap.md#pundit-evolution-solo-quality-adoption-paid-conversation)
governs this sequence. The initial dialogue draft is superseded as the next
test; the next no-spend proof is a solo written review on the existing sealed
pack, followed by exact audio quoting after script acceptance. Private source
feedback and artifact hashes are linked from
`_corpus/personality-system/audition-feedback-current.json`.

## A script remembers the standard that made it

Local candidate `product-personas-2026-10-26.3` retains shared speech
version `1.1.0` from the earlier local candidate. It includes the accepted writing contrasts, explicit reference-only
scope and a plain-delivery clarity standard. The writer's output contract and
all qualitative reviewers receive the examples through `spokenStyleBrief`;
the writer's judged dimensions and clarity judge read the same review rule.
Examples are anonymised and do not license claims in a different match.
All six profiles now have new `1.1.0` files with 120-180-second duration limits.
Reporter has a 420-500-word drafting budget; the other five have 330-450 words.
The accepted 352-word Gaffer example fits that budget. Word counts guide drafting;
measured audio determines duration acceptance. Existing speaking-rate calibration,
casting, character specs and safety thresholds are unchanged. Never rush or pad
to satisfy either check.

The writer, deterministic length gate, audio evaluator and publication decision
use the registry limits. Human audio review now requires the entire stored
recording within the alpha duration, rather than a fixed five-minute sample.
Historical reviews remain stored but do not count as proof of the new format.
Writer and reviewer use earned, relevant humour without a two-to-four-joke quota;
the persona reviewer assesses the analytical lens rather than demanding theatrical
character performance. Numerical quality floors remain unchanged.

The release is a cumulative local candidate against committed `.1`, superseding
uncommitted `.2`; it declares shared plus all six profile owners. Existing version
files and the earlier local manifest are preserved. It is not deployed, and no new
script or audio generation has established qualitative improvement.

The old shared file is retained. New scripts carry the new shared hash;
historical scripts keep their original reference and need explicit re-review
before new narration under the changed baseline. Existing approved recordings
are preserved. Growth remains pinned to its existing committed core until a
separate import and acceptance. Local prompt-routing checks establish which
standard is sent, not whether the model's writing or reviewing has improved.

The writer and every repair receive the selected profile and release hashes.
For the private single-Gaffer alpha diagnostic, the claim laboratory and writer
now describe one selected two-to-three-minute solo review. The earlier prompts
still referred to six long shows and told the writer to avoid the most obvious
reading merely to differ from another persona. The local candidate now directs
the writer to choose the clearest useful match argument through its own lens.
This prompt change is a test input, not evidence of better writing; no paid
generation has run. The unchanged profile release pins identity and speech,
while the diagnostic separately hashes its generator and transport source.

The 27 October local solo-contract correction responds to the sealed Gaffer
script's independent review. One match-specific argument now leads the writer;
the ten required beat fields remain storage joins, not audible sections. The
hook may state the take, and later fields develop it. A joke or portable line
is optional when it would interrupt the analysis. Without a registered prior
prediction, the receipt field can account for this match instead of forcing a
next-fixture forecast. The qualitative standards agree with those instructions.
The writer also forbids assigning full-match aggregates to a particular phase,
asks for pack-derived rather than improvised time intervals, and uses ordinary
spoken decimal forms. The numeric gate now licenses "nought point" decimals
only when their exact values appear in the pack. Existing factual gates and
quality floors remain in force. The accepted Gaffer v2 is the writing reference,
not independent certification of every match claim in that example. This is
still an ungenerated, unlistened local candidate: tests cannot establish a
natural performance or a listener benefit.

One approved private Gaffer run on the sealed Tottenham-Coventry pack tested
that candidate on 27 October. The 385-word script passed its deterministic
length and numeric checks, but the complete review quarantined it: factual
entailment failed, and insight and restraint each scored three of five. Sixteen
paid calls used $0.4138398 at local listed rates. The claim lab and writer
incorrectly described the late goal as a substitute assisted by a substitute;
the factual reviewer caught this. The script also narrated a table snapshot
taken after the match as if it described both teams before kickoff, which the
reviewer missed. The main argument repeated a generic xG/finishing point, with
audible counterpoint and receipt transitions. This establishes a narrower
mechanical improvement, not accepted spoken writing or audio.

A subsequent no-spend local correction checks pre-match table assertions
against snapshot timing and requires two incoming substitution events for a
double-substitute goal claim. Claim, writer and factual-review instructions now
name those boundaries and discourage a generic xG thesis or spoken field
labels. Synthetic tests and a replay of the exact quarantined script exercise
the new deterministic checks. Their scope is bounded: they do not certify
every possible temporal or player-role phrase, and no fresh generation has
tested the new prompt. The private source script and detailed review remain
outside the repository under `outputs/fulltime-gaffer-solo-contract-diagnostic`.

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
