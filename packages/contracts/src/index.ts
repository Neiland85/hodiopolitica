// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

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

// ─── Actor Contracts ───────────────────────────────────────

export interface ActorDTO {
  id: string;
  name: string;
  type: string;
  country: string;
}

export interface ActorInfluenceDTO {
  actorId: string;
  actorType: string;
  influenceScore: number;
  influenceChannel: string;
  stance: string;
  description: string;
}

export interface ActorAnalysisRequest {
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

export interface ActorAnalysisResponse {
  influences: ActorInfluenceDTO[];
  alignmentScore: number;
  supportBalance: {
    support: number;
    oppose: number;
    neutral: number;
  };
  dominantChannel: string;
  analyzedAt: string;
}

// ─── Media Contracts ───────────────────────────────────────

export interface MediaAnalysisRequest {
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

export interface MediaAnalysisResponse {
  policy: { id: string; title: string; domain: string };
  coverage: {
    country: string;
    period: { start: string; end: string };
    sources: string[];
  };
  metrics: PolicyMetricDTO[];
  analyzedAt: string;
}

// ─── Pipeline Contracts ────────────────────────────────────

export interface FullEvaluationRequest {
  policy: {
    id: string;
    title: string;
    description: string;
    domain: string;
    actors: string[];
    objectives: string[];
  };
  country: string;
  /** Optional list of stages to execute (default: all) */
  stages?: Array<"domain" | "actors" | "media" | "pqi">;
}

export interface PQIComponentDTO {
  name: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  description: string;
}

export interface PQIDTO {
  score: number;
  grade: string;
  components: PQIComponentDTO[];
  summary: string;
}

export interface StageOutputDTO {
  stageName: string;
  metrics: PolicyMetricDTO[];
  durationMs: number;
}

export interface FullEvaluationResponse {
  policy: { id: string; title: string; domain: string };
  country: string;
  stageResults: StageOutputDTO[];
  pqi?: PQIDTO;
  durationMs: number;
  evaluatedAt: string;
}

// ─── Error Codes (single source of truth) ──────────────────

export const ApiErrorCodes = {
  /** Rate limit exceeded (429) */
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  /** Missing required policy field */
  MISSING_POLICY: "MISSING_POLICY",
  /** Invalid policy domain */
  INVALID_DOMAIN: "INVALID_DOMAIN",
  /** Invalid policy payload */
  INVALID_POLICY: "INVALID_POLICY",
  /** Countries list validation failure */
  INVALID_COUNTRIES: "INVALID_COUNTRIES",
  /** Too many countries in comparison */
  TOO_MANY_COUNTRIES: "TOO_MANY_COUNTRIES",
  /** Invalid country parameter */
  INVALID_COUNTRY: "INVALID_COUNTRY",
  /** Invalid stages parameter */
  INVALID_STAGES: "INVALID_STAGES",
  /** Data source not found or unavailable */
  DATA_SOURCE_ERROR: "DATA_SOURCE_ERROR",
  /** Internal server error */
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];

export interface CountriesResponse {
  countries: string[];
}

// ─── Scenario Contracts ──────────────────────────────────────

export interface ScenarioAssumptionsDTO {
  indicatorOverrides?: Partial<{
    inflation: number;
    unemployment: number;
    housing_price_index: number;
    gdp_growth: number;
  }>;
  actorOverrides?: Array<{
    actorId: string;
    stance: "support" | "oppose" | "neutral";
  }>;
  sentimentShift?: number;
}

export interface ScenarioDTO {
  id: string;
  name: string;
  description: string;
  assumptions: ScenarioAssumptionsDTO;
}

export interface ScenarioRequest {
  policy: {
    id: string;
    title: string;
    description: string;
    domain: string;
    actors: string[];
    objectives: string[];
  };
  country: string;
  scenarios: ScenarioDTO[];
}

export interface ScenarioResultDTO {
  scenario: ScenarioDTO;
  pqi: PQIDTO;
  modifiedIndicators: {
    inflation: number;
    unemployment: number;
    housing_price_index: number;
    gdp_growth: number;
  };
}

export interface SensitivityEntryDTO {
  scenarioId: string;
  scenarioName: string;
  pqiScore: number;
  deltaFromBaseline: number;
}

export interface ScenarioResponse {
  scenarios: ScenarioResultDTO[];
  ranking: string[];
  bestCase: ScenarioResultDTO;
  worstCase: ScenarioResultDTO;
  sensitivityAnalysis: SensitivityEntryDTO[];
  durationMs: number;
  evaluatedAt: string;
}
