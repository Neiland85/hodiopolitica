// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Vote analysis domain events — published during vote analysis workflows.
 */

export interface VoteAnalysisCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly recordCount: number;
  readonly passageProbability: number;
  readonly durationMs: number;
}

export interface VoteAnalysisFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const VoteEventTypes = {
  VoteAnalysisCompleted: "VoteAnalysisCompleted",
  VoteAnalysisFailed: "VoteAnalysisFailed",
} as const;
