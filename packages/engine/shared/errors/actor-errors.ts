// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { DomainError } from "./domain-error";

/**
 * Error: Actor not found in the data source.
 */
export class ActorNotFoundError extends DomainError {
  readonly code = "ACTOR_NOT_FOUND";
  readonly message: string;

  constructor(identifier: string) {
    super();
    this.message = `Actor "${identifier}" not found`;
  }
}

/**
 * Error: Invalid or malformed actor data.
 */
export class InvalidActorDataError extends DomainError {
  readonly code = "INVALID_ACTOR_DATA";
  readonly message: string;

  constructor(field: string, reason: string) {
    super();
    this.message = `Invalid actor data for "${field}": ${reason}`;
  }
}
