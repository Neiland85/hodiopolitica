# Security Architecture

> **Clarity Structures Digital S.L.** | HodioPolitica v1.0.0
> Last updated: 2026-03-14

## Overview

HodioPolitica implements a **defense-in-depth** strategy with multiple independent security layers. Each layer operates autonomously, ensuring that a breach in one does not compromise the system.

## Architecture Layers

### 1. Transport Security

| Control | Implementation |
|---------|---------------|
| HTTPS enforcement | HSTS headers (1-year max-age, includeSubDomains, preload) |
| TLS version | 1.2+ (configured at reverse proxy / load balancer level) |
| Certificate management | Managed by deployment infrastructure |

### 2. API Security (Express Middleware Stack)

The middleware stack executes in strict order:

```
Request → Security Headers (helmet) → Rate Limiter → CORS → Body Parser (10KB limit) → Request Logger → Audit Logger → Route Handler → Error Handler → Response
```

| Middleware | Purpose | Config |
|-----------|---------|--------|
| `helmet` | Security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.) | Strict CSP in production, disabled in dev |
| `express-rate-limit` | DoS protection | 100 req/15min per IP, skip /api/health |
| `corsMiddleware` | Cross-origin policy | Configurable origins, strict in production |
| `express.json({ limit })` | Body size limits | 10KB max payload |
| `requestLogger` | HTTP request logging | JSON structured, method/path/status/duration |
| `auditLogger` | Security event logging | 4xx/5xx responses with IP, user-agent |
| `errorHandler` | Error sanitization | Strips internal details in production |

### 3. Application Security

| Control | Implementation |
|---------|---------------|
| Type safety | TypeScript strict mode (`strict: true`) |
| Input validation | Dedicated middleware layer (`validate.ts`) |
| Error handling | `Result<T, E>` monad — no unhandled exceptions |
| Domain boundaries | Modular monolith with enforced module boundaries |
| Domain events | In-process event bus for audit trail |
| Configuration | Centralized config with env var validation |

### 4. Data Security

| Control | Implementation |
|---------|---------------|
| Data access | Read-only mounted volumes in Docker (`:ro`) |
| Data classification | Public economic data only (no PII in MVP) |
| Audit trail | JSON structured logging for all API requests |
| Correlation | `x-correlation-id` header propagation through events |

### 5. Infrastructure Security

| Control | Implementation |
|---------|---------------|
| Container isolation | Multi-stage Docker builds (minimal attack surface) |
| Non-root execution | Custom user `hodiopolitica` (UID 1001) |
| Base image | `node:20-alpine` (minimal packages) |
| Health monitoring | Healthcheck configured (30s interval, 5s timeout, 3 retries) |
| Dependency scanning | `npm audit` in CI pipeline |
| Secret detection | TruffleHog in CI pipeline |
| License compliance | Automated license checking in CI |

### 6. CI/CD Security Pipeline

```
Code Push → Lint (Biome) → Type Check → Tests + Coverage → npm audit → License Check → Secret Detection
```

## Security Headers (Production)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
```

## Future Enhancements (Post-MVP)

- [ ] Authentication (JWT / OAuth2)
- [ ] Authorization (RBAC with role-based policies)
- [ ] Encryption at rest for sensitive data
- [ ] WAF integration (ModSecurity / cloud provider WAF)
- [ ] Secrets management (HashiCorp Vault / AWS Secrets Manager)
- [ ] CSRF protection for state-changing operations
- [ ] Request signing for API-to-API communication
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Penetration testing schedule
