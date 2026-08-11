import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hasClientSupabaseConfig } from "@/lib/supabase-availability";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!hasClientSupabaseConfig()) {
      setError("Sign-in is unavailable in this environment.");
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    const timeout = window.setTimeout(() => {
      if (!mounted) return;
      setError("Sign-in status took too long to load.");
      setLoading(false);
    }, 8_000);
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load sign-in status.");
      })
      .finally(() => {
        if (!mounted) return;
        window.clearTimeout(timeout);
        setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setError(null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user as User | undefined, loading, error };
}
