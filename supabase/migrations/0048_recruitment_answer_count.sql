-- TASK-OC-141: count applications that answered a question (or any question of a topic),
-- so the question bank can refuse to delete answered questions and offer hiding instead.
-- SECURITY INVOKER: RLS on candidate_applications still decides which rows the caller may count.
CREATE OR REPLACE FUNCTION public.recruitment_answer_count(
  _question uuid DEFAULT NULL,
  _topic uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT count(*)::int
  FROM public.candidate_applications a
  WHERE a.answers ?| ARRAY(
    SELECT q.id::text
    FROM public.recruitment_questions q
    WHERE q.id = _question OR q.topic_id = _topic
  );
$$;
REVOKE EXECUTE ON FUNCTION public.recruitment_answer_count(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recruitment_answer_count(uuid, uuid) TO authenticated;
