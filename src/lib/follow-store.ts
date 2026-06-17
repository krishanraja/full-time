// Local-only follow store. TODO: persist server-side once accounts exist.
import { useSyncExternalStore } from "react";

let followed = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const followStore = {
  toggle(id: string) {
    const next = new Set(followed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    followed = next;
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
