ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS leave_from date,
  ADD COLUMN IF NOT EXISTS leave_until date,
  ADD COLUMN IF NOT EXISTS left_on date,
  ADD COLUMN IF NOT EXISTS status_note text NOT NULL DEFAULT '';
ALTER TABLE public.course_settings
  ADD COLUMN IF NOT EXISTS co_teacher_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assistant_ids uuid[] NOT NULL DEFAULT '{}';