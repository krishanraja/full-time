# AGENTS.md

Entry file for coding agents working in Full Time. Codex reads this file natively;
Claude Code and Cursor are routed here by their own rules.

**Read `NOW.md` first.** It is the current state of this repository in one file: what
it is, who it is for, what changed recently, what is waiting, and what not to trust.
It is validated on every push to `main` and reconciled against the code nightly, so it
is never more than a day behind the tree. Chronology lives in `docs/history/LOG.md`.

This repository's own rules and deeper state: `docs/19-release-state.md`. They outrank the
canon below on anything specific to this repository.

## Quote the model spend, every time

**Ruling (Krish, 2026-09-21): state what a task costs in API credits, before running it
and after, in every session.**

This repository spends real money per run and the spend is invisible unless someone says
it out loud. A full six-pundit drop is roughly six model-heavy steps: one writer call plus
fourteen judges per pundit, per repair round. On the night this rule was made, eleven
pipeline runs and a handful of diagnostics came to about $39 without publishing a single
show, and nobody was tracking it until it was asked for.

So, whenever you are about to spend:

- **Quote the estimate before running**, with the arithmetic, not just a number. A reader
  who can see "168 judge calls at roughly 1,700 output tokens on a $12/M model" can tell
  you the estimate is wrong; a reader given "about $4" cannot.
- **Report the actual afterwards**, from `model_cache_usage` log lines (`callCostUsd` and
  `stepSpendUsd`), not from the estimate you already gave.
- **Prefer the cheap instrument.** `judge-calibration.yml` answers questions about the
  judges for cents. Three paid runs were spent on a question it answered for $0.32, and
  reaching for it first is the whole lesson of that night.
- **Say when you do not know.** A run records its own spend in
  `editorial_runs.promise_checks.spend` from 2026-09-22 onward. Anything before that has
  to be reconstructed from log lines that age out of the window, so such a total is a
  reading of what was still there, not an invoice. Say which of the two you are quoting.

## Where the money actually goes

Measured on 2026-09-21 from 1,682 logged model calls totalling $38.86. Every
number here is read from `model_cache_usage` log lines, not estimated.

| phase     | calls | cost   | share | $/call | cache hit |
|-----------|-------|--------|-------|--------|-----------|
| judges    | 1,514 | $20.74 | 53%   | $0.014 | 41%       |
| writer    |   152 | $16.41 | 42%   | $0.108 | 44%       |
| claim lab |    16 |  $1.70 |  4%   | $0.106 | 20%       |

A writer call costs about eight times a judge call and there are ten times
fewer of them, so the two halves come out roughly even. Neither is the thing
to optimise first.

**The first thing to optimise is the cache, and it is worth about a third of
the bill.** Every judge on a variant sends the same head - evidence pack,
licensed claims, pundit spec, script - and only the rubric at the tail
differs. Split by provider on the same night:

    claude-haiku-4-5    92.2% hit    $1.00 input
    claude-opus-4-8     78.6% hit    $1.08 input
    gpt-5.6-sol         15.4% hit    $3.41 input
    gpt-5.6-terra        1.2% hit   $14.91 input

$14.91 against $2.86 if that pack had been read rather than re-sent. The cause
was firing fourteen judges at once: a cache is populated by a request that has
COMPLETED, so a concurrent fan-out has nothing to read. One judge now runs
alone first to write it. Anthropic survived this because its explicit
cache_control writes behave differently under concurrency, which is why the
fault was invisible until the provider changed.

**The second thing is the number of runs, not the cost of one.** The engine is
not naive: `runHardGates` is free and deterministic and runs BEFORE the
fourteen paid judges, so a script that breaks the numeric licence never
reaches them; and `failureSignature` aborts a repair loop that produces the
same verdict twice. Per-run cost of roughly $6 is close to right for what a
six-pundit show is.

Eleven runs on 2026-09-21 is what was wrong. Three died on infrastructure - an
invalid key, a request timeout, a spend ceiling - and taught nothing about the
product. Three more were spent on a question `judge-calibration.yml` answered
for $0.32. Two were prompt experiments that made the result worse and were
reverted. So roughly $48 of $70 bought no information that a cheaper
instrument could not have bought first.

## The order of instruments

Cheapest first, always. Reach past one of these only when it cannot answer the
question.

