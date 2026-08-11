import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const scanner = resolve(process.cwd(), "scripts", "scan-research-drop.mjs");

function temporaryCorpus() {
  const root = mkdtempSync(join(tmpdir(), "full-time-research-"));
  roots.push(root);
  mkdirSync(join(root, "drop"), { recursive: true });
  return root;
}

function scan(root: string) {
  return JSON.parse(
    execFileSync(process.execPath, [scanner, "--root", root], { encoding: "utf8" }),
  ) as {
    week: string;
    accepted: Array<{ sourceId: string; path: string; sha256: string }>;
    duplicates: Array<{ path: string }>;
    quarantined: Array<{ path: string; reason: string }>;
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("automated research intake", () => {
  it("turns a single text-file drop into an approved, provenance-bound manifest record", () => {
    const root = temporaryCorpus();
    writeFileSync(
      join(root, "drop", "pressing-explanation.txt"),
      "A reusable explanation pattern.",
      "utf8",
    );

    const receipt = scan(root);
    expect(receipt.accepted).toHaveLength(1);
    expect(receipt.quarantined).toHaveLength(0);
    expect(existsSync(receipt.accepted[0].path)).toBe(true);

    const manifest = JSON.parse(
      readFileSync(join(root, "weekly-intake", receipt.week, "manifest.json"), "utf8"),
    );
    expect(manifest.status).toBe("ready");
    expect(manifest.sources).toHaveLength(1);
    expect(manifest.sources[0]).toMatchObject({
      decision: "approved",
      commercialUseAllowed: true,
      quotationAllowed: false,
      allowedUses: ["abstract_concepts", "internal_evaluation"],
      sha256: receipt.accepted[0].sha256,
    });
    expect(readdirSync(join(root, "drop")).filter((file) => file.endsWith(".txt"))).toEqual([]);

    writeFileSync(join(root, "drop", "second.txt"), "A second original pattern.", "utf8");
    const secondReceipt = scan(root);
    const updatedManifest = JSON.parse(
      readFileSync(join(root, "weekly-intake", receipt.week, "manifest.json"), "utf8"),
    );
    expect(secondReceipt.accepted).toHaveLength(1);
    expect(updatedManifest.sources).toHaveLength(2);
  });

  it("deduplicates content and quarantines credential-like text without storing the value in receipts", () => {
    const root = temporaryCorpus();
    const original = "A decision-quality framework.";
    writeFileSync(join(root, "drop", "first.txt"), original, "utf8");
    const first = scan(root);

    writeFileSync(join(root, "drop", "duplicate.txt"), original, "utf8");
    writeFileSync(
      join(root, "drop", "unsafe.txt"),
      "VERCEL_TOKEN=unsafe-placeholder-value-123456789",
      "utf8",
    );
    const second = scan(root);

    expect(first.accepted).toHaveLength(1);
    expect(second.accepted).toHaveLength(0);
    expect(second.duplicates).toHaveLength(1);
    expect(second.quarantined).toHaveLength(1);
    expect(second.quarantined[0].reason).toBe("possible credential material detected");

    const receiptText = JSON.stringify(second);
    expect(receiptText).not.toContain("unsafe-placeholder-value");
    expect(existsSync(second.duplicates[0].path)).toBe(true);
    expect(existsSync(second.quarantined[0].path)).toBe(true);

    writeFileSync(join(root, "drop", "duplicate.txt"), original, "utf8");
    const third = scan(root);
    expect(third.duplicates).toHaveLength(1);
    expect(third.duplicates[0].path).not.toBe(second.duplicates[0].path);
    expect(existsSync(third.duplicates[0].path)).toBe(true);
  });
});
