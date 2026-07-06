# 06 · Ops

**Role:** Anyone on-call when something breaks.
**Read this when:** the morning drop didn't happen, push didn't go out, a secret needs rotating, a Pro checkout didn't land entitlement, or a user reports a broken episode.
**Don't read this when:** you're shipping a feature (→ `02-developer.md`).

---

## Reality check before you panic

The daily drop is **inert until a live match-data feed exists.** Match data is currently seeded (2023-24 season) and the cron is date-filtered to recently finished matches, so a scheduled run returning `created: 0` is the **expected** state today, not a fault. There are 5 hand-authored episodes live and 0 real users so far. New dated cards will only start appearing once a live API-Football ingest is wired (see `12-roadmap.md`), which also turns on ongoing Anthropic plus ElevenLabs spend.

---

## Daily green-light check

After the 06:30 UTC drop, look at:

1. `/feed`: loads, and the seeded episodes play (their `audio_url` resolves). Expect no new dated cards until the live ingest lands.
2. Plausible (if `VITE_PLAUSIBLE_DOMAIN` set): `play` event count in the last hour. 0 is expected while there are no real users.
3. Cron logs: no spike in per-match errors, no `recap failed gate/judge` entries.

If any of these look wrong for the wrong reason, run the relevant runbook below.

---

## Runbook · cron didn't fire

**Symptom:** the schedule didn't run, or the live feed is on and still no new episodes.

1. Check GitHub Actions: repo → Actions → the "Daily Drop" workflow (`.github/workflows/daily-drop.yml`, 06:30 UTC, best-effort, expect ±10 min) → most recent run. If missing or red, the workflow itself didn't fire or failed.
2. Confirm the two GitHub repo secrets that the workflow needs are set: `CRON_SECRET` (must match the Vercel env var of the same name) and `FULL_TIME_URL` (the deployed origin). Without both, the `curl` step fails before it reaches the endpoint.
3. Manually trigger via the "Run workflow" button, which confirms whether the issue is the schedule or the endpoint.
4. If the manual run fails with **401**: the endpoint authorizes a `Authorization: Bearer <CRON_SECRET>` header, so this means the GitHub repo secret `CRON_SECRET` and the Vercel env `CRON_SECRET` disagree. Re-set both to the same value and re-run. (A legacy Supabase-publishable-key fallback still exists in the endpoint code but is inactive whenever `CRON_SECRET` is set, which is the intended posture.)
5. If the manual run returns **200 but `created: 0`**: no finished Big-5 matches in the last 36h (expected while data is seeded), OR all matched matches already have episodes (idempotent skip is working), OR the 240s time budget was hit and the rest is left for the next run.

---

## Runbook · cron fires but a match fails

**Symptom:** cron returns 200, `processed > 0`, and a result has `ok: false` with an `error`. Each match is caught independently, so one failure skips that match, not the whole drop.

Look at the error string:

| Error contains | Cause | Fix |
|---|---|---|
| `ANTHROPIC_API_KEY missing` | Writer/judge key absent in runtime | Set `ANTHROPIC_API_KEY` in Vercel env, redeploy |
| Anthropic 4xx/5xx (writer or judge fetch) | Anthropic API problem or quota | Check Anthropic status, retry |
| `recap failed gate/judge after N attempts` | The deterministic code gate or the Sonnet contradiction judge rejected all regens. Fail-closed: the episode is skipped on purpose rather than published wrong | Not a bug, it is the accuracy guarantee. Inspect the match's `match_events` fact-pack (usually missing or garbled events, or a genuinely un-writable match). A recurring pattern means tightening a check in `recap-generator.server.ts`, not loosening it |
| `ELEVENLABS_API_KEY missing` | TTS key absent | Set `ELEVENLABS_API_KEY` in Vercel env |
| `ElevenLabs 401` | Key invalid | Rotate `ELEVENLABS_API_KEY` |
| `ElevenLabs 402/429` | Quota or balance | Top up ElevenLabs account |
| `Storage upload: ...` | Bucket missing or RLS misconfigured | Check `episodes` bucket exists, public-read |

