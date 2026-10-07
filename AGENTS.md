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

- Keep public verification domain types, demo records, and Zod validation in one client-safe module so Lovable Cloud can replace the data source later without rebuilding the UI.
- Store each public content group (departments, courses, activities, news, partners, members) as typed accessors in src/lib/data/* so Lovable Cloud can replace demo data without UI changes.
- Recruitment (periods, positions, topics, questions, applications) lives in Lovable Cloud tables; public submissions go through a server function that re-validates every rule with the admin client, so the browser is never trusted.
- Applicant files upload via server-issued signed URLs into a private bucket; only admins can read them.
- Internal accounts are created only by admins through server functions using the admin auth API; there is no public sign-up, and suspended/disabled status is enforced with an auth ban so blocked users cannot sign in.
- Account, member profile, department/position, access role and fine-grained permissions are stored separately (members, member_accounts, user_roles) so each can change independently.
