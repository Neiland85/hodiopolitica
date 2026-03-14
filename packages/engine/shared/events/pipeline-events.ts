// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Pipeline domain events — published during full evaluation workflows.
 */

export interface FullEvaluationCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly stagesExecuted: string[];
  readonly pqiScore: number;
  readonly pqiGrade: string;
  readonly durationMs: number;
}

export interface FullEvaluationFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const PipelineEventTypes = {
  FullEvaluationCompleted: "FullEvaluationCompleted",
  FullEvaluationFailed: "FullEvaluationFailed",
} as const;
