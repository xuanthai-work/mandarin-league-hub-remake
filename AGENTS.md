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
- Keep the activity gallery in a typed data/query module with a public server read and RLS-scoped administrator writes; this separates content storage from public presentation.
- Store gallery media in a private bucket and authorize reads using visible photo records; hidden media must not have permanent public URLs.
- Store administrator roles separately and verify access on the server and through RLS; signing in never grants administrator privileges.
- Use Embla for manual activity-photo carousel gestures and controls without autoplay; this preserves accessible predictable navigation.
