CREATE TABLE public.tml_ai_public_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL,
 content text NOT NULL,
 keywords text[] NOT NULL DEFAULT '{}',
 source_url text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'draft',
 scope text NOT NULL DEFAULT 'private',
 CONSTRAINT tml_ai_document_status CHECK (status IN ('draft', 'approved', 'archived')),
 CONSTRAINT tml_ai_document_scope CHECK (scope IN ('private', 'public')),
 CONSTRAINT tml_ai_document_source CHECK (source_url ~ '^https://[^[:space:]]+$'),
 CONSTRAINT tml_ai_document_title CHECK (length(trim(title)) BETWEEN 1 AND 200),
 CONSTRAINT tml_ai_document_content CHECK (length(trim(content)) BETWEEN 1 AND 12000)
);
GRANT SELECT ON public.tml_ai_public_documents TO anon, authenticated;
GRANT ALL ON public.tml_ai_public_documents TO service_role;
ALTER TABLE public.tml_ai_public_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved public AI documents only" ON public.tml_ai_public_documents FOR SELECT TO anon, authenticated USING (status = 'approved' AND scope = 'public');
CREATE INDEX tml_ai_public_documents_visibility ON public.tml_ai_public_documents(status, scope);
COMMENT ON TABLE public.tml_ai_public_documents IS 'Dedicated curated public AI knowledge. No automatic ingestion or approval; no visitor questions. Excluded unconfirmed benefit programs are filtered server-side.';