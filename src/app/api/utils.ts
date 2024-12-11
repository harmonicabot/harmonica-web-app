import { SessionBuilderData } from "@/lib/types";

export function createPromptContent(data: SessionBuilderData) {
  const createSummaryInstructions = data.createSummary
    ? 'Create a summary of the conversation at the end.'
    : '';
  const allowIterationsOnSummary = data.summaryFeedback
    ? 'Ask the user whether the summary is accurate and iterate on it if necessary.'
    : '';
  const includeContextInstructions = data.requireContext
    ? `When the session is started, the host will provide context about: ${data.contextDescription}. Use this as [CONTEXT] where appropriate.`
    : '';

  return `
    Create a template with the following information:
    Session Name: ${data.sessionName}
    Task Description: ${data.goal}
    Critical to understand: ${data.critical ? data.critical : ''}
    Context: ${data.context ? data.context : ''}
    ${createSummaryInstructions}
    ${allowIterationsOnSummary}
    ${includeContextInstructions}
  `;
}