import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useUnitStatus(unitId: number) {
  return useQuery({
    queryKey: ["unit-status", unitId],
    queryFn: () => api.getUnitStatus(unitId),
    staleTime: 30_000,
  });
}

export function useUnitSensors(unitId: number, nCycles = 50) {
  return useQuery({
    queryKey: ["unit-sensors", unitId, nCycles],
    queryFn: () => api.getUnitSensors(unitId, nCycles),
    staleTime: 60_000,
  });
}

export function useMaintenanceLog(unitId: number) {
  return useQuery({
    queryKey: ["maintenance-log", unitId],
    queryFn: () => api.getMaintenanceLog({ unit_id: unitId }),
    staleTime: 30_000,
  });
}
