CREATE TABLE public.benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_key text NOT NULL DEFAULT 'gift',
  access_type text NOT NULL DEFAULT 'account',
  login text NOT NULL DEFAULT '',
  secret text NOT NULL DEFAULT '',
  access_url text NOT NULL DEFAULT '',
  usage_note text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT true,
  grant_all boolean NOT NULL DEFAULT false,
  min_points integer,
  ends_on date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits TO authenticated;
GRANT ALL ON public.benefits TO service_role;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage benefits" ON public.benefits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.member_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','paused','revoked')),
  ends_on date,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (benefit_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_benefits TO authenticated;
GRANT ALL ON public.member_benefits TO service_role;
ALTER TABLE public.member_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage member benefits" ON public.member_benefits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.my_benefits()
RETURNS TABLE(id uuid, name text, description text, icon_key text, access_type text, status text, ends_on date, has_access boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH me AS (SELECT m.id, m.contribution_points pts FROM public.members m WHERE m.id = public.my_member_id())
  SELECT b.id, b.name, b.description, b.icon_key, b.access_type, s.st, s.until, s.st = 'active'
  FROM public.benefits b CROSS JOIN me
  LEFT JOIN public.member_benefits mb ON mb.benefit_id = b.id AND mb.member_id = me.id
  CROSS JOIN LATERAL (SELECT
    COALESCE(mb.ends_on, b.ends_on) AS until,
    CASE
      WHEN mb.id IS NOT NULL AND mb.status <> 'active' THEN mb.status
      WHEN mb.id IS NULL AND NOT (b.grant_all OR (b.min_points IS NOT NULL AND me.pts >= b.min_points)) THEN 'locked'
      WHEN COALESCE(mb.ends_on, b.ends_on) < CURRENT_DATE THEN 'expired'
      ELSE 'active' END AS st) s
  WHERE b.is_enabled
  ORDER BY b.sort_order, b.name
$$;

CREATE OR REPLACE FUNCTION public.benefit_access(_benefit uuid)
RETURNS TABLE(login text, secret text, access_url text, usage_note text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.login, b.secret, b.access_url, b.usage_note FROM public.benefits b
  WHERE b.id = _benefit AND EXISTS (SELECT 1 FROM public.my_benefits() x WHERE x.id = _benefit AND x.has_access)
$$;
REVOKE EXECUTE ON FUNCTION public.my_benefits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.benefit_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_benefits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.benefit_access(uuid) TO authenticated;

INSERT INTO public.benefits(name, description, icon_key, is_enabled, grant_all, sort_order) VALUES
 ('Hanzii Premium','Từ điển Hán Việt nâng cao, tra nét viết và ví dụ câu.','hanzii',true,true,1),
 ('Migii HSK Premium','Luyện đề HSK 1–6 và chấm điểm chi tiết.','migii',true,false,2),
 ('HeyChina Premium','Luyện nghe nói tiếng Trung qua bài học ngắn.','heychina',true,false,3),
 ('Canva Premium','Thiết kế ấn phẩm truyền thông cho hoạt động TML.','canva',true,false,4),
 ('CapCut Premium','Dựng video cho hoạt động và truyền thông.','capcut',false,false,5),
 ('Netflix','Giải trí – luyện nghe qua phim Hoa ngữ.','netflix',false,false,6);