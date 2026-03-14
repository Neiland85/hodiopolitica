// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Actor domain events — published during actor analysis workflows.
 *
 * Follows the same pattern as policy-events.ts:
 * typed payload interfaces + const event type registry.
 */

export interface ActorAnalysisCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly actorsAnalyzed: number;
  readonly alignmentScore: number;
  readonly supportBalance: { support: number; oppose: number; neutral: number };
  readonly durationMs: number;
}

export interface ActorAnalysisFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const ActorEventTypes = {
  ActorAnalysisCompleted: "ActorAnalysisCompleted",
  ActorAnalysisFailed: "ActorAnalysisFailed",
} as const;
