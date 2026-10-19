# Polimill Strategy OS Implementation Plan

**Goal:** Deliver the approved authenticated MVP, repository and deployable Worker.
**Architecture:** Next.js routes and React components on vinext Workers; scoped D1 queries.
**Tech Stack:** Next.js, TypeScript, Tailwind, vinext, Wrangler, D1, Playwright.
**Spec:** design.md

Global constraints: Public repository; only synthetic data; credentials ignored; no public signup.

- [x] Infrastructure and data: Wrangler D1 binding, migrations, model types and provisioning script; prove migrations on empty local D1.
- [x] Authentication and protected APIs: test password/session and validation failures first, then implement login, session scoping, CSRF, rate limits and transactional updates.
- [x] Product: login, app shell, organization tree, goal drill-down, KPI chart, initiatives and edit dialogs; test persistence and invalid states.
- [x] Delivery: production build, Worker dry run, browser desktop/mobile QA, repository review, commit/push; use existing Cloudflare login or report required authentication.

Review focus: cross-organization IDs; expired/stolen session handling; rapid repeated logins; simultaneous edits; mobile table overflow.

## Execution record

- Current Cloudflare official recommendation verified: vinext. Scaffolded via create-vinext-app and kept Next.js App Router structure. Compatibility check: 100%, 0 partial imports.
- Fresh local D1 migrations and random-credential provisioning completed; remote D1 created and both migrations applied. No real data seeded.
- Unit tests: 3 passed. Built-Worker E2E: 5 passed (authentication, origin enforcement, scoped missing IDs, invalid inputs, optimistic conflict, KPI/goal/initiative persistence, mobile overflow, logout, shared-IP login allowance, failure throttling, disabled pre-hydration form).
- Review finding addressed: account failure limit remains 10/15min; independent IP limit is 100/15min, and successful login clears the account failure counter.
- Bugs repaired: pre-hydration form submission; initially separate local persistence paths between Vite and built Worker (start script now declares shared persistence); hydration interaction readiness.
- Test selector corrected: textarea located through its accessible textbox role; implicit-label text also included its initial contents in the test matcher.
- Windows preview locks build output; stop previews before build/deploy.
- Production build and Wrangler dry-run passed. Deployment: https://polimill-strategy-os.ba-taka-analysis-gateways.workers.dev (version d495fa3c-9153-4bb9-88d3-524455842902).
- Dependency audit residual: braces advisory through build tooling, 7 inherited High entries. fflate upgraded through override. No corresponding build-tool imports found in emitted Worker JavaScript.
- Ruling: user explicitly requested immediate implementation, GitHub reflection and deployment; no extra spec/plan or push approval gate was introduced. Empty repository was cloned into this task's work directory, providing a dedicated checkout without disturbing another workspace.
