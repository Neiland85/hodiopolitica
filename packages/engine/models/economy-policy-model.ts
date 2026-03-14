// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyContext } from "../context/policy-context";
import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";

/**
 * Economy Policy Evaluation Model
 *
 * Computes metrics that measure macroeconomic stability and
 * fiscal pressure conditions affecting economic policy decisions.
 *
 * ## Metrics
 *
 * ### economic_stability_index
 * Formula: 100 - (inflation * 5) - (unemployment * 3) + (gdp_growth * 8)
 * Clamped to 0-100.
 *
 * Rationale: Composite stability metric based on Phillips curve dynamics.
 * Inflation destabilizes prices (5x weight reflects its outsized impact
 * on consumer confidence), unemployment indicates labor market weakness
 * (3x), and GDP growth is the primary stabilizer (8x positive as the
 * strongest signal of economic health).
 *
 * Interpretation:
 *   - > 70:  Low severity — stable macroeconomic conditions
 *   - 50-70: Moderate — emerging instability risks
 *   - 30-50: High — significant economic vulnerability
 *   - < 30:  Critical — macroeconomic crisis conditions
 *
 * ### fiscal_pressure_index
 * Formula: (unemployment * inflation) + (housing_price_index / 10)
 *
 * Rationale: Combines Okun's Misery Index (unemployment x inflation)
 * with housing cost burden. Higher values indicate greater fiscal strain
 * on government budgets — rising welfare costs from unemployment,
 * eroded tax revenues from inflation, and housing subsidy pressure
 * from elevated property prices.
 *
 * Interpretation:
 *   - < 30:  Low — sustainable fiscal position
 *   - 30-50: Moderate — manageable but growing pressure
 *   - 50-80: High — significant fiscal strain
 *   - > 80:  Critical — unsustainable fiscal trajectory
 */
export function evaluateEconomyPolicy(decision: PolicyDecision, context: PolicyContext): PolicyMetric[] {
  const { inflation, unemployment, housing_price_index, gdp_growth } = context.indicators;

  // Economic stability index (inverted — higher is better, clamped 0-100)
  const rawStability = 100 - inflation * 5 - unemployment * 3 + gdp_growth * 8;
  const economicStability = Math.round(Math.max(0, Math.min(100, rawStability)) * 100) / 100;

  // Fiscal pressure index (not clamped — can exceed 100 in extreme scenarios)
  const fiscalPressure = Math.round((unemployment * inflation + housing_price_index / 10) * 100) / 100;

  return [
    {
      policyId: decision.id,
      metricName: "economic_stability_index",
      value: economicStability,
      source: "economy-policy-model",
      timestamp: new Date(),
      description:
        "Composite stability metric based on Phillips curve dynamics. Inflation destabilizes prices (5x), unemployment weakens labor market (3x), GDP growth stabilizes (8x positive). Clamped 0-100.",
    },
    {
      policyId: decision.id,
      metricName: "fiscal_pressure_index",
      value: fiscalPressure,
      source: "economy-policy-model",
      timestamp: new Date(),
      description:
        "Combines Okun's Misery Index (unemployment x inflation) with housing cost burden. Higher values indicate greater fiscal strain on government budgets.",
    },
  ];
}
