// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Media Coverage — raw media data for policy analysis.
 *
 * Represents the aggregated media coverage of a policy decision
 * across all outlets in a given country and time period.
 */

/**
 * Sentiment distribution across media coverage.
 * Values must sum to 1.0 (100%).
 */
export interface SentimentDistribution {
  /** Proportion of positive coverage (0-1) */
  readonly positive: number;
  /** Proportion of negative coverage (0-1) */
  readonly negative: number;
  /** Proportion of neutral coverage (0-1) */
  readonly neutral: number;
}

/**
 * Raw media coverage data for a specific policy.
 * This is the input to the media influence model.
 */
export interface MediaCoverage {
  /** Reference to the policy being covered */
  readonly policyId: string;
  /** Country where coverage is measured */
  readonly country: string;
  /** Measurement period */
  readonly period: {
    readonly startDate: string;
    readonly endDate: string;
  };
  /** Average mentions per day across all outlets */
  readonly mentionsPerDay: number;
  /** Sentiment distribution (must sum to ~1.0) */
  readonly sentiment: SentimentDistribution;
  /** Total audience reached in millions */
  readonly audienceReach: number;
  /** Average engagement rate (0-1): likes, shares, comments / impressions */
  readonly engagementRate: number;
  /** Data sources contributing coverage data */
  readonly sources: string[];
}
