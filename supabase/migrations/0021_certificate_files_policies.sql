CREATE POLICY "Admins manage certificate files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificate-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'certificate-files' AND public.has_role(auth.uid(), 'admin'));