/**
 * Shared sensor metadata for the C-MAPSS FD001 dataset.
 *
 * Authoritative source: src/graph/ontology.py:SENSOR_DEFS
 * Reference: Saxena et al., "Damage Propagation Modeling for Aircraft Engine
 * Run-to-Failure Simulation" (NASA C-MAPSS)
 */

export interface SensorMeta {
  id: string;
  symbol: string;
  description: string;
  subsystem: string;
  unit: string | null;
  isConstant: boolean;
  isKey: boolean;
}

export const SENSORS: Record<string, SensorMeta> = {
  sensor_1:  { id: "sensor_1",  symbol: "T2",       description: "Total temperature at fan inlet",    subsystem: "Fan",       unit: "°R",   isConstant: true,  isKey: false },
  sensor_2:  { id: "sensor_2",  symbol: "T24",      description: "Total temperature at LPC outlet",   subsystem: "LPC",       unit: "°R",   isConstant: false, isKey: true  },
  sensor_3:  { id: "sensor_3",  symbol: "T30",      description: "Total temperature at HPC outlet",   subsystem: "HPC",       unit: "°R",   isConstant: false, isKey: true  },
  sensor_4:  { id: "sensor_4",  symbol: "T50",      description: "Total temperature at LPT outlet",   subsystem: "LPT",       unit: "°R",   isConstant: false, isKey: true  },
  sensor_5:  { id: "sensor_5",  symbol: "P2",       description: "Pressure at fan inlet",             subsystem: "Fan",       unit: "psia", isConstant: true,  isKey: false },
  sensor_6:  { id: "sensor_6",  symbol: "P15",      description: "Total pressure in bypass-duct",     subsystem: "Fan",       unit: "psia", isConstant: true,  isKey: false },
  sensor_7:  { id: "sensor_7",  symbol: "P30",      description: "Total pressure at HPC outlet",      subsystem: "HPC",       unit: "psia", isConstant: false, isKey: true  },
  sensor_8:  { id: "sensor_8",  symbol: "Nf",       description: "Physical fan speed",                subsystem: "Fan",       unit: "rpm",  isConstant: false, isKey: false },
  sensor_9:  { id: "sensor_9",  symbol: "Nc",       description: "Physical core speed",               subsystem: "HPT",       unit: "rpm",  isConstant: false, isKey: false },
  sensor_10: { id: "sensor_10", symbol: "epr",      description: "Engine pressure ratio (P50/P2)",    subsystem: "Overall",   unit: null,   isConstant: true,  isKey: false },
  sensor_11: { id: "sensor_11", symbol: "Ps30",     description: "Static pressure at HPC outlet",     subsystem: "HPC",       unit: "psia", isConstant: false, isKey: true  },
  sensor_12: { id: "sensor_12", symbol: "phi",      description: "Fuel flow / Ps30 ratio",            subsystem: "HPC",       unit: null,   isConstant: false, isKey: true  },
  sensor_13: { id: "sensor_13", symbol: "NRf",      description: "Corrected fan speed",               subsystem: "Fan",       unit: "rpm",  isConstant: false, isKey: false },
  sensor_14: { id: "sensor_14", symbol: "NRc",      description: "Corrected core speed",              subsystem: "HPT",       unit: "rpm",  isConstant: false, isKey: false },
  sensor_15: { id: "sensor_15", symbol: "BPR",      description: "Bypass ratio",                      subsystem: "Fan",       unit: null,   isConstant: false, isKey: true  },
  sensor_16: { id: "sensor_16", symbol: "farB",     description: "Burner fuel-air ratio",             subsystem: "Combustor", unit: null,   isConstant: true,  isKey: false },
  sensor_17: { id: "sensor_17", symbol: "htBleed",  description: "Bleed enthalpy",                    subsystem: "LPC",       unit: null,   isConstant: false, isKey: false },
  sensor_18: { id: "sensor_18", symbol: "Nf_dmd",   description: "Demanded fan speed",                subsystem: "Fan",       unit: "rpm",  isConstant: true,  isKey: false },
  sensor_19: { id: "sensor_19", symbol: "PCNfR_dmd",description: "Demanded corrected fan speed",      subsystem: "Fan",       unit: "rpm",  isConstant: true,  isKey: false },
  sensor_20: { id: "sensor_20", symbol: "W31",      description: "HPT coolant bleed",                 subsystem: "HPT",       unit: "lbm/s", isConstant: false, isKey: false },
  sensor_21: { id: "sensor_21", symbol: "W32",      description: "LPT coolant bleed",                 subsystem: "LPT",       unit: "lbm/s", isConstant: false, isKey: false },
};

