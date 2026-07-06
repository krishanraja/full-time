# 05 · Content Safety

**Role:** Developer, product, legal, anyone touching the generation pipeline or considering loosening a constraint.
**Read this when:** changing the writer prompt, the deterministic code gate, the contradiction judge, the regen / fail-closed policy, the voice, or the AI disclosure copy.
**Don't read this when:** you only need user-facing FAQ (→ `10-support.md`).

---

## Why this matters

We narrate football. Football media is full of three things we must never do:

1. **Hallucinated facts:** invented goals, scorers, minutes, the wrong winner, the wrong scoreline, a goal credited to the wrong team.
2. **Real-broadcaster impressions:** imitating named commentators is an IP and trust hazard.
3. **Adjacent harms:** transfer rumours, injury speculation, betting language, political takes, slurs, mockery of a club, player, or manager.

Any of these in production is a brand-ending event. Treat this file as the binding constraint, not a guideline.

## Accuracy by construction

The old path (Lovable AI Gateway, Gemini flash, a single banned-words regex) is gone. It was fact-starved: it asked the model to stay truthful and hoped it would. A prompt instruction is not a guarantee.

The engine now guarantees the result **by construction**, and it is **fail-closed**: it publishes no episode rather than a wrong one. Five stages, in order:

1. **Deterministic fact-pack** (code, not the model) built from `match_events` and `match_stats`.
2. **Opus writer** conditioned on the voice corpus, writing prose only.
3. **Deterministic code gate** that mechanically checks score, scorers, length, repetition, and banned text.
4. **Sonnet contradiction judge** that flags a wrong winner, wrong score, or a goal credited to the wrong team.
5. **Fail-closed publish** after up to 5 surgical regens.

Then ElevenLabs TTS → Supabase Storage → the `episodes` row.

Lives in `src/lib/api/recap-generator.server.ts` (`generateRecap`) and `src/lib/api/episode-pipeline.functions.ts` (`runEpisodePipeline`). Models are set by `WRITER_MODEL` (default `claude-opus-4-8`) and `JUDGE_MODEL` (default `claude-sonnet-4-6`), with `ANTHROPIC_API_KEY`.

**Rule:** any change to the writer prompt, the code gate, or the judge requires:
1. Updating this file in the same change.
2. Logging a decision in `12-roadmap.md`.

### 1. The deterministic fact-pack

Assembled in code, never by the model. The model cannot introduce a scorer or a score the data does not contain, because it is only ever handed the truth:

- **Running goal log:** each goal in order, with the team it counts for and the score after it. The running score is computed in code (`h`, `a`), not narrated by the model.
- **Scorer summary by team:** exactly how many goals each side scored and who scored them.
- **Own-goal and penalty tagging:** an own goal is credited to the other team in code and annotated (the named player put it into his own net). Penalties are tagged.
- **Cards and red cards:** counted; sendings-off named with minute.
- **Full-match stats:** possession, shots, shots on target, xG, corners (when `match_stats` exists, else "no detailed stats").

We do **not** pass: rumours, betting lines, player quotes, news headlines, prior commentary, or our own past episodes. The `voice_corpus` (127 rows, service-role only) supplies the persona (`style_rule`) and register examples (`example`); it feeds **voice**, not facts.

### 2. The writer (Opus)

Conditioned on the fact-pack and the persona, the writer produces prose only and returns JSON (`title`, `script`, `magic_sentence`, `referenced_scorers`, `stated_score`). Its brief in `recap-generator.server.ts` (`WRITER`) carries the safety-relevant rules, reproduced here so changes are reviewed:

```
- 105 to 135 words, one continuous piece.
- State each fact once. No repeated scoreline, scorer, minute, or stat.
- ONE angle, the most interesting TRUE one. Do not list multiple stats.
- Never say a team "scored every goal" / "all the goals" unless the other side scored zero.
- Never credit a goal to the wrong team. An own goal counts for the OTHER team. A penalty: say so.
- Stats are full-match unless a minute is given. No invented sweeping claims.
- Calm, dry, identity-safe: mock the game or the situation, never a club, player, or manager.
- No exclamation marks. No em dashes (periods and commas). No emoji. Numbers as digits.
```

The writer is told to get the winner and final score exactly right and that it need not mention every goal. Naming only decisive goals is allowed; naming a scorer who did not score is not.

### 3. The deterministic code gate

Runs on every draft. Pure code, no model. All checks must pass:

| Check | What it enforces |
|---|---|
| `score` | `stated_score` equals the real final score `{home}-{away}`. |
| `goalsConsistent` | Number of goal events equals the sum of the two scores. |
| `scorers` | Every named scorer is a subset of the real scorers, matched by **diacritic-normalized surname** (so accents and first-name variants do not cause false rejects). |
| `length_ok` | 90 to 150 words (the writer is asked for 105 to 135). |
| `no_score_repeat` | The scoreline appears at most once. |
| `no_minute_repeat` | No minute is stated twice. |
| `no_every_goal` | No "scored / netted every / all the goals" when both teams scored. |
| `noDash` | No em dash or en dash. |
| `noCliche` | None of the banned house cliches: "draw your own conclusions", "not drawing them for you", "table does not ask". |

