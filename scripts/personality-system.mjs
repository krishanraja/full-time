import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  exportPersonalityCore,
  personalityChangeScope,
} from "../src/lib/pundit/personality/registry.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2] ?? "check";
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
try {
  const revision = git("rev-parse", "HEAD");
  const core = await exportPersonalityCore(revision);
  if (command === "export") {
    if (
      git(
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        "src/lib/pundit/personality",
        "scripts/personality-system.mjs",
      )
    ) {
      throw new Error("Commit the personality core before exporting a source-revision pin.");
    }
    if (!process.argv[3]) throw new Error("An explicit export destination is required.");
    const output = resolve(process.argv[3]);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(core, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    console.log(
      JSON.stringify({
        release: core.release.id,
        profiles: core.profiles.length,
        output,
        generationCalls: 0,
      }),
    );
  } else if (command === "check") {
    const base = process.argv[3];
    if (base) {
      const changes = git(
        "diff",
        "--name-status",
        base,
        "--",
        "src/lib/pundit/personality/profiles",
        "src/lib/pundit/personality/shared",
      );
      if (
        changes
          .split("\n")
          .filter(Boolean)
          .some((line) => !line.startsWith("A\t"))
      ) {
        throw new Error(
          "Existing personality version files are immutable. Add a new version instead of modifying or deleting one.",
        );
      }
      let previous;
      if (git("ls-tree", "--name-only", base, "src/lib/pundit/personality/release.json")) {
        previous = JSON.parse(git("show", `${base}:src/lib/pundit/personality/release.json`));
      }
      console.log(JSON.stringify(personalityChangeScope(previous, core.release)));
    }
    console.log(
      JSON.stringify({
        status: "valid",
        release: core.release.id,
        profiles: core.profiles.length,
        generationCalls: 0,
        humanQuality: "not measured by this check",
      }),
    );
  } else throw new Error("Expected check or export.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Personality check failed.");
  process.exitCode = 1;
}
