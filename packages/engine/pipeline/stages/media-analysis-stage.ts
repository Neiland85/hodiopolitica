// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EvaluatedMetric } from "../../application/evaluate-policy.usecase";
import { evaluateMediaInfluence } from "../../media/media-influence-model";
import type { MetricThresholds } from "../../metrics/policy-metric";
import { classifyMetricSeverity } from "../../metrics/policy-metric";
import type { MediaCoverageRepository } from "../../repositories/media-coverage-repository";
import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";

const MEDIA_THRESHOLDS: Record<string, MetricThresholds> = {
  media_influence_score: { moderate: 30, high: 60, critical: 90 },
  narrative_distortion_index: { moderate: 25, high: 50, critical: 75 },
  polarization_amplification: { moderate: 20, high: 50, critical: 80 },
};

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Pipeline stage: Media Analysis
 *
 * Wraps evaluateMediaInfluence() as a pipeline stage.
 * Loads media coverage and computes influence metrics.
 */
export function createMediaAnalysisStage(mediaRepo: MediaCoverageRepository) {
  return (context: PipelineContext): PipelineStageResult => {
    const coverageResult = mediaRepo.findByPolicy(context.policy.id, context.country);

    if (!coverageResult.ok) {
      throw new Error(`Media analysis failed: ${coverageResult.error.message}`);
    }

    const rawMetrics = evaluateMediaInfluence(context.policy, coverageResult.value);

    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, MEDIA_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS),
    }));

    return {
      stageName: "media_analysis",
      metrics,
      contextUpdates: { mediaMetrics: metrics },
    };
  };
}
