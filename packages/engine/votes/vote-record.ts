// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Vote Record — parliamentary voting data for policy analysis.
 *
 * Represents a single voting event in a legislative chamber,
 * including the vote breakdown and any proposed amendments.
 */

/**
 * Result of a parliamentary vote on a policy.
 */
export type VoteResult = "approved" | "rejected" | "amended";

/**
 * Status of a proposed amendment.
 */
export type AmendmentStatus = "pending" | "approved" | "rejected" | "withdrawn";

/**
 * A proposed amendment to a policy during the legislative process.
 */
export interface Amendment {
  /** Unique identifier for the amendment */
  readonly id: string;
  /** Brief description of the amendment's content */
  readonly description: string;
  /** Political group or actor that proposed the amendment */
  readonly proposedBy: string;
  /** Current status of the amendment */
  readonly status: AmendmentStatus;
}

/**
 * A parliamentary vote record associated with a policy.
 * This is the input to the vote analysis model.
 */
export interface VoteRecord {
  /** Reference to the policy being voted on */
  readonly policyId: string;
  /** Legislative chamber (e.g., "Congreso de los Diputados", "Senado") */
  readonly chamber: string;
  /** Date of the vote (ISO 8601) */
  readonly date: string;
  /** Outcome of the vote */
  readonly result: VoteResult;
  /** Number of votes in favor */
  readonly votesFor: number;
  /** Number of votes against */
  readonly votesAgainst: number;
  /** Number of abstentions */
  readonly abstentions: number;
  /** Total number of seats in the chamber */
  readonly totalSeats: number;
  /** Amendments proposed during the legislative process */
  readonly amendments: Amendment[];
}
