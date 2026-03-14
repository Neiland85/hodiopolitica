// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Media domain events — published during media analysis workflows.
 */

export interface MediaAnalysisCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly mediaInfluenceScore: number;
  readonly narrativeDistortionIndex: number;
  readonly polarizationAmplification: number;
  readonly durationMs: number;
}

export interface MediaAnalysisFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const MediaEventTypes = {
  MediaAnalysisCompleted: "MediaAnalysisCompleted",
  MediaAnalysisFailed: "MediaAnalysisFailed",
} as const;
