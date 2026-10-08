CREATE SEQUENCE IF NOT EXISTS public.certificate_code_seq;

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code text NOT NULL UNIQUE,
  holder_name text NOT NULL,
  program_name text NOT NULL,
  certificate_type text NOT NULL DEFAULT 'completion',
  classification text NOT NULL DEFAULT '',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  issuer text NOT NULL DEFAULT 'The Mandarin League',
  status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID','REVOKED')),
  revoked_reason text NOT NULL DEFAULT '',
  revoked_at timestamptz,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (certificate_code ~ '^[A-Z0-9_-]{3,50}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage certificates" ON public.certificates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public._normalize_certificate() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.certificate_code := upper(regexp_replace(coalesce(NEW.certificate_code,''), '\s+', '', 'g'));
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.status = 'REVOKED' AND NEW.revoked_at IS NULL THEN NEW.revoked_at := now(); END IF;
  IF NEW.status = 'VALID' THEN NEW.revoked_at := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_normalize_certificate BEFORE INSERT OR UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public._normalize_certificate();

CREATE OR REPLACE FUNCTION public.suggest_certificate_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint; c text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  LOOP
    n := nextval('public.certificate_code_seq');
    c := 'TML-CERT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-' || lpad(n::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = c);
  END LOOP;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE(certificate_code text, holder_name text, program_name text, certificate_type text, classification text, issue_date date, expiry_date date, issuer text, status text, revoked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.certificate_code, CASE WHEN c.status='REVOKED' THEN '' ELSE c.holder_name END, c.program_name, c.certificate_type, c.classification, c.issue_date, c.expiry_date, c.issuer, c.status, c.revoked_at
  FROM public.certificates c
  WHERE c.certificate_code = upper(regexp_replace(coalesce(_code,''), '\s+', '', 'g'))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_certificate_code() TO authenticated;