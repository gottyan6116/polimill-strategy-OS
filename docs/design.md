# Polimill Strategy OS MVP

2026-10-19. Implement the user's approved scope immediately; no additional design approval gate. Public repository remains public. Only synthetic hypotheses are seeded.

## Product and design

Authenticated management workspace: organization → department → goal → KPI and initiatives. Email/password login, editable goal hypotheses, KPI actual/target, initiative progress/status, durable D1 storage. No registration, password recovery, SSO or AI functionality in this MVP.

Reference: the two images from the linked conversation. Login: dark navy #0b2038, teal #45d5cb, centered translucent glass panel, email/password fields. Dashboard: white surfaces, navy sidebar, teal progress, organization tree, department goals, KPI trend and initiatives table. Japanese system sans typography, 14px body, 12px labels, 28px page heading; restrained 10px radii and light borders. Desktop three-column working area; mobile stacked sections with scrollable tables. Use accessible Lucide outline icons and visible focus states.

Intentional reference adaptations: Polimill synthetic business organization replaces fictional municipality; fiscal period is 2026; functional session/logout and editor replace decorative controls; omit nonfunctional SSO, AI and reports. No real company figures, people or customer information.

## Architecture

Next.js 16 App Router + TypeScript + Tailwind, deployed using Cloudflare's current recommended vinext adapter and Vite plugin (beta, documented constraint). Wrangler declares Worker and D1; versioned SQL migrations declare schema and synthetic seed. No Pages/next-on-pages. D1 binding is server-only. Login uses salted PBKDF2, random opaque sessions hashed in D1, HttpOnly SameSite cookie, expiry and logout revocation. Origin checks protect writes; D1 login throttling protects email and IP. All data access requires a valid session and organization scope. Initial admin creation is an operator-only local/remote script, no public bootstrap endpoint or committed credentials.

## Acceptance

Typecheck + production Worker build + dry-run deploy; migrations on a clean local D1; automated invalid login, unauthorized API, CSRF, throttling, update validation, persisted edits, concurrency and logout tests. Browser desktop and mobile inspection against supplied images. GitHub push authorized by user; remote Cloudflare provisioning/deploy only within existing authentication; request account login if missing.
