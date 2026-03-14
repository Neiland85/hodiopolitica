// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

"use client";

import type {
  FullEvaluationResponse,
  PolicyMetricDTO,
  PQIComponentDTO,
  ScenarioResponse,
  ScenarioResultDTO,
  SensitivityEntryDTO,
  StageOutputDTO,
} from "@hodiopolitica/contracts";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Legislaturas de Espana ──────────────────────────────────

interface Legislatura {
  numero: string;
  inicio: string;
  fin: string | null;
  presidente: string;
  partido: string;
  color: string;
}

const LEGISLATURAS: Legislatura[] = [
  { numero: "XV", inicio: "2023-11", fin: null, presidente: "Pedro Sanchez", partido: "PSOE", color: "#ef4444" },
  { numero: "XIV", inicio: "2020-01", fin: "2023-05", presidente: "Pedro Sanchez", partido: "PSOE", color: "#ef4444" },
  {
    numero: "XII",
    inicio: "2016-07",
    fin: "2019-03",
    presidente: "Mariano Rajoy / Pedro Sanchez",
    partido: "PP / PSOE",
    color: "#3b82f6",
  },
  { numero: "X", inicio: "2011-12", fin: "2015-10", presidente: "Mariano Rajoy", partido: "PP", color: "#3b82f6" },
];

// ─── Traducciones y constantes ───────────────────────────────

const SEVERITY_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  low: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.3)", badge: "#22c55e", text: "#4ade80" },
  moderate: { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.3)", badge: "#eab308", text: "#facc15" },
  high: { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)", badge: "#f97316", text: "#fb923c" },
  critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", badge: "#ef4444", text: "#f87171" },
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
  critical: "Critico",
};

const DOMAIN_OPTIONS = [
  { value: "housing", label: "VIV", fullLabel: "Vivienda", icon: "H" },
  { value: "education", label: "EDU", fullLabel: "Educacion", icon: "E" },
  { value: "healthcare", label: "SAN", fullLabel: "Sanidad", icon: "S" },
  { value: "economy", label: "ECO", fullLabel: "Economia", icon: "$" },
  { value: "environment", label: "MED", fullLabel: "Medio Amb.", icon: "M" },
];

const DOMAIN_LABELS: Record<string, string> = {
  housing: "Vivienda",
  education: "Educacion",
  healthcare: "Sanidad",
  economy: "Economia",
  environment: "Medio Ambiente",
};

const DOMAIN_POLICIES: Record<string, { id: string; title: string; description: string }> = {
  housing: {
    id: "housing-law-2023",
    title: "Ley de Vivienda",
    description: "Regulacion del mercado del alquiler y acceso a vivienda",
  },
  education: {
    id: "education-reform-2024",
    title: "Reforma Educativa",
    description: "Modernizacion del sistema educativo",
  },
  healthcare: {
    id: "healthcare-reform-2024",
    title: "Reforma Sanitaria",
    description: "Fortalecimiento del Sistema Nacional de Salud",
  },
  economy: {
    id: "economic-plan-2024",
    title: "Plan Economico",
    description: "Medidas de estimulo y sostenibilidad economica",
  },
  environment: {
    id: "green-transition-2024",
    title: "Transicion Verde",
    description: "Plan de sostenibilidad medioambiental",
  },
};

const STAGE_LABELS: Record<string, string> = {
  domain_evaluation: "Evaluacion de Dominio",
  actor_analysis: "Analisis de Actores",
  media_analysis: "Analisis Mediatico",
  vote_analysis: "Analisis de Votaciones",
  judicial_risk: "Riesgo Judicial",
  evidence_validation: "Validacion de Evidencia",
  public_reaction: "Reaccion Publica",
  pqi_computation: "Calculo PQI",
};

const METRIC_LABELS: Record<string, string> = {
  housing_pressure: "Presion Inmobiliaria",
  social_stress: "Estres Social",
  housing_affordability_index: "Indice de Asequibilidad",
  rental_market_pressure: "Presion del Alquiler",
  housing_supply_gap: "Deficit de Oferta",
  public_investment_ratio: "Inversion Publica",
  education_investment_gap: "Brecha de Inversion Educativa",
  youth_opportunity_index: "Oportunidad Juvenil",
  healthcare_expenditure_ratio: "Gasto Sanitario",
  hospital_beds_per_capita: "Camas Hospitalarias",
  gdp_growth_impact: "Impacto en PIB",
  unemployment_effect: "Efecto en Desempleo",
  inflation_pressure: "Presion Inflacionaria",
  fiscal_sustainability: "Sostenibilidad Fiscal",
  emissions_reduction_potential: "Reduccion de Emisiones",
  renewable_energy_progress: "Energias Renovables",
  environmental_compliance: "Cumplimiento Ambiental",
  media_influence_score: "Influencia Mediatica",
  narrative_distortion_index: "Distorsion Narrativa",
  polarization_amplification: "Amplificacion de Polarizacion",
  media_coverage_volume: "Cobertura Mediatica",
  media_sentiment_score: "Sentimiento Mediatico",
  media_source_diversity: "Diversidad de Fuentes",
  policy_quality_index: "Indice de Calidad de Politica",
  // Evidence & public reaction
  evidence_strength: "Fortaleza de Evidencia",
  consensus_level: "Nivel de Consenso",
  methodology_credibility: "Credibilidad Metodologica",
  approval_trend: "Tendencia de Aprobacion",
  protest_risk: "Riesgo de Protesta",
  electoral_impact: "Impacto Electoral",
  passage_probability: "Probabilidad de Aprobacion",
  amendment_risk: "Riesgo de Enmienda",
  coalition_stability: "Estabilidad de Coalicion",
  legal_challenge_risk: "Riesgo de Impugnacion Legal",
  constitutional_compatibility: "Compatibilidad Constitucional",
  enforcement_uncertainty: "Incertidumbre de Aplicacion",
};

