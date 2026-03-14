// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { MediaCoverage } from "../media/media-coverage";
import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";

/**
 * Repository interface for media coverage data.
 *
 * Follows the same pattern as EconomicContextRepository and ActorRepository.
 */
export interface MediaCoverageRepository {
  /**
   * Loads media coverage data for a specific country.
   * Returns all policy coverage entries available.
   */
  findByCountry(country: string): Result<MediaCoverage[], DomainError>;

  /**
   * Loads media coverage for a specific policy in a specific country.
   */
  findByPolicy(policyId: string, country: string): Result<MediaCoverage, DomainError>;

  /**
   * Lists all countries that have media coverage data available.
   */
  listAvailableCountries(): Result<string[], DomainError>;
}
