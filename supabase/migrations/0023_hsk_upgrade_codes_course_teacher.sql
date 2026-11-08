ALTER TABLE public.hsk_results
  ADD COLUMN IF NOT EXISTS hsk_class_id uuid REFERENCES public.hsk_classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS study_start date,
  ADD COLUMN IF NOT EXISTS study_end date;

ALTER TABLE public.hsk_results DROP CONSTRAINT IF EXISTS hsk_level_chk;
ALTER TABLE public.hsk_results ADD CONSTRAINT hsk_level_chk CHECK (level IN ('HSK1','HSK2','HSK3','HSK4','HSK5','HSK6','HSKK-BEG','HSKK-INT','HSKK-ADV','TML-4SKILL'));

CREATE OR REPLACE FUNCTION public._normalize_hsk() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.candidate_code := upper(regexp_replace(NEW.candidate_code, '[^A-Za-z0-9_-]', '', 'g'));
  NEW.candidate_name := btrim(NEW.candidate_name);
  IF NEW.level IN ('HSK1','HSK2') THEN
    NEW.writing_score := NULL; NEW.speaking_score := NULL;
    NEW.max_score := 200; NEW.pass_score := 120;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0);
  ELSIF NEW.level LIKE 'HSKK-%' THEN
    NEW.listening_score := NULL; NEW.reading_score := NULL; NEW.writing_score := NULL;
    NEW.max_score := 100; NEW.pass_score := 60;
    NEW.total_score := coalesce(NEW.speaking_score,0);
  ELSIF NEW.level = 'TML-4SKILL' THEN
    NEW.max_score := 400; NEW.pass_score := 240;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0) + coalesce(NEW.writing_score,0) + coalesce(NEW.speaking_score,0);
  ELSE
    NEW.speaking_score := NULL;
    NEW.max_score := 300; NEW.pass_score := 180;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0) + coalesce(NEW.writing_score,0);
  END IF;
  NEW.passed := NEW.total_score >= NEW.pass_score;
  IF NEW.status = 'REVOKED' AND NEW.revoked_at IS NULL THEN NEW.revoked_at := now(); END IF;
  IF NEW.status = 'VALID' THEN NEW.revoked_at := NULL; END IF;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN NEW.created_by := coalesce(NEW.created_by, auth.uid()); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.suggest_hsk_code_v2(_prefix text DEFAULT 'TMLHSK') RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; p text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  p := upper(regexp_replace(coalesce(nullif(_prefix,''),'TMLHSK'), '[^A-Za-z0-9]', '', 'g'));
  IF length(p) > 12 THEN p := left(p, 12); END IF;
  LOOP
    c := p || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY');
    FOR i IN 1..8 LOOP c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.hsk_results WHERE candidate_code = c);
  END LOOP;
  RETURN c;
END $$;
GRANT EXECUTE ON FUNCTION public.suggest_hsk_code_v2(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_hsk_v2(_code text, _name text DEFAULT '', _token text DEFAULT '')
RETURNS TABLE(candidate_code text, candidate_name text, candidate_name_zh text, level text, exam_date date, exam_session text,
  listening_score integer, reading_score integer, writing_score integer, speaking_score integer,
  total_score integer, max_score integer, pass_score integer, passed boolean, issuer text, status text, revoked_at timestamptz, verify_token text,
  course_name text, class_name text, teacher_name text, study_start date, study_end date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.candidate_code, CASE WHEN r.status='REVOKED' THEN '' ELSE r.candidate_name END, r.candidate_name_zh, r.level, r.exam_date, r.exam_session,
    r.listening_score, r.reading_score, r.writing_score, r.speaking_score,
    r.total_score, r.max_score, r.pass_score, r.passed, r.issuer, r.status, r.revoked_at, r.verify_token,
    r.course_name, coalesce(c.name,''), coalesce(t.full_name,''), coalesce(r.study_start, c.start_date), coalesce(r.study_end, c.end_date)
  FROM public.hsk_results r
  LEFT JOIN public.hsk_classes c ON c.id = r.hsk_class_id
  LEFT JOIN public.teachers t ON t.id = coalesce(r.teacher_id, c.teacher_id)
  WHERE r.candidate_code = upper(regexp_replace(coalesce(_code,''), '[^A-Za-z0-9_-]', '', 'g'))
    AND ((coalesce(_token,'') <> '' AND r.verify_token = _token)
      OR (length(btrim(coalesce(_name,''))) >= 2 AND public._fold_vi(r.candidate_name) = public._fold_vi(_name)))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_hsk_v2(text,text,text) TO anon, authenticated;