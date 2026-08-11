import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const TARGET_LUFS = -16;
const TARGET_TRUE_PEAK_DB = -1;
const TARGET_LRA = 7;
const MP3_BITRATE = 128_000;

type ProcessResult = { code: number; stdout: string; stderr: string };
export type FfmpegRunner = (binary: string, args: string[]) => Promise<ProcessResult>;

export type MasteredAudioMetrics = {
  integratedLufs: number;
  truePeakDb: number;
  speakingRateWpm: number;
  pauseVariationMs: number;
  dynamicRangeDb: number;
  durationSec: number;
};

export type MasteredAudio = {
  audio: Uint8Array;
  metrics: MasteredAudioMetrics;
  mastering: {
    targetLufs: number;
    targetTruePeakDb: number;
    targetLra: number;
    codec: "mp3";
    bitrate: 128000;
  };
};

export const runFfmpeg: FfmpegRunner = (binary, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("FFmpeg exceeded the 120 second mastering limit."));
    }, 120_000);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });

async function resolveFfmpegBinary() {
  if (process.env.FFMPEG_PATH?.trim()) return process.env.FFMPEG_PATH.trim();
  const imported = await import("ffmpeg-static");
  const binary = imported.default;
  if (!binary) {
    throw new Error(
      "FFmpeg is unavailable for this runtime. Configure FFMPEG_PATH or use a supported production architecture.",
    );
  }
  return binary;
}

