import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTodayFeed } from "@/lib/api/feed.functions";
import { supabase } from "@/integrations/supabase/client";

export function useTodayFeed() {
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
  });
}
