// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import fs from "node:fs";
import path from "node:path";
import type { PolicyContext } from "../context/policy-context";

/**
 * Raw shape of the JSON data file.
 * Used for runtime validation before casting to PolicyContext.
 */
interface RawEconomicData {
  country?: unknown;
  year?: unknown;
  indicators?: {
    inflation?: unknown;
    unemployment?: unknown;
    housing_price_index?: unknown;
    gdp_growth?: unknown;
  };
  sources?: unknown[];
}

/**
 * Loads and validates economic context data from a JSON file.
 *
 * @param filename - Name of the JSON file in data/sources/ (default: spain-economic-context.json)
 * @returns Validated PolicyContext object
 * @throws Error if file is missing, malformed, or fails validation
 */
export function loadEconomicContext(filename = "spain-economic-context.json"): PolicyContext {
  const datasetPath = path.resolve(__dirname, "../../../data/sources", filename);

  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Economic context file not found: ${datasetPath}`);
  }

  let raw: string;
  try {
    raw = fs.readFileSync(datasetPath, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read economic context file: ${(err as Error).message}`);
  }

  let data: RawEconomicData;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in economic context file: ${(err as Error).message}`);
  }

  return validateEconomicContext(data);
}

/**
 * Validates raw parsed data against the PolicyContext schema.
 */
function validateEconomicContext(data: RawEconomicData): PolicyContext {
  if (typeof data.country !== "string" || data.country.length === 0) {
    throw new Error('Economic context: "country" must be a non-empty string');
  }

  if (typeof data.year !== "number" || !Number.isInteger(data.year)) {
    throw new Error('Economic context: "year" must be an integer');
  }

  if (!data.indicators || typeof data.indicators !== "object") {
    throw new Error('Economic context: "indicators" must be an object');
  }

  const requiredIndicators = ["inflation", "unemployment", "housing_price_index", "gdp_growth"] as const;

  for (const key of requiredIndicators) {
    const value = data.indicators[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`Economic context: indicator "${key}" must be a valid number, got ${value}`);
    }
  }

  if (!Array.isArray(data.sources)) {
    throw new Error('Economic context: "sources" must be an array');
  }

  return {
    country: data.country,
    year: data.year,
    indicators: {
      inflation: data.indicators.inflation as number,
      unemployment: data.indicators.unemployment as number,
      housing_price_index: data.indicators.housing_price_index as number,
      gdp_growth: data.indicators.gdp_growth as number,
    },
    sources: data.sources.map(String),
  };
}
