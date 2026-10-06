-- First roll back both frontend deployments and undeploy sales-notifications.
-- Keep delivery audit if the single TEST has already been accepted. Disable only Sales bindings.
BEGIN;
UPDATE public.sales_push_bindings SET enabled=false,updated_at=now(),dry_run_at=null;
COMMIT;
-- Before any real push, an empty deployment can be removed with this guarded transaction:
-- BEGIN;
-- DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.sales_notification_deliveries) THEN RAISE EXCEPTION 'Delivery audit exists; preserve it'; END IF; END $$;
-- DROP TABLE public.sales_notification_deliveries;
-- DROP TABLE public.sales_push_bindings;
-- COMMIT;
