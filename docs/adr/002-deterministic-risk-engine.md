# ADR 002: Deterministic Risk Detection Engine

## Status
Accepted

## Context
Mentors need reliable, explainable early-warning signals without opaque AI scoring, hallucinated explanations, or external LLM data sharing.

## Decision
All risk detection rules (`RISK-001` through `RISK-006`) are implemented as pure, deterministic TypeScript functions with an injectable `Clock` (`src/server/metrics/risk-engine.ts`). Each flag emits a `ruleId`, `ruleVersion`, `observationStart`, `observationEnd`, `dataCoverage`, and structured `evidence` JSON.

## Consequences
Every risk flag is 100% reproducible in unit tests, auditable by mentors and students, and zero student data is ever sent to external AI APIs.
