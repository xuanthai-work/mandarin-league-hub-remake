CREATE TABLE public.member_library_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 auth_session_id text NOT NULL,
 session_hash text NOT NULL UNIQUE,
 pass_token_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours')
);
GRANT ALL ON public.member_library_sessions TO service_role;
ALTER TABLE public.member_library_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX member_library_sessions_owner_idx ON public.member_library_sessions(user_id);
CREATE OR REPLACE FUNCTION public.verify_member_library_pass(_pass text)
RETURNS TABLE(session_token text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _member uuid := public.my_member_id(); _token text; _auth_session text := auth.jwt()->>'session_id'; _expiry timestamptz := now() + interval '2 hours';
BEGIN
 IF auth.uid() IS NULL OR _member IS NULL OR _auth_session IS NULL THEN RETURN; END IF;
 IF _pass IS NULL OR _pass !~ '^[a-f0-9]{48}$' THEN RETURN; END IF;
 PERFORM 1 FROM public.member_passes p JOIN public.members m ON m.id = p.member_id
 WHERE p.member_id = _member AND p.pass_token = _pass AND p.pass_status = 'active' AND m.status = 'active' FOR SHARE OF p, m;
 IF NOT FOUND THEN RETURN; END IF;
 _token := encode(extensions.gen_random_bytes(32), 'hex');
 DELETE FROM public.member_library_sessions WHERE user_id = auth.uid() AND (expires_at <= now() OR auth_session_id = _auth_session);
 INSERT INTO public.member_library_sessions(member_id, user_id, auth_session_id, session_hash, pass_token_hash, expires_at)
 VALUES (_member, auth.uid(), _auth_session, encode(extensions.digest(_token, 'sha256'), 'hex'), encode(extensions.digest(_pass, 'sha256'), 'hex'), _expiry);
 RETURN QUERY SELECT _token, _expiry;
END $$;
CREATE OR REPLACE FUNCTION public.has_member_library_access(_session text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (
 SELECT 1 FROM public.member_library_sessions s
 JOIN public.member_passes p ON p.member_id = s.member_id
 JOIN public.members m ON m.id = s.member_id
 JOIN public.member_accounts a ON a.member_id = s.member_id AND a.user_id = s.user_id
 WHERE s.user_id = auth.uid() AND s.auth_session_id = auth.jwt()->>'session_id'
 AND s.session_hash = encode(extensions.digest(_session, 'sha256'), 'hex')
 AND s.pass_token_hash = encode(extensions.digest(p.pass_token, 'sha256'), 'hex')
 AND s.expires_at > now() AND p.pass_status = 'active' AND m.status = 'active'
 AND a.account_status = 'active' AND NOT a.must_change_password
 );
$$;
REVOKE ALL ON FUNCTION public.verify_member_library_pass(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_member_library_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_member_library_pass(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_member_library_access(text) TO authenticated;
COMMENT ON TABLE public.member_library_sessions IS 'Owner and auth-session bound QR library grants; hashes only, revoked by pass rotation or status change.';