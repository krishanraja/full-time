import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";

function readArgs(argv) {
  const args = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--require-ready") {
      args.set(value, true);
      continue;
    }
    if (!value.startsWith("--") || index + 1 >= argv.length) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    args.set(value, argv[index + 1]);
    index += 1;
  }
  return args;
}

function isoWeek(date = new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((current - yearStart) / 86_400_000 + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const args = readArgs(process.argv);
const week = args.get("--week") ?? isoWeek();
if (!/^\d{4}-W\d{2}$/.test(week)) {
  throw new Error("--week must use ISO format YYYY-Www.");
}

const root = resolve(
  args.get("--root") ??
    process.env.FULL_TIME_CORPUS_ROOT ??
    join(homedir(), "dev", "full-time", "_corpus", "weekly-intake"),
);
const weekRoot = join(root, week);
const inboxRoot = resolve(weekRoot, "inbox");
const manifestPath = join(weekRoot, "manifest.json");

if (!existsSync(manifestPath)) {
  throw new Error(`Manifest not found: ${manifestPath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
const errors = [];
const warnings = [];
const approved = [];
const seenIds = new Set();
const decisions = new Set(["pending", "approved", "rejected", "quarantined"]);
const allowedUses = new Set([
  "abstract_concepts",
  "paraphrase",
  "quotation",
  "internal_evaluation",
  "commercial_generation",
]);

if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
if (manifest.week !== week) errors.push(`manifest.week must equal ${week}.`);
if (!new Set(["intake", "reviewed", "ready", "quarantined"]).has(manifest.status)) {
  errors.push("status must be intake, reviewed, ready, or quarantined.");
}
if (!Array.isArray(manifest.sources)) errors.push("sources must be an array.");

for (const [index, source] of (manifest.sources ?? []).entries()) {
  const label = source?.sourceId || `sources[${index}]`;
  const requiredText = [
    "sourceId",
    "sourceType",
    "creator",
    "title",
    "permissionBasis",
    "decision",
  ];
  for (const field of requiredText) {
    if (typeof source?.[field] !== "string" || !source[field].trim()) {
      errors.push(`${label}: ${field} is required.`);
    }
  }
  if (seenIds.has(source?.sourceId)) errors.push(`${label}: sourceId must be unique.`);
  if (source?.sourceId) seenIds.add(source.sourceId);
  if (!decisions.has(source?.decision)) errors.push(`${label}: decision is invalid.`);
  if (!Array.isArray(source?.allowedUses) || source.allowedUses.length === 0) {
    errors.push(`${label}: allowedUses must contain at least one permitted use.`);
  } else {
    for (const use of source.allowedUses) {
      if (!allowedUses.has(use)) errors.push(`${label}: unsupported allowed use ${use}.`);
    }
  }

  const localFiles = Array.isArray(source?.localFiles) ? source.localFiles : [];
  if (!source?.sourceUrl && localFiles.length === 0) {
    errors.push(`${label}: provide sourceUrl or at least one localFiles entry.`);
  }

  const files = [];
  for (const localFile of localFiles) {
    if (typeof localFile !== "string" || !localFile.trim()) {
      errors.push(`${label}: localFiles entries must be non-empty strings.`);
      continue;
    }
    if (isAbsolute(localFile) || normalize(localFile).split(/[\\/]/).includes("..")) {
      errors.push(`${label}: local file must stay inside the weekly inbox: ${localFile}`);
      continue;
    }
    const absolute = resolve(inboxRoot, localFile);
    const withinInbox = relative(inboxRoot, absolute);
    if (withinInbox.startsWith("..") || isAbsolute(withinInbox)) {
      errors.push(`${label}: local file escapes the weekly inbox: ${localFile}`);
      continue;
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      errors.push(`${label}: local file does not exist: ${localFile}`);
      continue;
    }
    files.push({ path: localFile, bytes: statSync(absolute).size, sha256: sha256(absolute) });
  }

  if (source?.decision === "approved") {
    if (source.commercialUseAllowed !== true) {
      errors.push(`${label}: approved sources require commercialUseAllowed=true.`);
    }
    if (!source.approvedBy || !source.approvedAt) {
      errors.push(`${label}: approvedBy and approvedAt are required for approved sources.`);
    }
    approved.push({
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      allowedUses: source.allowedUses,
      sourceUrl: source.sourceUrl ?? null,
      files,
    });
  } else if (source?.decision === "pending") {
    warnings.push(`${label}: pending sources are not eligible for synthesis.`);
  }
}

if (args.get("--require-ready")) {
  if (manifest.status !== "ready") errors.push("--require-ready needs manifest.status=ready.");
  if (approved.length === 0) errors.push("--require-ready needs at least one approved source.");
  if ((manifest.sources ?? []).some((source) => source.decision === "pending")) {
    errors.push("--require-ready does not allow pending sources.");
  }
}

const report = {
  schemaVersion: 1,
  week,
  root: weekRoot,
  status: errors.length ? "blocked" : "passed",
  totals: {
    sources: manifest.sources?.length ?? 0,
    approved: approved.length,
    pending: (manifest.sources ?? []).filter((source) => source.decision === "pending").length,
  },
  approved,
  warnings,
  errors,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
