import type { PolicyContext } from "../context/policy-context";
import type { DomainError } from "../shared/errors/domain-error";
import type { Result } from "../shared/result/result";

/**
 * Repository interface for economic context data.
 *
 * Abstracts the data source — implementations can load from:
 *   - JSON files (FileEconomicContextRepository)
 *   - REST APIs (ApiEconomicContextRepository)
 *   - Databases (DbEconomicContextRepository)
 *
 * All implementations return Result<T, DomainError> to handle
 * failures without throwing exceptions.
 */
export interface EconomicContextRepository {
  /**
   * Loads the economic context for a given country.
   * @param country - ISO country identifier or name
   */
  findByCountry(country: string): Result<PolicyContext, DomainError>;

  /**
   * Lists all available countries in the data source.
   */
  listAvailableCountries(): Result<string[], DomainError>;
}
