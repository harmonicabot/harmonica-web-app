import * as db from './db';
import * as gpt from 'app/api/gptUtils';
import templates from '@/lib/templates.json';

type AssistantSummary = {
  type: "assistant";
  assistant_id: string;
};

type PromptSummary = {
  type: "prompt";
  prompt: string;
};

function isAssistantSummary(summary: any): summary is AssistantSummary {
  return summary.type === "assistant" && typeof summary.assistant_id === "string";
}

function isPromptSummary(summary: any): summary is PromptSummary {
  return summary.type === "prompt" && typeof summary.prompt === "string";
}

export async function getSummaryAssistant(sessionId: string): Promise<string> {
  const session = await db.getFromHostSession(sessionId, ['template_id']);
  return getSummaryAssistantFromTemplate(session?.template_id)
} 

export async function getSummaryAssistantFromTemplate(templateId: string | undefined): Promise<string> {
  // Check if there is a predefined summary for the template and use it if available:  
  const template = templates.templates.find(tmplt => tmplt.id === templateId);
  if (template?.summary) {
    const summary = template.summary;
    if (isAssistantSummary(summary)) {
      return summary.assistant_id;
    } else if (isPromptSummary(summary)) {
      return await gpt.handleCreateAssistant({
        prompt: summary.prompt,
        name: `AutoGen: ${template.id} Summary`
      });
    } else {
      console.warn(`Invalid summary type for template ${templateId}: 
        Expected either 'type=assistant & assistant_id', or 'type=prompt & prompt', but got: \n${summary}`);
    }
  }
  return process.env.SUMMARY_ASSISTANT ?? 'asst_QTmamFSqEIcbUX4ZwrjEqdm8';
}