# Phase 7B isolated routing rehearsal

Production remains untouched. No multi-agent rollout, no business RPC mutations, no production pushes. The candidate Tracker starts from 0f75e69265475d475bb21be288887c7a2087ffe9; premium login a589dce is excluded.

## Routing

submitted/resubmitted -> tracker_admin; changes_requested/approved/rejected -> sales_agent. Server maps event, verifies Sales JWT through Auth user endpoint, uses existing is_admin RPC, reads actual submission/audit, and rejects caller-supplied recipient fields. Historical dry-runs permit verified admin observation but never delivery. Actual events still require owner/admin authorization and matching live state. Pilot identity stays Chong only.

## Database

Prepared migration 20261007083155_role_based_sales_notification_routing.sql belongs only to the push project. tracker_push_bindings is separate, RLS on, browser grants denied, one enabled endpoint globally. Actual subscription stays in shared push_subscriptions. New Tracker subscriptions opt out of generic categories; existing subscriptions remain untouched. Existing delivery rows retain sales_agent role, with new role/Tracker recipient metadata for future delivery. Unique business event index covers submission/event/revision across endpoints; admin TEST has one global claim. Failed/unknown claims never retry. Migration fails on unexpected pre-existing duplicates rather than deleting data.

## Free local reproduction

From work/phase7b-isolated: npm ci --ignore-scripts, node --test schema-tests.mjs. Copy origins.example.json to origins.json and set only the exact Preview origin. node server.mjs listens only on 127.0.0.1:4211. It uses PGlite in private-data and independently generated local VAPID keys in private-vapid.json. No production VAPID key or service-role key is read. Production identity/audit calls are read-only; one explicit is_admin RPC performs authorization. Credentials are never logged or persisted. The server refuses to send any actual business notification, and allows only the marked Admin TEST. The agent binding in isolation is a synthetic channel representing the read-only production inventory; it is not the real Chong endpoint. Optional historical-claims.json may seed only event claim metadata to prove replay blocking; it is intentionally untracked.

The Preview embeds a loopback API override plus preview-guard.js. Guard blocks Sales REST mutations and production Edge Function calls. It preserves is_admin/list_team_agents reads and existing Auth login. This is a rehearsal artifact, not an artifact eligible for production promotion. Preview device subscriptions belong to the Preview origin. Canonical Tracker-origin subscription verification is a separate production-release gate.

## Rollback

No production rollback is needed for this rehearsal: production Tracker dpl_4sT3cz5D4o171wcJC6xK2g7HDc3c and sales-notifications v1 stay intact. Stop the local server and disable only the isolated Tracker binding if desired; do not delete the real Sales-agent binding. Keep audit and VAPID files private.

For any later approved production release: retain dpl_4sT3cz5D4o171wcJC6xK2g7HDc3c and the captured v1 Edge source as rollback references. Restore the frontend/Edge implementation if needed while retaining event-level delivery claims and the unique event index to prevent replay. Disable the Tracker binding if reverting routing. Do not force-drop delivery history or undo Sales data. Schema removal requires its own reviewed guarded procedure, especially after any real Phase 7B event; this rehearsal grants no production migration authority.
