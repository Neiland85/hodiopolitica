/**
 * @hodiopolitica/contracts
 *
 * Shared DTOs between API and Web.
 * These types define the API surface — both sides import from here
 * to ensure type safety across the network boundary.
 */

// ─── Shared Enums ───────────────────────────────────────────

export const VALID_DOMAINS = ["housing", "education", "healthcare", "economy", "environment"] as const;
export type PolicyDomainDTO = (typeof VALID_DOMAINS)[number];

export type SeverityLevel = "low" | "moderate" | "high" | "critical";

// ─── Request DTOs ───────────────────────────────────────────

export interface EvaluatePolicyRequest {
  policy: {
    id: string;
    title: string;
    description: string;
    domain: string;
    actors: string[];
    objectives: string[];
  };
  country: string;
}

export interface CompareCountriesRequest {
  policy: {
    id: string;
    title: string;
    description: string;
    domain: string;
    actors: string[];
    objectives: string[];
  };
  countries: string[];
}

// ─── Response DTOs ──────────────────────────────────────────

export interface PolicyMetricDTO {
  policyId: string;
  metricName: string;
  value: number;
  source: string;
  description: string;
  severity: SeverityLevel;
}

export interface EvaluatePolicyResponse {
  policy: {
    id: string;
    title: string;
    domain: string;
  };
  context: {
    country: string;
    year: number;
    sources: string[];
  };
  metrics: PolicyMetricDTO[];
  durationMs?: number;
  evaluatedAt: string;
}

export interface CompareCountriesResponse {
  policy: {
    id: string;
    title: string;
    domain: string;
  };
  comparisons: CountryComparisonDTO[];
  summary: {
    bestPerforming: string;
    worstPerforming: string;
    countriesAnalyzed: number;
    highestVarianceMetric: string;
  };
  evaluatedAt: string;
}

export interface CountryComparisonDTO {
  country: string;
  year: number;
  sources: string[];
  metrics: Array<{
    metricName: string;
    value: number;
    severity: SeverityLevel;
    description: string;
  }>;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  version: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  timestamp: string;
}

export interface CountriesResponse {
  countries: string[];
}
