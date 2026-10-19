# Monthly P&L and collection/payment management

Continue the authorized MVP with the five elements in the supplied screenshot: monthly operating profit, revenue, expense mix, receivables and payables. Preserve existing finance views, authentication and Public visibility. Use only fictional data; do not ingest the screenshot's account balances or external logos. Extend the established navy/white/teal UI.

Add a 損益・入出金 tab under 財務分析. Fiscal-year and business filters remain shared. The year runs April–March. Two monthly bar charts show operating profit and revenue; expenses use a donut plus exact category amounts. Collection/payment summaries show outstanding amounts grouped by missing due date, overdue, and upcoming/today. Detail controls open actual month or invoice lists, with working edits and recording of settlements.

## Accounting contract

Amounts remain JPY millions, with storage rounded to one yen (0.000001 million). Monthly revenue, cost of sales and six SG&A categories sum to existing annual fields. Monthly edits update annual revenue/cost/SG&A and dependent ratios atomically. Annual edits reallocate monthly values proportionally, preserving existing month/category mix; zero bases use equal shares. Largest-remainder allocation preserves exact whole-yen totals without negative residuals. Existing optimistic-version and carry-forward rules remain in effect.

Monthly operating profit = revenue − cost of sales − SG&A. This is accrual operating P&L, not net income or cash flow. Expense mix = cost of sales plus six SG&A categories. No consumption tax, nonoperating income or tax expenses in this view. FY2024–2026 month rows are fictional allocations and explicitly labelled as hypotheses.

Invoices link to an owned finance period and are either receivable or payable. Store issue date, optional due date, counterparty and amount. Settlement ledger rows store amount and actual settlement date; no external bank/payment execution. The summary has an editable as-of date, defaulting to today's Japan date. Exclude invoices not yet issued at that date, and subtract only settlements on/before that date. Due date strictly before the as-of date is overdue; the date itself is upcoming/today. Fully settled invoices are excluded from open balances but remain inspectable. Unknown due dates have their own category.

Invoice management is an independent operational ledger: recording a settlement updates outstanding balances, not annual P&L/CF or forecast B/S. State this explicitly to prevent double counting and false reconciliation expectations. Initial unsettled invoice amounts match FY period's illustrative receivables/payables for convenience, but subsequent edits need not match forecast B/S. Keep server-side organization scoping, strict validation, CSRF and optimistic concurrency. A version-guarded invoice update gates settlement insertion and audit logging in the same transaction; reject over-settlement, invalid dates and reduction below recorded settlements.

Cancellation preserves the ledger row with a Japan-date cancellation timestamp. Historical balances include that settlement until the cancellation date; same-day cancellation removes it for that day. Reject backdated settlements or invoice reductions that would exceed invoice capacity at any settlement/cancellation date. This is daily, not intraday, history; invoice metadata edits revise the invoice itself and are not versioned financial statements.

## Work plan

1. Test and implement allocation, reconciliation and as-of balance/status logic.
2. Add monthly rows and invoice/settlement tables with synthetic seed; extend finance reads and centralize period mutations so annual/monthly edits share the same transaction.
3. Add authenticated invoice creation/edit/settlement APIs, monthly API, five overview cards and working detail dialogs.
4. Verify existing features and new scenarios: month/annual equality, zero allocation, historical as-of, partial settlement, overpayment and stale versions, CSRF, persistence, desktop/mobile layout.
5. Review, additive remote migration, deploy, remote smoke/restore, GitHub push and CI.

## Verification record

- Typecheck and production Worker build pass; 12 unit tests and 10 built-Worker E2E tests pass.
- Coverage includes month/year reconciliation, whole-yen allocation, monthly persistence/restoration, partial settlements, cancellation, historical overpayment rejection, stale versions, CSRF, authenticated access and desktop/mobile layouts. Original strategy/login and four finance views remain covered.
- All four migrations succeed from an empty isolated local D1. Additive migration 0004 also applied successfully to remote D1 without resetting existing data.
- Independent code review identified historical settlement-capacity and large-amount precision issues; both fixed, regression-tested and re-reviewed with no remaining actionable findings.
- Mobile overflow from the expanded finance tabs was fixed by constraining the workspace grid column. Wide detail tables scroll inside dialogs.
