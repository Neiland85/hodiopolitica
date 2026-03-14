// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Public Reaction — time series data measuring public response to a policy.
 *
 * Captures approval ratings, protest activity, media engagement,
 * and electoral impact over time.
 */

/**
 * A single data point in the public reaction time series.
 */
export interface ReactionDataPoint {
  /** Date of measurement (ISO 8601) */
  readonly date: string;
  /** Public approval rating (0-100) */
  readonly approvalRating: number;
  /** Intensity of protest activity (0-1) */
  readonly protestIntensity: number;
  /** Level of media engagement (0-1) */
  readonly mediaEngagement: number;
  /** Electoral shift in percentage points (positive = governing party gains) */
  readonly electoralShift: number;
}

/**
 * Time series of public reactions to a specific policy.
 * This is the input to the public reaction model.
 */
export interface PublicReactionTimeSeries {
  /** Reference to the policy being measured */
  readonly policyId: string;
  /** Country where reactions are measured */
  readonly country: string;
  /** Chronologically ordered data points */
  readonly dataPoints: ReactionDataPoint[];
}
