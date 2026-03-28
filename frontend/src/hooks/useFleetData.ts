import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useFleetSummary(topN = 100) {
  return useQuery({
    queryKey: ["fleet-summary", topN],
    queryFn: () => api.getFleetSummary(topN),
    staleTime: 30_000,
  });
}
