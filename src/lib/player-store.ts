// Real-audio-first player store with simulated-timer fallback when an
// episode has no audio URL yet (pre-AI-pipeline seed data). MediaSession
// metadata + action handlers are wired so lock-screen controls work in
// the installed PWA.

import { useEffect, useSyncExternalStore } from "react";
import type { Episode } from "../data/mockEpisodes";
import { haptic } from "./haptics";

type State = {
  episode: Episode | null;
  isPlaying: boolean;
  progress: number; // 0..1
};

let state: State = { episode: null, isPlaying: false, progress: 0 };
const listeners = new Set<() => void>();
const completedListeners = new Set<(ep: Episode) => void>();
let audioEl: HTMLAudioElement | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
const trackEvent = (name: string, props?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  type Plausible = (event: string, opts?: { props?: Record<string, unknown> }) => void;
  const fn = (window as unknown as { plausible?: Plausible }).plausible;
  if (typeof fn === "function") fn(name, props ? { props } : undefined);
};

function emit() {
  listeners.forEach((l) => l());
}

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "metadata";
    audioEl.addEventListener("timeupdate", () => {
      if (!audioEl || !state.episode || !audioEl.duration) return;
      state = { ...state, progress: audioEl.currentTime / audioEl.duration };
      emit();
    });
    audioEl.addEventListener("ended", () => {
      handleComplete();
    });
    audioEl.addEventListener("pause", () => {
      if (!state.episode) return;
      state = { ...state, isPlaying: false };
      emit();
    });
    audioEl.addEventListener("play", () => {
      if (!state.episode) return;
      state = { ...state, isPlaying: true };
      emit();
    });
  }
  return audioEl;
}

function handleComplete() {
  if (!state.episode) return;
  const ep = state.episode;
  state = { ...state, progress: 1, isPlaying: false };
  stopFallback();
  haptic("success");
  trackEvent("complete", { id: ep.id });
  completedListeners.forEach((l) => l(ep));
  emit();
}

function tick() {
  if (!state.episode || !state.isPlaying) return;
  const step = 1 / (state.episode.durationSec * 4);
  const next = state.progress + step;
  if (next >= 1) {
    handleComplete();
    return;
  }
  state = { ...state, progress: next };
  emit();
}

function startFallback() {
  if (fallbackTimer) return;
  fallbackTimer = setInterval(tick, 250);
}
function stopFallback() {
  if (fallbackTimer) clearInterval(fallbackTimer);
  fallbackTimer = null;
}

function setMediaSession(ep: Episode) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.title,
    artist: `${ep.homeTeam} ${ep.homeScore}–${ep.awayScore} ${ep.awayTeam}`,
    album: `Full Time • ${ep.competition}`,
  });
  navigator.mediaSession.setActionHandler("play", () => playerStore.toggle());
  navigator.mediaSession.setActionHandler("pause", () => playerStore.toggle());
  navigator.mediaSession.setActionHandler("seekbackward", () =>
    playerStore.seek(Math.max(0, state.progress - 0.1)),
  );
  navigator.mediaSession.setActionHandler("seekforward", () =>
    playerStore.seek(Math.min(1, state.progress + 0.1)),
  );
}

export const playerStore = {
  play(ep: Episode) {
    const same = state.episode?.id === ep.id;
    state = {
      episode: ep,
      isPlaying: true,
      progress: same && state.progress < 1 ? state.progress : 0,
    };
    haptic("tap");
    trackEvent("play", { id: ep.id });
    setMediaSession(ep);

    const audio = getAudio();
    if (audio && ep.audioUrl) {
      stopFallback();
      if (!same || audio.src !== ep.audioUrl) {
        audio.src = ep.audioUrl;
        if (audio.duration) audio.currentTime = 0;
      }
      audio.play().catch((err) => {
        console.warn("[player] play failed, falling back to timer", err);
        startFallback();
      });
    } else {
      if (audio) audio.pause();
      startFallback();
    }
    emit();
  },
  toggle() {
    const ep = state.episode;
    if (!ep) return;
    const next = !state.isPlaying;
    state = { ...state, isPlaying: next };
    haptic(next ? "tap" : "soft");
    const audio = getAudio();
    if (audio && ep.audioUrl) {
      if (next) audio.play().catch(() => startFallback());
      else audio.pause();
    } else {
      if (next) startFallback();
      else stopFallback();
    }
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
