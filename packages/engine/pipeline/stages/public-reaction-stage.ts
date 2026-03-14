// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EvaluatedMetric } from "../../application/evaluate-policy.usecase";
import type { MetricThresholds } from "../../metrics/policy-metric";
import { classifyMetricSeverity } from "../../metrics/policy-metric";
import { analyzePublicReaction } from "../../public-reaction/public-reaction-model";
import type { PublicReactionRepository } from "../../repositories/public-reaction-repository";
import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";

const REACTION_THRESHOLDS: Record<string, MetricThresholds> = {
  approval_trend: { moderate: -30, high: 0, critical: 30 },
  protest_risk: { moderate: 20, high: 50, critical: 80 },
  electoral_impact: { moderate: -30, high: 0, critical: 30 },
};

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Pipeline stage: Public Reaction Analysis
 *
 * Wraps analyzePublicReaction() as a pipeline stage.
 * Loads public reaction time series and computes sentiment metrics.
 */
export function createPublicReactionStage(reactionRepo: PublicReactionRepository) {
  return (context: PipelineContext): PipelineStageResult => {
    const seriesResult = reactionRepo.findByPolicy(context.policy.id, context.country);

    if (!seriesResult.ok) {
      throw new Error(`Public reaction analysis failed: ${seriesResult.error.message}`);
    }

    const rawMetrics = analyzePublicReaction(context.policy, seriesResult.value);

    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, REACTION_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS),
    }));

    return {
      stageName: "public_reaction",
      metrics,
      contextUpdates: { publicReactionMetrics: metrics },
    };
  };
}
