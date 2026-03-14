import { describe, expect, it } from "vitest";
import {
  DataSourceError,
  InvalidIndicatorError,
  UnsupportedDomainError,
  ValidationError,
} from "../shared/errors/domain-error";

describe("Domain Errors", () => {
  it("InvalidIndicatorError should have correct code and message", () => {
    const err = new InvalidIndicatorError("inflation", "must be positive");
    expect(err.code).toBe("INVALID_INDICATOR");
    expect(err.message).toContain("inflation");
    expect(err.message).toContain("must be positive");
    expect(err.toString()).toBe('[INVALID_INDICATOR] Indicator "inflation" is invalid: must be positive');
  });

  it("UnsupportedDomainError should have correct code", () => {
    const err = new UnsupportedDomainError("space-policy");
    expect(err.code).toBe("UNSUPPORTED_DOMAIN");
    expect(err.message).toContain("space-policy");
  });

  it("DataSourceError should serialize to JSON", () => {
    const err = new DataSourceError("spain.json", "File not found");
    const json = err.toJSON();
    expect(json.code).toBe("DATA_SOURCE_ERROR");
    expect(json.message).toContain("spain.json");
    expect(json.message).toContain("File not found");
  });

  it("ValidationError should have correct structure", () => {
    const err = new ValidationError("indicators.inflation", "Must be a number");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toContain("indicators.inflation");
  });
});