const METRIC_DESCRIPTIONS: Record<string, string> = {
  housing_pressure: "Presion sobre costes de vivienda amplificada por inflacion.",
  social_stress: "Indice de Miseria: desempleo x inflacion.",
  media_influence_score: "Impacto mediatico global combinando volumen, alcance y sentimiento.",
  narrative_distortion_index: "Desviacion de la cobertura mediatica respecto a reportaje equilibrado.",
  polarization_amplification: "Cobertura polarizada amplificando division social.",
  education_investment_gap: "Diferencia con la media europea de inversion educativa.",
  youth_opportunity_index: "Empleo juvenil, acceso educativo y movilidad social.",
  healthcare_expenditure_ratio: "Ratio de gasto sanitario respecto al PIB.",
  hospital_beds_per_capita: "Camas hospitalarias por 1.000 habitantes.",
  gdp_growth_impact: "Impacto estimado sobre el crecimiento del PIB.",
  unemployment_effect: "Efecto estimado sobre la tasa de desempleo.",
  inflation_pressure: "Presion inflacionaria de las medidas propuestas.",
  fiscal_sustainability: "Sostenibilidad fiscal a medio plazo.",
  emissions_reduction_potential: "Potencial de reduccion de emisiones de GEI.",
  renewable_energy_progress: "Avance hacia objetivos de energias renovables.",
  environmental_compliance: "Cumplimiento con normativa medioambiental vigente.",
  passage_probability: "Probabilidad de aprobacion basada en conteo de votos parlamentarios.",
  amendment_risk: "Riesgo de cambios significativos por enmiendas legislativas pendientes.",
  coalition_stability: "Estabilidad de la coalicion de apoyo basada en abstenciones y presion de enmiendas.",
  legal_challenge_risk: "Riesgo de impugnaciones legales y sentencias judiciales adversas.",
  constitutional_compatibility: "Compatibilidad con el marco constitucional basada en historial de revision judicial.",
  enforcement_uncertainty: "Incertidumbre en la aplicacion por casos pendientes e interdictos.",
  evidence_strength: "Fortaleza de la evidencia cientifica combinando calidad, citas y relevancia.",
  methodology_credibility: "Calidad global de la metodologia de investigacion en la base de evidencia.",
  consensus_level: "Grado de consenso cientifico sobre la efectividad de la politica.",
  approval_trend: "Direccion y velocidad del cambio de opinion publica en el tiempo.",
  protest_risk: "Riesgo de protestas publicas organizadas combinando intensidad pico y tendencia.",
  electoral_impact: "Consecuencia electoral de la politica sobre el apoyo al partido gobernante.",
};

const PQI_COMPONENT_LABELS: Record<string, string> = {
  "Domain Analysis": "Analisis de Dominio",
  "Actor Alignment": "Alineamiento de Actores",
  "Public Legitimacy": "Legitimidad Publica",
  "Media Environment": "Entorno Mediatico",
  "Institutional Viability": "Viabilidad Institucional",
  "Evidence Quality": "Calidad de Evidencia",
  "Public Sentiment": "Sentimiento Publico",
};

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  A: { bg: "rgba(34,197,94,0.12)", text: "#4ade80", border: "#22c55e", glow: "rgba(34,197,94,0.4)" },
  B: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "#3b82f6", glow: "rgba(59,130,246,0.4)" },
  C: { bg: "rgba(234,179,8,0.12)", text: "#facc15", border: "#eab308", glow: "rgba(234,179,8,0.4)" },
  D: { bg: "rgba(249,115,22,0.12)", text: "#fb923c", border: "#f97316", glow: "rgba(249,115,22,0.4)" },
  F: { bg: "rgba(239,68,68,0.12)", text: "#f87171", border: "#ef4444", glow: "rgba(239,68,68,0.4)" },
};

const GRADE_DESCRIPTIONS: Record<string, string> = {
  A: "Excelente",
  B: "Buena",
  C: "Aceptable",
  D: "Deficiente",
  F: "Insuficiente",
};

