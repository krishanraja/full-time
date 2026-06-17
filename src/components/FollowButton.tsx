import { useFollowed } from "../lib/follow-store";
import { useToggleFollow } from "../lib/follow-store";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { HapticButton } from "./HapticButton";
import { cn } from "../lib/utils";

export function FollowButton({ id, label }: { id: string; label?: string }) {
  const followed = useFollowed();
  const toggle = useToggleFollow();
  const on = followed.has(id);
  return (
    <HapticButton
      hapticPattern={on ? "soft" : "double"}
      onClick={() => toggle(id)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold",
        on
          ? "bg-primary text-primary-foreground"
          : "border border-white/15 bg-transparent text-foreground",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {on ? (
          <motion.span
            key="c"
            initial={{ scale: 0.4, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.4 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span
            key="p"
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.4 }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
      <span>{on ? "Following" : (label ?? "Follow")}</span>
    </HapticButton>
  );
}
