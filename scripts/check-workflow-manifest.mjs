import { readFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.join(
  process.cwd(),
  ".vercel",
  "output",
  "functions",
  ".well-known",
  "workflow",
  "v1",
  "manifest.json",
);

const expectedSteps = [
  "claimEditorialRunStep",
  "completeRunStep",
  "finalizeProducedDropStep",
  "generatePunditStep",
  "persistEditorialStep",
  "prepareEditorialStep",
  "producePunditStep",
  "publishDropStep",
  "quarantineEditorialDropStep",
  "selectFeatureMatchStep",
];

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  throw new Error(`Workflow manifest is missing or invalid at ${manifestPath}.`, {
    cause: error,
  });
}

const workflow = manifest.workflows?.["src/workflows/daily-pundit.ts"]?.dailyPunditWorkflow;
const steps = manifest.steps?.["src/workflows/daily-pundit.steps.ts"] ?? {};
const missingSteps = expectedSteps.filter((step) => !steps[step]);

if (!workflow) {
  throw new Error("Production build did not register dailyPunditWorkflow.");
}

if (missingSteps.length > 0) {
  throw new Error(`Production build omitted workflow steps: ${missingSteps.join(", ")}.`);
}

console.log(`Workflow manifest verified: 1 workflow, ${expectedSteps.length} application steps.`);
