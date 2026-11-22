-- ==============================================================================
-- 0090_meet_runs_room_snapshot.sql
-- Chụp lại tên, loại và Ban của phòng họp vào bảng nhật ký meet_auto_runs:
-- - Thêm 3 cột: room_label, room_kind, room_department.
-- - Điền cho các dòng hiện có còn liên kết phòng (room_id IS NOT NULL).
-- - Tạo trigger BEFORE DELETE trên meeting_rooms để chụp lại thông tin phòng
--   trước khi khóa ngoại room_id bị SET NULL.
-- ==============================================================================

-- a) Ba cột chụp lại thông tin phòng (cho phép NULL) ---------------------------
ALTER TABLE public.meet_auto_runs
  ADD COLUMN IF NOT EXISTS room_label text,
  ADD COLUMN IF NOT EXISTS room_kind text,
  ADD COLUMN IF NOT EXISTS room_department text;

-- b) Điền thông tin cho các dòng hiện có còn phòng ----------------------------
UPDATE public.meet_auto_runs r
SET room_label = m.label, room_kind = m.kind, room_department = m.department
FROM public.meeting_rooms m
WHERE r.room_id = m.id AND r.room_label IS NULL;

-- c) Trigger chụp lại khi phòng họp bị xóa ------------------------------------
CREATE OR REPLACE FUNCTION public.meeting_room_snapshot_on_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.meet_auto_runs
  SET room_label = OLD.label, room_kind = OLD.kind, room_department = OLD.department
  WHERE room_id = OLD.id;
  RETURN OLD;
END $$;

REVOKE ALL ON FUNCTION public.meeting_room_snapshot_on_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS meeting_room_snapshot_on_delete ON public.meeting_rooms;
CREATE TRIGGER meeting_room_snapshot_on_delete
  BEFORE DELETE ON public.meeting_rooms
  FOR EACH ROW EXECUTE FUNCTION public.meeting_room_snapshot_on_delete();

-- Verification queries:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'meet_auto_runs' AND column_name LIKE 'room_%';
-- SELECT tgname FROM pg_trigger WHERE tgname = 'meeting_room_snapshot_on_delete';
