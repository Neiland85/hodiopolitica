// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyContext } from "../context/policy-context";
import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";

/**
 * Healthcare Policy Evaluation Model
 *
 * Computes metrics that measure the socioeconomic conditions
 * affecting healthcare policy sustainability and access.
 *
 * ## Metrics
 *
 * ### healthcare_access_pressure
 * Formula: unemployment * (inflation / 5) + (100 - gdp_growth * 10)
 * Clamped to 0-100.
 *
 * Rationale: Higher unemployment reduces private insurance coverage,
 * inflation erodes healthcare purchasing power, and low GDP growth
 * reduces public health budgets. The formula captures both demand-side
 * pressure (unemployment losing coverage) and supply-side constraints
 * (inflation + weak GDP limiting funding).
 *
 * Interpretation:
 *   - < 30:  Low pressure — healthcare system is well-funded
 *   - 30-60: Moderate — emerging access concerns
 *   - 60-80: High — significant access barriers
 *   - > 80:  Critical — systemic healthcare access crisis
 *
 * ### public_health_sustainability
 * Formula: 100 - (inflation * 3) - (unemployment * 2) + (gdp_growth * 5)
 * Clamped to 0-100.
 *
 * Rationale: Inverted index (100 = ideal). Inflation increases medical
 * costs (3x multiplier reflects healthcare cost inflation typically
 * exceeding headline CPI), unemployment reduces tax revenue for the
 * health system (2x), and GDP growth funds expansion (5x positive).
 *
 * Interpretation:
 *   - > 70:  Low severity — sustainable public health system
 *   - 50-70: Moderate — funding pressures emerging
 *   - 30-50: High — system sustainability at risk
 *   - < 30:  Critical — public health system under severe strain
 */
export function evaluateHealthcarePolicy(decision: PolicyDecision, context: PolicyContext): PolicyMetric[] {
  const { inflation, unemployment, gdp_growth } = context.indicators;

  // Healthcare access pressure (clamped 0-100)
  const rawAccessPressure = unemployment * (inflation / 5) + (100 - gdp_growth * 10);
  const healthcareAccessPressure = Math.round(Math.max(0, Math.min(100, rawAccessPressure)) * 100) / 100;

  // Public health sustainability (inverted — higher is better, clamped 0-100)
  const rawSustainability = 100 - inflation * 3 - unemployment * 2 + gdp_growth * 5;
  const publicHealthSustainability = Math.round(Math.max(0, Math.min(100, rawSustainability)) * 100) / 100;

  return [
    {
      policyId: decision.id,
      metricName: "healthcare_access_pressure",
      value: healthcareAccessPressure,
      source: "healthcare-policy-model",
      timestamp: new Date(),
      description:
        "Measures healthcare access barriers from unemployment (reducing coverage), inflation (eroding purchasing power), and low GDP growth (limiting public health budgets). Clamped 0-100.",
    },
    {
      policyId: decision.id,
      metricName: "public_health_sustainability",
      value: publicHealthSustainability,
      source: "healthcare-policy-model",
      timestamp: new Date(),
      description:
        "Inverted index (100 = ideal): captures public health system sustainability. Inflation increases medical costs (3x), unemployment reduces tax revenue (2x), GDP growth funds expansion (5x positive).",
    },
  ];
}
