// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import fs from "node:fs";
import path from "node:path";
import type { Actor, ActorType } from "../actors/actor";
import { VALID_ACTOR_TYPES } from "../actors/actor";
import { ActorNotFoundError, InvalidActorDataError } from "../shared/errors/actor-errors";
import { DataSourceError, type DomainError, ValidationError } from "../shared/errors/domain-error";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";
import type { ActorRepository } from "./actor-repository";

const logger = createLogger("repository.actor-file");

/**
 * Loads political actor data from JSON files on disk.
 *
 * File naming convention: {country-lowercase}-actors.json
 * Located in the configured data directory.
 *
 * Follows the same pattern as FileEconomicContextRepository.
 */
export class FileActorRepository implements ActorRepository {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(__dirname, "../../../data/actors");
  }

  findByCountry(country: string): Result<Actor[], DomainError> {
    const filename = `${country.toLowerCase()}-actors.json`;
    const filePath = path.join(this.dataDir, filename);

    logger.debug("Loading actor data", { country, filePath });

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

    return this.validateActorData(data);
  }

  findByType(country: string, type: ActorType): Result<Actor[], DomainError> {
    const allResult = this.findByCountry(country);
    if (!allResult.ok) return allResult;

    const filtered = allResult.value.filter((a) => a.type === type);
    return ok(filtered);
  }

  findById(id: string): Result<Actor, DomainError> {
    // Search across all available countries
    const countriesResult = this.listAvailableCountries();
    if (!countriesResult.ok) return fail(countriesResult.error);

    for (const country of countriesResult.value) {
      const actorsResult = this.findByCountry(country);
      if (!actorsResult.ok) continue;

      const actor = actorsResult.value.find((a) => a.id === id);
      if (actor) return ok(actor);
    }

    return fail(new ActorNotFoundError(id));
  }

  listAvailableCountries(): Result<string[], DomainError> {
    if (!fs.existsSync(this.dataDir)) {
      return fail(new DataSourceError(this.dataDir, "Actor data directory not found"));
    }

    try {
      const files = fs.readdirSync(this.dataDir);
      const countries = files
        .filter((f) => f.endsWith("-actors.json"))
        .map((f) => f.replace("-actors.json", ""))
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1));

      return ok(countries);
    } catch (err) {
      return fail(new DataSourceError(this.dataDir, (err as Error).message));
    }
  }

  private validateActorData(data: unknown): Result<Actor[], DomainError> {
    if (!data || typeof data !== "object") {
      return fail(new ValidationError("root", "Expected an object"));
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.country !== "string" || obj.country.length === 0) {
      return fail(new ValidationError("country", "Must be a non-empty string"));
    }

    if (!Array.isArray(obj.actors)) {
      return fail(new ValidationError("actors", "Must be an array"));
    }

    const actors: Actor[] = [];

    for (let i = 0; i < obj.actors.length; i++) {
      const actorResult = this.validateActor(obj.actors[i], i, obj.country);
      if (!actorResult.ok) return actorResult as Result<Actor[], DomainError>;
      actors.push(actorResult.value);
    }

    logger.info("Actor data loaded successfully", {
      country: obj.country,
      actorCount: actors.length,
    });

    return ok(actors);
  }

  private validateActor(raw: unknown, index: number, country: string): Result<Actor, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new InvalidActorDataError(`actors[${index}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;

    if (typeof obj.id !== "string" || obj.id.length === 0) {
      return fail(new InvalidActorDataError(`actors[${index}].id`, "Must be a non-empty string"));
    }

    if (typeof obj.name !== "string" || obj.name.length === 0) {
      return fail(new InvalidActorDataError(`actors[${index}].name`, "Must be a non-empty string"));
    }

    if (typeof obj.type !== "string" || !VALID_ACTOR_TYPES.includes(obj.type as ActorType)) {
      return fail(
        new InvalidActorDataError(`actors[${index}].type`, `Must be one of: ${VALID_ACTOR_TYPES.join(", ")}`),
      );
    }

    if (!obj.attributes || typeof obj.attributes !== "object") {
      return fail(new InvalidActorDataError(`actors[${index}].attributes`, "Must be an object"));
    }

    const attrObj = obj.attributes as Record<string, unknown>;

    // Validate that attributes.type matches actor.type
    if (attrObj.type !== obj.type) {
      return fail(new InvalidActorDataError(`actors[${index}].attributes.type`, `Must match actor type "${obj.type}"`));
    }

    return ok({
      id: obj.id,
      name: obj.name,
      type: obj.type as ActorType,
      country,
      attributes: obj.attributes,
    } as Actor);
  }
}
