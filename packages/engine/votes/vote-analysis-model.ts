// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";
import type { VoteRecord } from "./vote-record";

/**
 * Vote Analysis Model
 *
 * Computes three key metrics from parliamentary voting data.
 * Pure function — no side effects, deterministic output for given inputs.
 *
 * ## Metrics
 *
 * ### passage_probability
 * Formula: votesFor / (votesFor + votesAgainst) × 100
 *
 * Rationale: Measures the likelihood of policy approval based on actual
 * vote tallies. Abstentions are excluded since they don't count toward
 * passage in most parliamentary systems.
 *
 * Interpretation:
 *   - < 40:  Very unlikely — strong opposition dominates
 *   - 40-55: Uncertain — close vote, could go either way
 *   - 55-70: Likely — comfortable margin for passage
 *   - > 70:  Very likely — broad parliamentary support
 *
 * ### amendment_risk
 * Formula: pendingAmendments × 15 (capped at 100)
 *
 * Rationale: Pending amendments represent unresolved legislative friction.
 * Each pending amendment adds 15 points of risk, reflecting the potential
 * for the policy to be significantly altered from its original intent.
 *
 * Interpretation:
 *   - < 30:  Low — few modifications expected
 *   - 30-50: Moderate — notable legislative negotiation pending
 *   - 50-75: High — substantial policy changes likely
 *   - > 75:  Critical — policy may be unrecognizable after amendments
 *
 * ### coalition_stability
 * Formula: 100 - (abstentions / totalVoters × 100) - (amendmentRisk × 0.3)
 *
 * Rationale: Stability of the supporting coalition is eroded by
 * abstentions (indicating wavering support) and amendment pressure
 * (indicating disagreement on specifics). This composite captures
 * both direct defection risk and legislative friction.
 *
 * Interpretation:
 *   - > 80:  Stable — strong, unified coalition
 *   - 60-80: Moderate — some internal tensions
 *   - 40-60: Fragile — significant coalition management needed
 *   - < 40:  Unstable — coalition at risk of collapse
 */
export function analyzeVotes(decision: PolicyDecision, records: VoteRecord[]): PolicyMetric[] {
  if (records.length === 0) {
    return [
      createMetric(decision.id, "passage_probability", 50, "No vote records available — neutral default."),
      createMetric(decision.id, "amendment_risk", 0, "No vote records available — no amendment data."),
      createMetric(decision.id, "coalition_stability", 50, "No vote records available — neutral default."),
    ];
  }

  // Aggregate across all vote records (multiple chambers/sessions)
  let totalFor = 0;
  let totalAgainst = 0;
  let totalAbstentions = 0;
  let totalVoters = 0;
  let totalPendingAmendments = 0;

  for (const record of records) {
    totalFor += record.votesFor;
    totalAgainst += record.votesAgainst;
    totalAbstentions += record.abstentions;
    totalVoters += record.votesFor + record.votesAgainst + record.abstentions;
    totalPendingAmendments += record.amendments.filter((a) => a.status === "pending").length;
  }

  // Metric 1: Passage Probability
  const effectiveVotes = totalFor + totalAgainst;
  const passageProbability = effectiveVotes > 0 ? (totalFor / effectiveVotes) * 100 : 50;

  // Metric 2: Amendment Risk
  const amendmentRisk = Math.min(totalPendingAmendments * 15, 100);

  // Metric 3: Coalition Stability
  const abstentionPenalty = totalVoters > 0 ? (totalAbstentions / totalVoters) * 100 : 0;
  const coalitionStability = Math.max(100 - abstentionPenalty - amendmentRisk * 0.3, 0);

  return [
    createMetric(
      decision.id,
      "passage_probability",
      round(passageProbability),
      "Likelihood of policy approval based on parliamentary vote tallies.",
    ),
    createMetric(
      decision.id,
      "amendment_risk",
      round(amendmentRisk),
      "Risk of significant policy changes from pending legislative amendments.",
    ),
    createMetric(
      decision.id,
      "coalition_stability",
      round(coalitionStability),
      "Stability of the supporting coalition based on abstentions and amendment pressure.",
    ),
  ];
}

function createMetric(policyId: string, metricName: string, value: number, description: string): PolicyMetric {
  return {
    policyId,
    metricName,
    value,
    source: "vote-analysis-model",
    timestamp: new Date(),
    description,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
