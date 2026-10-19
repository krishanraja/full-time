import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

// Ruling (Krish, 2026-10-19): every business site names Mindmaker LLC (USA)
// and Mindmaker Ltd (UK) in a subtle footer note and in its terms and
// privacy. The exact wording is shared across the fleet, so change it here
// and on the legal pages together.
export const COMPANY_NOTE = "Full Time is a Mindmaker LLC company. Mindmaker Ltd in the UK.";

/** The one-line company note, in the smallest muted text the app already uses. */
export function CompanyNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-balance text-[11px] leading-snug text-muted-foreground", className)}>
      {COMPANY_NOTE}
    </p>
  );
}

/**
 * The footer for pages that are allowed to scroll (legal, archive, waitlist,
 * episode and the other legacy routes). Today, Teams and Settings are
 * one-screen tabs (Ruling, Krish, 2026-09-27: no scroll), so they get no
 * footer; Settings carries the note beside its own Privacy and Terms links.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--pitch-line)] pb-4 pt-3 text-[11px] text-muted-foreground">
      <div className="flex gap-4">
        <Link to="/legal/terms" className="inline-flex min-h-11 items-center hover:text-foreground">
          Terms
        </Link>
        <Link
          to="/legal/privacy"
          className="inline-flex min-h-11 items-center hover:text-foreground"
        >
          Privacy
        </Link>
      </div>
      <CompanyNote />
    </footer>
  );
}
