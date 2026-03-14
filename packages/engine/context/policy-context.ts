// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Economic indicators used for policy evaluation.
 * Each field represents a measurable economic metric.
 */
export interface EconomicIndicators {
  /** Annual inflation rate (%) - Source: INE/Eurostat */
  inflation: number;
  /** Unemployment rate (%) - Source: INE/Eurostat */
  unemployment: number;
  /** Housing price index (base 100) - Source: INE */
  housing_price_index: number;
  /** Annual GDP growth rate (%) - Source: Banco de España */
  gdp_growth: number;
}

/**
 * Context in which a policy is evaluated.
 * Provides the country-level economic backdrop for analysis.
 */
export interface PolicyContext {
  country: string;
  year: number;
  indicators: EconomicIndicators;
  sources: string[];
}
