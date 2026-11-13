-- TASK-GE-204: "Nhận xét" module under Cài đặt.
-- Every active member account may send a bug report / improvement idea / other comment.
-- A member reads only their own submissions; the Co-founder, admins and the Technology &
-- Systems leadership (heads, deputies, advisors) read and answer every submission through
-- the feedback.review action, so the matrix stays the single source of truth.

-- a) Permission action + matrix ---------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('feedback.review', 'feedback', 'Xem và xử lý mọi đơn nhận xét (trạng thái, phản hồi)', false, 480)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module, label = EXCLUDED.label,
      scoped = EXCLUDED.scoped, sort_order = EXCLUDED.sort_order;

-- User 2026-11-13: exactly these rows. The admin flag already bypasses has_perm().
DELETE FROM public.position_permissions WHERE action = 'feedback.review';
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('executive', 'Co-founder', 'feedback.review', 'all'),
  ('tech', 'Trưởng Ban', 'feedback.review', 'all'),
  ('tech', 'Phó Ban', 'feedback.review', 'all'),
  ('tech', 'Cố vấn chuyên môn', 'feedback.review', 'all')
ON CONFLICT (department, position, action) DO NOTHING;

-- b) Table -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bug', 'improvement', 'other')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 200),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 10 AND 5000),
  -- Storage path inside the private `feedback-screenshots` bucket (signed on read).
  screenshot_url text NOT NULL DEFAULT '' CHECK (char_length(screenshot_url) <= 400),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  admin_note text NOT NULL DEFAULT '' CHECK (char_length(admin_note) <= 2000),
  resolved_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_member_id ON public.feedbacks(member_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON public.feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.feedbacks TO authenticated;
GRANT ALL ON public.feedbacks TO service_role;

-- c) RLS ---------------------------------------------------------------------
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feedbacks readable by owner or reviewer" ON public.feedbacks;
CREATE POLICY "Feedbacks readable by owner or reviewer" ON public.feedbacks
  FOR SELECT TO authenticated
  USING (member_id = public.my_member_id() OR public.has_perm('feedback.review'));

DROP POLICY IF EXISTS "Feedbacks inserted by owner" ON public.feedbacks;
CREATE POLICY "Feedbacks inserted by owner" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id = public.my_member_id()
    AND status = 'pending'
    AND admin_note = ''
    AND resolved_by IS NULL
    AND resolved_at IS NULL
  );

-- RLS has no column granularity: the trigger below keeps the writer's words intact for
-- reviewers and the reviewer's answer intact for the writer.
DROP POLICY IF EXISTS "Feedbacks updated by owner or reviewer" ON public.feedbacks;
CREATE POLICY "Feedbacks updated by owner or reviewer" ON public.feedbacks
  FOR UPDATE TO authenticated
  USING (member_id = public.my_member_id() OR public.has_perm('feedback.review'))
  WITH CHECK (member_id = public.my_member_id() OR public.has_perm('feedback.review'));

-- d) Write guard --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._guard_feedback_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Definer functions and the service role keep their own checked paths.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.member_id IS DISTINCT FROM public.my_member_id() THEN
      RAISE EXCEPTION 'Chỉ được gửi nhận xét dưới tên của chính mình';
    END IF;
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Đơn mới luôn ở trạng thái Chờ xử lý';
    END IF;
    NEW.title := btrim(NEW.title);
    NEW.content := btrim(NEW.content);
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Không được đổi người viết hoặc thời điểm gửi';
  END IF;

  -- The writer may still fix their own words while the submission is Chờ xử lý.
  -- A reviewer who writes a submission gets the same path (their own answer fields untouched).
  IF OLD.member_id = public.my_member_id()
     AND OLD.status = 'pending'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.admin_note IS NOT DISTINCT FROM OLD.admin_note
     AND NEW.resolved_by IS NOT DISTINCT FROM OLD.resolved_by
     AND NEW.resolved_at IS NOT DISTINCT FROM OLD.resolved_at THEN
    NEW.title := btrim(NEW.title);
    NEW.content := btrim(NEW.content);
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT public.has_perm('feedback.review') THEN
    IF OLD.member_id IS DISTINCT FROM public.my_member_id() THEN
      RAISE EXCEPTION 'Không có quyền sửa đơn nhận xét này';
    ELSIF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Chỉ sửa được đơn đang Chờ xử lý';
    ELSE
      RAISE EXCEPTION 'Chỉ Ban Công nghệ & Hệ thống được đổi trạng thái và phản hồi';
    END IF;
  END IF;

  -- Reviewer answer: status + reply. The writer's content never changes.
  IF NEW.type IS DISTINCT FROM OLD.type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.screenshot_url IS DISTINCT FROM OLD.screenshot_url THEN
    RAISE EXCEPTION 'Người xử lý không sửa nội dung đơn nhận xét';
  END IF;
  NEW.admin_note := btrim(COALESCE(NEW.admin_note, ''));
  IF NEW.status IN ('resolved', 'closed') THEN
    NEW.resolved_by := COALESCE(NEW.resolved_by, public.my_member_id());
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSE
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._guard_feedback_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS feedbacks_guard_write ON public.feedbacks;
CREATE TRIGGER feedbacks_guard_write BEFORE INSERT OR UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public._guard_feedback_write();

-- e) Screenshot bucket --------------------------------------------------------
-- Private: the writer uploads and reads their own file, reviewers read every file.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Feedback screenshots uploaded by owner" ON storage.objects;
CREATE POLICY "Feedback screenshots uploaded by owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.my_member_id() IS NOT NULL
  );

DROP POLICY IF EXISTS "Feedback screenshots readable by owner or reviewer" ON storage.objects;
CREATE POLICY "Feedback screenshots readable by owner or reviewer" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_perm('feedback.review'))
  );

DROP POLICY IF EXISTS "Feedback screenshots removed by owner" ON storage.objects;
CREATE POLICY "Feedback screenshots removed by owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Kiểm tra sau khi chạy:
-- SELECT has_perm('feedback.review');
-- SELECT * FROM public.feedbacks ORDER BY created_at DESC LIMIT 5;
