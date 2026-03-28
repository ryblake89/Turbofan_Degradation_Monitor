import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/api/client";

export interface TraceFilters {
  unit_id?: number;
  intent?: string;
  limit?: number;
}

export function useTraces(filters: TraceFilters = {}) {
  return useQuery({
    queryKey: ["traces", filters.unit_id, filters.intent, filters.limit],
    queryFn: () => api.getTraces(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useTrace(traceId: number | null) {
  return useQuery({
    queryKey: ["trace", traceId],
    queryFn: () => api.getTrace(traceId!),
    enabled: traceId != null,
    staleTime: 30_000,
  });
}
