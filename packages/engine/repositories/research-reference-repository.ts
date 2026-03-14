// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { ResearchReference } from "../research/research-reference";
import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";

/**
 * Repository interface for research reference data.
 */
export interface ResearchReferenceRepository {
  /**
   * Loads all research references for a specific policy in a specific country.
   */
  findByPolicy(policyId: string, country: string): Result<ResearchReference[], DomainError>;

  /**
   * Loads all research references for a country.
   */
  findByCountry(country: string): Result<ResearchReference[], DomainError>;

  /**
   * Lists all countries that have research reference data available.
   */
  listAvailableCountries(): Result<string[], DomainError>;
}
