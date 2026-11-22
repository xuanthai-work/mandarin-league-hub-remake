-- TASK-GE-223: Bảng đệm trạng thái người có mặt trong phòng họp Google Meet (meeting_room_presence).
-- Dùng để đệm kết quả kiểm tra số người trong phòng (TTL 60s), tránh gọi Meet API liên tục.

CREATE TABLE IF NOT EXISTS public.meeting_room_presence (
  room_id           uuid PRIMARY KEY REFERENCES public.meeting_rooms(id) ON DELETE CASCADE,
  active            boolean NOT NULL DEFAULT false,
  participant_count int NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
  checked_at        timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  refreshing_at     timestamptz
);

-- Phân quyền & RLS ------------------------------------------------------------
ALTER TABLE public.meeting_room_presence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.meeting_room_presence FROM anon, authenticated;
GRANT SELECT ON public.meeting_room_presence TO authenticated;
GRANT ALL ON public.meeting_room_presence TO service_role;

DROP POLICY IF EXISTS "meeting_room_presence_read_scoped" ON public.meeting_room_presence;
CREATE POLICY "meeting_room_presence_read_scoped" ON public.meeting_room_presence
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT r.id FROM public.meeting_rooms r));

-- Kiểm tra sau khi chạy -------------------------------------------------------
SELECT count(*) AS meeting_room_presence_count FROM public.meeting_room_presence;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'meeting_room_presence';
