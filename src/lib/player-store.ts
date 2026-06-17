// Minimal global player state. No external state lib — just a tiny pub/sub
// so the MiniPlayer can sit in __root and any screen can control it.
// TODO: replace simulated timer with real <audio> element + streaming URL.

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
let timer: ReturnType<typeof setInterval> | null = null;
const completedListeners = new Set<(ep: Episode) => void>();

function emit() {
  listeners.forEach((l) => l());
}

function tick() {
  if (!state.episode || !state.isPlaying) return;
  const step = 1 / (state.episode.durationSec * 4); // 4 ticks/sec feel
  const next = state.progress + step;
  if (next >= 1) {
    const ep = state.episode;
    state = { ...state, progress: 1, isPlaying: false };
    stopTimer();
    haptic("success");
    completedListeners.forEach((l) => l(ep));
    emit();
    return;
  }
  state = { ...state, progress: next };
  emit();
}

function startTimer() {
  if (timer) return;
  timer = setInterval(tick, 250);
}
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
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
    startTimer();
    emit();
  },
  toggle() {
    if (!state.episode) return;
    state = { ...state, isPlaying: !state.isPlaying };
    haptic(state.isPlaying ? "tap" : "soft");
    if (state.isPlaying) startTimer();
    else stopTimer();
    emit();
  },
  seek(p: number) {
    if (!state.episode) return;
    state = { ...state, progress: Math.max(0, Math.min(1, p)) };
    emit();
  },
  onComplete(cb: (ep: Episode) => void) {
    completedListeners.add(cb);
    return () => completedListeners.delete(cb);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
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
