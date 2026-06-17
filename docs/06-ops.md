# 06 · Ops

**Role:** Anyone on-call when something breaks.
**Read this when:** the morning drop didn't happen, push didn't go out, a secret needs rotating, or a user reports a broken episode.
**Don't read this when:** you're shipping a feature (→ `02-developer.md`).

---

## Daily green-light check

Every morning ~07:30 local, look at:

1. `/feed` — at least 4–8 new cards dated today.
2. Plausible (if `VITE_PLAUSIBLE_DOMAIN` set) — `play` event count > 0 in the last hour.
3. No spike in `episode_pipeline_failed` log entries.

If any of these are off, run the relevant runbook below.

---

## Runbook · cron didn't fire

**Symptom:** no new episodes after 07:00 local.

1. Check GitHub Actions: repo → Actions → "Daily drop" workflow → most recent run. If missing or red, the workflow itself didn't fire / failed.
2. Manually trigger via the "Run workflow" button — confirms whether the issue is the schedule or the endpoint.
3. If manual run also fails with 401:
   - Open Lovable Settings → Secrets, copy the current `SUPABASE_PUBLISHABLE_KEY`.
   - Update the GitHub repo secret `SUPABASE_PUBLISHABLE_KEY` to match.
   - Re-run.
4. If manual run returns 200 but `created: 0`:
   - No finished Big-5 matches in the last 36h, OR
   - All those matches already have episodes (idempotent skip is working).

---

## Runbook · cron fires but every match fails

**Symptom:** cron returns 200, `processed > 0`, `created: 0`, each result has an `error`.

Look at the first error string:

| Error contains | Cause | Fix |
|---|---|---|
| `LOVABLE_API_KEY missing` | Cloud-injected key not in runtime | Rotate via Settings → Secrets, then re-deploy |
| `Lovable AI 4xx/5xx` | Gateway problem / quota | Check Lovable status, retry in 15 min |
| `Banned terms in generated script` (twice) | Model produced unsafe output twice — episode skipped as designed | Read `05-content-safety.md`. Add term to regex if pattern recurs. |
| `ELEVENLABS_API_KEY missing` | Connector secret missing | Re-link ElevenLabs connector in Settings → Integrations |
| `ElevenLabs 401` | Key invalid | Reconnect connector |
| `ElevenLabs 402/429` | Quota or balance | Top up ElevenLabs account |
| `Storage upload: ...` | Bucket missing or RLS misconfigured | Check `episodes` bucket exists, public-read |

---

## Runbook · push didn't deliver

**Symptom:** episodes were created but no one got the morning push.

1. Confirm VAPID secrets exist: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. If any missing, fanout silently no-ops.
2. Confirm there are rows in `push_subscriptions`. If zero, no one has opted in yet.
3. Inspect cron logs for `[cron] push fanout failed (non-fatal)`.
4. If a single subscriber's `endpoint` returns 410 Gone, that device unsubscribed at the browser level — safe to delete that row.
5. Service worker on the client: `/sw.js` must be registered. If users say "I had push working, then it stopped", their PWA cache may be stale — push them to reinstall.

---

## Runbook · take down a bad episode

**Symptom:** an episode is wrong, unsafe, or has a hallucination.

1. Find the `episodes.id` (search by `match_id` or by published_at + team names).
2. Delete the audio: Storage bucket `episodes`, path `YYYY-MM-DD/{matchId}.mp3`.
3. Delete the row: `DELETE FROM episodes WHERE id = '...'`.
4. If safety-related: open `05-content-safety.md`, log the incident, update `BANNED_TERMS` if the issue is patternable.
5. The frontend updates on next refresh; no cache to invalidate.

---

## Runbook · rotate a secret

All app secrets live in Lovable Settings → Secrets. To rotate:

1. Generate the new value (or reissue from the provider — ElevenLabs, VAPID, etc.).
2. Update in Settings → Secrets. Lovable redeploys server functions automatically.
3. For `SUPABASE_PUBLISHABLE_KEY`: also update the GitHub Actions repo secret of the same name. Otherwise the next cron will 401.
4. **Never** echo a secret in chat, logs, or a code response.

VAPID keypair generation:

```bash
npx web-push generate-vapid-keys
```

Generates a new pair — existing `push_subscriptions` rows tied to the old public key become invalid. Rotate only when actually compromised; otherwise leave alone.

---

## Runbook · database appears empty / broken

1. Lovable Settings → Backend → check status. If yellow/red, wait and re-check.
2. Connections healthy but no rows: check whether the most recent migration applied (Settings → Backend → Migrations).
3. RLS suspicion: a permission error in the browser console with a `HINT` line will tell you which GRANT or policy is missing. Apply the suggested GRANT in a new migration.

---

## Storage cost watch

`episodes` bucket grows ~3 MB/day (8 matches × ~360 KB mp3). At 1k DAU, bandwidth is the variable cost. If costs spike:

- Confirm no infinite-loop hotlinking (someone embedding our mp3s on another site).
- Consider a lifecycle policy: delete episodes older than 60 days. They're a daily product — old episodes aren't replayed.

---

## Escalation

- **Service down / users blocked:** post in the team channel, then status page if we have one.
- **Safety incident (bad recap):** product + legal in the loop within 1h. Use `05-content-safety.md` checklist.
- **Suspected data leak:** rotate every secret in Settings, audit `listens` and `profiles` access logs.
