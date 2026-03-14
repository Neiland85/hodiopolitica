// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EvaluatedMetric } from "../../application/evaluate-policy.usecase";
import { evaluateJudicialRisk } from "../../judicial/judicial-risk-model";
import type { MetricThresholds } from "../../metrics/policy-metric";
import { classifyMetricSeverity } from "../../metrics/policy-metric";
import type { JudicialActionRepository } from "../../repositories/judicial-action-repository";
import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";

const JUDICIAL_THRESHOLDS: Record<string, MetricThresholds> = {
  legal_challenge_risk: { moderate: 25, high: 50, critical: 75 },
  constitutional_compatibility: { moderate: 40, high: 60, critical: 80 },
  enforcement_uncertainty: { moderate: 20, high: 50, critical: 80 },
};

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Pipeline stage: Judicial Risk Analysis
 *
 * Wraps evaluateJudicialRisk() as a pipeline stage.
 * Loads judicial actions and computes legal risk metrics.
 */
export function createJudicialRiskStage(judicialRepo: JudicialActionRepository) {
  return (context: PipelineContext): PipelineStageResult => {
    const actionsResult = judicialRepo.findByPolicy(context.policy.id, context.country);

    if (!actionsResult.ok) {
      throw new Error(`Judicial risk analysis failed: ${actionsResult.error.message}`);
    }

    const rawMetrics = evaluateJudicialRisk(context.policy, actionsResult.value);

    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, JUDICIAL_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS),
    }));

    return {
      stageName: "judicial_risk",
      metrics,
      contextUpdates: { judicialMetrics: metrics },
    };
  };
}
