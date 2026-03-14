import type { PolicyContext } from "../context/policy-context";
import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";

/**
 * Housing Policy Evaluation Model
 *
 * Computes two key metrics that measure the socioeconomic pressure
 * of housing policies in a given economic context.
 *
 * ## Metrics
 *
 * ### housing_pressure
 * Formula: housing_price_index * (inflation / 10)
 *
 * Rationale: Captures how inflation amplifies housing cost pressure.
 * The housing price index (base 100) reflects absolute price level,
 * while inflation acts as a multiplier. Division by 10 normalizes
 * the inflation percentage into a scaling factor (e.g., 3.5% → 0.35).
 *
 * Interpretation:
 *   - < 30:  Low pressure — housing costs are manageable
 *   - 30-60: Moderate — emerging affordability concerns
 *   - 60-90: High — significant affordability crisis
 *   - > 90:  Critical — systemic housing emergency
 *
 * ### social_stress
 * Formula: unemployment * inflation
 *
 * Rationale: The "Misery Index" concept (Okun, 1962) — the product of
 * unemployment and inflation captures combined economic distress.
 * High values of both simultaneously indicate severe social strain.
 *
 * Interpretation:
 *   - < 20:  Low stress — stable socioeconomic conditions
 *   - 20-40: Moderate — noticeable public pressure
 *   - 40-60: High — risk of social unrest
 *   - > 60:  Critical — systemic instability
 */
export function evaluateHousingPolicy(decision: PolicyDecision, context: PolicyContext): PolicyMetric[] {
  const { inflation, unemployment, housing_price_index } = context.indicators;

  const housingPressure = housing_price_index * (inflation / 10);
  const socialStress = unemployment * inflation;

  return [
    {
      policyId: decision.id,
      metricName: "housing_pressure",
      value: Math.round(housingPressure * 100) / 100,
      source: "housing-policy-model",
      timestamp: new Date(),
      description:
        "Measures how inflation amplifies housing cost pressure. Based on housing price index scaled by inflation rate.",
    },
    {
      policyId: decision.id,
      metricName: "social_stress",
      value: Math.round(socialStress * 100) / 100,
      source: "housing-policy-model",
      timestamp: new Date(),
      description:
        "Misery Index variant: product of unemployment and inflation. Captures combined economic distress affecting citizens.",
    },
  ];
}
