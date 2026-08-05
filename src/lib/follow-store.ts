// Follow store: local-first, hydrates from Lovable Cloud when signed in,
// writes through to DB on toggle. Optimistic UI.

import { useSyncExternalStore } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyFollows, toggleFollow } from "@/lib/api/follows.functions";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "full-time:follows";

function loadInitial(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

let followed: Set<string> = loadInitial();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...followed]));
  } catch {
    /* ignore */
  }
}

export const followStore = {
  toggle(id: string) {
    const next = new Set(followed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    followed = next;
    persist();
    emit();
  },
  set(ids: Iterable<string>) {
    followed = new Set(ids);
    persist();
    emit();
  },
  has(id: string) {
    return followed.has(id);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get() {
    return followed;
  },
};

export function useFollowed() {
  return useSyncExternalStore(
    (l) => followStore.subscribe(l),
    () => followed,
    () => followed,
  );
}

// Parses "team:ars" or "league:epl" used by FollowButton ids.
function parseId(id: string): { entityType: "team" | "league"; entityId: string } | null {
  if (id.startsWith("league:")) return { entityType: "league", entityId: id.slice(7) };
  if (id.startsWith("team:")) return { entityType: "team", entityId: id.slice(5) };
  // legacy: bare team id
  return { entityType: "team", entityId: id };
}

// Hook: keeps DB follows in sync for authenticated users.
export function useFollowSync() {
  const { user } = useAuth();
  const fetchFollows = useServerFn(getMyFollows);
  useEffect(() => {
    if (!user) return;
    fetchFollows()
      .then((ids) => {
        const normalized = ids.map((i) => i); // already "team:..." / "league:..."
        followStore.set(normalized);
      })
      .catch((e) => console.warn("[follows] hydrate failed", e));
  }, [user, fetchFollows]);
}

export function useToggleFollow() {
  const { user } = useAuth();
  const toggle = useServerFn(toggleFollow);
  return (id: string) => {
    const parsed = parseId(id);

    // Analytics fires here, not in `FollowButton`, because this hook is the one
    // chokepoint every follow toggle passes through, the same way `play` and
    // `complete` fire from `player-store.ts` rather than the player UI.
    //
    // It fires at the point of intent, before the optimistic write and before
    // the server round-trip, for two reasons. Anonymous users never reach the
    // server call below and their follows are still a real personalisation
    // signal, so gating on a server response would silently under-count them.
    // And `followStore.has` has to be read before the toggle flips it, or the
    // direction would be inverted. The trade is that a failed server write that
    // rolls back still leaves one event behind; that is rare, and this measures
    // the user action rather than the row count.
    //
    // Follow and unfollow share one event with an `action` discriminator rather
    // than splitting into two names. See `docs/09-growth.md`.
    if (parsed) {
      track("follow", {
        entity_type: parsed.entityType,
        entity_id: parsed.entityId,
        action: followStore.has(id) ? "unfollow" : "follow",
      });
    }

    followStore.toggle(id); // optimistic local
    if (!user) return; // anonymous: local only
    if (!parsed) return;
    toggle({ data: parsed }).catch((e) => {
      console.warn("[follows] toggle failed, rolling back", e);
      followStore.toggle(id);
    });
  };
}
