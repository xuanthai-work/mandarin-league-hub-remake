<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions

- TML AI uses AI Elements and an injectable streaming adapter through a same-origin CAPTCHA-verified TanStack server route; Gemini keys stay server-only, conversations stay in React state, and the only accepted mode is community Q&A; retrieval uses a publishable client reading only the dedicated approved-public document table. Community output is a validated verbatim excerpt with source/date, so model-generated claims never become public organizational facts.

- Keep public verification domain types, demo records, and Zod validation in one client-safe module so Lovable Cloud can replace the data source later without rebuilding the UI.
- Public content groups use typed accessors in src/lib/data/* so data sources can change without UI changes.
- Recruitment (periods, positions, topics, questions, applications) lives in Lovable Cloud tables; public submissions go through a server function that re-validates every rule with the admin client, so the browser is never trusted.
- Applicant files upload via server-issued signed URLs into a private bucket; only admins can read them.
- Internal accounts are created only by admins through server functions using the admin auth API; there is no public sign-up, and suspended/disabled status is enforced with an auth ban so blocked users cannot sign in.
- Account, member profile, department/position, access role and fine-grained permissions are stored separately (members, member_accounts, user_roles) so each can change independently.
- Tasks and contribution points change only through security-definer database functions (create/update/review task, adjust points) that write an append-only point history row; clients have read-only table access so points can never be edited directly.
- Member codes are assigned by a database trigger (join month + global running sequence), so every insert path gets a consistent code.
- Application status changes go through a security-definer function that snapshots the reviewer from the session into an append-only history, so reviewers cannot be spoofed or history edited.
- Public org chart reads leaders/counts only via the security-definer `public_org_chart()` function, which respects each member's `is_public` flag, so the members table never becomes publicly readable.
- Teachers are a separate admin-managed table linked to HSK courses by teaching level, so courses can stay static until they move to Lovable Cloud.
- Course registrations (course_enrollments, per-level course_settings) are submitted and reviewed only via server functions, so applicants never touch the table.
- Programs live in `courses` (soft delete, public reads published only); HSK level enrollments keep course_id null so old flows keep working.
- Concrete HSK classes live in `hsk_classes` under fixed levels 1–6 (no levels table); enrollments link via course_enrollments.hsk_class_id and the server re-checks status and seats, so a class can be created without touching code.
- Programs (`courses` table) carry show_in_courses / show_in_activities flags so one record feeds both /courses and /activities without duplicates.
- Deputy heads use their own `deputy_head` role that `my_head_department()` treats like a head, so department-scoped rules cover both without granting admin rights.
- AI onboarding plans are generated once by an authenticated server function and stored in `onboarding_plans` (read-only to managers and the member), so reopening a plan never spends AI calls again.
- Activities (soft delete) take public registrations only via a server function and a trigger writes append-only audit logs; programs are never copied in, /activities reads `courses.show_in_activities`.
- Certificates live in `certificates` (admin-only RLS); public lookup only via security-definer `verify_certificate()` returning safe columns, and a trigger strips whitespace/uppercases codes so every insert path stores lookup-ready codes.
- Site UI text uses the typed dictionary in src/lib/i18n (vi/zh/en, Vietnamese on SSR then the stored choice after hydration), so new languages or strings need no library and never cause hydration mismatches.
- Certificate AI extraction only pre-fills the admin form via an admin-checked server function; nothing is saved until the admin confirms, so AI mistakes never reach public verification.
- HSK results live in `hsk_results` (admin-only RLS); triggers compute totals/pass and append `hsk_score_audits`; public reads only via security-definer `verify_hsk()` (code+name or token), so scores can't be faked or enumerated.
- Admin menu comes from role+department (src/lib/admin-permissions.ts) mirroring RLS helpers; a news trigger lets only comms heads/admin publish, so UI and DB agree and members can't self-publish.
- Public submit/lookup forms need a server-verified reCAPTCHA token; QR-token lookups skip it so QR links keep working.
- Member benefits (shared Premium accounts) live in `benefits`/`member_benefits` (admin-only RLS); members read via definer RPCs only, so credentials never leak.
- Portal hostnames (main/join/member) are mapped in src/lib/domain.ts and enforced both in src/server.ts (first load) and the root route (client navigation), so one codebase serves all three portals and preview hosts never redirect.
- Shared HomeLink uses the domain helper for full-document navigation from satellite portals to the main homepage, so root landing redirects cannot trap Home clicks; main and preview hosts retain local router navigation.
- Professional advisors live in `department_advisors` + per-department `department_advisor_settings` (admin-only writes), public reads via definer `public_dept_advisors()`, so advisor assignments never alter member profiles or grant permissions.
- Course–teacher assignments live in `course_teachers` (role + sort_order); `courses.teacher_id` is deprecated and only mirrors the lead, and teacher `status` drives `visible` via trigger so old readers keep working.
