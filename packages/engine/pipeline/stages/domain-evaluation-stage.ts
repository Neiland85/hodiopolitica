// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { evaluatePolicy } from "../../analysis/policy-engine";
import type { EvaluatedMetric } from "../../application/evaluate-policy.usecase";
import type { PolicyContext } from "../../context/policy-context";
import type { MetricThresholds } from "../../metrics/policy-metric";
import { classifyMetricSeverity } from "../../metrics/policy-metric";
import type { EconomicContextRepository } from "../../repositories/economic-context-repository";
import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Pipeline stage: Domain Evaluation
 *
 * Wraps the existing evaluatePolicy() function as a pipeline stage.
 * Loads economic context from the repository and runs domain-specific
 * evaluation models.
 */
export function createDomainEvaluationStage(contextRepo: EconomicContextRepository) {
  return (context: PipelineContext): PipelineStageResult => {
    const contextResult = contextRepo.findByCountry(context.country);

    if (!contextResult.ok) {
      throw new Error(`Domain evaluation failed: ${contextResult.error.message}`);
    }

    const economicContext: PolicyContext = contextResult.value;
    const rawMetrics = evaluatePolicy(context.policy, economicContext);

    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, DEFAULT_THRESHOLDS),
    }));

    return {
      stageName: "domain_evaluation",
      metrics,
      contextUpdates: { domainMetrics: metrics },
    };
  };
}
