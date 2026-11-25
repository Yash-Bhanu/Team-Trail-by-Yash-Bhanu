# AGENTS.md — TeamTrail Persistent Engineering Guidelines

1. **Security First:** Never bypass `enforce()` in `src/server/authorization/index.ts`. All API routes and server pages must verify session + object-level authorization server-side.
2. **Least-Privilege GitHub:** Never request `contents` permission or store PR/issue bodies, diffs, comment text, or raw webhook payloads.
3. **Demo Isolation:** `src/lib/demo-data.ts` and `/demo` must never touch the live database or authentication sessions. Live dashboards must never fall back to synthetic data.
4. **Deterministic Analytics:** All risk rules in `src/server/metrics/risk-engine.ts` must remain pure, deterministic, and AI-free.
5. **Verification:** Run `npm run typecheck`, `npm run test`, `npm run security:scan`, and `npm run build` after changes.