export async function concatenateNarrationMp3(input: {
  segments: readonly Uint8Array[];
  runner?: FfmpegRunner;
  binary?: string;
}) {
  if (!input.segments.length || input.segments.some((segment) => !segment.byteLength)) {
    throw new Error("Cannot concatenate missing or empty narration segments.");
  }
  if (input.segments.length === 1) return input.segments[0];
  const runner = input.runner ?? runFfmpeg;
  const binary = input.binary ?? (await resolveFfmpegBinary());
  const directory = await mkdtemp(join(tmpdir(), `full-time-concat-${randomUUID()}-`));
  const outputPath = join(directory, "narration.mp3");
  try {
    const paths: string[] = [];
    for (const [index, segment] of input.segments.entries()) {
      const path = join(directory, `segment-${String(index).padStart(2, "0")}.mp3`);
      await writeFile(path, segment);
      paths.push(path);
    }
    const manifestPath = join(directory, "segments.txt");
    const manifest = paths
      .map((path) => `file '${path.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`)
      .join("\n");
    await writeFile(manifestPath, manifest, "utf8");
    const result = await runner(binary, [
      "-hide_banner",
      "-nostats",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      manifestPath,
      "-codec:a",
      "copy",
      outputPath,
    ]);
    if (result.code !== 0) {
      throw new Error(`FFmpeg narration concatenation failed: ${result.stderr.slice(-600)}`);
    }
    const combined = new Uint8Array(await readFile(outputPath));
    if (!combined.byteLength) throw new Error("FFmpeg produced empty concatenated narration.");
    return combined;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

type LoudnormReport = {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
  output_i?: string;
  output_tp?: string;
  output_lra?: string;
};

function parseLoudnorm(stderr: string): LoudnormReport {
  const matches = [...stderr.matchAll(/\{\s*"input_i"[\s\S]*?\}/g)];
  const raw = matches.at(-1)?.[0];
  if (!raw) throw new Error("FFmpeg did not return a loudness report.");
  const parsed = JSON.parse(raw) as LoudnormReport;
  for (const field of [
    "input_i",
    "input_tp",
    "input_lra",
    "input_thresh",
    "target_offset",
  ] as const) {
    if (!Number.isFinite(Number(parsed[field]))) {
      throw new Error(`FFmpeg loudness report is missing ${field}.`);
    }
  }
  return parsed;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function pauseVariationMs(stderr: string) {
  const durations = [...stderr.matchAll(/silence_duration:\s*([0-9.]+)/g)].map((match) =>
    Number(match[1]),
  );
  return Math.round(standardDeviation(durations) * 1000);
}

export function parseFfmpegDuration(stderr: string) {
  const matches = [...stderr.matchAll(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/g)];
  const match = matches.at(-1);
  if (!match) throw new Error("FFmpeg did not report the mastered audio duration.");
  const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("FFmpeg reported an invalid mastered audio duration.");
  }
  return duration;
}

function wordCount(script: string) {
  return script.trim().split(/\s+/).filter(Boolean).length;
}

function firstPassArgs(inputPath: string) {
  return [
    "-hide_banner",
    "-nostats",
    "-i",
    inputPath,
    "-af",
    `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK_DB}:LRA=${TARGET_LRA}:print_format=json`,
    "-f",
    "null",
    "-",
  ];
}

function secondPassArgs(inputPath: string, outputPath: string, report: LoudnormReport) {
  const filter = [
    `loudnorm=I=${TARGET_LUFS}`,
    `TP=${TARGET_TRUE_PEAK_DB}`,
    `LRA=${TARGET_LRA}`,
    `measured_I=${report.input_i}`,
    `measured_TP=${report.input_tp}`,
    `measured_LRA=${report.input_lra}`,
    `measured_thresh=${report.input_thresh}`,
    `offset=${report.target_offset}`,
    "linear=true",
    "print_format=summary",
  ].join(":");
  return [
    "-hide_banner",
    "-nostats",
    "-y",
    "-i",
    inputPath,
    "-af",
    filter,
    "-ar",
    "44100",
    "-ac",
    "2",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outputPath,
  ];
}

function analysisArgs(inputPath: string) {
  const filters = [
    `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK_DB}:LRA=${TARGET_LRA}:print_format=json`,
    "silencedetect=noise=-38dB:d=0.12",
  ].join(",");
  return ["-hide_banner", "-nostats", "-i", inputPath, "-af", filters, "-f", "null", "-"];
}

export async function masterNarrationAudio(input: {
  audio: Uint8Array;
  script: string;
  runner?: FfmpegRunner;
  binary?: string;
}): Promise<MasteredAudio> {
  if (!input.audio.byteLength) throw new Error("Cannot master an empty audio file.");
  const runner = input.runner ?? runFfmpeg;
  const binary = input.binary ?? (await resolveFfmpegBinary());
  const directory = await mkdtemp(join(tmpdir(), `full-time-audio-${randomUUID()}-`));
  const sourcePath = join(directory, "source.mp3");
  const masteredPath = join(directory, "mastered.mp3");

  try {
    await writeFile(sourcePath, input.audio);
    const first = await runner(binary, firstPassArgs(sourcePath));
    if (first.code !== 0) {
      throw new Error(`FFmpeg loudness analysis failed: ${first.stderr.slice(-600)}`);
    }
    const report = parseLoudnorm(first.stderr);
    const second = await runner(binary, secondPassArgs(sourcePath, masteredPath, report));
    if (second.code !== 0) {
      throw new Error(`FFmpeg mastering failed: ${second.stderr.slice(-600)}`);
    }
    const mastered = new Uint8Array(await readFile(masteredPath));
    if (!mastered.byteLength) throw new Error("FFmpeg produced an empty mastered file.");

    const analysis = await runner(binary, analysisArgs(masteredPath));
    if (analysis.code !== 0) {
      throw new Error(`FFmpeg mastered-audio verification failed: ${analysis.stderr.slice(-600)}`);
    }
    const measured = parseLoudnorm(analysis.stderr);
    const durationSec = parseFfmpegDuration(analysis.stderr);
    const speakingRateWpm = wordCount(input.script) / (durationSec / 60);

    return {
      audio: mastered,
      metrics: {
        integratedLufs: Number(measured.input_i),
        truePeakDb: Number(measured.input_tp),
        speakingRateWpm,
        pauseVariationMs: pauseVariationMs(analysis.stderr),
        dynamicRangeDb: Number(measured.input_lra),
        durationSec,
      },
      mastering: {
        targetLufs: TARGET_LUFS,
        targetTruePeakDb: TARGET_TRUE_PEAK_DB,
        targetLra: TARGET_LRA,
        codec: "mp3",
        bitrate: MP3_BITRATE,
      },
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
