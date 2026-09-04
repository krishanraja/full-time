// Copies the ffmpeg-static package (index.js, package.json and the ffmpeg
// binary) into the Vercel server function so audio mastering can run there.
//
// ffmpeg-static is an optional dependency that is marked external in the
// server bundle and loaded lazily, so Nitro's file tracing never sees it. The
// Build Output API accepts any files placed inside the function directory, and
// `import("ffmpeg-static")` resolves from /var/task/node_modules at runtime.
import { chmodSync, copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const functionDir = resolve(root, ".vercel/output/functions/__server.func");

if (!existsSync(functionDir)) {
  console.log("ffmpeg-static: no Vercel server function output; nothing to copy.");
  process.exit(0);
}

let packageJsonPath;
try {
  packageJsonPath = createRequire(join(root, "package.json")).resolve("ffmpeg-static/package.json");
} catch {
  if (process.platform === "linux") {
    console.error("ffmpeg-static is not installed; the production build cannot master audio.");
    process.exit(1);
  }
  console.warn("ffmpeg-static is not installed on this platform; skipping copy.");
  process.exit(0);
}

const source = dirname(packageJsonPath);
const binary = join(source, "ffmpeg");
if (!existsSync(binary) || statSync(binary).size < 1_000_000) {
  console.error(`ffmpeg-static binary is missing or truncated at ${binary}.`);
  process.exit(1);
}

const target = join(functionDir, "node_modules", "ffmpeg-static");
mkdirSync(target, { recursive: true });
for (const name of ["package.json", "index.js", "ffmpeg"]) {
  copyFileSync(join(source, name), join(target, name));
}
chmodSync(join(target, "ffmpeg"), 0o755);
console.log(`ffmpeg-static copied into ${target} (${statSync(binary).size} bytes).`);
