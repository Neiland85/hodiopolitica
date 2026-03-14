// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { JudicialAction } from "../judicial/judicial-action";
import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";

/**
 * Repository interface for judicial action records.
 *
 * Follows the same pattern as MediaCoverageRepository and ActorRepository.
 */
export interface JudicialActionRepository {
  /**
   * Loads all judicial actions for a specific policy in a specific country.
   */
  findByPolicy(policyId: string, country: string): Result<JudicialAction[], DomainError>;

  /**
   * Loads all judicial actions for a country.
   */
  findByCountry(country: string): Result<JudicialAction[], DomainError>;

  /**
   * Lists all countries that have judicial action data available.
   */
  listAvailableCountries(): Result<string[], DomainError>;
}
