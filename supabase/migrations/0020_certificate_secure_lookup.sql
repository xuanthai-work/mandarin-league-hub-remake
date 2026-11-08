ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS verify_token text NOT NULL DEFAULT substr(translate(encode(gen_random_bytes(12),'base64'),'+/=01OIl','XYZ23456'),1,12);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS file_path text NOT NULL DEFAULT '';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS file_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public._fold_vi(_t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(translate(lower(coalesce(_t,'')),
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'), '[^a-z0-9]+', '', 'g')
$$;

CREATE OR REPLACE FUNCTION public.suggest_certificate_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  LOOP
    c := 'TML-CERT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-';
    FOR i IN 1..6 LOOP c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = c);
  END LOOP;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.verify_certificate_v2(_code text, _name text DEFAULT '', _token text DEFAULT '')
RETURNS TABLE(certificate_code text, holder_name text, program_name text, certificate_type text, classification text, issue_date date, expiry_date date, issuer text, status text, revoked_at timestamptz, verify_token text, has_file boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.certificate_code, CASE WHEN c.status='REVOKED' THEN '' ELSE c.holder_name END, c.program_name, c.certificate_type, c.classification, c.issue_date, c.expiry_date, c.issuer, c.status, c.revoked_at, c.verify_token, (c.file_path <> '' AND c.status='VALID')
  FROM public.certificates c
  WHERE c.certificate_code = upper(regexp_replace(coalesce(_code,''), '\s+', '', 'g'))
    AND ((coalesce(_token,'') <> '' AND c.verify_token = _token)
      OR (length(public._fold_vi(_name)) >= 2 AND public._fold_vi(c.holder_name) = public._fold_vi(_name)))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate_v2(text, text, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM anon;
COMMENT ON FUNCTION public.verify_certificate(text) IS 'DEPRECATED: replaced by verify_certificate_v2 (code + name/token)';