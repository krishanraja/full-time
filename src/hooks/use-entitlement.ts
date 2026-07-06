import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEntitlement } from "@/lib/api/billing.functions";
import type { Entitlement } from "@/lib/entitlement";
import { useAuth } from "./use-auth";

const ANON: Entitlement = { plan: "free", isPro: false, status: null, currentPeriodEnd: null };

export function useEntitlement() {
  const { user } = useAuth();
  const fn = useServerFn(getEntitlement);
  const q = useQuery({
    queryKey: ["entitlement", user?.id ?? "anon"],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  return {
    entitlement: user ? (q.data ?? ANON) : ANON,
    isPro: user ? (q.data?.isPro ?? false) : false,
    loading: !!user && q.isLoading,
    refetch: q.refetch,
  };
}
