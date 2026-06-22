---
name: Link Crew Connect
description: Key architectural decisions and gotchas for the Link Crew Connect platform
---

## Bearer Token Auth
Sessions stored in an in-memory Map (token → userId) server-side. Token saved in `localStorage("linkcrew_token")` client-side. `setAuthTokenGetter(() => localStorage.getItem("linkcrew_token"))` is called in `main.tsx` to wire Bearer headers to every API call automatically.

**Why:** Kept auth simple — no JWT, no passport, no express-session. Pure crypto.scryptSync hashing + random tokens.

## Generated Hook Names (important!)
The Orval codegen uses different names than what you might guess:
- `useGetConversations` → `useListConversations`
- `useGetMatches` → `useGetMyMatches`
- `useGetNotifications` → `useListNotifications`
- `useGetFriends` → `useListFriends`
- `useGetAdminUsers` → `useListAdminUsers`
- `useGetAdminReports` → `useListReports`

Always grep the generated file (`lib/api-client-react/src/generated/api.ts`) to confirm hook names before using them.

**Why:** Hook names are derived from the OpenAPI operationId, not the path. When they differ from intuition, the app crashes with a missing export error at runtime (not compile time in dev).

## Schools Table Schema
`id, name, city, state, logo_url, colors, member_count, created_at` — NO `district` column.

## Lib Rebuild Required
After any change to `lib/db/src/schema/` run `pnpm run typecheck:libs` before checking leaf artifact typecheck or the @workspace/db exports will be stale.

## CSS Import Order
Google Fonts `@import url(...)` must come BEFORE `@import "tailwindcss"` in `index.css` or PostCSS warns and the font may not load.

## Quiz Seeding
60 questions seeded into DB on first call to `GET /api/quiz/questions`. The seed is guarded by checking if any rows exist first (idempotent).

## Data Scoping
All content (posts, FAQs, leaders, matches) scoped by `schoolId`. Users belong to exactly one school. School is passed as query param or falls back to `req.userSchoolId` from auth middleware.
