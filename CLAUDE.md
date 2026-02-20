# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Harmonica is an LLM-powered deliberation and sensemaking platform. Users create "sessions" where groups can coordinate through AI-facilitated conversations, with automatic summarization and cross-pollination of ideas.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm start            # Run production build
npm run migrate      # Run database migrations
npm run migrate:down # Rollback migrations
```

```bash
# Evals (requires BRAINTRUST_API_KEY, ANTHROPIC_API_KEY, MAIN_LLM_* in .env.local)
npx tsx evals/facilitation.eval.ts       # Run synthetic facilitation evals
npx tsx evals/facilitation-real.eval.ts  # Run evals on real production sessions (last 14 days)
```

Note: No test or lint scripts are configured. TypeScript strict mode provides type safety. Node 20 required (`"engines": { "node": "20.x" }` in package.json). Use `npx tsc --noEmit` for type checking.

## Git Workflow

Always create a branch and open a PR for code changes — never commit directly to master. This applies to all application code changes; analytics-only or config changes outside the app don't require PRs.

```
branch naming: feature/short-description, fix/short-description
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Neon Postgres with Kysely query builder
- **Auth**: Auth0 (`@auth0/nextjs-auth0`)
- **LLM**: LlamaIndex with OpenAI/Anthropic/Google/PublicAI providers
- **Vector DB**: Qdrant for RAG queries
- **State**: Zustand (`src/stores/`)
- **UI**: Tailwind CSS + Radix UI + Shadcn components
- **Payments**: Stripe
- **Analytics**: PostHog
- **File Storage**: Vercel Blob

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Authenticated dashboard routes
│   ├── api/                # API routes (see API Routes below)
│   ├── chat/               # Chat interface
│   ├── create/             # Session creation flow (4 steps)
│   ├── sessions/[id]/      # Session detail pages
│   └── workspace/[w_id]/   # Workspace pages
├── actions/                # Server actions (file uploads)
├── components/             # React components (Shadcn in ui/)
├── db/migrations/          # 33 Kysely migrations (000-031, gap at 002, collision at 025)
├── lib/
│   ├── monica/             # RAG/LLM query system
│   ├── schema.ts           # Database schema types
│   ├── db.ts               # Database queries
│   ├── modelConfig.ts      # LLM provider configuration
│   ├── permissions.ts      # Role-based access control
│   ├── crossPollination.ts # Cross-session idea sharing
│   └── defaultPrompts.ts   # Prompt templates
├── hooks/                  # React hooks
└── stores/                 # Zustand state stores
```

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/auth/[...auth0]` | Auth0 authentication |
| `/api/builder` | Session prompt generation (CreatePrompt, EditPrompt, SummaryOfPrompt) |
| `/api/sessions` | Session CRUD |
| `/api/sessions/generate` | Generate session content |
| `/api/user/subscription` | Subscription management |
| `/api/llama` | LLM query endpoint |
| `/api/webhook/stripe` | Stripe webhooks (subscriptions, refunds → Discord notifications) |
| `/api/admin/prompts` | Admin prompt management (CRUD) |
| `/api/admin/prompt-types` | Prompt type management (CRUD) |
| `/api/admin/evals` | Braintrust experiment results (list + detail) |
| `/api/participant-suggestion` | Participant suggestions |
| `/api/sessions/[id]/generate-characters` | Generate conversation character personas |
| `/api/transcribe` | Audio transcription (Deepgram) |

### Core Concepts

**Sessions**: A "host session" is a deliberation created by an organizer. Each participant has a "user session" containing their conversation thread with the AI.

**Workspaces**: Container for organizing multiple sessions with custom visibility settings and banners.

**Monica**: The RAG system in `src/lib/monica/` handles intelligent querying across session data using Qdrant vector search. Supports single-session and multi-session queries.

**Cross-Pollination**: Shares insights across multiple sessions. Managed by `crossPollination.ts` and enabled per host_session.

**Session Creation**: 4-step flow in `src/app/create/`:
1. Template Selection (`choose-template.tsx`) - 10 templates in `src/lib/templates.json`
2. Form Collection (`MultiStepForm.tsx`) - goal, critical, context, sessionName
3. Prompt Review (`review.tsx`) - AI-generated facilitator prompt, host can edit
4. Share (`ShareParticipants.tsx`) - Configure participant form questions, then launch

**LLM Configuration**: Three tiers (SMALL, MAIN, LARGE) with environment variables `{TIER}_LLM_MODEL` and `{TIER}_LLM_PROVIDER`. Providers: openai, anthropic, gemini, publicai, swiss-ai, aisingapore, BSC-LT.

**Permissions**: Role-based access in `src/lib/permissions.ts`. Resources: session, workspace. Tracked in `permissions` table.

### Database

Schema interfaces in `src/lib/schema.ts`, queries in `src/lib/db.ts`. **Actual table names differ from interface names:**

