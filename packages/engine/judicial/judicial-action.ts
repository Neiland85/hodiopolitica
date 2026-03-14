// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Judicial Action — legal proceedings affecting a policy decision.
 *
 * Represents a single judicial proceeding (constitutional review,
 * injunction, ruling, or appeal) that may impact the enforceability
 * or constitutionality of a policy.
 */

/**
 * Type of judicial action.
 */
export type JudicialActionType = "constitutional_review" | "injunction" | "ruling" | "appeal";

/**
 * Current status of the judicial action.
 */
export type JudicialStatus = "pending" | "decided";

/**
 * Outcome of a decided judicial action.
 */
export type JudicialRuling = "upheld" | "struck_down" | "partial";

/**
 * A judicial action that may affect a policy's viability or enforcement.
 * This is the input to the judicial risk model.
 */
export interface JudicialAction {
  /** Unique case identifier */
  readonly caseId: string;
  /** Reference to the policy being challenged */
  readonly policyId: string;
  /** Court handling the case (e.g., "Tribunal Constitucional", "Tribunal Supremo") */
  readonly court: string;
  /** Type of judicial action */
  readonly type: JudicialActionType;
  /** Current status of the proceeding */
  readonly status: JudicialStatus;
  /** Outcome (only set when status is "decided") */
  readonly ruling?: JudicialRuling;
  /** Impact score (0-100): how significantly this action affects the policy */
  readonly impactScore: number;
  /** Precedent weight (0-1): how much this ruling influences future cases */
  readonly precedentWeight: number;
  /** Date the case was filed or decided (ISO 8601) */
  readonly date: string;
}
