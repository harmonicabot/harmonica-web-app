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

Note: No test or lint scripts are configured. TypeScript strict mode provides type safety.

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
├── db/migrations/          # 31 Kysely migrations
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
| `/api/auth/[...nextauth]` | Auth0 authentication |
| `/api/builder` | Session prompt generation (CreatePrompt, EditPrompt, SummaryOfPrompt) |
| `/api/sessions` | Session CRUD |
| `/api/sessions/generate` | Generate session content |
| `/api/user/subscription` | Subscription management |
| `/api/llama` | LLM query endpoint |
| `/api/webhook/stripe` | Stripe webhooks (subscriptions, refunds → Discord notifications) |
| `/api/admin/prompts` | Admin prompt management |

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

Schema defined in `src/lib/schema.ts`. Key tables:
- `host_sessions` - Deliberation sessions (prompt, settings, cross_pollination flag)
- `user_sessions` - Individual participant conversations
- `messages` - Chat messages per thread
- `workspaces` - Session containers with visibility settings
- `permissions` - Role-based access control
- `prompts` / `prompt_type` - Custom prompt templates
- `session_files` - Uploaded files (Vercel Blob)
- `daily_usage` / `usage_limits` - Subscription tracking

Migrations in `src/db/migrations/` (000-031). Run with `npm run migrate`.

### Prompt System

Templates in `src/lib/defaultPrompts.ts`:
- `BASIC_FACILITATION_PROMPT` - Fallback facilitation guidance
- `SUMMARY_PROMPT` - Session summarization
- `PROJECT_SUMMARY_PROMPT` - Multi-session project summary

Retrieval: `getPromptInstructions(typeId)` in `src/lib/promptActions.ts` checks DB first, falls back to defaults.

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
- `DISCORD_OPERATIONS_WEBHOOK_URL` - Stripe event notifications
