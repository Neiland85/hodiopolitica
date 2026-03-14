/**
 * Result<T, E> — Railway-oriented error handling.
 *
 * Forces callers to handle both success and failure paths explicitly,
 * eliminating unhandled exceptions in domain logic.
 *
 * @example
 * ```ts
 * const result = evaluatePolicy(policy, context)
 * if (result.ok) {
 *   console.log(result.value)  // PolicyMetric[]
 * } else {
 *   console.error(result.error) // DomainError
 * }
 * ```
 */

export type Result<T, E = Error> = Success<T> | Failure<E>

export interface Success<T> {
  readonly ok: true
  readonly value: T
}

export interface Failure<E> {
  readonly ok: false
  readonly error: E
}

export function ok<T>(value: T): Success<T> {
  return { ok: true, value }
}

export function fail<E>(error: E): Failure<E> {
  return { ok: false, error }
}

/**
 * Maps a successful result to a new value.
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value))
  }
  return result
}

/**
 * Chains results — useful when the mapping function itself can fail.
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (result.ok) {
    return fn(result.value)
  }
  return result
}
