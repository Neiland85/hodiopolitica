import type { PolicyContext } from "../context/policy-context";
import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";

/**
 * Education Policy Evaluation Model
 *
 * Computes metrics that measure the socioeconomic conditions
 * affecting education policy effectiveness.
 *
 * ## Metrics
 *
 * ### education_investment_gap
 * Formula: (gdp_growth < 1.5) ? (1.5 - gdp_growth) * unemployment : 0
 *
 * Rationale: When GDP growth is below the EU convergence threshold (1.5%),
 * education budgets face austerity pressure. The gap is amplified by
 * unemployment, which increases demand for retraining programs while
 * simultaneously reducing tax revenue for funding.
 *
 * Interpretation:
 *   - 0:    No gap — GDP growth is sufficient
 *   - < 10: Low gap — manageable with existing budgets
 *   - 10-25: Moderate — requires policy intervention
 *   - > 25: Critical — structural underfunding risk
 *
 * ### youth_opportunity_index
 * Formula: 100 - (unemployment * 2.5) - (inflation * 1.5)
 *
 * Rationale: An inverted index where 100 = ideal conditions for youth.
 * Youth unemployment typically runs ~2.5x the general rate (Eurostat),
 * and inflation erodes the real value of education grants/loans at ~1.5x
 * the headline rate due to faster cost growth in education services.
 *
 * Interpretation:
 *   - > 70:  Good — strong youth economic prospects
 *   - 50-70: Moderate — some barriers to youth opportunity
 *   - 30-50: Poor — significant youth disadvantage
 *   - < 30:  Critical — generational opportunity crisis
 */
export function evaluateEducationPolicy(decision: PolicyDecision, context: PolicyContext): PolicyMetric[] {
  const { inflation, unemployment, gdp_growth } = context.indicators;

  // Education investment gap
  const gdpThreshold = 1.5;
  const investmentGap =
    gdp_growth < gdpThreshold ? Math.round((gdpThreshold - gdp_growth) * unemployment * 100) / 100 : 0;

  // Youth opportunity index (inverted — higher is better)
  const rawOpportunity = 100 - unemployment * 2.5 - inflation * 1.5;
  const youthOpportunity = Math.round(Math.max(0, Math.min(100, rawOpportunity)) * 100) / 100;

  return [
    {
      policyId: decision.id,
      metricName: "education_investment_gap",
      value: investmentGap,
      source: "education-policy-model",
      timestamp: new Date(),
      description:
        "Measures underfunding risk when GDP growth falls below EU convergence threshold (1.5%), amplified by unemployment pressure on retraining demand.",
    },
    {
      policyId: decision.id,
      metricName: "youth_opportunity_index",
      value: youthOpportunity,
      source: "education-policy-model",
      timestamp: new Date(),
      description:
        "Inverted index (100 = ideal): captures youth economic prospects by accounting for amplified unemployment (2.5x) and inflation impact on education costs (1.5x).",
    },
  ];
}
