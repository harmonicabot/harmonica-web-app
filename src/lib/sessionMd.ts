import type { HostSession } from './schema';

/**
 * Generate a structured SESSION.md brief from session data.
 * Template-based — no LLM calls. Omits sections with no data.
 */
export function generateSessionMd(session: HostSession): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${session.topic}`);

  // Overview
  const overviewLines = [
    `- **Goal**: ${session.goal}`,
    `- **Status**: ${session.active ? 'Active' : 'Completed'}`,
    `- **Participants**: ${session.num_sessions}`,
    `- **Created**: ${formatDate(session.start_time)}`,
    `- **Last updated**: ${formatDate(session.last_edit)}`,
  ];
  sections.push(`## Overview\n\n${overviewLines.join('\n')}`);

  // Context (optional)
  if (session.context) {
    sections.push(`## Context\n\n${session.context}`);
  }

  // Critical points (optional)
  if (session.critical) {
    sections.push(`## Critical Points\n\n${session.critical}`);
  }

  // Questions (optional)
  const questions = parseQuestions(session.questions);
  if (questions.length > 0) {
    const questionList = questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n');
    sections.push(`## Questions\n\n${questionList}`);
  }

  // Summary (optional — may not be generated yet)
  if (session.summary) {
    sections.push(`## Summary\n\n${session.summary}`);
  }

  return sections.join('\n\n');
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function parseQuestions(questions: JSON | undefined): string[] {
  if (!questions) return [];
  try {
    const parsed =
      typeof questions === 'string' ? JSON.parse(questions) : questions;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((q: { label?: string }) => q.label)
      .filter((label): label is string => !!label);
  } catch {
    return [];
  }
}
