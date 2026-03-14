// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EvaluatedMetric } from "../../application/evaluate-policy.usecase";
import type { MetricThresholds } from "../../metrics/policy-metric";
import { classifyMetricSeverity } from "../../metrics/policy-metric";
import type { ResearchReferenceRepository } from "../../repositories/research-reference-repository";
import { evaluateEvidenceBase } from "../../research/evidence-quality-model";
import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";

const EVIDENCE_THRESHOLDS: Record<string, MetricThresholds> = {
  evidence_strength: { moderate: 25, high: 50, critical: 75 },
  methodology_credibility: { moderate: 30, high: 60, critical: 80 },
  consensus_level: { moderate: 30, high: 50, critical: 70 },
};

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Pipeline stage: Evidence Validation
 *
 * Wraps evaluateEvidenceBase() as a pipeline stage.
 * Loads research references and computes evidence quality metrics.
 */
export function createEvidenceValidationStage(researchRepo: ResearchReferenceRepository) {
  return (context: PipelineContext): PipelineStageResult => {
    const refsResult = researchRepo.findByPolicy(context.policy.id, context.country);

    if (!refsResult.ok) {
      throw new Error(`Evidence validation failed: ${refsResult.error.message}`);
    }

    const rawMetrics = evaluateEvidenceBase(context.policy, refsResult.value);

    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, EVIDENCE_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS),
    }));

    return {
      stageName: "evidence_validation",
      metrics,
      contextUpdates: { evidenceMetrics: metrics },
    };
  };
}
