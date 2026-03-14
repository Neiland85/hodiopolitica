// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Evidence validation domain events.
 */

export interface EvidenceValidationCompletedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly referenceCount: number;
  readonly evidenceStrength: number;
  readonly durationMs: number;
}

export interface EvidenceValidationFailedPayload {
  readonly policyId: string;
  readonly country: string;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export const ResearchEventTypes = {
  EvidenceValidationCompleted: "EvidenceValidationCompleted",
  EvidenceValidationFailed: "EvidenceValidationFailed",
} as const;
