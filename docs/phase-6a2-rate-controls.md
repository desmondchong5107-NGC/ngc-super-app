# Sales product rate controls

Cash EQ Sales Charge is a select with 0, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5 percent. Matching PS: 0, .6, .9, 1.4, 1.9, 2, 2.2, 2.4, 2.8, 3, 3, 3 percent. New Cash EQ defaults to 3/1.9. PS is read-only. EPF 3/2.2; PRS 1.5/.9; Cash MM 0/0; both rates read-only. Others defaults to 0/0 and remains editable, SC 0..6.5 and PS 0..100.

Product changes intentionally reset only that fund to its product defaults. A restored legacy invalid Cash EQ pair is never normalized on render or load. Its original rates and saved request are preserved; the user must explicitly select a valid SC. An already attempted request remains locked for idempotency; check My Submissions before discarding and preparing corrected content.

Form estimates and approval formula retain the exact existing operation order. Draft namespace, expiration, RPC payloads, revision and attempt lifecycle are unchanged.

Run existing app/Auth/PWA tests plus `node work/test-sales-rates.mjs` (36 new checks). Real OTP remains eight digits and uses the existing Supabase email verification path.
