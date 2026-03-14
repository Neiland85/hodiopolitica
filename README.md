# HodioPolitica

Motor de evaluaci&oacute;n de pol&iacute;ticas p&uacute;blicas contra indicadores econ&oacute;micos.

[![CI](https://github.com/Neiland85/hodiopolitica/actions/workflows/ci.yml/badge.svg)](https://github.com/Neiland85/hodiopolitica/actions/workflows/ci.yml)
[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](LICENSE)

## Qu&eacute; es

HodioPolitica analiza el impacto de decisiones pol&iacute;ticas compar&aacute;ndolas con indicadores econ&oacute;micos reales (PIB, desempleo, &iacute;ndices de vivienda). Soporta m&uacute;ltiples pa&iacute;ses y dominios de pol&iacute;ticas.

**Caracter&iacute;sticas principales:**

- Evaluaci&oacute;n de pol&iacute;ticas por pa&iacute;s con m&eacute;tricas de severidad
- Comparaci&oacute;n multi-pa&iacute;s (hasta 10 simult&aacute;neos)
- Modelos de evaluaci&oacute;n espec&iacute;ficos por dominio (vivienda, educaci&oacute;n)
- API REST documentada con OpenAPI 3.1
- Dashboard interactivo con Next.js

## Arquitectura

Modular Monolith con DDD, Hexagonal Architecture, y DI Container.

```
hodiopolitica/
├── packages/
│   ├── engine/         # Dominio + l&oacute;gica de negocio (puro, sin I/O)
│   │   ├── analysis/       Strategy Pattern (evaluadores por dominio)
│   │   ├── application/    Use Cases (CQRS-lite)
│   │   ├── models/         Modelos de evaluaci&oacute;n (housing, education)
│   │   ├── repositories/   Ports & Adapters
│   │   └── shared/         Result monad, EventBus, DI Container, Logger
│   └── contracts/      # DTOs compartidos (API boundary)
├── apps/
│   ├── api/            # Express 5 REST API + middleware de seguridad
│   └── web/            # Next.js 15 dashboard
├── data/sources/       # Datos econ&oacute;micos por pa&iacute;s (JSON)
└── docs/
    ├── adr/            # Architecture Decision Records (9 ADRs)
    ├── security/       # Threat model, arquitectura de seguridad
    ├── compliance/     # Privacidad, gobernanza de datos
    └── openapi.yaml    # Especificaci&oacute;n API
```

### Patrones clave

| Patr&oacute;n | Implementaci&oacute;n |
|--------|---------------|
| **Result Monad** | `Result<T, DomainError>` — sin excepciones en dominio |
| **Strategy** | Evaluadores intercambiables por dominio pol&iacute;tico |
| **Repository** | Puerto `EconomicContextRepository` + adaptador `FileEconomicContextRepository` |
| **Domain Events** | `EventBus` in-process con `PolicyEvaluated` / `PolicyEvaluationFailed` |
| **DI Container** | Factory-based lazy singletons + Composition Root |
| **Use Cases** | Application Services que orquestan dominio, repos y eventos |

## Inicio r&aacute;pido

### Requisitos

- Node.js 20+
- npm 9+

### Instalaci&oacute;n

```bash
git clone https://github.com/Neiland85/hodiopolitica.git
cd hodiopolitica
cp .env.example .env
npm install
```

### Desarrollo

```bash
# API + Web en paralelo
npm run dev

# Solo API (puerto 3001)
npm run dev:api

# Solo Web (puerto 3000)
npm run dev:web
```

### Tests

```bash
npm test              # 98 tests, 14 suites
npm run test:watch    # modo watch
npm run test:coverage # con cobertura (umbrales: 70%)
```

### Calidad

```bash
npm run typecheck     # TypeScript strict
npm run lint          # Biome
npm run lint:fix      # auto-fix
```

## API

Base URL: `http://localhost:3001`

| M&eacute;todo | Endpoint | Descripci&oacute;n |
|--------|----------|-------------|
| GET | `/api/health` | Health check con estado de datos |
| GET | `/api/countries` | Lista de pa&iacute;ses disponibles |
| GET | `/api/policy/evaluate?country=spain` | Evaluar pol&iacute;tica de vivienda |
| POST | `/api/policy/evaluate` | Evaluar pol&iacute;tica personalizada |
| POST | `/api/policy/compare` | Comparar pol&iacute;tica entre pa&iacute;ses |

Documentaci&oacute;n completa: [`docs/openapi.yaml`](docs/openapi.yaml)

## Docker

```bash
docker compose up -d
# API: http://localhost:3001
# Web: http://localhost:3000
```

## Seguridad

El sistema implementa defense-in-depth:

- **Helmet.js** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Rate limiting** — 100 req/15min por IP
- **Body size limit** — 10KB m&aacute;ximo
- **Audit logging** — eventos de seguridad (4xx/5xx)
- **Validaci&oacute;n de entrada** — middleware dedicado
- **Contenedores non-root** — UID 1001

Ver [`SECURITY.md`](SECURITY.md) para reportar vulnerabilidades.

## Documentaci&oacute;n

| Documento | Descripci&oacute;n |
|-----------|-------------|
| [`docs/adr/`](docs/adr/) | 9 Architecture Decision Records |
| [`docs/openapi.yaml`](docs/openapi.yaml) | Especificaci&oacute;n API (OpenAPI 3.1) |
| [`docs/security/THREAT-MODEL.md`](docs/security/THREAT-MODEL.md) | An&aacute;lisis STRIDE |
| [`docs/security/SECURITY-ARCHITECTURE.md`](docs/security/SECURITY-ARCHITECTURE.md) | Arquitectura de seguridad |
| [`docs/compliance/PRIVACY.md`](docs/compliance/PRIVACY.md) | Pol&iacute;tica de privacidad (draft) |
| [`docs/compliance/DATA-GOVERNANCE.md`](docs/compliance/DATA-GOVERNANCE.md) | Gobernanza de datos |

## Licencia

**Business Source License 1.1** (BUSL-1.1)

Copyright &copy; 2026 **Clarity Structures Digital S.L.**

- Uso no-producci&oacute;n: libre (desarrollo, testing, investigaci&oacute;n)
- Uso en producci&oacute;n: requiere licencia comercial
- Conversi&oacute;n autom&aacute;tica a Apache-2.0 el 2030-03-14

Ver [`LICENSE`](LICENSE) para el texto completo.
