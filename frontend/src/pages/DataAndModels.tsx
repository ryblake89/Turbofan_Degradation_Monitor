import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SENSORS,
  SENSOR_COLORS,
  SENSOR_PHYSICS,
  type SensorMeta,
} from "@/lib/sensors";
import Collapsible from "@/components/ui/Collapsible";
import { usePageTitle } from "@/hooks/usePageTitle";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sensorSignal(s: SensorMeta): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  if (s.isKey) return { label: "Key", variant: "default" };
  if (s.isConstant) return { label: "Constant", variant: "outline" };
  return { label: "Informative", variant: "secondary" };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEGRADATION_CASCADE = [
  { sensorId: "sensor_3", symbol: "T30", direction: "\u2191", magnitude: "~7\u00b0R", desc: "HPC outlet temp rises (compressor works harder)" },
  { sensorId: "sensor_11", symbol: "Ps30", direction: "\u2193", magnitude: "~2 psia", desc: "HPC static pressure drops (flow capacity loss)" },
  { sensorId: "sensor_7", symbol: "P30", direction: "\u2193", magnitude: "~0.5 psia", desc: "HPC total pressure drops (pressure ratio degradation)" },
  { sensorId: "sensor_12", symbol: "phi", direction: "\u2191", magnitude: "~0.05", desc: "Fuel/Ps30 increases (more fuel to compensate)" },
  { sensorId: "sensor_4", symbol: "T50", direction: "\u2191", magnitude: "~16\u00b0R", desc: "LPT outlet temp rises (downstream thermal cascade)" },
  { sensorId: "sensor_15", symbol: "BPR", direction: "\u2193", magnitude: "~0.15", desc: "Bypass ratio drops (core flow disruption)" },
  { sensorId: "sensor_2", symbol: "T24", direction: "\u2191", magnitude: "~0.75\u00b0R", desc: "LPC outlet temp tends to increase (upstream thermal effects, weaker signal)" },
] as const;

