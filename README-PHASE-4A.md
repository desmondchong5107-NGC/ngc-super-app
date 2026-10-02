# NGC Super App agent Sales module — Phase 4A

Local-only implementation. No production deployment or production mappings are authorized by this baseline.

Production-identical starting commit: 62ffa16a93eae59b7a6ecb27c71b186935d1abe3, branch baseline/super-app-phase4a. Feature branch: phase-4/agent-sales-module. Original index SHA256: a942db6508c83233452d84325f6b728d120942ce64c1b41125e68b3eb2a11cd0.

## Build and verify

Run `npm run build`, `npm test`, and `npm run preflight`. These commands use Node built-ins and need no new package installation. The Sales builder starts from the preserved production HTML in work/sales/baseline-super-app.html and adds exactly five shell changes: a shortcut, an iframe, a module payload, a frame binding, and the magic-link initial route. The existing modules and assets remain byte-identical.

The old build/verify scripts in the copied package manifest pointed to source-generation tools outside this isolated checkout. This branch provides portable build and verification scripts for the captured production HTML instead. The original project is untouched.

Edit work/sales/module.html, then build. Supabase JS 2.57.4 is pinned and bundled inline, so Sales does not add a CDN dependency or require changing the service worker. Generated HTML aliases must remain identical. The config contains a production public anon key only; RLS and authenticated RPCs provide authorization.

## Architecture and authentication

A separate Sales Supabase client targets ejhwbovqtcujjwvjniyt. Existing Super App services still target their original project. Authentication uses registered-account email OTP/magic links, with signup disabled by the client. A separate storage key persists the Sales session within the Super App origin. Sessions are not shared with the Tracker origin. Magic-link access/refresh tokens are consumed by setSession and removed from the URL. Authorization comes from active agent_user_links and backend RLS, never editable user metadata.

The eventual production callback is https://ngc-super-app.vercel.app/#sales. Before deployment, confirm that the Tracker project's redirect allow-list accepts this exact origin/path/hash, and that its email template presents a code for OTP if OTP entry is wanted. Existing production Auth configuration has not been changed. Any additional deployed alias needs its own explicitly approved redirect. Opening a link on another browser creates that browser's session; use OTP on the current device if necessary.

## Workflow and drafts

Mapped agents can submit one or multiple funds through submit_sale. Own-only list/detail queries include submitter_user_id filters in addition to RLS. Status counts are exact; the list is capped at the most recent 100 cases. Changes Requested cases use resubmit_sale with expected revision. Pending, Approved and Rejected are read-only.

Calculation contract: net = gross / (1 + (sales_charge / 100) * (1 + 0.08)); commission = net * (ps_rate / 100). Preview values are displayed to two decimals without rounding the calculation inputs. Funds reconcile to Total Investment in cents. Approval remains authoritative.

One UUID and immutable payload are retained per submission attempt, including failed/lost responses. An attempted draft locks its fields. Resubmission retries recognize a completed matching next revision before issuing another RPC. There is no automatic background submission or Realtime subscription.

Device drafts are account-scoped, expire after seven days, and are removed on successful submission, discard or sign-out. They contain the minimal client reference and sales fields, so shared devices should be signed out. Drafts never enter official counts. Once an API request has been attempted, check My Submissions before discarding/recreating the case because the server may have committed despite a lost response.

## Validation evidence and boundaries

Real disposable local PostgreSQL 17.6, Supabase Auth/PostgREST and the validated Phase 2/3 schema were used, with synthetic admin, Agent A, Agent B and unmapped users. OTP, magic-link callback, session restore, single/multiple funds, double tap plus lost-response retry, correction/resubmission, final statuses, RLS isolation, unmapped RPC denial and API-unavailable draft recovery passed. The admin review actions were local RPC test controls; no admin UI was built.

The localhost rehearsal uses a separate API proxy and a response-only local URL/key substitution. CSP blocks production API connections. Never run the production-configured static output against real production for synthetic testing. Local keys, passwords, databases and Auth fixtures are not included in this source archive.

Existing EPF, commission and PRS calculations were tested interactively. HERO88 shortcut, presentation and notification code is unchanged; production push delivery and remote presentation fetches were deliberately not exercised through the isolated preview. Service-worker offline reload and calculator operation passed with the local server stopped. Existing PWA update flow was exercised; an installed old cache requires the normal update/online reload before the new Sales module is available offline. Physical iOS installation has not been tested.

Do not deploy or build the Tracker admin approval interface without the next explicit approval.
