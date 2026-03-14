// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";
import type { VoteRecord } from "../votes/vote-record";

/**
 * Repository interface for parliamentary vote records.
 *
 * Follows the same pattern as MediaCoverageRepository and ActorRepository.
 */
export interface VoteRepository {
  /**
   * Loads all vote records for a specific policy in a specific country.
   */
  findByPolicy(policyId: string, country: string): Result<VoteRecord[], DomainError>;

  /**
   * Loads all vote records for a country.
   */
  findByCountry(country: string): Result<VoteRecord[], DomainError>;

  /**
   * Lists all countries that have vote data available.
   */
  listAvailableCountries(): Result<string[], DomainError>;
}
