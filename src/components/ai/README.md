# TML AI — Phase 1

Public route: `/ai-tutor`. Entry points: shared website mobile menu and footer (desktop header kept intact to avoid crowding). Vietnamese-first, official TML logo and existing theme tokens.

## Interaction and data boundary

`TmlAiChat` accepts a `ChatService` implemented by `src/lib/tml-ai.ts`. The default service only resolves exact curated example questions; all other input returns an unavailable result. It makes no network calls. Messages and input live only in React state. No database writes, auth changes, analytics or new endpoint.

AI Elements owns conversation scrolling, message rendering, multiline composer, submit state and loading. Only the CJK markdown plugin is enabled because code, math and diagrams are not needed for this phase. All user content is plain text. Sample community answers reference existing public pages, not member records or benefit credentials.

## Review checklist

- Switch both modes; choose general Chinese / HSK 1–6.
- Choose a suggestion, edit/clear input, submit an exact grammar/community example.
- Submit arbitrary input and see the explicit disconnected-service response.
- Copy example text; start a new conversation; leave/reload and confirm no persistence.
- Verify narrow mobile, tablet, desktop, dark theme and existing site navigation.

## Before Phase 2

Review Phase 1 first. Implement a real server-side adapter, cancellation, safe failure handling, privacy/usage policies and public-information grounding in a separately approved phase. Keep credentials server-only. This TanStack Start project uses server functions/server routes rather than Edge Functions. No real AI provider has been configured or contacted by this feature.

## Changed files

- New: `src/routes/ai-tutor.tsx`, `src/components/ai/TmlAiChat.tsx`, this README, `src/lib/tml-ai.ts`, `src/lib/tml-ai.test.ts`.
- Added AI Elements source: `conversation.tsx`, `message.tsx`, `prompt-input.tsx`, `shimmer.tsx` and their `button-group`, `input-group`, `spinner` UI dependencies.
- Existing: `SiteLayout.tsx` (two entry links), `button.tsx` (compatible icon-sm size), package manifest/lockfile (UI dependencies), `AGENTS.md` and `roadmap.md`.

## Verification

- 23 targeted tests passed (demo boundaries, domain routing, points, admin permissions).
- Browser confirmed public page, HSK selection, prompt fill/clear, curated example, clipboard, unavailable reply, reset and reload without persistence. Submitting the arbitrary question caused zero network requests.
- Desktop, tablet and mobile widths checked: 375, 768, 1024, 1280, 1440; no page overflow. Existing header unchanged on desktop.
- Automatic build/typecheck passed. Focused lint has no errors; AI Elements source has development-only refresh warnings. Whole-project lint includes extensive pre-existing formatting and unrelated warnings, not changed in this scoped feature.
- Fixed the new chat dependency conflict by pinning parse5 to the compatible 7.2.1 version while preserving the existing entities 4.5.0 override. This prevents the markdown dependency optimizer from hanging the preview.
- Private member/admin flows were not re-exercised; their files, tables and authentication were not changed.