| Table name | Interface | Purpose |
|------------|-----------|---------|
| `host_db` | `HostSessionsTable` | Deliberation sessions (prompt, settings, cross_pollination flag) |
| `user_db` | `UserSessionsTable` | Individual participant conversations |
| `messages_db` | `MessagesTable` | Chat messages per thread |
| `workspaces` | `WorkspacesTable` | Session containers with visibility settings |
| `permissions` | — | Role-based access control |
| `prompts` / `prompt_type` | — | Custom prompt templates |
| `session_files` | — | Uploaded files (Vercel Blob) |
| `daily_usage` / `usage_limits` | — | Subscription tracking |
| `session_ratings` | `SessionRatingsTable` | Session feedback (1-5 rating, free-text per thread) |
| `api_keys` | `ApiKeysTable` | User API keys (hashed, with prefix and revocation) |

Migrations in `src/db/migrations/` (33 files, 000–031 with gap at 002 and collision at 025). Run with `npm run migrate`. **Important:** OSS and Pro share the same Neon database — check Pro migrations before adding new ones to avoid conflicts.

### Prompt System

Templates in `src/lib/defaultPrompts.ts`:
- `BASIC_FACILITATION_PROMPT` - Fallback facilitation guidance
- `SUMMARY_PROMPT` - Session summarization
- `PROJECT_SUMMARY_PROMPT` - Multi-session project summary

Retrieval: `getPromptInstructions(typeId)` in `src/lib/promptActions.ts` checks DB first, falls back to defaults.

### Evals

Facilitation quality is measured by 5 LLM-as-judge scorers (defined in `evals/shared/scorers.ts`): relevance, question_quality, goal_alignment, tone, conciseness. Each scores 0.0–1.0 with a reason.

Two eval scripts share these scorers:
- `evals/facilitation.eval.ts` — 7 synthetic test cases, generates new facilitator responses via the MAIN LLM tier, then judges them. Runs weekly via GitHub Actions (`evals-digest.yml`, Fridays 10 AM UTC).
- `evals/facilitation-real.eval.ts` — pulls up to 20 real production threads (last 14 days, ≥6 messages) from Neon, judges the actual assistant responses (identity task, no LLM generation). Requires `POSTGRES_URL` in `.env.local`.

Results log to Braintrust under project `harmonica-facilitation` and are viewable at `/admin/evals`.

### Braintrust Integration

`src/lib/braintrust.ts` provides `getBraintrustLogger()` for production LLM call logging and `traceOperation()` for hierarchical spans. Optional — logs a warning if `BRAINTRUST_API_KEY` is not set. The `/api/admin/evals` route queries Braintrust experiments for the admin dashboard.

### Middleware

`src/middleware.ts` handles auth and bot detection:
- **Auth**: `withMiddlewareAuthRequired` from `@auth0/nextjs-auth0/edge`
- **Bot detection**: `isbot` rewrites bots to `/bots/` routes
- **Public bypass**: `?access=public` query param skips auth on any route
- **Unauthenticated routes**: `/api`, `/login`, `/chat`, `/canvas-demo`, static assets

### Preview Deploys

`next.config.js` auto-derives `AUTH0_BASE_URL` from `VERCEL_BRANCH_URL` at build time, so preview deploys work with Auth0 without per-branch env var configuration. Access previews via the stable branch alias: `harmonica-web-app-git-{branch}-harmonica.vercel.app`.

**Vercel gotcha:** `$VAR` and `${VAR}` references are NOT expanded inside env var values. System env vars (`VERCEL_URL`, `VERCEL_BRANCH_URL`) must be read in code, not referenced in other env var strings.

### Next.js 14 Config Notes

- External packages go under `experimental.serverComponentsExternalPackages` (NOT top-level `serverExternalPackages` — that's Next.js 15+)
- `reactStrictMode: false` to prevent components loading twice
- API routes using `cookies()` need `export const dynamic = 'force-dynamic'` to avoid build warnings

## Code Style

- Prefer React Server Components; minimize `'use client'`
- Use server actions over API routes where possible
- TypeScript strict mode enabled
- Functional patterns, no classes (except LLM wrapper)
- Zod for validation
- Variable naming: `isLoading`, `hasError` (auxiliary verbs)
- Directory naming: lowercase with dashes
- Prettier: single quotes, 2-space tabs, semicolons

## Environment Variables

**Local dev setup:** Pull env vars with `vercel env pull .env.local`, then set `AUTH0_BASE_URL=http://localhost:3000` (Vercel pulls the production URL which won't work locally).

**Required:**
- `POSTGRES_URL` - Neon connection string
- `OPENAI_API_KEY` - For embeddings and LLM
- `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**LLM Config** (per tier: SMALL, MAIN, LARGE):
- `{TIER}_LLM_MODEL`, `{TIER}_LLM_PROVIDER`

**Optional:**
- `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` - Alternative LLM providers
- `QDRANT_URL`, `QDRANT_API_KEY` - Vector search
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` - Analytics
- `DEEPGRAM_API_KEY` - Transcription
- `BRAINTRUST_API_KEY` - LLM tracing and observability
- `DISCORD_OPERATIONS_WEBHOOK_URL` - Stripe event notifications
- `DISCORD_ANALYTICS_WEBHOOK_URL` - Weekly analytics and evals digests