const ACTOR_TYPE_COLORS: Record<string, string> = {
  politician: "#3b82f6",
  political_party: "#7c3aed",
  government: "#2563eb",
  legislative: "#0891b2",
  judicial: "#a855f7",
  journalist: "#f97316",
  media: "#f97316",
  public: "#22c55e",
  researcher: "#06b6d4",
};

const ACTOR_TYPE_LABELS: Record<string, string> = {
  politician: "Politico",
  political_party: "Partido",
  government: "Gobierno",
  legislative: "Legislativo",
  judicial: "Judicial",
  journalist: "Periodista",
  media: "Medios",
  public: "Sociedad Civil",
  researcher: "Investigador",
};

type ViewMode = "evaluacion" | "legislaturas" | "escenarios";

interface ActorInfo {
  id: string;
  name: string;
  type: string;
  country: string;
}

// ─── Scenario presets ────────────────────────────────────────

const SCENARIO_PRESETS = [
  {
    id: "status-quo",
    name: "Statu Quo",
    description: "Sin cambios en indicadores",
    assumptions: {},
  },
  {
    id: "optimistic",
    name: "Optimista",
    description: "Mejora economica general",
    assumptions: {
      indicatorOverrides: { inflation: 1.5, unemployment: 8, gdp_growth: 3.0 },
      sentimentShift: 15,
    },
  },
  {
    id: "pessimistic",
    name: "Pesimista",
    description: "Recesion y malestar social",
    assumptions: {
      indicatorOverrides: { inflation: 5.5, unemployment: 18, gdp_growth: -1.0 },
      sentimentShift: -20,
    },
  },
];

// ─── 3D Style helpers ────────────────────────────────────────

function card3dStyle(depth = 20, hue = 220): CSSProperties {
  return {
    background: `linear-gradient(145deg, rgba(30,30,60,0.95), rgba(20,20,45,0.9))`,
    border: `1px solid rgba(${hue === 220 ? "100,140,255" : "140,100,255"},0.15)`,
    borderRadius: 16,
    padding: "1.25rem",
    transform: `translateZ(${depth}px)`,
    transformStyle: "preserve-3d" as const,
    boxShadow: `
      0 ${depth / 2}px ${depth}px rgba(0,0,0,0.4),
      0 ${depth / 4}px ${depth / 2}px rgba(0,0,0,0.2),
      inset 0 1px 0 rgba(255,255,255,0.05)
    `,
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  };
}

function recessedDisplayStyle(): CSSProperties {
  return {
    background: "linear-gradient(180deg, #0a0a18 0%, #0d0d20 100%)",
    borderRadius: 12,
    padding: "1.5rem",
    boxShadow: `
      inset 0 4px 12px rgba(0,0,0,0.6),
      inset 0 1px 3px rgba(0,0,0,0.4),
      0 1px 0 rgba(255,255,255,0.03)
    `,
    border: "1px solid rgba(255,255,255,0.04)",
  };
}

function calcKeyStyle(isActive: boolean, color: string): CSSProperties {
  return {
    padding: "0.65rem 0.5rem",
    background: isActive
      ? `linear-gradient(180deg, ${color}30 0%, ${color}20 100%)`
      : "linear-gradient(180deg, rgba(50,50,80,0.8) 0%, rgba(35,35,60,0.8) 100%)",
    border: isActive ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: "0.7rem",
    fontWeight: 700,
    fontFamily: "inherit",
    color: isActive ? color : "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    transform: isActive ? "translateZ(5px) translateY(1px)" : "translateZ(15px)",
    boxShadow: isActive
      ? `inset 0 2px 4px rgba(0,0,0,0.3), 0 0 12px ${color}30`
      : "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
    transition: "all 0.15s ease",
    textAlign: "center" as const,
    lineHeight: 1.3,
  };
}

function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── SVG Gauge Component ─────────────────────────────────────

function PQIGauge({
  score,
  grade,
  size = 160,
  strokeWidth = 10,
}: {
  score: number;
  grade: string;
  size?: number;
  strokeWidth?: number;
}) {
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.C;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`PQI score: ${score}`}>
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: "stroke-dashoffset 1s ease",
            filter: `drop-shadow(0 0 6px ${colors.glow})`,
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: size * 0.25,
            fontWeight: 800,
            color: colors.text,
            lineHeight: 1,
            fontFamily: "inherit",
            textShadow: `0 0 20px ${colors.glow}`,
          }}
        >
          {score.toFixed(0)}
        </span>
        <span style={{ fontSize: size * 0.09, color: "#64748b", marginTop: 2 }}>de 100</span>
      </div>
    </div>
  );
}

// ─── Tilt Card wrapper ───────────────────────────────────────

function TiltCard({
  children,
  style,
  depth = 20,
  hue = 220,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
  depth?: number;
  hue?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateZ(${depth + 10}px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `translateZ(${depth}px)`;
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: purely visual tilt effect, no semantic interaction
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...card3dStyle(depth, hue), ...style }}
    >
      {children}
    </div>
  );
}

// ─── Console Header ──────────────────────────────────────────

