// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PublicReactionTimeSeries } from "../public-reaction/public-reaction";
import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";

/**
 * Repository interface for public reaction time series data.
 */
export interface PublicReactionRepository {
  /**
   * Loads public reaction data for a specific policy in a specific country.
   */
  findByPolicy(policyId: string, country: string): Result<PublicReactionTimeSeries, DomainError>;

  /**
   * Loads all public reaction time series for a country.
   */
  findByCountry(country: string): Result<PublicReactionTimeSeries[], DomainError>;

  /**
   * Lists all countries that have public reaction data available.
   */
  listAvailableCountries(): Result<string[], DomainError>;
}