---

## Runbook · push didn't deliver

**Symptom:** episodes were created but no one got the morning push.

1. Confirm VAPID secrets exist: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. If any missing, fanout silently no-ops.
2. Confirm there are rows in `push_subscriptions`. If zero, no one has opted in yet.
3. Inspect cron logs for `[cron] push fanout failed (non-fatal)`.
4. If a single subscriber's `endpoint` returns 410 Gone, that device unsubscribed at the browser level, so it is safe to delete that row.
5. Service worker on the client: `/sw.js` must be registered. If users say "I had push working, then it stopped", their PWA cache may be stale, so push them to reinstall.

---

## Runbook · Pro checkout didn't grant entitlement

**Symptom:** a user completed a Stripe checkout but is still on Free (still locked to the Reporter pundit).

1. Remember Stripe is on the **test** key today (account `acct_1Siiex`), so this only applies to test-mode checkouts. No real charges happen yet.
2. Check the Stripe webhook endpoint (`src/routes/api/stripe/webhook.ts`) is receiving events and `STRIPE_WEBHOOK_SECRET` is set in Vercel. Bad or missing signature returns 400; a transient handler error returns 500 so Stripe retries with backoff.
3. Entitlement is written only by the service-role client, because the billing columns on `profiles` (`plan`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `current_period_end`, `price_id`) are locked by the `enforce_profile_billing_guard` BEFORE INSERT/UPDATE trigger. If writes are being rejected, confirm the webhook is going through `supabaseAdmin`, not a user client.
4. As a manual reconcile, `syncCheckout` in `src/lib/api/billing.functions.ts` recomputes a user's profile from Stripe. Every webhook handler is also idempotent (it re-derives state from Stripe), so replaying the event is safe.

---

## Runbook · take down a bad episode

**Symptom:** an episode is wrong, unsafe, or has a hallucination.

1. Find the `episodes.id` (search by `match_id` or by `published_at` plus team names).
2. Delete the audio: Storage bucket `episodes`, path `YYYY-MM-DD/{matchId}.mp3`.
3. Delete the row: `DELETE FROM episodes WHERE id = '...'`.
4. If it slipped past the gate plus judge: the accuracy layer is code (deterministic fact-pack, code gate, Sonnet contradiction judge in `recap-generator.server.ts`), not a term list. Capture the script and the `match_events`, note the failure mode, and open `05-content-safety.md`. A recurring miss means tightening a gate or judge check, not adding a banned word.
5. The frontend updates on next refresh; no cache to invalidate.

---

## Runbook · rotate a secret

Server secrets live in the **Vercel project → Settings → Environment Variables.** The cron additionally needs two **GitHub repo secrets** (`CRON_SECRET`, `FULL_TIME_URL`). To rotate:

1. Reissue the value at the provider (Stripe, Anthropic, ElevenLabs, VAPID, etc.).
2. Update it in Vercel env, then **redeploy**. Env changes only take effect on a new deployment.
3. For `CRON_SECRET`: update **both** the Vercel env var **and** the GitHub repo secret to the same new value, or the next cron will 401.
4. For `STRIPE_WEBHOOK_SECRET`: reissue from the Stripe Dashboard webhook endpoint, update in Vercel, redeploy.
5. **Never** echo a secret in chat, logs, or a code response.

VAPID keypair generation:

```bash
npx web-push generate-vapid-keys
```

Generates a new pair. Existing `push_subscriptions` rows tied to the old public key become invalid. Rotate only when actually compromised; otherwise leave alone.

---

## Env inventory (where each secret lives)

Server env, set in Vercel:

