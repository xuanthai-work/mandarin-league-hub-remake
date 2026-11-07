-- TASK-GE-183: split recruitment.config into view / create / edit (periods) and questions.edit
-- (question bank). Deleting follows the matching edit action; there is no separate delete action.

-- a) New actions --------------------------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('recruitment.view',   'recruitment', 'Xem đợt tuyển và ngân hàng câu hỏi', false, 10),
  ('recruitment.create', 'recruitment', 'Tạo đợt tuyển', false, 11),
  ('recruitment.edit',   'recruitment', 'Sửa đợt tuyển và vị trí tuyển (mở, đóng, xóa)', false, 12),
  ('questions.edit',     'recruitment', 'Thêm, sửa, xóa chủ đề và câu hỏi tuyển dụng', false, 13)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module, label = EXCLUDED.label,
      scoped = EXCLUDED.scoped, sort_order = EXCLUDED.sort_order;

-- b) Matrix rows (User 2026-11-08). Remove any earlier rows of these actions first so reruns
--    end in exactly this state.
DELETE FROM public.position_permissions
 WHERE action IN ('recruitment.view','recruitment.create','recruitment.edit','questions.edit');

INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('executive','Co-founder','recruitment.view','all'),
  ('executive','Co-founder','recruitment.create','all'),
  ('executive','Co-founder','recruitment.edit','all'),
  ('executive','Co-founder','questions.edit','all'),
  ('executive','Thư ký','recruitment.view','all'),
  ('hr','Trưởng Ban','recruitment.view','all'),
  ('hr','Phó Ban','recruitment.view','all'),
  ('hr','Thành viên','recruitment.view','all'),
  ('hr','Trưởng Ban','questions.edit','all'),
  ('hr','Phó Ban','questions.edit','all'),
  ('hr','Thành viên','questions.edit','all')
ON CONFLICT (department, position, action) DO NOTHING;

-- c) RLS: staff reads -------------------------------------------------------------
DROP POLICY IF EXISTS "Recruitment staff read recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment staff read recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment staff read recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment staff read recruitment_questions" ON public.recruitment_questions;
CREATE POLICY "Recruitment staff read recruitment_periods" ON public.recruitment_periods FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.view') OR public.perm_scope('candidates.view') IS NOT NULL);
CREATE POLICY "Recruitment staff read recruitment_positions" ON public.recruitment_positions FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.view') OR public.perm_scope('candidates.view') IS NOT NULL);
CREATE POLICY "Recruitment staff read recruitment_topics" ON public.recruitment_topics FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.view') OR public.perm_scope('candidates.view') IS NOT NULL);
CREATE POLICY "Recruitment staff read recruitment_questions" ON public.recruitment_questions FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.view') OR public.perm_scope('candidates.view') IS NOT NULL);

-- d) RLS: writes ------------------------------------------------------------------
DROP POLICY IF EXISTS "Recruitment config insert recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment config update recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment config insert recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment config update recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment config insert recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment config update recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment config insert recruitment_questions" ON public.recruitment_questions;
DROP POLICY IF EXISTS "Recruitment config update recruitment_questions" ON public.recruitment_questions;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_questions" ON public.recruitment_questions;

-- Periods: create vs edit.
CREATE POLICY "Recruitment create recruitment_periods" ON public.recruitment_periods FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('recruitment.create'));
CREATE POLICY "Recruitment edit recruitment_periods" ON public.recruitment_periods FOR UPDATE TO authenticated
  USING (public.has_perm('recruitment.edit')) WITH CHECK (public.has_perm('recruitment.edit'));
CREATE POLICY "Recruitment delete recruitment_periods" ON public.recruitment_periods FOR DELETE TO authenticated
  USING (public.has_perm('recruitment.edit'));

-- Positions belong to a period: inserted while creating a period, or edited later.
CREATE POLICY "Recruitment create recruitment_positions" ON public.recruitment_positions FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('recruitment.create') OR public.has_perm('recruitment.edit'));
CREATE POLICY "Recruitment edit recruitment_positions" ON public.recruitment_positions FOR UPDATE TO authenticated
  USING (public.has_perm('recruitment.edit')) WITH CHECK (public.has_perm('recruitment.edit'));
CREATE POLICY "Recruitment delete recruitment_positions" ON public.recruitment_positions FOR DELETE TO authenticated
  USING (public.has_perm('recruitment.edit'));

-- Question bank: topics + questions.
CREATE POLICY "Questions insert recruitment_topics" ON public.recruitment_topics FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('questions.edit'));
CREATE POLICY "Questions update recruitment_topics" ON public.recruitment_topics FOR UPDATE TO authenticated
  USING (public.has_perm('questions.edit')) WITH CHECK (public.has_perm('questions.edit'));
CREATE POLICY "Questions delete recruitment_topics" ON public.recruitment_topics FOR DELETE TO authenticated
  USING (public.has_perm('questions.edit'));
CREATE POLICY "Questions insert recruitment_questions" ON public.recruitment_questions FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('questions.edit'));
CREATE POLICY "Questions update recruitment_questions" ON public.recruitment_questions FOR UPDATE TO authenticated
  USING (public.has_perm('questions.edit')) WITH CHECK (public.has_perm('questions.edit'));
CREATE POLICY "Questions delete recruitment_questions" ON public.recruitment_questions FOR DELETE TO authenticated
  USING (public.has_perm('questions.edit'));

-- e) Answered-question count: shown before deleting a question/topic.
CREATE OR REPLACE FUNCTION public.recruitment_answer_count(
  _question uuid DEFAULT NULL,
  _topic uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm('recruitment.view') THEN
    RAISE EXCEPTION 'Bạn không có quyền xem ngân hàng câu hỏi';
  END IF;
  RETURN (SELECT count(*)::int
    FROM public.candidate_applications a
    WHERE a.answers ?| ARRAY(
      SELECT q.id::text
      FROM public.recruitment_questions q
      WHERE q.id = _question OR q.topic_id = _topic
    ));
END $$;
REVOKE EXECUTE ON FUNCTION public.recruitment_answer_count(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recruitment_answer_count(uuid, uuid) TO authenticated;

-- f) Personal grants of recruitment.config -> view + questions.edit (period create/edit stays
--    Co-founder only, as the User decided). Same expiry and note.
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT g.member_id, v.action, 'all', g.expires_at,
       trim(g.note || ' (chuyển từ recruitment.config, 0064)'), g.granted_by
FROM public.member_permission_grants g
CROSS JOIN (VALUES ('recruitment.view'), ('questions.edit')) v(action)
WHERE g.action = 'recruitment.config' AND g.revoked_at IS NULL
  -- expired grants are skipped: the table CHECK requires expires_at > created_at (= now()).
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = v.action AND x.revoked_at IS NULL);

-- g) Drop the old action (cascades its matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'recruitment.config';
