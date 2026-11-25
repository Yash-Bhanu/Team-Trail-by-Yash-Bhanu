# Security Policy

## Reporting a Vulnerability
Do not open public issues for security vulnerabilities. Report vulnerabilities privately to the project maintainer (Yash Bhanu) with reproduction steps.

## Security Architecture Highlights
- Server-side default-deny authorization (`src/server/authorization/index.ts`)
- Strict Zod input validation (`src/lib/validations.ts`)
- Constant-time HMAC SHA-256 GitHub webhook verification (`src/server/webhooks/github.ts`)
- PostgreSQL-backed durable rate limiting (`src/server/security/rate-limiter.ts`)
- Nonce-based Content-Security-Policy & security headers (`src/middleware.ts`)
- CSV formula injection neutralization (`sanitizeCsvCell` in `src/lib/utils.ts`)
- Pino structured logging with automatic secret redaction (`src/server/security/logger.ts`)
