// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import fs from "node:fs";
import path from "node:path";
import type { JudicialAction } from "../judicial/judicial-action";
import { DataSourceError, type DomainError, ValidationError } from "../shared/errors/domain-error";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";
import type { JudicialActionRepository } from "./judicial-action-repository";

const logger = createLogger("repository.judicial-file");

const VALID_TYPES = new Set(["constitutional_review", "injunction", "ruling", "appeal"]);
const VALID_STATUSES = new Set(["pending", "decided"]);
const VALID_RULINGS = new Set(["upheld", "struck_down", "partial"]);

/**
 * Loads judicial action data from JSON files on disk.
 *
 * File naming convention: {country-lowercase}-judicial.json
 * Located in the configured data directory.
 */
export class FileJudicialActionRepository implements JudicialActionRepository {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(__dirname, "../../../data/judicial");
  }

  findByCountry(country: string): Result<JudicialAction[], DomainError> {
    const filename = `${country.toLowerCase()}-judicial.json`;
    const filePath = path.join(this.dataDir, filename);

    logger.debug("Loading judicial action data", { country, filePath });

    if (!fs.existsSync(filePath)) {
      return fail(new DataSourceError(filename, `File not found at ${filePath}`));
    }

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      return fail(new DataSourceError(filename, (err as Error).message));
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return fail(new DataSourceError(filename, `Invalid JSON: ${(err as Error).message}`));
    }

    return this.validateJudicialData(data);
  }

  findByPolicy(policyId: string, country: string): Result<JudicialAction[], DomainError> {
    const allResult = this.findByCountry(country);
    if (!allResult.ok) return allResult;

    const actions = allResult.value.filter((a) => a.policyId === policyId);
    return ok(actions);
  }

  listAvailableCountries(): Result<string[], DomainError> {
    if (!fs.existsSync(this.dataDir)) {
      return fail(new DataSourceError(this.dataDir, "Judicial data directory not found"));
    }

    try {
      const files = fs.readdirSync(this.dataDir);
      const countries = files
        .filter((f) => f.endsWith("-judicial.json"))
        .map((f) => f.replace("-judicial.json", ""))
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1));

      return ok(countries);
    } catch (err) {
      return fail(new DataSourceError(this.dataDir, (err as Error).message));
    }
  }

  private validateJudicialData(data: unknown): Result<JudicialAction[], DomainError> {
    if (!data || typeof data !== "object") {
      return fail(new ValidationError("root", "Expected an object"));
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.country !== "string" || obj.country.length === 0) {
      return fail(new ValidationError("country", "Must be a non-empty string"));
    }

    if (!Array.isArray(obj.actions)) {
      return fail(new ValidationError("actions", "Must be an array"));
    }

    const actions: JudicialAction[] = [];

    for (let i = 0; i < obj.actions.length; i++) {
      const result = this.validateActionEntry(obj.actions[i], i);
      if (!result.ok) return result as unknown as Result<JudicialAction[], DomainError>;
      actions.push(result.value);
    }

    logger.info("Judicial action data loaded", {
      country: obj.country,
      actionCount: actions.length,
    });

    return ok(actions);
  }

  private validateActionEntry(raw: unknown, index: number): Result<JudicialAction, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new ValidationError(`actions[${index}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;

    if (typeof obj.caseId !== "string") {
      return fail(new ValidationError(`actions[${index}].caseId`, "Must be a string"));
    }

    if (typeof obj.policyId !== "string") {
      return fail(new ValidationError(`actions[${index}].policyId`, "Must be a string"));
    }

    if (typeof obj.court !== "string") {
      return fail(new ValidationError(`actions[${index}].court`, "Must be a string"));
    }

    if (typeof obj.type !== "string" || !VALID_TYPES.has(obj.type)) {
      return fail(
        new ValidationError(
          `actions[${index}].type`,
          "Must be 'constitutional_review', 'injunction', 'ruling', or 'appeal'",
        ),
      );
    }

    if (typeof obj.status !== "string" || !VALID_STATUSES.has(obj.status)) {
      return fail(new ValidationError(`actions[${index}].status`, "Must be 'pending' or 'decided'"));
    }

    if (obj.status === "decided" && obj.ruling !== undefined) {
      if (typeof obj.ruling !== "string" || !VALID_RULINGS.has(obj.ruling)) {
        return fail(new ValidationError(`actions[${index}].ruling`, "Must be 'upheld', 'struck_down', or 'partial'"));
      }
    }

    if (typeof obj.impactScore !== "number" || obj.impactScore < 0 || obj.impactScore > 100) {
      return fail(new ValidationError(`actions[${index}].impactScore`, "Must be a number between 0 and 100"));
    }

    if (typeof obj.precedentWeight !== "number" || obj.precedentWeight < 0 || obj.precedentWeight > 1) {
      return fail(new ValidationError(`actions[${index}].precedentWeight`, "Must be a number between 0 and 1"));
    }

    if (typeof obj.date !== "string") {
      return fail(new ValidationError(`actions[${index}].date`, "Must be a string"));
    }

    return ok({
      caseId: obj.caseId,
      policyId: obj.policyId,
      court: obj.court,
      type: obj.type,
      status: obj.status,
      ruling: obj.ruling,
      impactScore: obj.impactScore,
      precedentWeight: obj.precedentWeight,
      date: obj.date,
    } as JudicialAction);
  }
}
