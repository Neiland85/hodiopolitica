# ADR-006: Security Hardening Strategy

## Status

Accepted

## Context

HodioPolitica is transitioning from a POC/MVP to a commercially deployable product
under Clarity Structures Digital S.L. The API needs baseline security hardening before
serving production traffic, even without user authentication in the MVP. The project
also requires a commercial license (BSL 1.1) and compliance documentation.

## Decision

### Licensing
Adopt **Business Source License 1.1 (BUSL-1.1)** with Apache-2.0 as the Change License
after 4 years. This provides commercial protection during the startup phase while
guaranteeing eventual open-source conversion.

### Security Middleware
Implement a defense-in-depth middleware stack:

1. **helmet.js** — Security headers (CSP, HSTS, X-Frame-Options, etc.)
2. **express-rate-limit** — DoS protection (100 req/15min per IP)
3. **Body size limits** — 10KB max JSON payload
4. **Audit logging** — Security-relevant event logging (4xx/5xx responses)

### Compliance Documentation
- STRIDE threat model for systematic threat identification
- Privacy policy draft (GDPR-ready)
- Data governance framework (ICANN ALAC-inspired principles)
- Security architecture documentation

### CI/CD Security
- npm audit for dependency vulnerability scanning
- License compliance checking
- Secret detection with TruffleHog

## Consequences

### Positive
- OWASP Top 10 baseline coverage without custom code
- Security configuration externalized to environment variables
- Audit trail for security-relevant events
- Commercial protection via BSL 1.1 while maintaining source availability
- Compliance documentation ready for legal review

### Negative
- Two new runtime dependencies (helmet, express-rate-limit)
- Rate limiting may need tuning per deployment environment
- BSL 1.1 restricts production use (intentional for commercial model)
- Compliance documents are drafts requiring legal counsel review
