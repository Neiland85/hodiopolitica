// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Scenario analysis domain events.
 */

export interface ScenarioAnalysisCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly scenarioCount: number;
  readonly bestScenarioId: string;
  readonly worstScenarioId: string;
  readonly durationMs: number;
}

export interface ScenarioAnalysisFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const ScenarioEventTypes = {
  ScenarioAnalysisCompleted: "ScenarioAnalysisCompleted",
  ScenarioAnalysisFailed: "ScenarioAnalysisFailed",
} as const;
