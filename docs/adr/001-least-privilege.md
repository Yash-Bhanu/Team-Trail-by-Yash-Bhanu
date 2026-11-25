# ADR 001: Least-Privilege GitHub App Integration

## Status
Accepted

## Context
University project teams store source code, private discussions, and sensitive academic work in GitHub repositories. Requesting broad repository `contents` permissions creates unnecessary privacy and security risks.

## Decision
TeamTrail uses a GitHub App requesting only:
- `Metadata: Read-only`
- `Pull requests: Read-only`
- `Issues: Read-only`

Webhook payloads are verified via constant-time HMAC SHA-256 and processed transiently to extract only approved metadata (event type, actor ID/login, timestamps, PR/issue numbers, URLs). Bodies, diffs, and comment text are discarded immediately.

## Consequences
Direct `git push` commits without PRs are not tracked. TeamTrail documents this explicitly in the UI via `dataCoverage` so missing data is never misinterpreted as inactivity.
