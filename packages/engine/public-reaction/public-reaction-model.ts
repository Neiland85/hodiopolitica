// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";
import type { PublicReactionTimeSeries } from "./public-reaction";

/**
 * Public Reaction Model
 *
 * Computes three key metrics from public reaction time series data.
 * Pure function — no side effects, deterministic output for given inputs.
 *
 * ## Metrics
 *
 * ### approval_trend
 * Formula: linear regression slope of approvalRating × 10 (mapped to -100..100)
 *
 * Rationale: Captures the direction and velocity of public opinion change.
 * A positive trend means growing support; negative means declining.
 * The × 10 scaling makes the metric sensitive to meaningful shifts.
 *
 * Interpretation:
 *   - < -30: Rapidly declining — public is turning against the policy
 *   - -30-0: Slowly declining — erosion of support
 *   - 0-30:  Slowly improving — gradual acceptance
 *   - > 30:  Rapidly improving — strong public endorsement trend
 *
 * ### protest_risk
 * Formula: max(protestIntensity) × 50 + trend(protestIntensity) × 50
 *
 * Rationale: Combines the peak protest level with the trend direction.
 * High peak intensity indicates organized resistance, while an upward
 * trend signals escalating unrest.
 *
 * Interpretation:
 *   - < 20:  Low — minimal protest activity
 *   - 20-50: Moderate — notable public demonstrations
 *   - 50-80: High — significant sustained protests
 *   - > 80:  Critical — social crisis level protests
 *
 * ### electoral_impact
 * Formula: avg(electoralShift) × 10 (capped at ±100)
 *
 * Rationale: Averages electoral shift measurements and scales them
 * to capture the political consequence of the policy. Positive values
 * indicate the governing party benefits; negative values indicate damage.
 *
 * Interpretation:
 *   - < -30: Severe negative — policy is electoral poison
 *   - -30-0: Mild negative — some electoral cost
 *   - 0-30:  Mild positive — modest electoral benefit
 *   - > 30:  Strong positive — policy is an electoral asset
 */
export function analyzePublicReaction(decision: PolicyDecision, timeSeries: PublicReactionTimeSeries): PolicyMetric[] {
  const points = timeSeries.dataPoints;

  if (points.length === 0) {
    return [
      createMetric(decision.id, "approval_trend", 0, "No public reaction data — neutral default."),
      createMetric(decision.id, "protest_risk", 0, "No public reaction data — no protest risk."),
      createMetric(decision.id, "electoral_impact", 0, "No public reaction data — no electoral impact."),
    ];
  }

  // Metric 1: Approval Trend (linear regression slope × 10)
  const approvalValues = points.map((p) => p.approvalRating);
  const approvalSlope = linearRegressionSlope(approvalValues);
  const approvalTrend = clamp(approvalSlope * 10, -100, 100);

  // Metric 2: Protest Risk
  const maxProtest = Math.max(...points.map((p) => p.protestIntensity));
  const protestValues = points.map((p) => p.protestIntensity);
  const protestTrend = linearRegressionSlope(protestValues);
  const protestRisk = clamp(maxProtest * 50 + Math.max(protestTrend, 0) * 50, 0, 100);

  // Metric 3: Electoral Impact
  const avgShift = points.reduce((sum, p) => sum + p.electoralShift, 0) / points.length;
  const electoralImpact = clamp(avgShift * 10, -100, 100);

  return [
    createMetric(
      decision.id,
      "approval_trend",
      round(approvalTrend),
      "Direction and velocity of public opinion change over time.",
    ),
    createMetric(
      decision.id,
      "protest_risk",
      round(protestRisk),
      "Risk from organized public protests combining peak intensity and trend.",
    ),
    createMetric(
      decision.id,
      "electoral_impact",
      round(electoralImpact),
      "Electoral consequence of the policy on governing party support.",
    ),
  ];
}

/**
 * Computes the slope of a simple linear regression over equally-spaced values.
 *
 * Uses the least-squares method with indices as x-values.
 * Returns the slope per time step.
 */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    numerator += xDiff * (values[i] - yMean);
    denominator += xDiff * xDiff;
  }

  return denominator !== 0 ? numerator / denominator : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createMetric(policyId: string, metricName: string, value: number, description: string): PolicyMetric {
  return {
    policyId,
    metricName,
    value,
    source: "public-reaction-model",
    timestamp: new Date(),
    description,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
