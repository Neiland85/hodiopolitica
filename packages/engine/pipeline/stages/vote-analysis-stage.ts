// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EvaluatedMetric } from "../../application/evaluate-policy.usecase";
import type { MetricThresholds } from "../../metrics/policy-metric";
import { classifyMetricSeverity } from "../../metrics/policy-metric";
import type { VoteRepository } from "../../repositories/vote-repository";
import { analyzeVotes } from "../../votes/vote-analysis-model";
import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";

const VOTE_THRESHOLDS: Record<string, MetricThresholds> = {
  passage_probability: { moderate: 40, high: 55, critical: 70 },
  amendment_risk: { moderate: 30, high: 50, critical: 75 },
  coalition_stability: { moderate: 40, high: 60, critical: 80 },
};

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Pipeline stage: Vote Analysis
 *
 * Wraps analyzeVotes() as a pipeline stage.
 * Loads parliamentary vote records and computes institutional metrics.
 */
export function createVoteAnalysisStage(voteRepo: VoteRepository) {
  return (context: PipelineContext): PipelineStageResult => {
    const recordsResult = voteRepo.findByPolicy(context.policy.id, context.country);

    if (!recordsResult.ok) {
      throw new Error(`Vote analysis failed: ${recordsResult.error.message}`);
    }

    const rawMetrics = analyzeVotes(context.policy, recordsResult.value);

    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, VOTE_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS),
    }));

    return {
      stageName: "vote_analysis",
      metrics,
      contextUpdates: { voteMetrics: metrics },
    };
  };
}
