import { Container, createContainer } from './container'
import { FileEconomicContextRepository } from '../../repositories/file-economic-context-repository'
import { EvaluatePolicyUseCase } from '../../application/evaluate-policy.usecase'
import { ListCountriesUseCase } from '../../application/list-countries.usecase'
import { CompareCountriesUseCase } from '../../application/compare-countries.usecase'
import type { EconomicContextRepository } from '../../repositories/economic-context-repository'

/**
 * Composition Root — the single place where all dependencies are wired.
 *
 * This is the ONLY file that knows about concrete implementations.
 * All other code depends only on interfaces (ports).
 *
 * To swap an implementation (e.g., database instead of file):
 *   1. Create a new class implementing EconomicContextRepository
 *   2. Change the factory here
 *   3. Nothing else changes
 */

/** Dependency names — typed keys for the container. */
export const DI = {
  ContextRepo: 'contextRepo',
  EvaluatePolicy: 'evaluatePolicy',
  ListCountries: 'listCountries',
  CompareCountries: 'compareCountries',
} as const

export type DIKey = (typeof DI)[keyof typeof DI]

/**
 * Bootstraps the DI container with all production dependencies.
 */
export function bootstrapContainer(dataDir?: string): Container {
  const container = createContainer()

  // Infrastructure
  container.register<EconomicContextRepository>(
    DI.ContextRepo,
    () => new FileEconomicContextRepository(dataDir),
  )

  // Use Cases
  container.register<EvaluatePolicyUseCase>(
    DI.EvaluatePolicy,
    (c) => new EvaluatePolicyUseCase(c.resolve(DI.ContextRepo)),
  )

  container.register<ListCountriesUseCase>(
    DI.ListCountries,
    (c) => new ListCountriesUseCase(c.resolve(DI.ContextRepo)),
  )

  container.register<CompareCountriesUseCase>(
    DI.CompareCountries,
    (c) => new CompareCountriesUseCase(c.resolve(DI.ContextRepo)),
  )

  return container
}