| Key | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL` | server clients | Supabase project `hzadscrqmyilbisexvyz` |
| `SUPABASE_SERVICE_ROLE_KEY` | admin client (`client.server.ts`) | Service-role writes: generation, entitlement past the billing guard |
| `SUPABASE_PUBLISHABLE_KEY` | read clients, auth middleware, legacy cron fallback | Anon-key reads; inactive as cron auth once `CRON_SECRET` is set |
| `ANTHROPIC_API_KEY` | `recap-generator.server.ts` | Opus writer plus Sonnet judge |
| `WRITER_MODEL` (optional) | generator | Writer model, default `claude-opus-4-8` |
| `JUDGE_MODEL` (optional) | generator | Judge model, default `claude-sonnet-4-6` |
| `ELEVENLABS_API_KEY` | episode pipeline | TTS |
| `ELEVENLABS_VOICE_ID` (optional) | episode pipeline | Voice, default Daniel `onwK4e9ZLuTAKqWW03F9` |
| `STRIPE_SECRET_KEY` (**test**) | `stripe.server.ts` | Stripe API, test key on account `acct_1Siiex` |
| `STRIPE_PRO_PRICE_ID` (**test**) | checkout | Full Time Pro price ($4.99/mo) |
| `STRIPE_WEBHOOK_SECRET` | webhook | Verifies the Stripe signature against the raw body |
| `APP_URL` | `billing.functions.ts` | Checkout and portal return URLs |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | push fanout | Morning push |
| `CRON_SECRET` | cron route auth | Bearer token the daily-drop endpoint requires |

Client env (publishable, `VITE_` prefixed): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PLAUSIBLE_DOMAIN` (optional analytics).

GitHub repo secrets (for the scheduled cron): `CRON_SECRET` (matching the Vercel value) and `FULL_TIME_URL` (the deployed origin).

---

## Runbook · database appears empty / broken

1. Supabase dashboard (project `hzadscrqmyilbisexvyz`) → check project status. If yellow or red, wait and re-check.
2. Connections healthy but no rows: confirm the latest migration applied. Migrations are the 3 base files plus `supabase/migrations/20260617130000_magic_engine_extensions.sql` plus `supabase/migrations/20260705120000_billing.sql`.
3. RLS suspicion: a permission error in the browser console with a `HINT` line will tell you which GRANT or policy is missing. Apply the suggested GRANT in a new migration.
4. Billing writes rejected: the `profiles` billing columns are writable only by `service_role` via the `enforce_profile_billing_guard` trigger. If entitlement will not persist, confirm the writer is the service-role client and that the guard is not blocking a legitimate service-role write.

---

## Generation and storage cost watch

Once the live feed is on, each published episode costs: one Anthropic Opus writer call (plus up to 5 surgical regens on gate or judge rejection), one Sonnet judge call per attempt, and one ElevenLabs TTS render. So Anthropic plus ElevenLabs spend scales per episode per day. The fail-closed design bounds this: a hopeless match burns at most the writer, judge, and regen budget, then skips, so it never loops forever.

Storage: the `episodes` bucket grows about 3 MB/day (8 matches at roughly 360 KB mp3). At scale, bandwidth is the variable cost. If costs spike:

- Confirm no infinite-loop hotlinking (someone embedding our mp3s on another site).
- Consider a lifecycle policy: delete episodes older than 60 days. They're a daily product, old episodes aren't replayed.

---

## Deploys

- Hosted on **Vercel** (TanStack Start built with the nitro `vercel` preset).
- The live app is currently deployed from the local working tree and is being **merged to main now**. Once on `main`, pushes to `main` deploy through the Vercel Git integration.
- Env-var changes do not apply to the running deployment until you trigger a **new deployment**.
- The daily cron is driven by GitHub Actions, not by Vercel Cron.

---

## Escalation

- **Service down / users blocked:** post in the team channel, then status page if we have one.
- **Safety incident (bad recap):** product plus legal in the loop within 1h. Use `05-content-safety.md` checklist.
- **Suspected data leak:** rotate every affected secret in Vercel env (and the matching GitHub repo secret for `CRON_SECRET`), reissue provider keys at the source, and audit `listens` and `profiles` access logs.
