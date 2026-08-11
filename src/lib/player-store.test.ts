import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Episode } from "@/data/mockEpisodes";

type Listener = { callback: EventListener; once: boolean };

class FakeAudio {
  static rejectNextPlay = false;
  src = "";
  preload = "";
  muted = false;
  playbackRate = 1;
  currentTime = 0;
  duration = 360;
  private listeners = new Map<string, Listener[]>();

  addEventListener(
    type: string,
    callback: EventListener,
    options?: AddEventListenerOptions | boolean,
  ) {
    const once = typeof options === "object" && Boolean(options.once);
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), { callback, once }]);
  }

  removeEventListener(type: string, callback: EventListener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((listener) => listener.callback !== callback),
    );
  }

  private emit(type: string) {
    const current = this.listeners.get(type) ?? [];
    for (const listener of current) listener.callback(new Event(type));
    this.listeners.set(
      type,
      current.filter((listener) => !listener.once),
    );
  }

  load() {
    queueMicrotask(() => this.emit("canplay"));
  }

  play() {
    if (FakeAudio.rejectNextPlay) {
      FakeAudio.rejectNextPlay = false;
      return Promise.reject(new Error("fixture load failed"));
    }
    queueMicrotask(() => this.emit("play"));
    return Promise.resolve();
  }

  pause() {
    this.emit("pause");
  }

  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
}

const episode = (id: string): Episode => ({
  id,
  title: `Show ${id}`,
  hook: "Checked facts.",
  homeTeam: "Full Time",
  awayTeam: "AI Pundit",
  homeScore: 0,
  awayScore: 0,
  competition: "AI Pundit show",
  durationSec: 360,
  audioUrl: `https://audio.example/${id}.mp3`,
  format: "daily",
});

describe("transactional AI Pundit switching", () => {
  beforeAll(() => {
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
      posthog: { capture: vi.fn() },
    });
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("Audio", FakeAudio);
  });

  afterAll(() => vi.unstubAllGlobals());

  it("keeps the old playable show when the candidate fails, then commits only after success", async () => {
    const { playerStore } = await import("./player-store");
    const oldShow = episode("old");
    const newShow = episode("new");
    playerStore.play(oldShow, [oldShow]);
    await Promise.resolve();
    expect(playerStore.get().episode?.id).toBe("old");

    FakeAudio.rejectNextPlay = true;
    await expect(playerStore.switchEpisode(newShow, { autoplay: true })).rejects.toThrow(
      "fixture load failed",
    );
    expect(playerStore.get().episode?.id).toBe("old");
    expect(playerStore.get().isPlaying).toBe(true);

    await playerStore.switchEpisode(newShow, { autoplay: false });
    expect(playerStore.get()).toMatchObject({
      episode: { id: "new" },
      isPlaying: false,
      progress: 0,
      status: "paused",
    });
  });
});
