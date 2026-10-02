import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const BACKDROP_ID = "app-backdrop";

/** Draws into the frame-level backdrop behind the header, the screen and
 *  the tab bar (`__root.tsx`), so a screen's light can reach the top of the
 *  phone the way the approved design does. Client-only: before hydration,
 *  and without JavaScript, the ground is plain. */
export function Backdrop({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById(BACKDROP_ID)), []);
  return target ? createPortal(children, target) : null;
}