function ConsoleHeader({ viewMode, onViewChange }: { viewMode: ViewMode; onViewChange: (mode: ViewMode) => void }) {
  const views: { key: ViewMode; label: string }[] = [
    { key: "evaluacion", label: "EVAL" },
    { key: "escenarios", label: "SCEN" },
    { key: "legislaturas", label: "LEG" },
  ];

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.5rem",
        background: "linear-gradient(180deg, rgba(40,40,70,0.95) 0%, rgba(25,25,50,0.95) 100%)",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "1.5rem",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "1.4rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.05em",
          }}
        >
          HODIOPOLITICA
        </h1>
        <p style={{ margin: "0.15rem 0 0", color: "#64748b", fontSize: "0.7rem", letterSpacing: "0.1em" }}>
          MODELADO DE DECISIONES POLITICAS
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.35rem" }}>
        {views.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            onClick={() => onViewChange(key)}
            style={{
              padding: "0.4rem 0.85rem",
              border: viewMode === key ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              background: viewMode === key ? "rgba(96,165,250,0.15)" : "transparent",
              color: viewMode === key ? "#60a5fa" : "#64748b",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.08em",
              transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}

// ─── Domain Keypad ───────────────────────────────────────────

function DomainKeypad({
  selectedDomain,
  onSelect,
  onEval,
  loading,
}: {
  selectedDomain: string;
  onSelect: (domain: string) => void;
  onEval: () => void;
  loading: boolean;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        style={{
          fontSize: "0.6rem",
          color: "#64748b",
          letterSpacing: "0.15em",
          marginBottom: "0.5rem",
          textTransform: "uppercase",
        }}
      >
        DOMINIO
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", transformStyle: "preserve-3d" }}
      >
        {DOMAIN_OPTIONS.map((d) => (
          <button
            type="button"
            key={d.value}
            onClick={() => onSelect(d.value)}
            style={calcKeyStyle(selectedDomain === d.value, "#60a5fa")}
          >
            <div style={{ fontSize: "0.85rem", marginBottom: 2 }}>{d.icon}</div>
            {d.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onEval}
          disabled={loading}
          style={{
            ...calcKeyStyle(false, "#22c55e"),
            background: loading
              ? "rgba(34,197,94,0.1)"
              : "linear-gradient(180deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.15) 100%)",
            color: "#22c55e",
            border: "1px solid rgba(34,197,94,0.4)",
          }}
        >
          <div style={{ fontSize: "0.85rem", marginBottom: 2 }}>{loading ? "..." : "="}</div>
          EVAL
        </button>
      </div>
    </div>
  );
}

// ─── PQI Display (recessed screen) ──────────────────────────

function PQIDisplay({
  data,
  loading,
  error,
  selectedDomain,
}: {
  data: FullEvaluationResponse | null;
  loading: boolean;
  error: string | null;
  selectedDomain: string;
}) {
  const policy = DOMAIN_POLICIES[selectedDomain];

  return (
    <div style={recessedDisplayStyle()}>
      {/* Policy title bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e2e8f0" }}>
            {policy?.title || selectedDomain}
          </div>
          <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 2 }}>
            {DOMAIN_LABELS[selectedDomain] || selectedDomain}
          </div>
        </div>
        <div style={{ fontSize: "0.6rem", color: "#475569" }}>{data ? `${data.durationMs}ms` : "---"}</div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div
            style={{
              fontSize: "1.5rem",
              color: "#60a5fa",
              animation: "glow 1.5s ease-in-out infinite alternate",
            }}
          >
            ...
          </div>
          <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: "0.5rem" }}>Procesando</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            fontSize: "0.75rem",
            color: "#f87171",
          }}
        >
          Error: {error}
        </div>
      )}

      {/* PQI Gauge */}
      {!loading && !error && data?.pqi && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <PQIGauge score={data.pqi.score} grade={data.pqi.grade} size={160} />
          <div style={{ textAlign: "center" }}>
            <span
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: GRADE_COLORS[data.pqi.grade]?.text || "#e2e8f0",
                textShadow: `0 0 20px ${GRADE_COLORS[data.pqi.grade]?.glow || "transparent"}`,
              }}
            >
              {data.pqi.grade}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
              {GRADE_DESCRIPTIONS[data.pqi.grade] || data.pqi.grade}
            </span>
          </div>
        </div>
      )}

      {/* No data */}
      {!loading && !error && !data && (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "#475569", fontSize: "0.75rem" }}>
          Selecciona un dominio y pulsa EVAL
        </div>
      )}
    </div>
  );
}

// ─── PQI Components (dark bars) ──────────────────────────────

