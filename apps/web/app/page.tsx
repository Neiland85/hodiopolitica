// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CompareCountriesResponse,
  CountriesResponse,
  CountryComparisonDTO,
  EvaluatePolicyResponse,
  PolicyMetricDTO,
  SeverityLevel,
} from "../../../packages/contracts/src/index";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const SEVERITY_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  low: { bg: "#f0fdf4", border: "#86efac", badge: "#16a34a", text: "#15803d" },
  moderate: { bg: "#fefce8", border: "#fde047", badge: "#ca8a04", text: "#a16207" },
  high: { bg: "#fff7ed", border: "#fdba74", badge: "#ea580c", text: "#c2410c" },
  critical: { bg: "#fef2f2", border: "#fca5a5", badge: "#dc2626", text: "#b91c1c" },
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
  critical: "Cr\u00edtico",
};

const DOMAIN_OPTIONS = [
  { value: "housing", label: "Vivienda" },
  { value: "education", label: "Educaci\u00f3n" },
];

type ViewMode = "single" | "compare";

// ─── Components ─────────────────────────────────────────────

function MetricCard({
  metric,
}: {
  metric: PolicyMetricDTO | { metricName: string; value: number; severity: SeverityLevel; description: string };
}) {
  const colors = SEVERITY_COLORS[metric.severity] || SEVERITY_COLORS.low;
  return (
    <div style={{ padding: "1.25rem", border: `2px solid ${colors.border}`, borderRadius: 12, background: colors.bg }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4
          style={{
            margin: 0,
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#374151",
          }}
        >
          {metric.metricName.replace(/_/g, " ")}
        </h4>
        <span
          style={{
            padding: "0.15rem 0.5rem",
            borderRadius: 20,
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#fff",
            background: colors.badge,
            textTransform: "uppercase",
          }}
        >
          {SEVERITY_LABELS[metric.severity] || metric.severity}
        </span>
      </div>
      <p style={{ fontSize: "2rem", fontWeight: 800, margin: "0.2rem 0", color: colors.text }}>{metric.value}</p>
      <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: "0.4rem 0 0", lineHeight: 1.4 }}>
        {metric.description}
      </p>
    </div>
  );
}