A failure here is mechanical and specific, so the regen feedback can be surgical (the exact fixed facts, the failing checks, the only scorers that exist).

### 4. The contradiction judge (Sonnet)

A second model reads the draft against the correct result and returns a verdict only. It flags a contradiction **only** if the recap states the wrong winner, the wrong final score, or attributes a named goal to the wrong team. It ignores phrasing, observations, vague adjectives, and any goal the recap chooses not to mention. This catches the class of error a regex cannot: a fluent, well-formed script that quietly names the wrong winner.

### 5. Fail-closed publish

On any gate failure or judge contradiction, the engine regenerates with the corrective feedback appended, up to **5 attempts**. If no attempt passes both the gate and the judge, `generateRecap` returns `ok: false` and `runEpisodePipeline` **throws**. No episode row is written, no audio is synthesized. The cron logs the failure and moves on; the match is retried on the next run (the pipeline is idempotent and skips matches that already have an episode). We would rather ship nothing for a match than ship a wrong recap.

## Banned terms and cliches

The only **deterministic text filters** now live in the code gate (see check `noDash` and `noCliche` above): em / en dashes, and the three named house cliches. Add or change these in the `cc` object in `recap-generator.server.ts`, and log the change here plus in `12-roadmap.md`.

The policy categories we never say aloud (betting, transfer rumours, injury speculation, slurs, broadcaster impressions) are prevented **by construction** rather than by a standalone banned-words regex: the model is only ever handed a structured match fact-pack, so there is no rumour or betting data for it to surface, and the identity-safe voice rules keep it off people. If a category ever needs a hard deterministic block, add a check to the code gate rather than trusting the prompt.

## What we don't filter (deliberately)

- **Player and scorer names.** We name scorers exactly as the source data names them.
- **Sharp language about performance** ("collapsed", "outplayed", "ragged") grounded in the scoreline. Match reporting needs colour.
- **Manager names and tactical critique** grounded in the result.

The line is identity safety: mock the game or the situation, never a club, player, or manager (writer rule, backed by the judge for factual attribution).

## Voice / TTS constraints

- TTS uses one **synthetic** voice: Daniel (`onwK4e9ZLuTAKqWW03F9`), model `eleven_multilingual_v2`, output `mp3_44100_128`. Overridable via `ELEVENLABS_VOICE_ID`; documented changes go in `12-roadmap.md`. Don't change the output format without product sign-off; it affects file size and bandwidth cost.
- **No cloning of real broadcasters**, even with a licence claim, without legal sign-off.
- Pundit **selection** is a separate, persona-level choice, not a cloned voice. The free tier gets one pundit ("The Reporter" / `zen`); the other five are Full Time Pro, enforced server-side in `setVoiceStyle` (`src/lib/api/profile.functions.ts`) so a lower tier cannot select them via a direct RPC.

## AI disclosure (user-facing)

The Settings page surfaces:

> Recaps on Full Time are generated by AI from publicly available match data. Voices are synthetic. No copyrighted broadcast audio is used.

Every player surface shows a low-volume `AI · {duration}` tag. Do not hide either. See `11-legal.md` for the legal stance.

## What to do if something slips through

1. Take the offending episode down immediately: delete the `episodes` row and the Storage object at `episodes/YYYY-MM-DD/{matchId}.mp3`. Runbook in `06-ops.md`.
2. Log the script that produced it in an internal note.
3. **If it was a wrong fact** (wrong winner, score, or scorer) it means the gate and judge both missed it. That is a fail-closed breach: capture the fact-pack and the script, and tighten the gate check or the judge brief in the same change. Also confirm the source data (`matches`, `match_events`) was correct, because the fact-pack is only as true as the rows.
4. **If it was banned text** (an em dash or a house cliche) the gate should have caught it; find why the check missed and fix the check.
5. **If it was a new category** we want blocked deterministically, add a check to the code gate rather than the prompt.
6. Post a short note on Settings / changelog if the fix is user-visible.

## Things we will not do, even if asked

- "Make it funnier" by loosening the code gate or the contradiction judge, or by weakening the fail-closed rule so borderline drafts still publish.
- Feed the writer anything beyond the structured match fact-pack (rumours, betting lines, headlines, quotes).
- Use real broadcaster voices, even with a licence claim, without legal sign-off.
- Include "what's the betting" type asides.
- Pipe in rumour news from any RSS / aggregator.

If a stakeholder asks for any of the above, point them at this file.
