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
