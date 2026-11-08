-- Proof files attached to manual bonus/penalty adjustments.
-- The audit reason stays text-only; file paths live in their own column so the
-- ledger can reopen them without polluting the reason/audit trail.

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS evidence_paths text[] NOT NULL DEFAULT '{}';

-- Private bucket: only admins upload and read proof files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'point-evidence',
  'point-evidence',
  false,
  10485760,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage point evidence" ON storage.objects;
CREATE POLICY "Admins manage point evidence" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'point-evidence' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'point-evidence' AND public.has_role(auth.uid(), 'admin'));

-- Carry the evidence paths through the single internal points writer.
DROP FUNCTION IF EXISTS public._apply_points(uuid, int, text, text, uuid);
CREATE OR REPLACE FUNCTION public._apply_points(
  _member uuid,
  _delta int,
  _reason text,
  _kind text,
  _task uuid,
  _evidence text[] DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal int;
BEGIN
  UPDATE public.members SET contribution_points = contribution_points + _delta WHERE id = _member RETURNING contribution_points INTO _bal;
  IF _bal IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thành viên'; END IF;
  INSERT INTO public.point_transactions(member_id, delta, reason, kind, task_id, balance_after, created_by, evidence_paths)
  VALUES (_member, _delta, _reason, _kind, _task, _bal, auth.uid(), COALESCE(_evidence, ARRAY[]::text[]));
END $$;
REVOKE EXECUTE ON FUNCTION public._apply_points(uuid, int, text, text, uuid, text[]) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.adjust_points(uuid, int, text, text);
CREATE OR REPLACE FUNCTION public.adjust_points(
  _member uuid,
  _delta int,
  _reason text,
  _kind text,
  _evidence text[] DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _kind = 'attendance' THEN
    IF NOT public.can_manage_department(_dept) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
    IF _delta < 0 OR _delta > 10 THEN RAISE EXCEPTION 'Điểm điểm danh 0–10'; END IF;
  ELSIF _kind IN ('bonus','penalty') THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Chỉ Quản trị viên được thưởng/trừ điểm'; END IF;
    IF _delta = 0 OR abs(_delta) > 100 THEN RAISE EXCEPTION 'Điểm điều chỉnh 1–100'; END IF;
    IF (_kind = 'bonus') <> (_delta > 0) THEN RAISE EXCEPTION 'Dấu điểm không khớp loại điều chỉnh'; END IF;
  ELSE RAISE EXCEPTION 'Loại điều chỉnh không hợp lệ'; END IF;
  IF length(trim(COALESCE(_reason,''))) < 3 OR length(_reason) > 300 THEN RAISE EXCEPTION 'Lý do bắt buộc (3–300 ký tự)'; END IF;
  IF COALESCE(array_length(_evidence, 1), 0) > 5 THEN RAISE EXCEPTION 'Tối đa 5 tệp minh chứng'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(_evidence, ARRAY[]::text[])) p WHERE length(p) > 400) THEN
    RAISE EXCEPTION 'Đường dẫn minh chứng quá dài';
  END IF;
  PERFORM public._apply_points(_member, _delta, trim(_reason), _kind, NULL, COALESCE(_evidence, ARRAY[]::text[]));
END $$;
REVOKE EXECUTE ON FUNCTION public.adjust_points(uuid, int, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_points(uuid, int, text, text, text[]) TO authenticated;
