// Real-audio-only player store. A missing or rejected media source is an
// explicit listener-visible error. Progress and completion only come from the
// media element, so silence can never be counted as a listen.

import { useEffect, useSyncExternalStore } from "react";
import type { Episode } from "../data/mockEpisodes";
import { haptic } from "./haptics";
import { track } from "./analytics";

type State = {
  episode: Episode | null;
  isPlaying: boolean;
  progress: number; // 0..1
  status: "idle" | "loading" | "playing" | "paused" | "error" | "ended";
  error: string | null;
  playbackRate: number;
};

let state: State = {
  episode: null,
  isPlaying: false,
  progress: 0,
  status: "idle",
  error: null,
  playbackRate: 1,
};
const listeners = new Set<() => void>();
const completedListeners = new Set<(ep: Episode) => void>();
let audioEl: HTMLAudioElement | null = null;
// The "drop": a queue the player advances through so listening is continuous
// and hands-busy, instead of one tap per clip.
let queue: Episode[] = [];
let queueIndex = 0;

function nextInQueue(): Episode | null {
  if (queueIndex >= 0 && queueIndex + 1 < queue.length) return queue[queueIndex + 1];
  return null;
}
function prevInQueue(): Episode | null {
  if (queueIndex > 0 && queue.length) return queue[queueIndex - 1];
  return null;
}
function emit() {
  listeners.forEach((l) => l());
}

function wireAudio(audio: HTMLAudioElement) {
  audio.addEventListener("timeupdate", () => {
    if (audioEl !== audio || !state.episode || !audio.duration) return;
    state = { ...state, progress: audio.currentTime / audio.duration };
    emit();
  });
  audio.addEventListener("ended", () => {
    if (audioEl === audio) handleComplete();
  });
  audio.addEventListener("waiting", () => {
    if (audioEl !== audio || !state.episode) return;
    state = { ...state, isPlaying: false, status: "loading" };
    emit();
  });
  audio.addEventListener("error", () => {
    if (audioEl === audio) {
      failPlayback("This show could not be loaded. Check your connection and try again.");
    }
  });
  audio.addEventListener("pause", () => {
    if (audioEl !== audio || !state.episode) return;
    if (state.status !== "ended" && state.status !== "error") {
      state = { ...state, isPlaying: false, status: "paused" };
    }
    emit();
  });
  audio.addEventListener("play", () => {
    if (audioEl !== audio) return;
    const episodeId = state.episode?.id;
    if (!episodeId) return;
    state = { ...state, isPlaying: true, status: "playing", error: null };
    track("play_started", { id: episodeId });
    emit();
  });
}

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "metadata";
    wireAudio(audioEl);
  }
  return audioEl;
}

function waitForReady(audio: HTMLAudioElement) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => finish(new Error("The new show took too long to load.")),
      15_000,
    );
    const onReady = () => finish();
    const onError = () => finish(new Error("The new show could not be loaded."));
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
      if (error) reject(error);
      else resolve();
    };
    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();
  });
}

function playWithTimeout(audio: HTMLAudioElement) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("The new show took too long to load.")),
      15_000,
    );
    audio.play().then(
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function handleComplete() {
  if (!state.episode) return;
  const ep = state.episode;
  state = { ...state, progress: 1, isPlaying: false, status: "ended", error: null };
  haptic("success");
  track("listen_completed", { id: ep.id });
  completedListeners.forEach((l) => l(ep));
  emit();
  // Auto-advance the drop: play the next recap so a hands-busy listener
  // keeps going without touching the phone.
  const nxt = nextInQueue();
  if (nxt) playerStore.play(nxt, queue);
}

function failPlayback(message: string) {
  const id = state.episode?.id;
  state = { ...state, isPlaying: false, status: "error", error: message };
  if (id) track("playback_error", { id, message });
  emit();
}

function setMediaSession(ep: Episode) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  if (ep.format === "daily") {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ep.title,
      artist: `${ep.punditName ?? "Full Time"} edition`,
      album: "Full Time morning drop",
    });
    navigator.mediaSession.setActionHandler("play", () => playerStore.toggle());
    navigator.mediaSession.setActionHandler("pause", () => playerStore.toggle());
    navigator.mediaSession.setActionHandler("seekbackward", () => playerStore.skip(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => playerStore.skip(15));
    navigator.mediaSession.setActionHandler("nexttrack", () => playerStore.next());
    navigator.mediaSession.setActionHandler("previoustrack", () => playerStore.prev());
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.title,
    artist: `${ep.homeTeam} ${ep.homeScore}–${ep.awayScore} ${ep.awayTeam}`,
    album: `Full Time • ${ep.competition}`,
  });
  navigator.mediaSession.setActionHandler("play", () => playerStore.toggle());
  navigator.mediaSession.setActionHandler("pause", () => playerStore.toggle());
  navigator.mediaSession.setActionHandler("seekbackward", () => playerStore.skip(-15));
  navigator.mediaSession.setActionHandler("seekforward", () => playerStore.skip(15));
  navigator.mediaSession.setActionHandler("nexttrack", () => playerStore.next());
  navigator.mediaSession.setActionHandler("previoustrack", () => playerStore.prev());
}

