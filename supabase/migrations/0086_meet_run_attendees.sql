-- TASK-GE-224: Đọc danh sách thành viên được điểm danh của một buổi họp Meet.
-- Chỉ người có quyền points.attendance mới được đọc, tuân thủ đúng phạm vi RLS (scope own/all).

CREATE OR REPLACE FUNCTION public.meet_run_attendees(_conference_record text)
RETURNS TABLE (
  member_id uuid, full_name text, member_code text,
  department text, "position" text, avatar_path text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _scope text := public.perm_scope('points.attendance');
  _room_kind text; _room_dept text; _session uuid;
BEGIN
  IF _scope IS NULL THEN RETURN; END IF;

  SELECT r.attendance_session_id, m.kind, m.department
    INTO _session, _room_kind, _room_dept
  FROM public.meet_auto_runs r
  LEFT JOIN public.meeting_rooms m ON m.id = r.room_id
  WHERE r.conference_record = _conference_record;
  IF _session IS NULL THEN RETURN; END IF;

  -- Cùng luật nhìn thấy như policy meet_auto_runs_read_scoped (0084):
  IF _scope <> 'all' THEN
    IF NOT (_room_kind = 'shared'
            OR (_room_kind = 'work'
                AND _room_dept = (SELECT mm.department FROM public.my_active_member() mm))) THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT mb.id, mb.full_name, mb.member_code, mb.department, mb.position, mb.avatar_path
  FROM public.attendance_sessions s
  JOIN public.members mb ON mb.id = ANY (s.member_ids)
  WHERE s.id = _session
  ORDER BY mb.full_name;
END $$;

REVOKE ALL ON FUNCTION public.meet_run_attendees(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meet_run_attendees(text) TO authenticated;

-- Kiểm tra sau khi chạy -------------------------------------------------------
SELECT proname FROM pg_proc WHERE proname = 'meet_run_attendees';