// ---------------------------------------------------------------------------
// C-MAPSS Context Section
// ---------------------------------------------------------------------------
function CmapssContextSection() {
  const sensorList = Object.values(SENSORS);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          The Data &mdash; NASA C-MAPSS FD001
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* About */}
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Commercial Modular Aero-Propulsion System Simulation (C-MAPSS) is a
            NASA-developed turbofan engine simulator used to generate{" "}
            <strong className="text-red-400">run-to-failure</strong>{" "}
            degradation data. FD001 is the benchmark dataset from the 2008 PHM data
            challenge: 100 engines, each running from healthy to failure under a
            single operating condition with a single fault mode (HPC degradation).
            Most research treats it as a prediction problem. This project treats it
            as an operational monitoring problem, building a system around the data
            rather than just a model.
          </p>
        </div>

        {/* Collapsible: Dataset Details */}
        <Collapsible title="Dataset Details">
          <div className="text-sm text-muted-foreground space-y-3">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong className="text-foreground">FD001 specifics:</strong>{" "}
                100 engines, 26 columns (unit_id + cycle + 3 operational
                settings + 21 sensors)
              </li>
              <li>
                <strong className="text-foreground">Single fault mode:</strong>{" "}
                HPC degradation &mdash; progressive efficiency and flow loss in the
                High Pressure Compressor
              </li>
              <li>
                <strong className="text-foreground">
                  Single operating condition:
                </strong>{" "}
                sea level (operational settings are near-constant)
              </li>
              <li>
                <strong className="text-foreground">Run-to-failure:</strong>{" "}
                training data ends at engine failure; test data ends before
                failure
              </li>
            </ul>

            {/* Sensor table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-foreground">#</th>
                    <th className="text-left py-2 pr-3 text-foreground">Symbol</th>
                    <th className="text-left py-2 pr-3 text-foreground">Description</th>
                    <th className="text-left py-2 pr-3 text-foreground">Subsystem</th>
                    <th className="text-left py-2 pr-3 text-foreground">Unit</th>
                    <th className="text-left py-2 text-foreground">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorList.map((s, i) => {
                    const sig = sensorSignal(s);
                    return (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-1.5 pr-3">{i + 1}</td>
                        <td className="py-1.5 pr-3 font-mono text-foreground">{s.symbol}</td>
                        <td className="py-1.5 pr-3">{s.description}</td>
                        <td className="py-1.5 pr-3">{s.subsystem}</td>
                        <td className="py-1.5 pr-3">{s.unit ?? "\u2014"}</td>
                        <td className="py-1.5">
                          <Badge
                            variant={sig.variant}
                            className={
                              sig.label === "Key"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : sig.label === "Informative"
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : ""
                            }
                          >
                            {sig.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs">
              <strong className="text-foreground">Signal tiers:</strong>{" "}
              <Badge
                variant="default"
                className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-1"
              >
                Key
              </Badge>{" "}
              = 7 sensors used in RUL estimation,{" "}
              <Badge
                variant="secondary"
                className="bg-amber-500/20 text-amber-400 border-amber-500/30 mx-1"
              >
                Informative
              </Badge>{" "}
              = 7 sensors used in Isolation Forest but not RUL,{" "}
              <Badge variant="outline" className="mx-1">
                Constant
              </Badge>{" "}
              = 7 near-constant sensors in FD001's single operating condition.
            </p>

            <p>
              <strong className="text-foreground">Why FD001:</strong> single
              operating condition eliminates multivariate confounds and keeps
              the agent architecture as the focal point, not operational regime
              classification.
            </p>
          </div>
        </Collapsible>

        {/* Collapsible: Degradation Model */}
        <Collapsible title='Degradation Model (Saxena et al. 2008)'>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>The exponential health equation:</p>
            <p className="font-mono bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 rounded text-cyan-300 text-xs">
              h(t) = 1 - d - exp{"{"} a &middot; t^b {"}"}
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <code className="text-foreground">a</code> = degradation rate
                &nbsp;(range: 0.001&ndash;0.003)
              </li>
              <li>
                <code className="text-foreground">b</code> = shape exponent,
                controls onset curvature &nbsp;(range: 1.4&ndash;1.6)
              </li>
              <li>
                <code className="text-foreground">d</code> = initial wear
                offset, random per engine &nbsp;(d &le; 1%)
              </li>
            </ul>
            <p className="text-xs">
              Separate equations for efficiency{" "}
              <code className="text-foreground">e(t)</code> and flow{" "}
              <code className="text-foreground">f(t)</code> per module.
            </p>
            <p className="text-xs">
              Health index:{" "}
              <code className="text-foreground">
                H(t) = min(mFan, mHPC, mHPT, mEGT)
              </code>{" "}
              &mdash; the minimum of normalized operational margins.
            </p>
            <p className="text-xs">
              Failure criterion:{" "}
              <code className="text-foreground">H(t) = 0</code>
            </p>
            <p className="text-xs">
              <strong className="text-foreground">Key insight:</strong> the
              margins are not in the dataset &mdash; they were hidden from PHM
              challenge participants. Any health index must be reconstructed
              from sensor readings alone. The system validates observed sensor
              degradation against this physics model by fitting exponential
              curves and reporting R&sup2; per sensor &mdash; connecting ML outputs
              back to the underlying damage propagation theory.
            </p>
          </div>
        </Collapsible>

        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
          Saxena, A., Goebel, K., Simon, D., &amp; Eklund, N. (2008).{" "}
          <em>
            Damage Propagation Modeling for Aircraft Engine Run-to-Failure
            Simulation.
          </em>{" "}
          Proceedings of the 1st International Conference on Prognostics and
          Health Management (PHM08), Denver, CO.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Degradation Physics Section
