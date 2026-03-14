import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getConfig, resetConfig } from "../config/config";

describe("Config", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    resetConfig();
  });

  it("should return default port and cors", () => {
    const config = getConfig();
    expect(config.port).toBe(3001);
    expect(config.corsOrigins).toContain("http://localhost:3000");
  });

  it("should read NODE_ENV from environment", () => {
    process.env.NODE_ENV = "production";
    const config = getConfig();
    expect(config.env).toBe("production");
  });

  it("should default to development when NODE_ENV is not set", () => {
    delete process.env.NODE_ENV;
    const config = getConfig();
    expect(config.env).toBe("development");
  });

  it("should cache config on subsequent calls", () => {
    const first = getConfig();
    const second = getConfig();
    expect(first).toBe(second); // same reference
  });

  it("should return fresh config after reset", () => {
    const first = getConfig();
    resetConfig();
    const second = getConfig();
    expect(first).not.toBe(second); // different references
  });
});
