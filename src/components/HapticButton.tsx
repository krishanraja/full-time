import { forwardRef, type ButtonHTMLAttributes } from "react";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  hapticPattern?: "tap" | "soft" | "double" | "success" | "swipe";
};

export const HapticButton = forwardRef<HTMLButtonElement, Props>(function HapticButton(
  { hapticPattern = "tap", onClick, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      onClick={(e) => {
        haptic(hapticPattern);
        onClick?.(e);
      }}
      className={cn("tap select-none active:scale-[0.97] transition-transform", className)}
      {...rest}
    >
      {children}
    </button>
  );
});
