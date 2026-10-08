REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (key, published, published_at) ON public.site_content TO anon;