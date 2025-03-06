# Harmonica Web App Development Guide

## Commands
- Build: `npm run build`
- Dev server: `npm run dev`
- Production server: `npm run start`
- DB migrations: `npm run migrate`
- Rollback migration: `npm run migrate:down`

## Code Style
- Use functional components with hooks, avoid classes
- Organize imports: React first, then external libs, then internal modules
- Use TypeScript with strict typing and proper interfaces/types
- Variable naming: camelCase with descriptive names and auxiliary verbs (`isLoading`, `hasError`)
- Directory naming: lowercase with dashes (e.g., `components/auth-wizard`)
- Component structure: exports, subcomponents, helpers, types

## Best Practices
- Minimize use of `'use client'`, favor React Server Components
- Use early returns for error conditions and implement guard clauses
- Implement Zod for schema validation
- Use Shadcn UI components with Tailwind CSS for styling
- Zustand for state management
- Thorough error handling with custom error types
- Mobile-first responsive design

## File Structure
Place new components in appropriate directories following existing patterns.