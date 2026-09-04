import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const readTarget = (path) => {
  const absolute = resolve(root, path);
  if (!statSync(absolute).isDirectory()) return read(path);
  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((item) => item.isFile())
    .filter((item) => /\.(?:ts|tsx|js|jsx|md|txt)$/.test(item.name))
    .map((item) => readFileSync(resolve(item.parentPath, item.name), "utf8"))
    .join("\n");
};
const failures = [];
const requireText = (path, pattern, note) => {
  const value = readTarget(path);
  if (!pattern.test(value)) failures.push(`${path}: ${note}`);
};
const forbidText = (path, pattern, note) => {
  const value = readTarget(path);
  if (pattern.test(value)) failures.push(`${path}: ${note}`);
};

const statePath = "docs/product-state.json";
let state;
try {
  state = JSON.parse(read(statePath));
} catch (error) {
  failures.push(`${statePath}: invalid JSON (${error instanceof Error ? error.message : error})`);
}

if (state) {
  if (state.schemaVersion !== 1) failures.push(`${statePath}: unsupported schemaVersion`);
  if (state.asOf !== "2026-09-04")
    failures.push(`${statePath}: asOf must match this reconciliation`);
  if (state.product?.lifecycle !== "live-beta") failures.push(`${statePath}: lifecycle drifted`);
  if (
    state.product?.publicNavigation?.map((item) => item.label).join(",") !== "Today,Teams,Settings"
  ) {
    failures.push(`${statePath}: public navigation must be Today, Teams, Settings`);
  }
  if (state.aiPundits?.length !== 6) failures.push(`${statePath}: exactly six AI Pundits required`);
}

const currentDocs = [
  "docs/00-product.md",
  "docs/01-brand.md",
  "docs/02-developer.md",
  "docs/03-architecture.md",
  "docs/04-data-model.md",
  "docs/05-content-safety.md",
  "docs/06-ops.md",
  "docs/07-marketing.md",
  "docs/08-sales.md",
  "docs/09-growth.md",
  "docs/10-support.md",
  "docs/11-legal.md",
  "docs/12-roadmap.md",
  "docs/13-agent-handoff.md",
  "docs/18-world-class-pundit-system.md",
  "docs/19-release-state.md",
  "docs/20-research-intake.md",
  "docs/21-go-to-market-agent.md",
];

for (const path of currentDocs) {
  if (!existsSync(resolve(root, path))) {
    failures.push(`${path}: missing current document`);
    continue;
  }
  requireText(path, /\*\*Status:\*\*/, "missing Status field");
  requireText(path, /\*\*Owner:\*\*/, "missing Owner field");
  requireText(path, /\*\*Purpose:\*\*/, "missing Purpose field");
  // 2026-08-11 was the full handbook reconciliation. 2026-09-04 is the founder
  // launch override; only the documents that changed carry that date.
  requireText(
    path,
    /\*\*Last (?:reviewed|verified):\*\* 2026-0(?:8-11|9-04)/,
    "review date is stale",
  );
}

for (const path of [
  "README.md",
  "docs/00-product.md",
  "docs/01-brand.md",
  "docs/07-marketing.md",
  "docs/08-sales.md",
  "docs/10-support.md",
  "docs/13-agent-handoff.md",
  "docs/21-go-to-market-agent.md",
]) {
  forbidText(path, /AI[- ]character/gi, "public terminology must use AI Pundit");
  forbidText(path, /Big Five leagues, about 60 seconds/gi, "legacy product claim remains");
}

requireText(
  "src/components/BottomNav.tsx",
  /label: "Today"[\s\S]*label: "Teams"[\s\S]*label: "Settings"/,
  "three-tab navigation drifted",
);
requireText(
  "src/routes/feed.tsx",
  /redirect\(\{ to: "\/", replace: true \}\)/,
  "/feed must redirect to Today",
);
requireText(
  "src/components/TodayShowPlayer.tsx",
  /AI Pundit/,
  "Today must use AI Pundit terminology",
);
forbidText("src", /AI Character/gi, "AI Character remains in public source");

const docsIndex = read("docs/README.md");
for (const path of [...currentDocs, "docs/product-state.json"]) {
  const name = path.replace("docs/", "");
  if (!docsIndex.includes(name)) failures.push(`docs/README.md: missing ${name}`);
}

const markdownFiles = [
  "README.md",
  "src/routes/README.md",
  ...readdirSync(resolve(root, "docs"), { recursive: true })
    .map(String)
    .filter((path) => path.endsWith(".md"))
    .map((path) => `docs/${path.replaceAll("\\", "/")}`),
];

for (const path of markdownFiles) {
  const absolute = resolve(root, path);
  const content = readFileSync(absolute, "utf8");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    target = target.split("#", 1)[0].split("?", 1)[0];
    if (!target) continue;
    const resolved = resolve(dirname(absolute), decodeURIComponent(target));
    if (!existsSync(resolved)) {
      failures.push(`${path}: broken relative link ${match[1]}`);
    }
  }
}

const routeMap = read("src/routes/README.md");
const routeFiles = readdirSync(resolve(root, "src/routes"), { recursive: true })
  .map(String)
  .filter((path) => /\.(?:ts|tsx)$/.test(path))
  .filter((path) => !path.endsWith("routeTree.gen.ts"));

for (const file of routeFiles) {
  const absolute = resolve(root, "src/routes", file);
  const content = readFileSync(absolute, "utf8");
  const match = content.match(/createFileRoute\("([^"]+)"\)/);
  if (!match) continue;
  const documentedPath = match[1].replace(/\/\$([^/]+)/g, "/:$1");
  if (!routeMap.includes(documentedPath)) {
    failures.push(
      `src/routes/README.md: missing route ${documentedPath} from ${relative(root, absolute)}`,
    );
  }
}

if (failures.length) {
  console.error("Documentation reconciliation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Documentation matches the AI-native product contract.");
