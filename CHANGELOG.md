# Changelog

All notable changes to Harmonica are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- Changelog entries are automatically added below this line -->

## [Unreleased]

### Added
- Per-session LLM analytics — `session_id` threaded into PostHog `$ai_generation` events for per-session cost and latency tracking
- Weekly analytics digest GitHub Actions workflow (PostHog → Discord every Friday at 9 AM UTC)

### Fixed
- Summary generation timeout

## [0.2.0] - 2026-01-29

### Changed
- Fixed security vulnerabilities in dependencies

## [0.1.2] - 2025-12-09

### Changed
- Increased PDF upload size limit to 10MB

## [0.1.1] - 2025-11-20

### Added
- Edit facilitator prompt from session settings
- Edit summary prompt directly from session results

### Changed
- Revamped session results UI
- Redesigned templates page with back navigation

## [0.1.0] - 2025-10-30

### Added
- Session templates for common deliberation types
- Improved session creation flow

## [0.13] - 2025-10-16

### Added
- Voice typing integration in chat input with microphone support
- Hideable mic error for graceful audio fallback

### Changed
- LLM model now configurable via environment variables per tier
- Gemini fallback for LLM overload errors
- Cross-pollination default set to false across entire app
- Removed deprecated `hostData.is_public` flag

### Fixed
- Dynamic preview branches for Vercel
- Initial database setup issues
- Compilation errors and auth reverts

## [0.12] - 2025-09-17

### Added
- Multi-step session creation flow with intro step and new user redirect
- Session overview modal with updated sharing UI
- Export controls for session data
- Question editor for customizing participant forms
- Templates button on home page

### Changed
- Refactored workspace creation flow and UI logic
- Refactored session creation flow with navigation and loading improvements
- Updated session storage and workspace creation links

## [0.11] - 2025-07-16

### Added
- Complete chat overhaul — redesigned participant experience with mobile-first updates
- Persistent chat — conversation state preserved across page reloads
- Share settings — configurable sharing abilities for sessions
- Summary update manager with color indicator, debounce, and real-time status
- Toggle to exclude participants from summary
- Quick create session from dashboard
- Gmail SMTP server for email invitations
- Public access loading spinner
- Inline chat styling improvements

### Changed
- Sort projects by last modified
- Better include/exclude in summary controls using Zustand store

### Fixed
- Chat fields not storing (form name ID fix)
- Mobile chat autofocus removed for better UX
- Session invite encryption
- User account deletion transaction code (Kysely)
- Chat scroll behavior
- Export responses
- Button icon spacing
- Question labels hotfix
- How it works modal

## [0.10] - 2025-06-11

### Added
- Session rating system — participants can rate sessions on completion
- Editor role can add sessions to projects
- Owner permissions for viewing and editing sessions
- Dashboard and design system updates

### Changed
- Separate summary prompt editing (HRM-687 Prompt Edit Dialog)

### Fixed
- AI suggestion hotfix
- 200 sessions limit hotfix
- Rename workspaces in profile
- Link from project navigation bug

## [0.9] - 2025-05-19

### Added
- Cross-pollination intelligence fully operational in production — AI identifies and shares relevant insights between conversation threads in real-time
- Session knowledge system (foundational version) retains context and learnings from previous workshops
- Enhanced project handling for better organization and continuity across multiple sessions

## [0.8] - 2025-03-24

### Added
- Centralized admin panel for managing all AI prompts
- Streamlined prompt optimization and testing workflows

## [0.7] - 2025-03-09

### Added
- Cross-pollination between conversation threads — AI identifies opportunities to share insights across discussions with context-aware question generation
- "AI Suggestion" button near input field for lightweight PM-style response generation (GPT-4o-mini)

### Changed
- Upgraded to LlamaIndex framework for flexible multi-LLM support
- Switched primary AI engine to Gemini 2.0 for stronger reasoning and larger context windows
- Cross-pollination timing controls to prevent conversation disruption (max once every 3 minutes)

## [0.6] - 2025-02-04

### Added
- Projects (workspace view) for organizing and managing multiple sessions
- Migrated key sessions with improved data organization
- Streamlined access to historical workshops and results

## [0.5] - 2025-01-28

### Changed
- Enhanced ignored user response handling
- Improved chat scrolling and navigation
- Added chat results directly to session result pages
- Cleaner, more intuitive results page experience

## [0.4] - 2024-12-06

### Added
- Data collection forms to streamline participant input gathering
- Advanced user analytics (Part 3) for workshop engagement insights
- Session timestamps and sorting by creation date
- Direct links to start new sessions from results pages

### Changed
- Major database migration for improved performance and scalability
- Enhanced chat reliability with better error handling and increased timeout limits
- Improved template system — templates auto-recreate when creation fields are modified
- Better page titles and metadata for SEO and social sharing
- Enhanced summary generation reliability and automated updates
- Improved user privacy controls with session visibility limits
- Streamlined dashboard performance with optimized data retrieval

### Fixed
- Session loading issues and data fetching across all pages
- Message ordering in chat interfaces
- Anonymous user handling in conversations
- Chat export for sessions with multiple participants
- Session counting accuracy

## [0.3] - 2024-10-17

### Added
- Personal dashboard with secure cookie-based session memory
- Session controls — hosts see management options, participants get streamlined view
- Individual session result links for each participant
- Real-time summary creation — no need to wait for sessions to finish
- Session completion handling with helpful popup messages and "Create New Session" button
- Direct navigation from chat completion to session results
- Logged-out mode with "Create Test Session" for easy trial access
- Session creation and participant invitations without login
- Direct links to session results for better sharing

### Changed
- Streamlined summary display in clean, single-card format
- Hidden empty transcripts for cleaner participant views
- User names visible in participant lists
- Improved transcript formatting to match chat interface
