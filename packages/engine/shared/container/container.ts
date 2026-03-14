/**
 * Lightweight Dependency Injection Container
 *
 * Provides IoC (Inversion of Control) for the modular monolith.
 * All dependencies are registered at startup and resolved at runtime.
 *
 * Design decisions:
 *   - Factory-based: dependencies are registered as factory functions
 *   - Lazy singletons: created on first resolve, cached thereafter
 *   - Typed: uses TypeScript generics for type-safe resolution
 *   - No decorators: avoids reflect-metadata and experimental features
 *
 * @example
 * ```ts
 * const container = createContainer()
 * container.register('repo', () => new FileEconomicContextRepository())
 * container.register('evaluatePolicy', (c) => new EvaluatePolicyUseCase(c.resolve('repo')))
 *
 * const useCase = container.resolve('evaluatePolicy')
 * ```
 */

type Factory<T> = (container: Container) => T

interface Registration<T> {
  factory: Factory<T>
  instance?: T
  singleton: boolean
}

export class Container {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private registrations = new Map<string, Registration<any>>()

  /**
   * Register a dependency factory.
   * @param singleton If true (default), the factory is called only once and cached.
   */
  register<T>(name: string, factory: Factory<T>, singleton = true): this {
    this.registrations.set(name, { factory, singleton })
    return this
  }

  /**
   * Resolve a dependency by name.
   * @throws Error if the dependency is not registered.
   */
  resolve<T>(name: string): T {
    const reg = this.registrations.get(name)
    if (!reg) {
      throw new Error(`[DI] Dependency "${name}" is not registered`)
    }

    if (reg.singleton) {
      if (!reg.instance) {
        reg.instance = reg.factory(this)
      }
      return reg.instance as T
    }

    return reg.factory(this) as T
  }

  /**
   * Check if a dependency is registered.
   */
  has(name: string): boolean {
    return this.registrations.has(name)
  }

  /**
   * List all registered dependency names.
   */
  list(): string[] {
    return [...this.registrations.keys()]
  }

  /**
   * Reset all cached instances (for testing).
   * Registrations are preserved.
   */
  resetInstances(): void {
    for (const reg of this.registrations.values()) {
      reg.instance = undefined
    }
  }

  /**
   * Clear everything (for testing).
   */
  clear(): void {
    this.registrations.clear()
  }
}

/**
 * Creates a new empty container.
 */
export function createContainer(): Container {
  return new Container()
}
