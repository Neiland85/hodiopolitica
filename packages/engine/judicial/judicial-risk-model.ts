// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";
import type { JudicialAction } from "./judicial-action";

/**
 * Judicial Risk Model
 *
 * Computes three key metrics from judicial proceedings data.
 * Pure function — no side effects, deterministic output for given inputs.
 *
 * ## Metrics
 *
 * ### legal_challenge_risk
 * Formula: pending_cases × 20 + decided_against × 30 (capped at 100)
 *
 * Rationale: Each pending case adds uncertainty (20 points), while
 * each adverse ruling (struck_down) adds substantial risk (30 points)
 * as it demonstrates active judicial hostility toward the policy.
 *
 * Interpretation:
 *   - < 25:  Low — minimal legal exposure
 *   - 25-50: Moderate — notable legal challenges pending
 *   - 50-75: High — significant judicial opposition
 *   - > 75:  Critical — policy faces existential legal threat
 *
 * ### constitutional_compatibility
 * Formula: 100 - (constitutional_reviews × 25) - (struck_down × 40)
 *
 * Rationale: Constitutional reviews inherently question a policy's
 * legal foundation (25 points each), and any ruling striking down
 * the policy is a severe constitutional blow (40 points each).
 *
 * Interpretation:
 *   - > 80:  Strong — no constitutional concerns
 *   - 60-80: Adequate — minor constitutional questions
 *   - 40-60: Weak — significant constitutional doubts
 *   - < 40:  Critical — likely unconstitutional
 *
 * ### enforcement_uncertainty
 * Formula: (pending / total × 50) + (injunctions × 20) (capped at 100)
 *
 * Rationale: Pending cases create uncertainty about whether the policy
 * can be enforced (proportional to total caseload), while each
 * injunction directly blocks enforcement (20 points each).
 *
 * Interpretation:
 *   - < 20:  Low — policy can be enforced confidently
 *   - 20-50: Moderate — some enforcement risk
 *   - 50-80: High — enforcement may be blocked
 *   - > 80:  Critical — policy likely unenforceable
 */
export function evaluateJudicialRisk(decision: PolicyDecision, actions: JudicialAction[]): PolicyMetric[] {
  if (actions.length === 0) {
    return [
      createMetric(decision.id, "legal_challenge_risk", 0, "No judicial actions filed — no legal challenge risk."),
      createMetric(
        decision.id,
        "constitutional_compatibility",
        100,
        "No judicial actions filed — constitutional compatibility assumed.",
      ),
      createMetric(
        decision.id,
        "enforcement_uncertainty",
        0,
        "No judicial actions filed — no enforcement uncertainty.",
      ),
    ];
  }

  const pendingCases = actions.filter((a) => a.status === "pending").length;
  const decidedAgainst = actions.filter((a) => a.status === "decided" && a.ruling === "struck_down").length;
  const constitutionalReviews = actions.filter((a) => a.type === "constitutional_review").length;
  const injunctions = actions.filter((a) => a.type === "injunction").length;
  const totalCases = actions.length;

  // Metric 1: Legal Challenge Risk
  const legalChallengeRisk = Math.min(pendingCases * 20 + decidedAgainst * 30, 100);

  // Metric 2: Constitutional Compatibility
  const constitutionalCompatibility = Math.max(100 - constitutionalReviews * 25 - decidedAgainst * 40, 0);

  // Metric 3: Enforcement Uncertainty
  const pendingRatio = totalCases > 0 ? pendingCases / totalCases : 0;
  const enforcementUncertainty = Math.min(pendingRatio * 50 + injunctions * 20, 100);

  return [
    createMetric(
      decision.id,
      "legal_challenge_risk",
      round(legalChallengeRisk),
      "Risk from pending legal challenges and adverse judicial rulings.",
    ),
    createMetric(
      decision.id,
      "constitutional_compatibility",
      round(constitutionalCompatibility),
      "Compatibility with constitutional framework based on judicial review history.",
    ),
    createMetric(
      decision.id,
      "enforcement_uncertainty",
      round(enforcementUncertainty),
      "Uncertainty in policy enforcement due to pending cases and injunctions.",
    ),
  ];
}

function createMetric(policyId: string, metricName: string, value: number, description: string): PolicyMetric {
  return {
    policyId,
    metricName,
    value,
    source: "judicial-risk-model",
    timestamp: new Date(),
    description,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