/** The 7 key sensors used for trend analysis and charting. */
export const KEY_SENSOR_IDS = Object.values(SENSORS)
  .filter((s) => s.isKey)
  .map((s) => s.id);

/** Engine flow path order. */
export const SUBSYSTEM_ORDER = ["Fan", "LPC", "HPC", "Combustor", "HPT", "LPT"] as const;

/** Chart line colors for key sensors. */
export const SENSOR_COLORS: Record<string, string> = {
  sensor_2:  "#22d3ee",
  sensor_3:  "#f97316",
  sensor_4:  "#a78bfa",
  sensor_7:  "#34d399",
  sensor_11: "#f472b6",
  sensor_12: "#facc15",
  sensor_15: "#60a5fa",
};

/** Short symbol: "T24" */
export function sensorSymbol(id: string): string {
  return SENSORS[id]?.symbol ?? id.replace("sensor_", "S");
}

/** Compact label: "T24 — LPC outlet temp" */
export function sensorLabel(id: string): string {
  const s = SENSORS[id];
  if (!s) return id.replace("sensor_", "S");
  // Shorten "Total temperature at LPC outlet" → "LPC outlet temp"
  const short = s.description
    .replace(/^Total temperature at /, "")
    .replace(/^Total pressure (?:at |in )/, "")
    .replace(/^Static pressure at /, "")
    .replace(/temperature$/, "temp")
    .replace(/pressure$/, "press.");
  return `${s.symbol} — ${short}`;
}

/** Full label: "T24 — Total temperature at LPC outlet" */
export function sensorFullLabel(id: string): string {
  const s = SENSORS[id];
  if (!s) return id;
  return `${s.symbol} — ${s.description}`;
}

/** Operational settings metadata (near-constant in FD001). */
export const OP_SETTINGS = {
  op_setting_1: { label: "Altitude", unit: "ft", note: "Near-constant in FD001 (sea level)" },
  op_setting_2: { label: "Mach Number", unit: null, note: "Near-constant in FD001" },
  op_setting_3: { label: "Throttle Resolver Angle (TRA)", unit: "°", note: "Near-constant in FD001" },
};

/**
 * Physics explanations for the 7 key sensors under HPC degradation.
 * Source: Saxena et al. 2008 — C-MAPSS simulation physics.
 */
export interface SensorPhysics {
  direction: "increases" | "decreases";
  explanation: string;
}

export const SENSOR_PHYSICS: Record<string, SensorPhysics> = {
  sensor_2:  { direction: "increases", explanation: "Upstream thermal effects from compressor efficiency loss" },
  sensor_3:  { direction: "increases", explanation: "HPC works harder — outlet temperature rises" },
  sensor_4:  { direction: "increases", explanation: "Downstream thermal cascade through turbine stages" },
  sensor_7:  { direction: "decreases", explanation: "HPC pressure ratio drops as flow capacity degrades" },
  sensor_11: { direction: "decreases", explanation: "Static pressure loss at HPC outlet — direct flow capacity indicator" },
  sensor_12: { direction: "increases", explanation: "More fuel required per unit pressure to compensate for efficiency loss" },
  sensor_15: { direction: "decreases", explanation: "Core flow path disruption alters bypass ratio" },
};

/** Group key sensors by physical measurement type. */
export const SENSOR_GROUPS = [
  { label: "Temperatures", sensors: ["sensor_2", "sensor_3", "sensor_4"] },
  { label: "Pressures", sensors: ["sensor_7", "sensor_11"] },
  { label: "Ratios", sensors: ["sensor_12", "sensor_15"] },
] as const;
