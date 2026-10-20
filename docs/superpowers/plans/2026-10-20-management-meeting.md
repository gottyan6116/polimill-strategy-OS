# Management meeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve numeric facts and financial formulas while adding configurable reporting structure and decision-focused screens.
**Architecture:** Add a scoped managed-value ledger and milestone records; preserve legacy tables with synchronized actuals. Share presentation configuration, formatters and axis helpers. Replace dashboard panel replicas with full lists and an executive summary.
**Tech Stack:** Existing TypeScript/React/vinext/Cloudflare D1; no new runtime dependencies.
**Spec:** docs/management-meeting-design.md

## Global Constraints
- Do not change financial calculation functions or any existing numeric facts.
- Null budgets/forecasts/plans/closing metadata must never become zero or inferred targets.
- Colors, units, definitions and thresholds live in configuration/tokens.
- Preserve authentication, organization scoping, audit and optimistic concurrency.

## Review Focus
- Zero versus missing, signed/zero-only axes and large magnitude ranges.
- No completed-month assumptions or fallback from missing forecast to actual.
- Seasonal/lower-is-better KPI plans and entirely missing plans.
- Legacy self-reported progress must not become invented completion dates.
- Existing actual edits and normalized values must stay synchronized.

### Task 1: Baseline and presentation corrections
- [ ] Capture eight existing primary views on desktop; save baseline actual numeric snapshot privately in work/.
- [ ] Add failing tests for money 38.080003→38, rates, nice ticks/0 and all-positive NOPAT domain.
- [ ] Implement config/presentation.ts, lib/presentation.ts and use in financial charts/formatters. Replace donut, legends/points; constrain bubble labels.
- [ ] Verify unit tests and unchanged finance tests.

### Task 2: Managed observations and milestones
- [ ] Test null scenario comparisons, month-specific KPI plans, milestones and migration preservation.
- [ ] Create config/management.ts, lib/management.ts, migration0005 and scoped management API. Extend workspace/finance GET payload with management:{values,milestones}.
- [ ] Value contract: entity_type finance_period/finance_month/kpi, entity_id, metric, scenario actual/budget/forecast/prior_year, period, value number|null, is_closed boolean, source, updated_at, version.
- [ ] Milestone contract: id,initiative_id,title,planned_on,completed_on nullable,version.
- [ ] Synchronize legacy actuals; no made-up numeric forecasts/plans. Test auth/scoping/version checks and migration from current DB.

### Task 3: Decision screens and visual system
- [ ] Add executive summary, exception list and freshness; missing comparisons display 未設定.
- [ ] Add full KPI/initiative/organization searchable sortable filterable lists and individual details; use milestone edit forms.
- [ ] Add configurable driver→finance→profit→ROIC traversal.
- [ ] Add monthly actual/forecast/budget rendering and cumulative toggle with missing-state explanation. Prioritize overdue balances and owner.
- [ ] Apply neutral design tokens, numerical hierarchy, thin rules and typography across existing financial tabs.

### Task 4: Verify and deliver
- [ ] Run type/unit/build/E2E and fresh migration; verify original numeric facts unchanged.
- [ ] Capture same eight views after changes plus mobile. Inspect screenshots/console/label bounds.
- [ ] Fresh whole-change review, fix material findings, rerun affected checks.
- [ ] Deliver source, before/after screenshots, requirement checklist, decisions and remaining unset fields. Apply authorized additive migration/deployment and verify live behavior; GitHub remains Public.

Execution ruling: The user has supplied the desired design and previously requested confirmation only for required authentication/external changes. Proceed within that authorized scope without additional design-approval pauses. Independent chart and data tasks use the dispatching-parallel-agents workflow with disjoint files; root integrates UI and checks. Production publication retains existing authorization from the continuing task.
