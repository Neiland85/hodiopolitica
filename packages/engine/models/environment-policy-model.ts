// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyContext } from "../context/policy-context";
import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";

/**
 * Environment Policy Evaluation Model
 *
 * Computes metrics that measure a country's capacity to implement
 * green transition policies and the economic cost of environmental regulation.
 *
 * ## Metrics
 *
 * ### green_transition_capacity
 * Formula: 100 - (unemployment * 4) + (gdp_growth * 12) - (inflation * 2)
 * Clamped to 0-100.
 *
 * Rationale: Green transition requires investment capacity (GDP growth
 * weighted 12x as the primary enabler), low unemployment for workforce
 * retraining (4x negative impact), and price stability (inflation 2x
 * negative). Based on EU Green Deal prerequisites — countries need
 * fiscal room and labor flexibility to decarbonize.
 *
 * Interpretation:
 *   - > 70:  Low severity — strong transition capacity
 *   - 50-70: Moderate — feasible with targeted investment
 *   - 30-50: High — transition significantly constrained
 *   - < 30:  Critical — green transition economically unviable
 *
 * ### environmental_policy_cost
 * Formula: (housing_price_index / 20) * (inflation / 3) + unemployment * 1.5
 *
 * Rationale: Environmental regulations increase construction costs
 * (housing index as a proxy for building sector impact, scaled by 1/20),
 * amplified by inflation (scaled by 1/3), while unemployment constrains
 * adaptation capacity (1.5x weight). Higher values indicate greater
 * economic burden of environmental policies.
 *
 * Interpretation:
 *   - < 20:  Low — environmental policy costs are manageable
 *   - 20-40: Moderate — noticeable but acceptable cost burden
 *   - 40-60: High — significant economic impact
 *   - > 60:  Critical — environmental regulation economically prohibitive
 */
export function evaluateEnvironmentPolicy(decision: PolicyDecision, context: PolicyContext): PolicyMetric[] {
  const { inflation, unemployment, housing_price_index, gdp_growth } = context.indicators;

  // Green transition capacity (inverted — higher is better, clamped 0-100)
  const rawCapacity = 100 - unemployment * 4 + gdp_growth * 12 - inflation * 2;
  const greenTransitionCapacity = Math.round(Math.max(0, Math.min(100, rawCapacity)) * 100) / 100;

  // Environmental policy cost (not clamped — reflects raw economic burden)
  const environmentalPolicyCost =
    Math.round(((housing_price_index / 20) * (inflation / 3) + unemployment * 1.5) * 100) / 100;

  return [
    {
      policyId: decision.id,
      metricName: "green_transition_capacity",
      value: greenTransitionCapacity,
      source: "environment-policy-model",
      timestamp: new Date(),
      description:
        "Inverted index (100 = ideal): measures capacity for green transition. GDP growth enables investment (12x), unemployment blocks retraining (4x), inflation erodes funding (2x). Based on EU Green Deal prerequisites.",
    },
    {
      policyId: decision.id,
      metricName: "environmental_policy_cost",
      value: environmentalPolicyCost,
      source: "environment-policy-model",
      timestamp: new Date(),
      description:
        "Economic cost of environmental regulation: housing index proxies construction impact (amplified by inflation), unemployment constrains adaptation capacity. Higher values indicate greater policy burden.",
    },
  ];
}
