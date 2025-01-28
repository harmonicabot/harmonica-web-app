'use server';
import * as db from './db';
import * as gpt from 'app/api/gptUtils';
import { Message } from './schema';
import { UserProfile } from '@auth0/nextjs-auth0/client';
import templates from '@/lib/templates.json';

export async function isAdmin(user: UserProfile) {
  console.log('Admin IDs: ', process.env.ADMIN_ID);
  return (process.env.ADMIN_ID || '').indexOf(user.sub ?? 'NO USER') > -1;
}

// Define the type for the grouped chats
interface GroupedChats {
  [threadId: string]: Message[];
}

type AssistantSummary = {
  type: "assistant";
  assistant_id: string;
};

type PromptSummary = {
  type: "prompt";
  prompt: string;
};

type TemplateSummary = AssistantSummary | PromptSummary;

export async function getAssistantId(assistant: 'RESULT_CHAT_ASSISTANT' | 'EXPORT_ASSISTANT' | 'TEMPLATE_BUILDER_ID' | 'SUMMARY_ASSISTANT') {
  const result = process.env[assistant];
  if (result)
    return result;
  throw new Error(`Missing ${assistant}`);
}

export async function createSummary(sessionId: string) {
  console.log(`Creating summary for ${sessionId}...`);
  const messageStats = await db.getNumUsersAndMessages([sessionId]);
  const allUsers = await db.getUsersBySessionId(sessionId, ['id', 'thread_id', 'include_in_summary']);
  const onlyIncludedUsersWithAtLeast2Messages =
    allUsers.filter(usr => usr.include_in_summary && messageStats[sessionId][usr.id].num_messages > 2)
  console.log('Users with contributions to summary: ', onlyIncludedUsersWithAtLeast2Messages.length);

  const chats = await db.getAllMessagesForUsersSorted(onlyIncludedUsersWithAtLeast2Messages);
  const contextData = await db.getFromHostSession(sessionId, ['context', 'critical', 'goal', 'topic']);
  
  // Flatten the chats and group by thread_id to distinguish participants
  const groupedChats: GroupedChats = chats.reduce((acc, chat) => {
    const participant = chat.thread_id; // Use thread_id to identify the participant
    if (!acc[participant]) {
      acc[participant] = [];
    }
    acc[participant].push(chat);
    return acc;
  }, {} as GroupedChats); // Type assertion for the accumulator

  // Create formatted messages for each participant
  const chatMessages = Object.entries(groupedChats).map(
    ([participantId, messages]) => {
      const participantMessages = messages
        .map((chat) => {
          return `${chat.role === 'user' ? 'User' : 'AI'}: ${chat.content}`;
        })
        .join(`\n\n`); // Join messages for the same participant
      return `\`\`\`\n----START Participant ${participantId}:----\n${participantMessages}\n\n----END Participant ${participantId}----\`\`\``; // Format for each participant
    },
  );


  const objectiveData = `\`\`\`This is the context, including the **OBJECTIVE**, used to create the session.\n
  Use this information to design an appropriate report structure:\n\n
  ----START OBJECTIVE DATA----\n
  ${JSON.stringify(contextData)}
  \n----END OBJECTIVE DATA----\n\`\`\``;
  // console.log('Sending prompt to GPT-4: ', promptForObjective);
  const threadId = await gpt.handleCreateThread(
    {
      role: 'assistant',
      content: 'Use the following messages as context for user input.',
    },
    [...chatMessages, objectiveData],
  );

  const summaryAssistantId = await getSummaryAssistant(sessionId);
  const summaryReply = await gpt.handleGenerateAnswer({
    threadId: threadId,
    assistantId: summaryAssistantId,
    messageText:
      'Generate the report based on the participant data provided addressing the objective.',
  });
  const summary = summaryReply.content;
  console.log('Summary: ', summary);

  await db.updateHostSession(sessionId, {
    summary: summary ?? undefined,
    last_edit: new Date(),
  });
}

function isAssistantSummary(summary: any): summary is AssistantSummary {
  return summary.type === "assistant" && typeof summary.assistant_id === "string";
}

function isPromptSummary(summary: any): summary is PromptSummary {
  return summary.type === "prompt" && typeof summary.prompt === "string";
}

async function getSummaryAssistant(sessionId: string) {
  // Check if there is a predefined summary for the template and use it if available:
  const session = await db.getFromHostSession(sessionId, ['template_id']);
  if (session?.template_id) {
    const template = templates.templates.find(tmplt => tmplt.id === session.template_id);
    if (template?.summary) {
      const summary = template.summary;
      if (isAssistantSummary(summary)) {
        return summary.assistant_id;
      } else if (isPromptSummary(summary)) {
        return await gpt.handleCreateAssistant({
          prompt: summary.prompt,
          name: `AutoGen: ${template.id} Summary for ${sessionId}`
        });
      } else {
        console.warn(`Invalid summary type for template ${session.template_id}: 
          Expected either 'type=assistant & assistant_id', or 'type=prompt & prompt', but got: \n${summary}`);
      }
    }
  }
  return process.env.SUMMARY_ASSISTANT ?? 'asst_QTmamFSqEIcbUX4ZwrjEqdm8';
}
