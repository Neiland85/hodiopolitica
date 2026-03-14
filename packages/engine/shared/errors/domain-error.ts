/**
 * Base class for all domain errors.
 *
 * Domain errors represent business rule violations or invalid states.
 * They are NOT exceptions — they are expected outcomes that must be
 * handled explicitly via the Result type.
 */
export abstract class DomainError {
  abstract readonly code: string;
  abstract readonly message: string;

  toString(): string {
    return `[${this.code}] ${this.message}`;
  }

  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

/**
 * A required economic indicator is missing or invalid.
 */
export class InvalidIndicatorError extends DomainError {
  readonly code = "INVALID_INDICATOR";
  readonly message: string;

  constructor(indicatorName: string, reason: string) {
    super();
    this.message = `Indicator "${indicatorName}" is invalid: ${reason}`;
  }
}

/**
 * The policy domain is not supported by any registered evaluator.
 */
export class UnsupportedDomainError extends DomainError {
  readonly code = "UNSUPPORTED_DOMAIN";
  readonly message: string;

  constructor(domain: string) {
    super();
    this.message = `No evaluation model registered for domain "${domain}"`;
  }
}

/**
 * The economic context data source could not be loaded.
 */
export class DataSourceError extends DomainError {
  readonly code = "DATA_SOURCE_ERROR";
  readonly message: string;

  constructor(source: string, reason: string) {
    super();
    this.message = `Failed to load data from "${source}": ${reason}`;
  }
}

/**
 * The economic context data failed validation.
 */
export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly message: string;

  constructor(field: string, reason: string) {
    super();
    this.message = `Validation failed for "${field}": ${reason}`;
  }
}
