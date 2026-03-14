// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Public reaction analysis domain events.
 */

export interface PublicReactionAnalysisCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly dataPointCount: number;
  readonly approvalTrend: number;
  readonly durationMs: number;
}

export interface PublicReactionAnalysisFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const PublicReactionEventTypes = {
  PublicReactionAnalysisCompleted: "PublicReactionAnalysisCompleted",
  PublicReactionAnalysisFailed: "PublicReactionAnalysisFailed",
} as const;
