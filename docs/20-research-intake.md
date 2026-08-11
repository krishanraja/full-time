# 20 - Weekly research intake

- **Status:** Current operating contract
- **Owner:** Founder, editorial, and data
- **Purpose:** Give Krish one private weekly drop location that agents can audit and fetch without mixing unverified material into the production corpus.
- **Last reviewed:** 2026-08-11

## The drop location

Use this private local root:

```text
C:\Users\krish\dev\full-time\_corpus\weekly-intake\YYYY-Www\
```

Source files remain outside the public Git repository. The repository contains only the manifest schema, validation script, and this runbook. [`.gitignore`](../.gitignore) also rejects an accidental repository-local `_corpus` directory.

Create or reopen the current ISO week with:

```powershell
pnpm research:new-week
```

Create a particular week with:

```powershell
pnpm research:new-week -- -Week 2026-W33
```

The command is idempotent. It creates:

```text
2026-W33/
  README.md
  manifest.json
  inbox/
  reviewed/
  quarantine/
  receipts/
```

## Krish's weekly action

1. Put each approved source file in `inbox/`. A URL-only source needs no local file.
2. Add one object per source to `manifest.json`.
3. Record the actual rights basis and permitted uses. Watching, buying, or subscribing to content is not automatically commercial reuse permission.
4. Set `decision` to `approved`, `rejected`, `quarantined`, or `pending`.
5. When the week is complete, set the manifest `status` to `ready` and tell Codex: `ingest research week YYYY-Www`.

Do not place access tokens, passwords, API keys, private personal information, or unrelated customer data in the folder or manifest.

## Source record

Use this shape inside `sources`:

```json
{
  "sourceId": "2026-W33-example-01",
  "sourceType": "youtube",
  "creator": "Creator or publisher",
  "title": "Source title",
  "sourceUrl": "https://example.com/source",
  "localFiles": ["example-transcript.txt"],
  "permissionBasis": "Written creator permission dated 2026-08-10",
  "allowedUses": ["abstract_concepts", "internal_evaluation"],
  "commercialUseAllowed": true,
  "quotationAllowed": false,
  "attribution": "Required attribution, or none",
  "decision": "approved",
  "approvedBy": "Krish Raja",
  "approvedAt": "2026-08-11T12:00:00Z",
  "expiresAt": null,
  "notes": "Optional limits or context"
}
```

Allowed-use values are:

- `abstract_concepts`
- `paraphrase`
- `quotation`
- `internal_evaluation`
- `commercial_generation`

Permission to use abstract analytical techniques does not grant quotation, imitation, voice cloning, or source-language reuse.

## Agent fetch contract

Before synthesis, the agent runs:

```powershell
pnpm research:audit -- --week 2026-W33 --require-ready
```

The audit blocks:

- missing or duplicate source IDs;
- missing rights or approval fields;
- approved sources without explicit commercial permission;
- unrecognized uses or decisions;
- missing local files;
- absolute paths or path traversal outside the weekly inbox;
- a supposedly ready week containing pending sources.

For every local file, the audit reports byte size and SHA-256. These become the reproducibility receipt when source metadata is added to `research_sources`.

After a passing audit, the research workflow may:

1. create or update source metadata without copying prohibited language;
2. extract analytical techniques, evidence patterns, explanation methods, decision-versus-outcome examples, prediction structures, humour mechanisms, and common failures;
3. draft original `ConceptCard` records with source links;
4. run overlap and originality checks;
5. place failed or ambiguous items in quarantine;
6. wait for Krish's acceptance before any card enters the active pundit corpus.

No general YouTube transcript scraper is permitted. NotebookLM or another research workbench may assist with rights-approved sources, but it is never the production writer or match-evidence source.

## Storage evolution

The local intake is usable immediately and does not depend on production credentials. A private Supabase Storage intake bucket may replace or mirror it after the official connector is authorized for project `hzadscrqmyilbisexvyz`. That change requires a separately reviewed migration, private bucket policy, upload identity, retention rule, and verified readback; source files must never be placed in a public bucket.

## Recovery

- An incorrect manifest can be repaired before ingestion.
- Rejected or ambiguous material moves to `quarantine/`; it is not silently deleted.
- Accepted source files and concept cards keep their hashes and provenance.
- Revoked or expired rights disable future use without rewriting historical audit records.
- A failed weekly audit changes no production tables and publishes nothing.
