# Financial analysis extension

User requested the four analysis families in the supplied screenshot. Extend the existing authenticated app; preserve Public visibility, synthetic data only, and existing deployment authorization. No additional design approval gate.

## Screens

Add 財務分析 to the sidebar with four tabs: ポートフォリオ, ROICツリー, 財務指標, キャッシュフロー. Keep the established white/navy/teal system. Shared fiscal-year and business-unit filters. Portfolio plots revenue growth against ROIC; bubble area encodes sales, and selection drills into the business. Revenue and NOPAT share bars accompany the comparison. ROIC tree decomposes NOPAT margin × invested capital turnover, then revenue/costs and working/fixed capital. Financial indicators cover profitability, growth, asset efficiency and balance-sheet safety. CF shows operating/investing/financing series, FCF and a beginning-to-ending cash bridge. Exact numbers remain available in tables.

## Data contract

Organization-scoped business units and fiscal-year records in D1. Three fictional businesses over FY2024–2026. All amounts in JPY millions, tax rates as fractions. All records explicitly hypothetical; no actual Polimill financials inferred from the screenshot. No commercial product marks copied.

Operating profit = revenue − cost of sales − SG&A. Simplified operating tax = max(operating profit, 0) × assumed tax rate; no automatic tax credit on losses. NOPAT = operating profit − operating tax. Closing invested capital = receivables + inventory − payables + net fixed operating assets; cash excluded. ROIC uses the average of opening and closing invested capital. Group ratios use summed numerators and denominators, never arithmetic means of business ratios. Revenue growth requires the same business population in both periods and a positive prior revenue; otherwise unavailable. FCF = operating CF + investing CF. Cash changes by operating + investing + financing CF; no FX effects in this model.

Total assets = closing cash + receivables + inventory + fixed assets. Liabilities = payables + short-term debt + long-term debt. Equity = total assets − liabilities. Current ratio = current assets / (payables + short-term debt). Asset turnover uses average opening/closing assets. Nonpositive denominators return null, displayed as —, never zero. Negative profit shares are not represented as positive composition.

Editing a historical year propagates cash, invested capital and assets into following years' opening balances within one D1 transaction; affected versions increase. Preserve strict input validation, organization scoping, CSRF, conflict detection and audit logs. Validate the full affected chain and guard all affected record versions.

## Delivery plan

1. Write failing calculation/validation tests, implement pure finance model.
2. Add migration/seed, authenticated GET/PATCH API, scoped optimistic updates and carry-forward.
3. Build four interactive views and an editor; keep financial UI isolated from strategy components.
4. Verify calculations, unauthorized/invalid/conflicting edits, carry-forward, all four screens and responsive layout; run existing suite to protect the MVP.
5. Review, apply additive remote migration, deploy, push GitHub, verify remote persistence and CI.

Definition references: IFRS IAS 7 classifies cash flows into operating/investing/financing (https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows.html). ROIC definitions vary by organization (https://www.kao.com/global/en/newsroom/news/release/2025/20250508-002/); the explicit simplified model above is this app's convention, not a claim of IFRS financial-statement compliance.

## Verification record

- Typecheck and production Worker build pass.
- Unit tests: 8 passed, including decomposition, weighted aggregation, losses, unavailable denominators/comparatives, carry-forward, validation.
- Built-Worker E2E: 7 passed, including all four financial screens, actual persisted edits, subsequent-year balance propagation and restoration, conflict/invalid/origin checks, mobile layout, and the original strategy/login tests.
- Independent read-only code review: no important findings. Concurrent interleavings reviewed from code rather than stress-tested.
- Fixed mobile overflow caused by an absolutely positioned screen-reader label inside a horizontally scrolling table: anchored its containing button with position:relative. Charts and wide tables now scroll inside their panels, with no page-level horizontal overflow across all four views.
- Additive migration 0003 applied to remote D1. Deployed Worker version 511b3e47-2da2-4ca2-a0c7-7a1c7ef06192. Public repository and original accounts/data preserved.
