# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities.

### Contact

- **Email**: security@claritystructures.digital
- **Response SLA**: 48 hours acknowledgment

### Process

1. Send an email describing the vulnerability, reproduction steps, and potential impact.
2. We will acknowledge receipt within **48 hours**.
3. We aim to assess and triage within **7 days**.
4. Critical patches are developed within **30 days**.
5. Coordinated public disclosure after **90 days** (or sooner if a fix is available).
6. We credit reporters unless they prefer anonymity.

### Scope

- HodioPolitica API server (`apps/api`)
- HodioPolitica web application (`apps/web`)
- Policy analysis engine (`packages/engine`)
- Data handling, privacy, and integrity
- Authentication and authorization mechanisms
- Dependencies and supply chain

### Out of Scope

- Third-party services not maintained by Clarity Structures Digital S.L.
- Issues in upstream open-source dependencies (report directly to maintainers)
- Social engineering attacks against team members

## Security Architecture

See [`docs/security/SECURITY-ARCHITECTURE.md`](docs/security/SECURITY-ARCHITECTURE.md) for the full security architecture documentation.

## Threat Model

See [`docs/security/THREAT-MODEL.md`](docs/security/THREAT-MODEL.md) for the STRIDE-based threat analysis.
