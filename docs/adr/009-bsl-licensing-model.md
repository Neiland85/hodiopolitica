# ADR-009: Business Source License (BSL 1.1)

## Status

Accepted

## Context

HodioPolitica is transitioning from a research project to a commercial product
under Clarity Structures Digital S.L. The licensing model must:

1. Protect commercial interests during the startup phase
2. Allow source code visibility (transparency, trust, community feedback)
3. Permit non-production use (development, testing, academic research)
4. Provide a clear path to open-source conversion
5. Be compatible with common dependency licenses (MIT, Apache-2.0, ISC)

Traditional open-source licenses (MIT, Apache-2.0) do not provide commercial
protection. Fully proprietary licenses prevent source visibility and community trust.

## Decision

Adopt **Business Source License 1.1 (BUSL-1.1)** with the following parameters:

| Parameter | Value |
|-----------|-------|
| Licensor | Clarity Structures Digital S.L. |
| Licensed Work | HodioPolitica 1.0.0 |
| Additional Use Grant | Non-production use free; production requires commercial license |
| Change Date | 2030-03-14 (4 years) |
| Change License | Apache License, Version 2.0 |

## Rationale

BSL 1.1 is used by MariaDB, HashiCorp, CockroachDB, and Couchbase for similar
reasons. It is:

- **SPDX-recognized** (`BUSL-1.1`) — compatible with automated license tooling
- **Source-available** — code is publicly visible, buildable, and modifiable
- **Time-limited restriction** — automatically converts to Apache-2.0 after 4 years
- **GPL-compatible conversion** — Apache-2.0 is compatible with GPL 2.0+

## Implementation

- `LICENSE` file with full BSL 1.1 text and parameters
- `NOTICE` file with copyright attribution and third-party notices
- SPDX headers in all source files: `// SPDX-License-Identifier: BUSL-1.1`
- `"license": "BUSL-1.1"` in all `package.json` files
- License compliance checking in CI pipeline

## Consequences

- **Positive**: Source code visible — builds trust and enables community review
- **Positive**: Non-production use is free — encourages adoption and evaluation
- **Positive**: Automatic Apache-2.0 conversion — reduces vendor lock-in concerns
- **Positive**: SPDX recognition — works with automated compliance tools
- **Negative**: Production use requires commercial license — may limit adoption
- **Negative**: BSL is not considered "open source" by OSI — cannot claim OSS status
- **Negative**: Some contributors may be reluctant due to licensing restrictions
