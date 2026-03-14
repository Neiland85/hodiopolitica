// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";
import type { ResearchMethodology, ResearchReference } from "./research-reference";

/**
 * Methodology weight — higher-quality designs contribute more.
 */
const METHODOLOGY_WEIGHTS: Record<ResearchMethodology, number> = {
  rct: 1.0,
  meta_analysis: 0.9,
  observational: 0.6,
  case_study: 0.4,
  expert_opinion: 0.2,
};

/**
 * Evidence Quality Model
 *
 * Computes three key metrics from research reference data.
 * Pure function — no side effects, deterministic output for given inputs.
 *
 * ## Metrics
 *
 * ### evidence_strength
 * Formula: avg(refs.map(r => methodWeight × min(citationCount/100, 1) × relevanceScore)) × 100
 *
 * Rationale: Combines methodology rigor, citation impact, and policy
 * relevance into a single evidence strength measure. Each reference
 * contributes based on its methodology quality, how widely cited it is,
 * and how relevant it is to the specific policy.
 *
 * Interpretation:
 *   - < 25:  Weak — insufficient or low-quality evidence
 *   - 25-50: Moderate — some credible evidence available
 *   - 50-75: Strong — substantial high-quality evidence
 *   - > 75:  Very strong — robust evidence base
 *
 * ### methodology_credibility
 * Formula: weighted avg of methodology tiers × 100
 *
 * Rationale: Evaluates the overall quality of research methodologies
 * used across all references. A body of evidence dominated by RCTs and
 * meta-analyses scores higher than one based on expert opinions.
 *
 * Interpretation:
 *   - < 30:  Low — mostly expert opinions and case studies
 *   - 30-60: Moderate — mix of observational and experimental
 *   - 60-80: High — predominantly experimental designs
 *   - > 80:  Very high — RCTs and meta-analyses dominate
 *
 * ### consensus_level
 * Formula: (supports - challenges) / total × 50 + 50 (mapped to 0-100)
 *
 * Rationale: Measures the degree of scientific consensus about the
 * policy's effectiveness. When most studies support the policy, consensus
 * is high. When studies are split, consensus is low (around 50).
 *
 * Interpretation:
 *   - < 30:  Strong counter-evidence — majority challenges the policy
 *   - 30-50: Divided — significant disagreement in evidence
 *   - 50-70: Moderate consensus — majority supports but with dissent
 *   - > 70:  Strong consensus — clear scientific support
 */
export function evaluateEvidenceBase(decision: PolicyDecision, refs: ResearchReference[]): PolicyMetric[] {
  if (refs.length === 0) {
    return [
      createMetric(decision.id, "evidence_strength", 0, "No research references available — no evidence base."),
      createMetric(
        decision.id,
        "methodology_credibility",
        0,
        "No research references available — no methodology to assess.",
      ),
      createMetric(decision.id, "consensus_level", 50, "No research references available — neutral consensus default."),
    ];
  }

  // Metric 1: Evidence Strength
  let strengthSum = 0;
  for (const ref of refs) {
    const methodWeight = METHODOLOGY_WEIGHTS[ref.methodology];
    const citationFactor = Math.min(ref.citationCount / 100, 1);
    strengthSum += methodWeight * citationFactor * ref.relevanceScore;
  }
  const evidenceStrength = (strengthSum / refs.length) * 100;

  // Metric 2: Methodology Credibility
  let credibilitySum = 0;
  for (const ref of refs) {
    credibilitySum += METHODOLOGY_WEIGHTS[ref.methodology];
  }
  const methodologyCredibility = (credibilitySum / refs.length) * 100;

  // Metric 3: Consensus Level
  const supports = refs.filter((r) => r.policyAlignment === "supports").length;
  const challenges = refs.filter((r) => r.policyAlignment === "challenges").length;
  const total = refs.length;
  const consensusLevel = ((supports - challenges) / total) * 50 + 50;

  return [
    createMetric(
      decision.id,
      "evidence_strength",
      round(evidenceStrength),
      "Strength of scientific evidence combining methodology quality, citations, and policy relevance.",
    ),
    createMetric(
      decision.id,
      "methodology_credibility",
      round(methodologyCredibility),
      "Overall quality of research methodologies across the evidence base.",
    ),
    createMetric(
      decision.id,
      "consensus_level",
      round(consensusLevel),
      "Degree of scientific consensus about the policy's effectiveness.",
    ),
  ];
}

function createMetric(policyId: string, metricName: string, value: number, description: string): PolicyMetric {
  return {
    policyId,
    metricName,
    value,
    source: "evidence-quality-model",
    timestamp: new Date(),
    description,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
