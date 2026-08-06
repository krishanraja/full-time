import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTodayFeed } from "@/lib/api/feed.functions";
import { supabase } from "@/integrations/supabase/client";

export type TodayFeed = Awaited<ReturnType<typeof getTodayFeed>>;

// `initialData` is the server-rendered payload handed down by the route
// loader. Passing it means the very first render (on the server, and again
// on hydration) has real episodes instead of a skeleton, which is what puts
// the actual match copy into the HTML that crawlers and AI agents read.
// Without it React Query would start empty and the SSR'd body would be nav
// chrome only.
export function useTodayFeed(initialData?: TodayFeed) {
  const fetchFeed = useServerFn(getTodayFeed);
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase
      .channel("episodes-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "episodes" },
        () => qc.invalidateQueries({ queryKey: ["today-feed"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["today-feed"],
    queryFn: () => fetchFeed(),
    staleTime: 30_000,
    ...(initialData ? { initialData } : {}),
  });
}
