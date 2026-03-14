// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Judicial risk analysis domain events — published during judicial analysis workflows.
 */

export interface JudicialRiskAnalysisCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly actionCount: number;
  readonly legalChallengeRisk: number;
  readonly durationMs: number;
}

export interface JudicialRiskAnalysisFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const JudicialEventTypes = {
  JudicialRiskAnalysisCompleted: "JudicialRiskAnalysisCompleted",
  JudicialRiskAnalysisFailed: "JudicialRiskAnalysisFailed",
} as const;