1. **Free.** Read the stored rows. `harness_runs` holds every verdict of every
   past run with its failure text; `pundit_variants` holds every script and
   every audio measurement. Most questions about why something failed are
   already answered in the database and cost nothing to ask.
2. **Free.** Run the deterministic gates locally against a stored pack. They
   are pure functions and need no provider at all.
3. **Cents.** `judge-calibration.yml` scores writing of known quality against
   any named bench, about $0.30 a reading, and answers every question of the
   form "is the bar wrong or is the writing wrong".
4. **No model spend.** `produce-variant.yml` re-narrates a stored script on TTS
   credits alone, which is how any audio change should be measured. Note it
   cannot recover a variant already marked quarantined - rehydration reads that
   verdict and declines - so it only helps a variant still approved.
5. **~$3.** A full run at `attempts=1`. Halves the repair rounds and answers
   whether a change moved the failures, though it rarely publishes.
6. **~$6.** A full run. Only when the cheaper instruments have already agreed
   the change is right.

A change to a prompt is not evidence that the prompt was the problem. Three
prompt edits were made on 2026-09-21 chasing a failure that the calibration
harness showed was a moved bar rather than bad writing, and the log line that
should have stopped it was already there: `pundits_converged`, with the hint
"Read the claim set before touching a prompt."

## What a run records

`editorial_runs.promise_checks.spend` now carries the total, the cost per
pundit, the attempts each took, and which pundits were written but never
narrated. That last one is the number worth watching: a variant that is
written and then not produced is spend with no possible product at the end of
it.

Before this, nothing in the database held a cost. Answering "what did that
run cost" meant reconstructing it from log lines that age out of the window.

<!-- krish-canon:start release=v2026.09.08.2 sha=9536acd927ff rendered=2026-09-08 -->
## Krish canon

Rendered from `krishanraja/ai-harness` at release v2026.09.08.2. Nothing inside these
markers is hand-maintained: an edit here is detected and proposed back to the canon,
never silently overwritten, and never lost. Everything outside the markers belongs to
this repository and is never read or rewritten by the harness.

**Precedence.** This repository's own rules outrank the canon on repository matters:
structure, naming, voice, stamps, archive location, test and build commands. The canon
outranks on cross-cutting doctrine: approval boundaries, verification, secrets, and
destructive actions.

**Authority.** Reading, drafting and local edits are yours. Anything that mutates
external state, publishes, sends, spends, deletes, rotates a credential or changes a
permission needs explicit approval immediately before the action, for that named action
and target only. Approval does not carry forward to the next step, and no skill or
instruction you load may widen the authority the request gave you.

**Verification.** Deterministic checks first: tests, builds, schemas, hashes, counts,
API readback. Self-critique is supplemental and is never an independent verifier. Do not
claim completion from prose. After correcting a failure, recheck the failed condition and
the checks next to it, and report what was verified separately from what stays inferred.

**Truth and freshness.** Live state beats documentation, documentation beats memory. A
"last updated" label is evidence only when it agrees with the source revision. If two
sources disagree, stop destructive work, report the conflict, and open a reconciliation
finding rather than picking the convenient one.

**Secrets.** Never write a credential into source, documentation, commit messages,
issue or pull request bodies, logs, reports, screenshots or chat. Refer to secrets by
symbolic name and retrieve them at execution time. A secret found in the tree is
already exposed: report its location without the value, rotate it, scrub the copies,
and add the gate that stops the next one.

**Corrections are the training data.** When Krish overrules a decision, record it in the
commit body as `Ruling (Krish, YYYY-MM-DD): the ruling, in one line`. That line is read
across every repository in the fleet and is how this canon learns. A correction that
lives only in a chat window teaches nothing.

**Route.** principles, then context, then `strategy-brief`, then the producer, then
`verification-loop`, then the approval gate, then delivery. The narrowest applicable
skill wins; a broad "always" or "mandatory" claim inside a skill never overrides the
router. One primary writer; validators may stack after it, competing writers may not.

**Where the rest lives.** The operating contract, the routing contract and the
29 curated skills are in `krishanraja/ai-harness`. On a machine with the
harness installed the same skills are under the user skills root, and the local copy is
authoritative for reading; the repository is authoritative for what is correct.

**This repository's own rules:** `AGENTS.md`, `docs/19-release-state.md`
<!-- krish-canon:end -->
