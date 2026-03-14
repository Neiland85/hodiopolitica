// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { Actor, ActorType } from "../actors/actor";
import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";

/**
 * Repository interface for political actor data.
 *
 * Follows the same pattern as EconomicContextRepository:
 * - Returns Result<T, DomainError> for all fallible operations
 * - No side effects in the interface contract
 * - Implementations handle data source specifics
 */
export interface ActorRepository {
  /**
   * Loads all actors for a country.
   */
  findByCountry(country: string): Result<Actor[], DomainError>;

  /**
   * Loads actors of a specific type for a country.
   */
  findByType(country: string, type: ActorType): Result<Actor[], DomainError>;

  /**
   * Finds a single actor by ID.
   */
  findById(id: string): Result<Actor, DomainError>;

  /**
   * Lists all countries that have actor data available.
   */
  listAvailableCountries(): Result<string[], DomainError>;
}
