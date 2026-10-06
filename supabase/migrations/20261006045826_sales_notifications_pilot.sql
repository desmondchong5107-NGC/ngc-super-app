-- Notification project only. No Sales business tables, generic push routes or credentials changed.
BEGIN;
CREATE TABLE public.sales_push_bindings (
 endpoint text PRIMARY KEY REFERENCES public.push_subscriptions(endpoint) ON DELETE CASCADE,
 sales_user_id uuid NOT NULL,
 sales_agent_id uuid NOT NULL,
 agent_name text NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 enabled_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 dry_run_at timestamptz,
 CHECK (length(endpoint)<=2048 AND endpoint LIKE 'https://%')
);
-- Phase 7A is single device globally, deliberately narrower than per-agent uniqueness.
CREATE UNIQUE INDEX sales_push_bindings_one_pilot_device ON public.sales_push_bindings(enabled) WHERE enabled;
CREATE INDEX sales_push_bindings_sales_user_idx ON public.sales_push_bindings(sales_user_id);
CREATE TABLE public.sales_notification_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 submission_id uuid,
 event_type text NOT NULL CHECK(event_type IN ('submitted','resubmitted','changes_requested','approved','rejected','test')),
 revision integer NOT NULL,
 recipient_sales_user_id uuid NOT NULL,
 endpoint text NOT NULL,
 status text NOT NULL CHECK(status IN ('processing','sent','failed','unknown')),
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 error_code text,
 CHECK ((event_type='test' AND submission_id IS NULL AND revision=0) OR (event_type<>'test' AND submission_id IS NOT NULL AND revision>0)),
 UNIQUE(submission_id,event_type,revision,endpoint)
);
-- A single marked TEST for this pilot, including retries/device changes. Never auto-retry.
CREATE UNIQUE INDEX sales_notification_deliveries_one_pilot_test ON public.sales_notification_deliveries(recipient_sales_user_id) WHERE event_type='test';
ALTER TABLE public.sales_push_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_push_bindings,public.sales_notification_deliveries FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.sales_push_bindings,public.sales_notification_deliveries TO service_role;
COMMENT ON TABLE public.sales_push_bindings IS 'Cross-project Sales identities verified by sales-notifications Edge Function; browser roles have no access.';
COMMENT ON TABLE public.sales_notification_deliveries IS 'At-most-once targeted Sales push claims. No client content or authentication tokens. Failed/unknown claims never automatically retried.';
COMMIT;