export const playerStore = {
  async switchEpisode(ep: Episode, options: { autoplay: boolean }) {
    if (typeof window === "undefined" || !ep.audioUrl) {
      throw new Error("Audio is not available for this show yet.");
    }
    if (state.episode?.id === ep.id) {
      if (options.autoplay && !state.isPlaying) this.toggle();
      else if (!options.autoplay && state.isPlaying) getAudio()?.pause();
      this.seek(0);
      return;
    }

    const candidate = new Audio();
    candidate.preload = "auto";
    candidate.src = ep.audioUrl;
    candidate.playbackRate = state.playbackRate;
    candidate.currentTime = 0;
    try {
      if (options.autoplay) {
        candidate.muted = true;
        await playWithTimeout(candidate);
      } else {
        await waitForReady(candidate);
      }
    } catch (error) {
      candidate.pause();
      candidate.removeAttribute("src");
      throw error instanceof Error ? error : new Error("The new show could not be loaded.");
    }

    const previous = audioEl;
    if (previous) previous.pause();
    audioEl = candidate;
    wireAudio(candidate);
    queue = [ep];
    queueIndex = 0;
    candidate.currentTime = 0;
    candidate.muted = false;
    state = {
      episode: ep,
      isPlaying: options.autoplay,
      progress: 0,
      status: options.autoplay ? "playing" : "paused",
      error: null,
      playbackRate: state.playbackRate,
    };
    setMediaSession(ep);
    track("pundit_switch_committed", { id: ep.id, autoplay: options.autoplay });
    emit();
  },
  // q: the drop to play through. When given, playback auto-advances through it.
  play(ep: Episode, q?: Episode[]) {
    if (q && q.length) {
      queue = q;
      const i = q.findIndex((e) => e.id === ep.id);
      queueIndex = i >= 0 ? i : 0;
    } else {
      const i = queue.findIndex((e) => e.id === ep.id);
      if (i >= 0) queueIndex = i;
      else {
        queue = [ep];
        queueIndex = 0;
      }
    }
    const same = state.episode?.id === ep.id;
    state = {
      episode: ep,
      isPlaying: false,
      progress: same && state.progress < 1 ? state.progress : 0,
      status: "loading",
      error: null,
      playbackRate: state.playbackRate,
    };
    haptic("tap");
    track("play_intent", { id: ep.id });
    setMediaSession(ep);

    const audio = getAudio();
    if (audio && ep.audioUrl) {
      if (!same || audio.src !== ep.audioUrl) {
        audio.src = ep.audioUrl;
        audio.currentTime = 0;
      }
      audio.playbackRate = state.playbackRate;
      audio.play().catch((err) => {
        console.warn("[player] play failed", err);
        failPlayback("Playback was blocked or the audio is unavailable. Tap to retry.");
      });
    } else {
      if (audio) audio.pause();
      failPlayback("Audio is not available for this episode yet.");
    }
    emit();
  },
  // Start the whole morning drop from the top.
  playAll(list: Episode[]) {
    if (list.length) this.play(list[0], list);
  },
  next() {
    const n = nextInQueue();
    if (n) this.play(n, queue);
  },
  prev() {
    const p = prevInQueue();
    if (p) this.play(p, queue);
  },
  toggle() {
    const ep = state.episode;
    if (!ep) return;
    const audio = getAudio();
    if (!audio || !ep.audioUrl) {
      failPlayback("Audio is not available for this episode yet.");
      return;
    }
    if (state.isPlaying) {
      haptic("soft");
      audio.pause();
      return;
    }
    haptic("tap");
    state = { ...state, status: "loading", error: null };
    emit();
    audio
      .play()
      .catch(() => failPlayback("Playback was blocked or the audio is unavailable. Tap to retry."));
  },
  skip(seconds: number) {
    const audio = getAudio();
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  },
  setPlaybackRate(rate: number) {
    const allowed = [0.75, 1, 1.25, 1.5, 2];
    const next = allowed.includes(rate) ? rate : 1;
    state = { ...state, playbackRate: next };
    const audio = getAudio();
    if (audio) audio.playbackRate = next;
    emit();
  },
  seek(p: number) {
    const ep = state.episode;
    if (!ep) return;
    const clamped = Math.max(0, Math.min(1, p));
    state = { ...state, progress: clamped };
    const audio = getAudio();
    if (audio && ep.audioUrl && audio.duration) {
      audio.currentTime = clamped * audio.duration;
    }
    emit();
  },
  onComplete(cb: (ep: Episode) => void) {
    completedListeners.add(cb);
    return () => {
      completedListeners.delete(cb);
    };
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get() {
    return state;
  },
};

function subscribe(l: () => void) {
  return playerStore.subscribe(l);
}
function getSnapshot() {
  return state;
}
function getServerSnapshot() {
  return state;
}

export function usePlayer() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useOnComplete(cb: (ep: Episode) => void) {
  useEffect(() => playerStore.onComplete(cb), [cb]);
}
