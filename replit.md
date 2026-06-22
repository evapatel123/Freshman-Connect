# Link Crew Connect

A multi-school platform where high school freshmen connect with Link Crew leaders — upperclassmen mentors who help them navigate their first year.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/linkcrew run dev` — run the React frontend (port 25282, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, session-based auth (Bearer token in Authorization header, in-memory Map store)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + wouter (routing) + TanStack Query + shadcn/ui + Tailwind CSS v4
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas used by the API server
- `lib/db/src/schema/` — Drizzle ORM schema files (schools, users, quiz, leaders, matches, conversations, posts, faqs, notifications, friends, reports)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per resource)
- `artifacts/api-server/src/lib/auth.ts` — password hashing (scrypt) and token generation
- `artifacts/api-server/src/middlewares/requireAuth.ts` — auth middleware
- `artifacts/linkcrew/src/pages/` — all frontend pages
- `artifacts/linkcrew/src/lib/auth.tsx` — AuthContext + token persistence
- `artifacts/linkcrew/src/main.tsx` — sets up Bearer token getter for all API calls

## Architecture decisions

- **Bearer token auth**: Session tokens stored in an in-memory Map server-side; token saved in `localStorage` client-side. The `setAuthTokenGetter` from `@workspace/api-client-react` automatically attaches the Bearer header to every API request.
- **School-scoped data**: All content (posts, FAQs, leaders, matches) is scoped by `schoolId` — every user belongs to exactly one school.
- **Interest-based matching**: The 60-question quiz builds an interest profile; the matching algorithm computes overlap between freshman interests and leader interests/activities/classes.
- **Quiz seeding**: All 60 quiz questions are seeded into the DB on the first call to `GET /api/quiz/questions`.
- **No JWT/passport**: Simple crypto.scryptSync password hashing + random token for sessions. Keeps dependencies minimal.

## Product

- **Landing page**: School selection from a searchable grid of all registered schools
- **Auth**: Register as freshman or leader; login per school; auto-redirect to quiz for new freshmen
- **60-question quiz**: 6 categories (hobbies, academic interests, extracurriculars, college goals, career interests, exploration); builds interest profile
- **Leader profiles**: Leaders set up their profile with bio, interests, activities, favorite classes, AP/SAT experience, college plans
- **Interest-based matching**: Freshmen get top 5 leader matches based on quiz overlap
- **Private messaging**: Real-time-style conversation threads between users
- **Discussion board**: School-scoped posts with categories, comments, pinning
- **FAQs**: Leaders and admins post Q&A; freshmen browse by category
- **Friends**: Interest-based peer suggestions; friend requests between freshmen
- **Notifications**: System notifications with read/unread state
- **Admin panel**: Dashboard stats, user management, report moderation

## User preferences

_Populate as you build._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing any file in `lib/db` or `lib/api-spec` before typechecking leaf artifacts.
- Run `pnpm --filter @workspace/db run push` after schema changes to apply to the DB.
- Run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`.
- The schools table has columns: `id`, `name`, `city`, `state`, `logo_url`, `colors`, `member_count`, `created_at` — no `district` column.
- The CSS Google Fonts `@import url(...)` must come before `@import "tailwindcss"` in `index.css`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