// ---------------------------------------------------------------------------
function DegradationPhysicsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          Degradation Physics &mdash; HPC Efficiency Loss
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          When HPC efficiency degrades (the sole fault mode in FD001), the
          effects cascade through the engine in predictable ways. Understanding
          this physics informed sensor selection, anomaly detection features,
          cross-sensor divergence tracking, and the knowledge graph's failure
          mode ontology. The knowledge graph's FailureMode nodes encode these
          sensor-to-subsystem relationships &mdash; when the diagnostic agent flags
          T30 and Ps30, Neo4j returns "HPC Efficiency Loss" as the matching
          failure mode with the specific sensors that indicate it.
        </p>

        {/* Degradation cascade */}
        <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
          <div className="text-sm font-medium text-red-400 mb-3">
            HPC Efficiency Drops
          </div>
          {DEGRADATION_CASCADE.map(({ sensorId, symbol, direction, magnitude, desc }) => {
            const color = SENSOR_COLORS[sensorId] ?? "#888";
            const physics = SENSOR_PHYSICS[sensorId];
            const arrowColor =
              physics?.direction === "increases"
                ? "text-emerald-400"
                : "text-red-400";
            return (
              <div
                key={sensorId}
                className="flex items-start gap-3 py-1.5 pl-4 border-l-2"
                style={{ borderColor: color }}
              >
                <span className={`${arrowColor} font-mono text-sm w-4 shrink-0`}>
                  {direction}
                </span>
                <span
                  className="font-mono text-sm font-medium w-12 shrink-0"
                  style={{ color }}
                >
                  {symbol}
                </span>
                <span className="font-mono text-sm text-muted-foreground w-20 shrink-0">
                  {magnitude}
                </span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            );
          })}
        </div>

        {/* Cross-Sensor Divergence */}
        <div className="border-l-2 border-amber-500/50 pl-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-amber-400">
              Cross-Sensor Divergence
            </strong>{" "}
            &mdash; During healthy operation, physically linked sensors maintain
            stable correlations. T30 and Ps30 normally move together
            (compression raises both temperature and pressure). As HPC
            efficiency degrades, T30 rises while Ps30 drops &mdash; the correlation
            inverts. The system tracks these divergences using Pearson
            correlation against healthy baselines across 5 predefined sensor
            pairs, detecting when subsystem physics begin to decouple.
          </p>
        </div>

        {/* Collapsible: Sensor Selection Rationale */}
        <Collapsible title="Sensor Selection Rationale">
          <div className="text-sm text-muted-foreground space-y-3">
            <div>
              <strong className="text-foreground">7 key sensors</strong> (T24,
              T30, T50, P30, Ps30, phi, BPR): Selected via variance analysis
              (coefficient of variation &gt; 0.001) combined with physical
              reasoning about HPC degradation effects.
            </div>
            <div>
              <strong className="text-foreground">
                7 near-constant sensors
              </strong>{" "}
              (T2, P2, P15, epr, farB, Nf_dmd, PCNfR_dmd): Near-constant in
              FD001's single operating condition. These would be informative in
              multi-condition datasets (FD002/FD004) but carry no signal here.
            </div>
            <div>
              <strong className="text-foreground">7 informative sensors</strong>{" "}
              (Nf, Nc, NRf, NRc, htBleed, W31, W32): Show degradation signals
              but are noisier or redundant with key sensors. Used in the full
              14-feature Isolation Forest but not in RUL estimation.
            </div>
            <div>
              <strong className="text-foreground">Model usage:</strong>{" "}
              Isolation Forest: 14 sensors (key + informative). RUL estimation:
              7 key sensors only. This layered approach uses broad coverage for
              anomaly detection but focused sensors for remaining life
              prediction.
            </div>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ML Models Section
