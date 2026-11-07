-- TASK-GE-198: leader card cleanup and a one-time blank reset (User 2026-11-08).
-- 1. The leader card is assigned with plain SQL by an admin, so set_member_leader() from 0075
--    is dropped (members_guard_write still lets only admins or the SQL editor change is_leader).
-- 2. Blank reset: every member back to 0 points and all six history / audit tables emptied.
--    Members, accounts and every other table stay as they are. The reset runs only once,
--    guarded by public.maintenance_runs, so re-running this file never wipes newer history.

DROP FUNCTION IF EXISTS public.set_member_leader(uuid, boolean);

-- One-time maintenance markers (no client access: RLS on, no policies).
CREATE TABLE IF NOT EXISTS public.maintenance_runs (
  key text PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.maintenance_runs FROM anon, authenticated;

DO $$
BEGIN
  INSERT INTO public.maintenance_runs (key) VALUES ('blank-reset-2026-11-08')
  ON CONFLICT (key) DO NOTHING;
  IF NOT FOUND THEN
    RETURN; -- already done once
  END IF;

  UPDATE public.members SET contribution_points = 0 WHERE contribution_points <> 0;
  DELETE FROM public.point_transactions;
  DELETE FROM public.application_status_history;
  DELETE FROM public.activity_audit_logs;
  DELETE FROM public.content_audit_logs;
  DELETE FROM public.hsk_score_audits;
  DELETE FROM public.permission_audit_logs;
END $$;

-- Kiểm tra sau khi chạy:
-- SELECT count(*) FROM pg_proc WHERE proname = 'set_member_leader';                 -- 0
-- SELECT count(*) FROM public.members WHERE contribution_points <> 0;               -- 0
-- SELECT (SELECT count(*) FROM public.point_transactions)
--      + (SELECT count(*) FROM public.application_status_history)
--      + (SELECT count(*) FROM public.activity_audit_logs)
--      + (SELECT count(*) FROM public.content_audit_logs)
--      + (SELECT count(*) FROM public.hsk_score_audits)
--      + (SELECT count(*) FROM public.permission_audit_logs);                       -- 0
-- SELECT * FROM public.maintenance_runs;                     -- 1 dòng blank-reset-2026-11-08
