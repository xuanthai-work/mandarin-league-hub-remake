CREATE SEQUENCE IF NOT EXISTS public.hsk_result_seq;

CREATE TABLE public.hsk_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code text NOT NULL UNIQUE,
  candidate_name text NOT NULL,
  candidate_name_zh text NOT NULL DEFAULT '',
  level text NOT NULL,
  exam_date date NOT NULL DEFAULT current_date,
  exam_session text NOT NULL DEFAULT '',
  listening_score integer,
  reading_score integer,
  writing_score integer,
  speaking_score integer,
  total_score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  pass_score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  issuer text NOT NULL DEFAULT 'The Mandarin League',
  status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID','REVOKED')),
  revoked_reason text NOT NULL DEFAULT '',
  revoked_at timestamptz,
  verify_token text NOT NULL DEFAULT encode(gen_random_bytes(12),'hex'),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  change_reason text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hsk_level_chk CHECK (level IN ('HSK1','HSK2','HSK3','HSK4','HSK5','HSK6','HSKK-BEG','HSKK-INT','HSKK-ADV')),
  CONSTRAINT hsk_scores_chk CHECK (
    coalesce(listening_score,0) BETWEEN 0 AND 100 AND coalesce(reading_score,0) BETWEEN 0 AND 100
    AND coalesce(writing_score,0) BETWEEN 0 AND 100 AND coalesce(speaking_score,0) BETWEEN 0 AND 100)
);

CREATE TABLE public.hsk_score_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid,
  candidate_code text NOT NULL DEFAULT '',
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  reason text NOT NULL DEFAULT '',
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.hsk_results TO authenticated;
GRANT ALL ON public.hsk_results TO service_role;
GRANT SELECT ON public.hsk_score_audits TO authenticated;
GRANT ALL ON public.hsk_score_audits TO service_role;
GRANT USAGE ON SEQUENCE public.hsk_result_seq TO authenticated;

ALTER TABLE public.hsk_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsk_score_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read hsk" ON public.hsk_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert hsk" ON public.hsk_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update hsk" ON public.hsk_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read hsk audits" ON public.hsk_score_audits FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public._normalize_hsk() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.candidate_code := upper(regexp_replace(NEW.candidate_code, '\s+', '', 'g'));
  NEW.candidate_name := btrim(NEW.candidate_name);
  IF NEW.level IN ('HSK1','HSK2') THEN
    NEW.writing_score := NULL; NEW.speaking_score := NULL;
    NEW.max_score := 200; NEW.pass_score := 120;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0);
  ELSIF NEW.level LIKE 'HSKK-%' THEN
    NEW.listening_score := NULL; NEW.reading_score := NULL; NEW.writing_score := NULL;
    NEW.max_score := 100; NEW.pass_score := 60;
    NEW.total_score := coalesce(NEW.speaking_score,0);
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

CREATE TRIGGER hsk_normalize BEFORE INSERT OR UPDATE ON public.hsk_results FOR EACH ROW EXECUTE FUNCTION public._normalize_hsk();

CREATE OR REPLACE FUNCTION public._audit_hsk() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.hsk_score_audits(result_id, candidate_code, action, old_data, new_data, reason, actor_id, actor_name)
  VALUES (NEW.id, NEW.candidate_code,
    CASE WHEN TG_OP='INSERT' THEN 'create' WHEN OLD.status <> NEW.status THEN lower(NEW.status) ELSE 'update' END,
    CASE WHEN TG_OP='UPDATE' THEN jsonb_build_object('listening',OLD.listening_score,'reading',OLD.reading_score,'writing',OLD.writing_score,'speaking',OLD.speaking_score,'total',OLD.total_score,'status',OLD.status,'name',OLD.candidate_name) END,
    jsonb_build_object('listening',NEW.listening_score,'reading',NEW.reading_score,'writing',NEW.writing_score,'speaking',NEW.speaking_score,'total',NEW.total_score,'status',NEW.status,'name',NEW.candidate_name),
    NEW.change_reason, auth.uid(), public._actor_label(auth.uid()));
  RETURN NEW;
END $$;

CREATE TRIGGER hsk_audit AFTER INSERT OR UPDATE ON public.hsk_results FOR EACH ROW EXECUTE FUNCTION public._audit_hsk();

CREATE OR REPLACE FUNCTION public.suggest_hsk_code() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'TML-HSK-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.hsk_result_seq')::text, 4, '0')
$$;

CREATE OR REPLACE FUNCTION public.verify_hsk(_code text, _name text, _token text)
RETURNS TABLE(candidate_code text, candidate_name text, candidate_name_zh text, level text, exam_date date, exam_session text,
  listening_score integer, reading_score integer, writing_score integer, speaking_score integer,
  total_score integer, max_score integer, pass_score integer, passed boolean, issuer text, status text, revoked_at timestamptz, verify_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.candidate_code, r.candidate_name, r.candidate_name_zh, r.level, r.exam_date, r.exam_session,
    r.listening_score, r.reading_score, r.writing_score, r.speaking_score,
    r.total_score, r.max_score, r.pass_score, r.passed, r.issuer, r.status, r.revoked_at, r.verify_token
  FROM public.hsk_results r
  WHERE r.candidate_code = upper(regexp_replace(coalesce(_code,''), '\s+', '', 'g'))
    AND ((coalesce(_token,'') <> '' AND r.verify_token = _token)
      OR (length(btrim(coalesce(_name,''))) >= 2 AND public._fold_vi(r.candidate_name) = public._fold_vi(_name)))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.verify_hsk(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_hsk_code() TO authenticated;