// ---------------------------------------------------------------------------
function MLModelsSection() {
  const models = [
    {
      title: "Anomaly Detection \u2014 Isolation Forest",
      color: "#22d3ee",
      icon: BarChart3,
      metric: "0.33 score separation between healthy and late-stage engines",
      oneLiner:
        "Detects deviation from healthy engine behavior using an unsupervised ensemble",
      details: [
        "Training: Fit on first 30% of each engine's life (healthy baseline), 14 informative sensors, StandardScaler",
        "Output: Anomaly score (0\u2013100 normalized), top contributing sensors via permutation importance",
      ],
      designChoice:
        "Unsupervised \u2014 no failure labels needed for training. FD001 provides run-to-failure data, so supervised labels are technically available. Isolation Forest was chosen because real-world maintenance data rarely has clean failure labels \u2014 building on unsupervised methods demonstrates a production-realistic approach. Permutation importance provides per-sensor interpretability.",
    },
    {
      title: "RUL Estimation \u2014 Piecewise Linear",
      color: "#a78bfa",
      icon: BarChart3,
      metric: "MAE: 11.9 cycles at 75% engine life",
      oneLiner:
        "Estimates remaining useful life by detecting degradation onset and extrapolating to failure",
      details: [
        "Method: Two-segment regression finds knee point, normalizes current position between healthy baseline and failure threshold, bootstrap CI from cross-unit variance",
        "Output: Estimated RUL (cycles), 90% confidence interval, degradation stage, per-sensor detail",
      ],
      designChoice:
        "Piecewise linear, not LSTM \u2014 the agent architecture is the star, not the prediction model. An LSTM produces a single number with no per-sensor attribution. The piecewise approach breaks down RUL by sensor, letting the agent explain which sensors are driving the estimate and how far each has degraded \u2014 critical for maintenance decision-making.",
    },
    {
      title: "Trend Analysis \u2014 CUSUM + Rolling Statistics",
      color: "#fbbf24",
      icon: BarChart3,
      metric: "Median onset: cycle 99 (~50% of engine life)",
      oneLiner:
        "Tracks sensor behavior changes and detects degradation onset timing",
      details: [
        "Method: Rolling mean/std/slope per sensor, CUSUM change-point detection, cross-sensor Pearson divergence tracked across 5 physically-motivated pairs",
        "Output: Per-sensor rates of change, change point locations, cross-sensor divergence scores, overall trend classification",
      ],
      designChoice:
        "C-MAPSS samples once per flight cycle \u2014 not high-frequency vibration data. FFT would be meaningless. CUSUM detects persistent mean shifts, which is exactly how degradation manifests in this data.",
    },
    {
      title: "Health Index \u2014 Composite Score",
      color: "#34d399",
      icon: BarChart3,
      metric: "At EOL: 69% critical, 31% near-failure (mean HI: 26.2)",
      oneLiner:
        "Combines anomaly and RUL signals into a single 0\u2013100 health score",
      details: [
        "Formula: 40% normalized anomaly score + 60% RUL component",
        "Labels: Healthy (\u226580), Degrading (\u226550), Critical (\u226525), Near Failure (<25)",
      ],
      designChoice:
        "The paper's original health index used flow/efficiency margins hidden from participants. This composite reconstructs a health signal from available sensor data \u2014 60% RUL weight because remaining life is more actionable than current anomaly state.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">ML Models &amp; Methods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {models.map(({ title, color, metric, oneLiner, details, designChoice }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm" style={{ color }}>{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="text-xs font-semibold rounded px-2 py-1 w-fit"
                  style={{ color, backgroundColor: `${color}15` }}
                >
                  {metric}
                </div>
                <p className="text-sm text-muted-foreground">{oneLiner}</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                  {designChoice}
                </p>
                <Link
                  to="/units/1"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  See this model in action on a live unit &rarr;
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Collapsible: Exponential Fit Quality */}
        <Collapsible title="Exponential Fit Quality">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              After computing RUL, the system fits Saxena's{" "}
              <code className="text-foreground">
                h(t) = 1 - exp{"{"} a &middot; t^b {"}"}
              </code>{" "}
              to each sensor's post-knee degradation trajectory.
            </p>
            <p>
              Reports R&sup2; per sensor &mdash; validates whether observed
              degradation follows the physics model.
            </p>
            <p>
              Thresholds: R&sup2; &gt; 0.85 = strong physics match, 0.7&ndash;0.85 =
              moderate, &lt; 0.7 = deviates from model.
            </p>
            <p>
              Sensors with R&sup2; &gt; 0.85 follow the Saxena exponential model
              closely, confirming the cascade chain (HPC efficiency &rarr; T30 &rarr; Ps30
              &rarr; phi &rarr; T50).
            </p>
          </div>
        </Collapsible>

        {/* Collapsible: Training Details */}
        <Collapsible title="Training Details">
          <div className="text-sm text-muted-foreground space-y-2">
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Healthy fraction: first 30% of each engine's life</li>
              <li>
                Isolation Forest: contamination=0.05, n_estimators=200. Anomaly
                scores calibrated to 0&ndash;100 using percentile mapping from healthy
                (p1) and degraded (p99) baselines
              </li>
              <li>
                RUL profiles: per-sensor slope distributions, mean degradation
                lengths, knee fraction statistics &mdash; all learned from the 100
                training engines
              </li>
              <li>Expected median life: 199 cycles (from EDA)</li>
              <li>
                Feature importance: permutation-based (shuffle one feature,
                measure score change)
              </li>
            </ul>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function DataAndModels() {
  usePageTitle("Data & Models");
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data &amp; Models</h2>
        <p className="text-lg text-muted-foreground mt-1">
          NASA C-MAPSS turbofan dataset, degradation physics, and the ML models that power the agent tools
        </p>
      </div>
      <CmapssContextSection />
      <DegradationPhysicsSection />
      <MLModelsSection />
    </div>
  );
}
