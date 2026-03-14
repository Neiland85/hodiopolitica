import type { EconomicContextRepository } from '../repositories/economic-context-repository'
import type { Result } from '../shared/result/result'
import type { DomainError } from '../shared/errors/domain-error'

/**
 * Use Case: List Available Countries
 *
 * Query that returns all countries with available economic data.
 * Pure read operation — no side effects, no events.
 */
export class ListCountriesUseCase {
  constructor(private readonly contextRepo: EconomicContextRepository) {}

  execute(): Result<string[], DomainError> {
    return this.contextRepo.listAvailableCountries()
  }
}
