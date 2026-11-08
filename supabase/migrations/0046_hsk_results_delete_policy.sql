GRANT DELETE ON public.hsk_results TO authenticated;

DROP POLICY IF EXISTS "Admins delete hsk" ON public.hsk_results;
CREATE POLICY "Admins delete hsk" ON public.hsk_results FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND status = 'REVOKED');

CREATE OR REPLACE FUNCTION public._audit_hsk_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.hsk_score_audits(result_id, candidate_code, action, old_data, new_data, reason, actor_id, actor_name)
  VALUES (OLD.id, OLD.candidate_code, 'delete',
    jsonb_build_object('listening',OLD.listening_score,'reading',OLD.reading_score,'writing',OLD.writing_score,
      'speaking',OLD.speaking_score,'total',OLD.total_score,'status',OLD.status,'name',OLD.candidate_name,
      'level',OLD.level,'exam_date',OLD.exam_date),
    NULL, coalesce(OLD.revoked_reason,''), auth.uid(), public._actor_label(auth.uid()));
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS hsk_audit_delete ON public.hsk_results;
CREATE TRIGGER hsk_audit_delete AFTER DELETE ON public.hsk_results
  FOR EACH ROW EXECUTE FUNCTION public._audit_hsk_delete();
