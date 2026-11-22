-- TASK-GE-219: Điểm danh họp tự động qua Google Meet (lõi xử lý và phòng họp chính thức).
-- Phòng họp do bot Google sở hữu và nhật ký xử lý tự động của các buổi họp.

-- a) Phòng họp chính thức do bot sở hữu
CREATE TABLE IF NOT EXISTS public.meeting_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 80),
  kind        text NOT NULL CHECK (kind IN ('work', 'club')),
  department  text,                        -- bắt buộc với 'work', NULL với 'club'
  space_name  text NOT NULL UNIQUE CHECK (space_name ~ '^spaces/[A-Za-z0-9_-]{1,100}$'),
  meeting_uri text NOT NULL CHECK (meeting_uri ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$'),
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'work' AND department IS NOT NULL) OR (kind = 'club' AND department IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_active ON public.meeting_rooms(active);

-- b) Nhật ký xử lý tự động: mỗi buổi họp (conference record) đúng một dòng
CREATE TABLE IF NOT EXISTS public.meet_auto_runs (
  conference_record     text PRIMARY KEY
                        CHECK (conference_record ~ '^conferenceRecords/[A-Za-z0-9_-]{1,200}$'),
  space_name            text,
  room_id               uuid REFERENCES public.meeting_rooms(id) ON DELETE SET NULL,
  status                text NOT NULL
                        CHECK (status IN ('running','scored','too_short','no_members','unknown_room','error')),
  detail                text NOT NULL DEFAULT '',
  present_count         int,
  attendance_session_id uuid REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
  meeting_start         timestamptz,
  meeting_end           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meet_auto_runs_status ON public.meet_auto_runs(status);
CREATE INDEX IF NOT EXISTS idx_meet_auto_runs_created_at ON public.meet_auto_runs(created_at DESC);

-- c) Phân quyền & RLS ---------------------------------------------------------
REVOKE ALL ON public.meeting_rooms FROM anon, authenticated;
REVOKE ALL ON public.meet_auto_runs FROM anon, authenticated;

GRANT SELECT ON public.meeting_rooms TO authenticated;
GRANT SELECT ON public.meet_auto_runs TO authenticated;

GRANT ALL ON public.meeting_rooms TO service_role;
GRANT ALL ON public.meet_auto_runs TO service_role;

ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_auto_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_rooms_read_attendance" ON public.meeting_rooms;
CREATE POLICY "meeting_rooms_read_attendance" ON public.meeting_rooms
  FOR SELECT TO authenticated
  USING (public.perm_scope('points.attendance') IS NOT NULL);

DROP POLICY IF EXISTS "meet_auto_runs_read_attendance" ON public.meet_auto_runs;
CREATE POLICY "meet_auto_runs_read_attendance" ON public.meet_auto_runs
  FOR SELECT TO authenticated
  USING (public.perm_scope('points.attendance') IS NOT NULL);

-- d) Kiểm tra sau khi chạy ----------------------------------------------------
SELECT count(*) AS meeting_rooms_count FROM public.meeting_rooms;
SELECT count(*) AS meet_auto_runs_count FROM public.meet_auto_runs;
