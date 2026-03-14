# Threat Model (STRIDE Analysis)

> **Clarity Structures Digital S.L.** | HodioPolitica v1.0.0
> Last updated: 2026-03-14 | Methodology: STRIDE

## System Description

HodioPolitica is a policy analysis engine that evaluates public policies against economic indicators. The MVP serves public economic data through a REST API consumed by a web dashboard.

### Data Flow

```
Browser → (HTTPS) → Reverse Proxy → Express API → JSON Data Store (read-only)
                                          ↓
                                    Audit Logs (stdout)
```

### Trust Boundaries

1. **External**: Internet → Reverse Proxy (untrusted)
2. **DMZ**: Reverse Proxy → Express API (semi-trusted)
3. **Internal**: Express API → Data Store (trusted, read-only)

---

## STRIDE Analysis

### S — Spoofing

| Threat | Risk | Mitigation | Status |
|--------|------|-----------|--------|
| Attacker impersonates API client | LOW | No auth in MVP; API serves public analytical data | Accepted |
| IP spoofing to bypass rate limit | LOW | Trust proxy configured; rate limit per X-Forwarded-For | Mitigated |
| API key theft | N/A | No API keys in MVP | N/A |

**Planned**: JWT / OAuth2 authentication for production user accounts.

### T — Tampering

| Threat | Risk | Mitigation | Status |
|--------|------|-----------|--------|
| Economic data file modification | LOW | Docker volume mounted read-only (`:ro`) | Mitigated |
| Request body manipulation | MODERATE | Input validation middleware, body size limit (10KB) | Mitigated |
| Man-in-the-middle attack | LOW | HSTS headers, TLS at reverse proxy | Mitigated |
| Dependency supply chain attack | MODERATE | npm audit in CI, lock file integrity | Mitigated |

### R — Repudiation

| Threat | Risk | Mitigation | Status |
|--------|------|-----------|--------|
| Cannot trace request origin | MODERATE | Request logger (JSON), audit logger for 4xx/5xx | Mitigated |
| Event stream tampering | LOW | In-process event bus, correlationId propagation | Mitigated |

**Planned**: Authentication-linked audit trail with user identity.

### I — Information Disclosure

| Threat | Risk | Mitigation | Status |
|--------|------|-----------|--------|
| Error messages leak internals | MODERATE | Error handler strips details in production | Mitigated |
| Server technology fingerprinting | LOW | Helmet removes/obscures identifying headers | Mitigated |
| Source code exposure | LOW | BSL license, private repo, compiled production builds | Mitigated |
| Secrets in Git history | MODERATE | TruffleHog in CI, .gitignore covers .env | Mitigated |

### D — Denial of Service

| Threat | Risk | Mitigation | Status |
|--------|------|-----------|--------|
| API flood | MODERATE | Rate limiting (100 req/15min per IP) | Mitigated |
| Large payload attack | MODERATE | Body size limit (10KB) | Mitigated |
| Slowloris / slow read attacks | LOW | Handled by reverse proxy (nginx/caddy) | Partially mitigated |

**Planned**: WAF, CDN-level protection, connection timeouts.

### E — Elevation of Privilege

| Threat | Risk | Mitigation | Status |
|--------|------|-----------|--------|
| Container escape | LOW | Non-root Docker users, Alpine minimal image | Mitigated |
| Path traversal in data loading | LOW | Validated country names, no user-controlled file paths | Mitigated |
| Admin endpoint access | N/A | No admin endpoints in MVP | N/A |

---

## Risk Matrix Summary

| Threat Category | Likelihood | Impact | Overall Risk | Status |
|----------------|-----------|--------|-------------|--------|
| Spoofing | Low | Low | **LOW** | Accepted (MVP) |
| Tampering | Low | Moderate | **MODERATE** | Mitigated |
| Repudiation | Low | Low | **LOW** | Mitigated |
| Information Disclosure | Low | Moderate | **MODERATE** | Mitigated |
| Denial of Service | Moderate | Moderate | **MODERATE** | Mitigated |
| Elevation of Privilege | Very Low | High | **LOW** | Mitigated |

## Review Schedule

- **Next review**: Before production launch
- **Periodic review**: Annually or after significant architecture changes
- **Trigger review**: After any security incident
