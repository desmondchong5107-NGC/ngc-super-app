-- Push project only. Prepared candidate; production remains untouched in Phase 7B Preview.
BEGIN;
CREATE TABLE public.tracker_push_bindings (
 endpoint text PRIMARY KEY REFERENCES public.push_subscriptions(endpoint) ON DELETE CASCADE,
 tracker_user_id uuid NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 enabled_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 dry_run_at timestamptz,
 CHECK(length(endpoint)<=2048 AND endpoint LIKE 'https://%')
);
CREATE UNIQUE INDEX tracker_push_bindings_one_admin_device ON public.tracker_push_bindings(enabled) WHERE enabled;
ALTER TABLE public.tracker_push_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tracker_push_bindings FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.tracker_push_bindings TO service_role;
ALTER TABLE public.sales_notification_deliveries ADD COLUMN recipient_role text NOT NULL DEFAULT 'sales_agent' CHECK(recipient_role IN ('sales_agent','tracker_admin'));
ALTER TABLE public.sales_notification_deliveries ADD COLUMN recipient_tracker_user_id uuid;
ALTER TABLE public.sales_notification_deliveries ADD CONSTRAINT sales_delivery_role_identity CHECK((recipient_role='sales_agent' AND recipient_tracker_user_id IS NULL) OR (recipient_role='tracker_admin' AND recipient_tracker_user_id IS NOT NULL));
-- Existing Phase 7A rows remain sales_agent, including their historical submitted event.
-- Index creation deliberately fails if unexpected historical duplicates exist: no data deletion.
CREATE UNIQUE INDEX sales_notification_deliveries_one_business_event ON public.sales_notification_deliveries(submission_id,event_type,revision) WHERE event_type<>'test';
DROP INDEX public.sales_notification_deliveries_one_pilot_test;
CREATE UNIQUE INDEX sales_notification_deliveries_one_agent_test ON public.sales_notification_deliveries(recipient_sales_user_id) WHERE event_type='test' AND recipient_role='sales_agent';
-- Exactly one administrator TEST per Phase 7B, including retries and endpoint replacements.
CREATE UNIQUE INDEX sales_notification_deliveries_one_admin_test ON public.sales_notification_deliveries(recipient_role) WHERE event_type='test' AND recipient_role='tracker_admin';
COMMENT ON COLUMN public.sales_notification_deliveries.recipient_sales_user_id IS 'Legacy field: Sales submission owner/pilot; actual recipient role is explicit and Tracker recipient uses recipient_tracker_user_id.';
COMMENT ON TABLE public.tracker_push_bindings IS 'Separate one-device Tracker admin channel. JWT and existing is_admin verified server-side. No browser table access.';
COMMIT;
