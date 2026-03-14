// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EconomicContextRepository } from "../repositories/economic-context-repository";
import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";

/**
 * Use Case: List Available Countries
 *
 * Query that returns all countries with available economic data.
 * Pure read operation — no side effects, no events.
 */
export class ListCountriesUseCase {
  constructor(private readonly contextRepo: EconomicContextRepository) {}

  execute(): Result<string[], DomainError> {
    return this.contextRepo.listAvailableCountries();
  }
}