function PQIComponentsGrid({ components }: { components: PQIComponentDTO[] }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "0.5rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        marginBottom: "1.25rem",
      }}
    >
      {components.map((c) => {
        const pct = Math.min(Math.max(c.rawScore, 0), 100);
        const isGood = c.rawScore >= 60;
        return (
          <div
            key={c.name}
            style={{
              padding: "0.85rem",
              background: "rgba(15,15,30,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.4rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {PQI_COMPONENT_LABELS[c.name] || c.name}
              </span>
              <span style={{ fontSize: "0.6rem", color: "#475569" }}>{(c.weight * 100).toFixed(0)}%</span>
            </div>
            {/* Bar */}
            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: "0.35rem",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: isGood
                    ? "linear-gradient(to right, #22c55e, #4ade80)"
                    : "linear-gradient(to right, #f97316, #fb923c)",
                  transition: "width 0.6s ease",
                  boxShadow: isGood ? "0 0 8px rgba(34,197,94,0.4)" : "0 0 8px rgba(249,115,22,0.4)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontWeight: 700, fontSize: "0.75rem", color: isGood ? "#4ade80" : "#fb923c" }}>
                {c.rawScore.toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Metric Card (dark 3D) ──────────────────────────────────

function MetricCard3D({ metric }: { metric: PolicyMetricDTO }) {
  const colors = SEVERITY_COLORS[metric.severity] || SEVERITY_COLORS.low;
  const label = METRIC_LABELS[metric.metricName] || metric.metricName.replace(/_/g, " ");

  return (
    <TiltCard depth={15} style={{ padding: "1rem", borderColor: colors.border }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <h4
          style={{
            margin: 0,
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#94a3b8",
          }}
        >
          {label}
        </h4>
        <span
          style={{
            padding: "0.1rem 0.4rem",
            borderRadius: 20,
            fontSize: "0.55rem",
            fontWeight: 700,
            color: "#fff",
            background: colors.badge,
            textTransform: "uppercase",
          }}
        >
          {SEVERITY_LABELS[metric.severity] || metric.severity}
        </span>
      </div>
      <p
        style={{
          fontSize: "1.6rem",
          fontWeight: 800,
          margin: "0.15rem 0",
          color: colors.text,
          textShadow: `0 0 10px ${colors.border}`,
        }}
      >
        {typeof metric.value === "number" ? metric.value.toFixed(1) : metric.value}
      </p>
      <p style={{ fontSize: "0.68rem", color: "#64748b", margin: "0.25rem 0 0", lineHeight: 1.4 }}>
        {METRIC_DESCRIPTIONS[metric.metricName] || metric.description}
      </p>
    </TiltCard>
  );
}

// ─── Stage Section (dark) ────────────────────────────────────

function StageSection3D({ stage }: { stage: StageOutputDTO }) {
  const label = STAGE_LABELS[stage.stageName] || stage.stageName.replace(/_/g, " ");
  if (stage.metrics.length === 0) return null;

  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.85rem", color: "#e2e8f0", fontWeight: 700, letterSpacing: "0.02em" }}>
          {label}
        </h3>
        <span style={{ fontSize: "0.65rem", color: "#475569", fontFamily: "inherit" }}>{stage.durationMs}ms</span>
      </div>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          perspective: "1000px",
        }}
      >
        {stage.metrics.map((m) => (
          <MetricCard3D key={m.metricName} metric={m} />
        ))}
      </div>
    </section>
  );
}

// ─── Actor Avatars ───────────────────────────────────────────

function ActorAvatars({ actors }: { actors: ActorInfo[] }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h3
        style={{
          margin: "0 0 0.75rem",
          fontSize: "0.85rem",
          color: "#e2e8f0",
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        Actores Politicos
      </h3>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {actors.map((a) => {
          const color = ACTOR_TYPE_COLORS[a.type] || "#6b7280";
          const initials = getInitials(a.name);
          return (
            <div
              key={a.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.35rem",
                width: 80,
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${color}40, ${color}20)`,
                  border: `2px solid ${color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color,
                  boxShadow: `0 0 12px ${color}30`,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                {initials}
              </div>
              <span
                style={{
                  fontSize: "0.62rem",
                  color: "#cbd5e1",
                  textAlign: "center",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                }}
              >
                {a.name}
              </span>
              <span
                style={{
                  fontSize: "0.55rem",
                  color: color,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {ACTOR_TYPE_LABELS[a.type] || a.type}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Scenario Column ─────────────────────────────────────────

function ScenarioColumn({ result, isBaseline }: { result: ScenarioResultDTO; isBaseline?: boolean }) {
  const grade = result.pqi.grade;
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.C;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 200,
        padding: "1rem",
        background: isBaseline ? "rgba(96,165,250,0.05)" : "rgba(15,15,30,0.5)",
        border: isBaseline ? "1px solid rgba(96,165,250,0.2)" : "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: isBaseline ? "#60a5fa" : "#94a3b8",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {result.scenario.name}
      </div>

      <PQIGauge score={result.pqi.score} grade={grade} size={90} strokeWidth={7} />

      <div style={{ marginTop: "0.5rem" }}>
        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: colors.text }}>{result.pqi.score.toFixed(0)}</span>
        <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "0.3rem" }}>{grade}</span>
      </div>

      {/* Component mini bars */}
      <div style={{ marginTop: "0.75rem", textAlign: "left" }}>
        {result.pqi.components.map((c) => {
          const pct = Math.min(Math.max(c.rawScore, 0), 100);
          const isGood = c.rawScore >= 60;
          return (
            <div key={c.name} style={{ marginBottom: "0.35rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.55rem",
                  color: "#64748b",
                  marginBottom: 2,
                }}
              >
                <span>{PQI_COMPONENT_LABELS[c.name] || c.name}</span>
                <span style={{ color: isGood ? "#4ade80" : "#fb923c" }}>{c.rawScore.toFixed(0)}</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 2,
                    background: isGood ? "#22c55e" : "#f97316",
                    transition: "width 0.5s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modified indicators */}
      <div
        style={{
          marginTop: "0.75rem",
          paddingTop: "0.5rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: "0.6rem",
          color: "#475569",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Inflacion</span>
          <span style={{ color: "#94a3b8" }}>{result.modifiedIndicators.inflation.toFixed(1)}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Desempleo</span>
          <span style={{ color: "#94a3b8" }}>{result.modifiedIndicators.unemployment.toFixed(1)}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>PIB</span>
          <span style={{ color: "#94a3b8" }}>{result.modifiedIndicators.gdp_growth.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sensitivity Chart ───────────────────────────────────────

function SensitivityChart({ entries }: { entries: SensitivityEntryDTO[] }) {
  const maxDelta = Math.max(...entries.map((e) => Math.abs(e.deltaFromBaseline)), 1);

  return (
    <div
      style={{
        padding: "1rem",
        background: "rgba(15,15,30,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "0.75rem",
        }}
      >
        Analisis de Sensibilidad
      </div>
      {entries.map((entry) => {
        const isPositive = entry.deltaFromBaseline >= 0;
        const barWidth = (Math.abs(entry.deltaFromBaseline) / maxDelta) * 100;
        return (
          <div key={entry.scenarioId} style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", marginBottom: 3 }}>
              <span style={{ color: "#94a3b8" }}>{entry.scenarioName}</span>
              <span style={{ color: isPositive ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                {isPositive ? "+" : ""}
                {entry.deltaFromBaseline.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                position: "relative",
                height: 8,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              {/* Center line */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  width: 1,
                  height: "100%",
                  background: "rgba(255,255,255,0.1)",
                }}
              />
              {/* Bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  height: "100%",
                  borderRadius: 4,
                  background: isPositive
                    ? "linear-gradient(to right, rgba(34,197,94,0.3), #22c55e)"
                    : "linear-gradient(to left, rgba(239,68,68,0.3), #ef4444)",
                  ...(isPositive
                    ? { left: "50%", width: `${barWidth / 2}%` }
                    : { right: "50%", width: `${barWidth / 2}%` }),
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Scenario Whiteboard ─────────────────────────────────────

function ScenarioWhiteboard({
  scenarioData,
  scenarioLoading,
  scenarioError,
}: {
  scenarioData: ScenarioResponse | null;
  scenarioLoading: boolean;
  scenarioError: string | null;
}) {
  if (scenarioLoading) {
    return (
      <div style={{ ...recessedDisplayStyle(), textAlign: "center", padding: "3rem 1.5rem" }}>
        <div style={{ fontSize: "1.2rem", color: "#60a5fa", animation: "glow 1.5s ease-in-out infinite alternate" }}>
          ...
        </div>
        <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: "0.5rem" }}>Ejecutando escenarios</div>
      </div>
    );
  }

  if (scenarioError) {
    return (
      <div
        style={{
          padding: "1rem",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 12,
          fontSize: "0.75rem",
          color: "#f87171",
        }}
      >
        Error: {scenarioError}
      </div>
    );
  }

  if (!scenarioData) {
    return (
      <div style={{ ...recessedDisplayStyle(), textAlign: "center", padding: "3rem 1.5rem" }}>
        <div style={{ fontSize: "0.8rem", color: "#475569" }}>Selecciona un dominio para comparar escenarios</div>
      </div>
    );
  }

  return (
    <div>
      {/* Scenario columns */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {scenarioData.scenarios.map((result, idx) => (
          <ScenarioColumn key={result.scenario.id} result={result} isBaseline={idx === 0} />
        ))}
      </div>

      {/* Sensitivity */}
      {scenarioData.sensitivityAnalysis.length > 0 && <SensitivityChart entries={scenarioData.sensitivityAnalysis} />}

      {/* Ranking */}
      <div
        style={{
          marginTop: "0.75rem",
          padding: "0.75rem",
          background: "rgba(15,15,30,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          fontSize: "0.65rem",
          color: "#64748b",
        }}
      >
        <span style={{ fontWeight: 700, color: "#94a3b8", marginRight: "0.5rem" }}>RANKING:</span>
        {scenarioData.ranking.map((id, i) => {
          const s = scenarioData.scenarios.find((sc) => sc.scenario.id === id);
          return (
            <span key={id}>
              <span
                style={{ color: i === 0 ? "#4ade80" : i === scenarioData.ranking.length - 1 ? "#f87171" : "#94a3b8" }}
              >
                {i + 1}. {s?.scenario.name || id}
              </span>
              {i < scenarioData.ranking.length - 1 && <span style={{ margin: "0 0.4rem", color: "#334155" }}>|</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legislaturas View (dark) ────────────────────────────────

function LegislaturasViewDark({
  selectedDomain,
  currentData,
}: {
  selectedDomain: string;
  currentData: FullEvaluationResponse | null;
}) {
  return (
    <section>
      <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#e2e8f0", fontWeight: 700 }}>
        Comparativa por Legislatura — {DOMAIN_LABELS[selectedDomain] || selectedDomain}
      </h3>

      <div style={{ position: "relative" }}>
        {LEGISLATURAS.map((leg, idx) => {
          const isCurrent = leg.fin === null;
          return (
            <div
              key={leg.numero}
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "stretch",
              }}
            >
              {/* Timeline */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: isCurrent ? leg.color : "#334155",
                    border: isCurrent ? `3px solid ${leg.color}60` : "2px solid #475569",
                    flexShrink: 0,
                    marginTop: 6,
                    boxShadow: isCurrent ? `0 0 10px ${leg.color}40` : "none",
                  }}
                />
                {idx < LEGISLATURAS.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: "#1e293b", minHeight: 20 }} />
                )}
              </div>

              {/* Card */}
              <div
                style={{
                  flex: 1,
                  padding: "1rem 1.25rem",
                  background: isCurrent ? "rgba(30,30,60,0.8)" : "rgba(20,20,40,0.5)",
                  border: isCurrent ? `1px solid ${leg.color}30` : "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  marginBottom: "0.5rem",
                  boxShadow: isCurrent ? `0 2px 16px ${leg.color}15` : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#e2e8f0" }}>
                      {leg.numero} Legislatura
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          padding: "0.1rem 0.5rem",
                          background: leg.color,
                          color: "#fff",
                          borderRadius: 12,
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Actual
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#475569" }}>
                    {leg.inicio} {"->"} {leg.fin || "presente"}
                  </span>
                </div>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                  <strong style={{ color: "#cbd5e1" }}>{leg.presidente}</strong>{" "}
                  <span
                    style={{
                      padding: "0.05rem 0.35rem",
                      background: `${leg.color}20`,
                      color: leg.color,
                      borderRadius: 4,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                    }}
                  >
                    {leg.partido}
                  </span>
                </p>

                {/* Metrics for current */}
                {isCurrent && currentData?.pqi && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      gap: "1.5rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.6rem", color: "#475569", textTransform: "uppercase" }}>PQI</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                        <span
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: 800,
                            color: GRADE_COLORS[currentData.pqi.grade]?.text || "#e2e8f0",
                          }}
                        >
                          {currentData.pqi.score.toFixed(0)}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: GRADE_COLORS[currentData.pqi.grade]?.text || "#e2e8f0",
                          }}
                        >
                          {currentData.pqi.grade}
                        </span>
                      </div>
                    </div>
                    {currentData.stageResults
                      .filter((s) => s.stageName !== "pqi_computation")
                      .map((s) => (
                        <div key={s.stageName}>
                          <span style={{ fontSize: "0.6rem", color: "#475569", textTransform: "uppercase" }}>
                            {STAGE_LABELS[s.stageName] || s.stageName.replace(/_/g, " ")}
                          </span>
                          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>
                            {s.metrics.length} metricas
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {!isCurrent && (
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.65rem", color: "#334155", fontStyle: "italic" }}>
                    Datos historicos en desarrollo
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Loading Skeleton (dark) ─────────────────────────────────

function LoadingSkeleton3D() {
  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            padding: "1.5rem",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            background: "rgba(20,20,40,0.5)",
            animation: "pulse 2s infinite",
          }}
        >
          <div
            style={{
              height: 12,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 4,
              width: "60%",
              marginBottom: "1rem",
            }}
          />
          <div
            style={{
              height: 28,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 4,
              width: "35%",
              marginBottom: "0.75rem",
            }}
          />
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, width: "90%" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Principal ────────────────────────────────────

export default function DashboardPage() {
  const [selectedDomain, setSelectedDomain] = useState("housing");
  const [viewMode, setViewMode] = useState<ViewMode>("evaluacion");
  const [data, setData] = useState<FullEvaluationResponse | null>(null);
  const [actors, setActors] = useState<ActorInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Scenario state
  const [scenarioData, setScenarioData] = useState<ScenarioResponse | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  const fetchEvaluation = useCallback(() => {
    setLoading(true);
    setError(null);

    const policy = DOMAIN_POLICIES[selectedDomain] || DOMAIN_POLICIES.housing;

    fetch(`${API_URL}/api/evaluation/full`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy: {
          id: policy.id,
          title: policy.title,
          description: policy.description,
          domain: selectedDomain,
          actors: [],
          objectives: [],
        },
        country: "spain",
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: FullEvaluationResponse) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedDomain]);

  const fetchScenarios = useCallback(() => {
    setScenarioLoading(true);
    setScenarioError(null);

    const policy = DOMAIN_POLICIES[selectedDomain] || DOMAIN_POLICIES.housing;

    fetch(`${API_URL}/api/scenarios/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy: {
          id: policy.id,
          title: policy.title,
          description: policy.description,
          domain: selectedDomain,
          actors: [],
          objectives: [],
        },
        country: "spain",
        scenarios: SCENARIO_PRESETS,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: ScenarioResponse) => setScenarioData(d))
      .catch((e) => setScenarioError(e.message))
      .finally(() => setScenarioLoading(false));
  }, [selectedDomain]);

  // Fetch actors on mount
  useEffect(() => {
    fetch(`${API_URL}/api/actors?country=spain`)
      .then((r) => r.json())
      .then((d: { actors: ActorInfo[] }) => setActors(d.actors))
      .catch(() => setActors([]));
  }, []);

  // Fetch evaluation + scenarios when domain changes
  useEffect(() => {
    fetchEvaluation();
    fetchScenarios();
  }, [fetchEvaluation, fetchScenarios]);

  const nonPqiStages = data?.stageResults.filter((s) => s.stageName !== "pqi_computation") || [];

  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        @keyframes glow { from { text-shadow: 0 0 10px rgba(96,165,250,0.3); } to { text-shadow: 0 0 20px rgba(96,165,250,0.6), 0 0 40px rgba(96,165,250,0.3); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>

      <main
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "1.5rem 2rem",
          perspective: "1800px",
        }}
      >
        <ConsoleHeader viewMode={viewMode} onViewChange={setViewMode} />

        {/* ═══ View: EVALUACION ═══ */}
        {viewMode === "evaluacion" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "420px 1fr",
              gap: "1.5rem",
              alignItems: "start",
              animation: "slideUp 0.4s ease",
            }}
          >
            {/* Left: Calculator Console */}
            <div style={{ ...card3dStyle(25, 220), padding: "1.25rem" }}>
              <DomainKeypad
                selectedDomain={selectedDomain}
                onSelect={setSelectedDomain}
                onEval={fetchEvaluation}
                loading={loading}
              />
              <PQIDisplay data={data} loading={loading} error={error} selectedDomain={selectedDomain} />
            </div>

            {/* Right: Scenario Panel */}
            <div style={{ ...card3dStyle(20, 260), padding: "1.25rem" }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.75rem",
                }}
              >
                PIZARRA DE ESCENARIOS
              </div>
              <ScenarioWhiteboard
                scenarioData={scenarioData}
                scenarioLoading={scenarioLoading}
                scenarioError={scenarioError}
              />
            </div>
          </div>
        )}

        {/* PQI Components + Stages + Actors (below the console) */}
        {viewMode === "evaluacion" && data && !loading && (
          <div style={{ marginTop: "1.5rem", animation: "slideUp 0.5s ease" }}>
            {data.pqi && (
              <>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#e2e8f0", fontWeight: 700 }}>
                  Componentes PQI
                </h3>
                <PQIComponentsGrid components={data.pqi.components} />
              </>
            )}

            {nonPqiStages.map((s) => (
              <StageSection3D key={s.stageName} stage={s} />
            ))}

            {actors.length > 0 && <ActorAvatars actors={actors} />}
          </div>
        )}

        {/* Loading state for evaluation view */}
        {viewMode === "evaluacion" && loading && !data && (
          <div style={{ marginTop: "1.5rem" }}>
            <LoadingSkeleton3D />
          </div>
        )}

        {/* ═══ View: ESCENARIOS (fullscreen) ═══ */}
        {viewMode === "escenarios" && (
          <div style={{ animation: "slideUp 0.4s ease" }}>
            <div style={{ ...card3dStyle(20, 260), padding: "1.5rem" }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#e2e8f0",
                    letterSpacing: "0.05em",
                  }}
                >
                  Comparativa de Escenarios — {DOMAIN_LABELS[selectedDomain] || selectedDomain}
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {DOMAIN_OPTIONS.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => setSelectedDomain(d.value)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        border: selectedDomain === d.value ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6,
                        background: selectedDomain === d.value ? "rgba(96,165,250,0.15)" : "transparent",
                        color: selectedDomain === d.value ? "#60a5fa" : "#475569",
                        cursor: "pointer",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        fontFamily: "inherit",
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <ScenarioWhiteboard
                scenarioData={scenarioData}
                scenarioLoading={scenarioLoading}
                scenarioError={scenarioError}
              />
            </div>
          </div>
        )}

        {/* ═══ View: LEGISLATURAS ═══ */}
        {viewMode === "legislaturas" && (
          <div style={{ ...card3dStyle(20, 220), padding: "1.5rem", animation: "slideUp 0.4s ease" }}>
            <LegislaturasViewDark selectedDomain={selectedDomain} currentData={data} />
          </div>
        )}

        {/* Footer */}
        <footer
          style={{
            marginTop: "2rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: "0.65rem",
            color: "#334155",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>HODIOPOLITICA v1.0.0</span>
          <span>{data ? new Date(data.evaluatedAt).toLocaleString("es-ES") : ""}</span>
        </footer>
      </main>
    </>
  );
}
