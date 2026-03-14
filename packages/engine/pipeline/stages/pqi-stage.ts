// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";
import { computePQI } from "../pqi-calculator";

/**
 * Pipeline stage: Policy Quality Index computation.
 *
 * Reads domain metrics, actor analysis, and media metrics from the
 * pipeline context and computes the composite PQI score.
 *
 * This should always be the LAST stage in the pipeline.
 */
export function createPQIStage() {
  return (context: PipelineContext): PipelineStageResult => {
    const pqi = computePQI(
      context.domainMetrics,
      context.actorAnalysis,
      context.mediaMetrics,
      context.voteMetrics,
      context.judicialMetrics,
      context.evidenceMetrics,
      context.publicReactionMetrics,
    );

    // Store PQI in the context for the pipeline to extract
    const updates: Record<string, unknown> = {
      compositeMetrics: [
        {
          policyId: context.policy.id,
          metricName: "policy_quality_index",
          value: pqi.score,
          source: "pqi-calculator",
          description: pqi.summary,
          severity: pqi.grade === "A" || pqi.grade === "B" ? "low" : pqi.grade === "C" ? "moderate" : "high",
        },
      ],
      pqi,
    };

    return {
      stageName: "pqi_computation",
      metrics: updates.compositeMetrics as import("../../application/evaluate-policy.usecase").EvaluatedMetric[],
      contextUpdates: updates as Partial<PipelineContext>,
    };
  };
}
