CREATE TABLE public.member_passes (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  pass_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  pass_status text NOT NULL DEFAULT 'active',
  pass_updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.member_passes TO service_role;
ALTER TABLE public.member_passes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_pass()
RETURNS TABLE(pass_token text, pass_status text, pass_updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _m uuid := public.my_member_id(); _st text;
BEGIN
  IF _m IS NULL THEN RETURN; END IF;
  SELECT status INTO _st FROM members WHERE id = _m;
  IF _st IS DISTINCT FROM 'active' THEN RETURN; END IF;
  INSERT INTO member_passes(member_id) VALUES (_m) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT p.pass_token, p.pass_status, p.pass_updated_at FROM member_passes p WHERE p.member_id = _m AND p.pass_status = 'active';
END $$;

CREATE OR REPLACE FUNCTION public.rotate_member_pass(_member uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Chỉ Admin được làm mới mã QR'; END IF;
  INSERT INTO member_passes(member_id) VALUES (_member)
  ON CONFLICT (member_id) DO UPDATE SET pass_token = encode(extensions.gen_random_bytes(24), 'hex'), pass_status = 'active', pass_updated_at = now();
END $$;

REVOKE ALL ON FUNCTION public.my_pass() FROM anon, public;
REVOKE ALL ON FUNCTION public.rotate_member_pass(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_pass() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_member_pass(uuid) TO authenticated;