function ComparisonTable({ comparisons }: { comparisons: CountryComparisonDTO[] }) {
  if (comparisons.length === 0) return null;
  const metricNames = comparisons[0].metrics.map((m) => m.metricName);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
            <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "#6b7280" }}>M\u00e9trica</th>
            {comparisons.map((c) => (
              <th key={c.country} style={{ textAlign: "center", padding: "0.75rem 0.5rem", color: "#374151" }}>
                {c.country} <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>({c.year})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metricNames.map((name) => (
            <tr key={name} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.6rem 0.5rem", fontWeight: 600, textTransform: "capitalize", color: "#374151" }}>
                {name.replace(/_/g, " ")}
              </td>
              {comparisons.map((c) => {
                const metric = c.metrics.find((m) => m.metricName === name);
                const colors = SEVERITY_COLORS[metric?.severity || "low"];
                return (
                  <td key={c.country} style={{ textAlign: "center", padding: "0.6rem 0.5rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.1rem", color: colors.text }}>
                      {metric?.value ?? "-"}
                    </span>
                    <br />
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: 10,
                        background: colors.badge,
                        color: "#fff",
                      }}
                    >
                      {SEVERITY_LABELS[metric?.severity || "low"]}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            padding: "1.5rem",
            border: "2px solid #e5e7eb",
            borderRadius: 12,
            background: "#f9fafb",
            animation: "pulse 2s infinite",
          }}
        >
          <div style={{ height: 14, background: "#e5e7eb", borderRadius: 4, width: "60%", marginBottom: "1rem" }} />
          <div style={{ height: 36, background: "#e5e7eb", borderRadius: 4, width: "35%", marginBottom: "0.75rem" }} />
          <div style={{ height: 10, background: "#e5e7eb", borderRadius: 4, width: "90%" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────

export default function DashboardPage() {
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("spain");
  const [selectedDomain, setSelectedDomain] = useState("housing");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [data, setData] = useState<EvaluatePolicyResponse | null>(null);
  const [compareData, setCompareData] = useState<CompareCountriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load countries on mount
  useEffect(() => {
    fetch(`${API_URL}/api/countries`)
      .then((r) => r.json())
      .then((d: CountriesResponse) => setCountries(d.countries))
      .catch(() => setCountries(["Spain", "France", "Germany", "Italy"]));
  }, []);

  const fetchSingle = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/policy/evaluate?country=${selectedCountry}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCountry]);

  const fetchComparison = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/policy/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy: {
          id: `${selectedDomain}-analysis`,
          title: `${selectedDomain} Analysis`,
          description: "",
          domain: selectedDomain,
          actors: [],
          objectives: [],
        },
        countries: countries.map((c) => c.toLowerCase()),
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setCompareData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [countries, selectedDomain]);

  useEffect(() => {
    if (viewMode === "single") fetchSingle();
    else if (countries.length >= 2) fetchComparison();
  }, [viewMode, fetchSingle, fetchComparison, countries.length]);

  return (
    <>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      <main style={{ maxWidth: 1060, margin: "0 auto", padding: "1.5rem" }}>
        {/* Header */}
        <header style={{ marginBottom: "1.5rem" }}>
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
              <h1 style={{ margin: 0, color: "#111827", fontSize: "1.6rem", fontWeight: 800 }}>HodioPolitica</h1>
              <p style={{ margin: "0.2rem 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
                An\u00e1lisis de Pol\u00edticas P\u00fablicas
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["single", "compare"] as ViewMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    background: viewMode === mode ? "#3b82f6" : "#fff",
                    color: viewMode === mode ? "#fff" : "#374151",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {mode === "single" ? "Pa\u00eds" : "Comparar"}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{
              height: 3,
              background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
              borderRadius: 2,
              marginTop: "0.75rem",
            }}
          />
        </header>

        {/* Controls */}
        <section style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {viewMode === "single" && (
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: "0.85rem",
                background: "#fff",
              }}
            >
              {countries.map((c) => (
                <option key={c} value={c.toLowerCase()}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {viewMode === "compare" && (
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: "0.85rem",
                background: "#fff",
              }}
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={viewMode === "single" ? fetchSingle : fetchComparison}
            style={{
              padding: "0.45rem 1rem",
              border: "1px solid #3b82f6",
              borderRadius: 8,
              background: "#3b82f6",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Evaluar
          </button>
        </section>

        {loading && <LoadingSkeleton />}
        {error && (
          <div
            style={{
              padding: "1rem",
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 12,
              marginBottom: "1rem",
            }}
          >
            <strong style={{ color: "#991b1b" }}>Error:</strong>
            <span style={{ color: "#b91c1c", marginLeft: "0.5rem" }}>{error}</span>
          </div>
        )}

        {/* Single Country View */}
        {viewMode === "single" && data && !loading && (
          <>
            <section
              style={{
                padding: "1rem",
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b" }}>{data.policy.title}</h2>
                  <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.82rem" }}>
                    {data.context.country} ({data.context.year}) &middot;{" "}
                    <strong style={{ textTransform: "capitalize" }}>{data.policy.domain}</strong>
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  {data.context.sources.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: "0.15rem 0.45rem",
                        background: "#e0e7ff",
                        color: "#3730a3",
                        borderRadius: 6,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </section>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {data.metrics.map((m) => (
                <MetricCard key={m.metricName} metric={m} />
              ))}
            </div>
          </>
        )}

        {/* Comparison View */}
        {viewMode === "compare" && compareData && !loading && (
          <>
            <section
              style={{
                padding: "1rem",
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                marginBottom: "1.25rem",
              }}
            >
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "#1e293b" }}>
                Comparaci\u00f3n: {compareData.policy.title}
              </h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#64748b" }}>
                <span>
                  Pa\u00edses: <strong>{compareData.summary.countriesAnalyzed}</strong>
                </span>
                <span>
                  Mejor: <strong style={{ color: "#16a34a" }}>{compareData.summary.bestPerforming}</strong>
                </span>
                <span>
                  Peor: <strong style={{ color: "#dc2626" }}>{compareData.summary.worstPerforming}</strong>
                </span>
                <span>
                  Mayor varianza:{" "}
                  <strong style={{ textTransform: "capitalize" }}>
                    {compareData.summary.highestVarianceMetric.replace(/_/g, " ")}
                  </strong>
                </span>
              </div>
            </section>
            <ComparisonTable comparisons={compareData.comparisons} />
          </>
        )}

        {/* Footer */}
        <footer
          style={{
            marginTop: "1.5rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #e5e7eb",
            fontSize: "0.75rem",
            color: "#9ca3af",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>HodioPolitica v1.0.0</span>
          <span>
            {viewMode === "single" && data
              ? new Date(data.evaluatedAt).toLocaleString("es-ES")
              : viewMode === "compare" && compareData
                ? new Date(compareData.evaluatedAt).toLocaleString("es-ES")
                : ""}
          </span>
        </footer>
      </main>
    </>
  );
}
