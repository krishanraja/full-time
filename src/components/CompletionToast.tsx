import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useState } from "react";
import { useOnComplete } from "../lib/player-store";

export function CompletionToast({ children }: { children?: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  useOnComplete((ep) => {
    setMsg(`Done • ${ep.homeTeam} ${ep.homeScore}–${ep.awayScore} ${ep.awayTeam}`);
    setTimeout(() => setMsg(null), 2200);
  });
  return (
    <>
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed inset-x-0 top-3 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg"
          >
            ✓ {msg}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
