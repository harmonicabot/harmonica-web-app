import { SessionBuilderData } from "@/lib/types";

export function createPromptContent(data: SessionBuilderData) {
  const sessionCritical = data.critical
    ? `[Session_Critical] (what is important to understand?): ${data.critical}`
    : '';
  const sessionContext = data.context
    ? `[Session_Context]: ${data.context}`
    : '';
  
  return `
    Create a template with the following information:
    [Session_Name]: ${data.sessionName}
    [Session_Objective]: ${data.goal}
    ${sessionCritical}
    ${sessionContext}
  `;
}