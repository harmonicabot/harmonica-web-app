# Implementation Plan

## Core Changes

### Export Functionality
- Extend ExportSection.tsx to handle Markdown/PDF
- Add multi-select capability for cards
- Create hover controls on individual cards
- Focus on Summary & Custom Insights only

### Layout & UI
- Implement collapsible summary with smooth animation
- Match height constraints between summary and chat
- Mobile-first responsive design improvements
- Remove session recap tab
- Clean up card presentation

### Content
- Update chat introduction for ENS context
- Add institutional footer with placeholders
- Improve section spacing

## Component Changes

### ResultTabs.tsx
- Add CollapsibleSection wrapper for summary
- Implement consistent height constraints
- Remove session recap tab
- Add export controls integration
- Improve mobile responsiveness

### SessionSummaryCard.tsx
- Restructure card layout (objective below title)
- Remove messages count
- Add hover export controls
- Improve mobile layout

### ExportSection.tsx
- Extend for Markdown/PDF support
- Add multi-select functionality
- Integrate with ResultTabs

### New Components
- CollapsibleSection.tsx (animation & state management)
- InstitutionalFooter.tsx (with placeholder data)
- ExportControls.tsx (unified export interface)

## Mobile Improvements
- Responsive layout adjustments
- Touch-friendly controls
- Collapsible behavior optimization

## TODOs
- [ ] Placeholder institutional logos
- [ ] Social media links
- [ ] Contact information
- [ ] Help documentation links
