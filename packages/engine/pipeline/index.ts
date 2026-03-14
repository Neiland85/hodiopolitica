// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Evaluation Pipeline — public API exports.
 */

export type {
  PipelineContext,
  PipelineResult,
  PipelineStage,
  PipelineStageResult,
  StageOutput,
} from "./evaluation-pipeline";

export { createEvaluationPipeline, EvaluationPipeline } from "./evaluation-pipeline";

export type { PolicyQualityIndex, PQIComponent, PQIGrade } from "./pqi-calculator";

export { computePQI } from "./pqi-calculator";
export { createActorAnalysisStage } from "./stages/actor-analysis-stage";
export { createDomainEvaluationStage } from "./stages/domain-evaluation-stage";
export { createMediaAnalysisStage } from "./stages/media-analysis-stage";
export { createPQIStage } from "./stages/pqi-stage";
