import { getLLM } from '@/lib/modelConfig';
import { Message } from './schema';
import {
  getAllChatMessagesInOrder,
  getAllMessagesForSessionSorted,
  getHostSessionById,
} from '@/lib/db';
import { getPromptInstructions } from './promptsCache';
export interface CrossPollinationConfig {
  maxParticipants?: number;
  feedbackFrequency?: number;
  feedbackDepth?: number;
  enabled: boolean;
  sessionId: string;
}

export interface IdeaCluster {
  id: string;
  ideas: string[];
  summary: string;
  participants: string[];
}

export class CrossPollinationManager {
  private analyzeEngine;
  private generateEngine;
  private config: CrossPollinationConfig;
  private lastCrossPollination: number | null = null;
  private sessionData: any = null;

  constructor(config: CrossPollinationConfig) {
    this.config = config;
    // Initialize with specific models for each purpose
    this.analyzeEngine = getLLM('MAIN', 0.3);
    this.generateEngine = getLLM('LARGE', 0.3);
  }

  async loadSessionData(): Promise<any> {
    if (!this.sessionData) {
      try {
        this.sessionData = await getHostSessionById(this.config.sessionId);
        console.log(
          `[i] Loaded session data for session ${this.config.sessionId}`,
        );
      } catch (error) {
        console.error('[x] Error loading session data:', error);
        this.sessionData = {};
      }
    }
    return this.sessionData;
  }

  async analyzeSessionState(threadId: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      // 1. Load session metadata (prompt, summary, etc.)
      const sessionData = await this.loadSessionData();
      if (!sessionData) {
        console.log('[i] Session data not found, skipping cross-pollination');
        return false;
      }

      // 2. Load only the current thread messages
      const currentThreadMessages = await getAllChatMessagesInOrder(threadId);
      if (currentThreadMessages.length < 3) {
        console.log(
          '[i] Not enough messages in current thread for cross-pollination',
        );
        return false;
      }

      // 3. Check time since last cross-pollination
      const timeSinceLastCrossPollination = this.getLastCrossPollinationTime();
      if (timeSinceLastCrossPollination < 3 * 60 * 1000) {
        // 3 minutes in milliseconds
        console.log('[i] Too soon since last cross-pollination');
        return false;
      }
      const crossPollinationReasoningPrompt = await getPromptInstructions(
        'CROSS_POLLINATION_REASONING',
      );

      // 4. Analyze the current thread to determine if cross-pollination is appropriate
      const response = await this.analyzeEngine.chat({
        messages: [
          {
            role: 'system',
            content: crossPollinationReasoningPrompt,
          },
          {
            role: 'user',
            content: `Session Info:
Topic: ${sessionData.topic || 'No topic specified'}
Goal: ${sessionData.goal || 'No goal specified'}
Time since last cross-pollination: ${Math.floor(timeSinceLastCrossPollination / 60000)} minutes

Current Conversation:
${currentThreadMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n')}

Based on this information, should I introduce cross-pollination now? Answer with YES or NO only.`,
          },
        ],
      });

      const responseText = response.message.content
        .toString()
        .trim()
        .toUpperCase();
      console.log('[i] Cross-pollination analysis response:', responseText);

      // Simple check for YES at the beginning of the response
      const shouldCrossPollinate = responseText.startsWith('YES');
      console.log(`[i] Cross-pollination decision: ${shouldCrossPollinate}`);

      return shouldCrossPollinate;
    } catch (error) {
      console.error('[x] Error analyzing session state:', error);
      return false;
    }
  }

  async generateCrossPollinationQuestion(threadId: string): Promise<string> {
    try {
      // Load session data
      const sessionData = await this.loadSessionData();

      // Load current thread messages
      const currentThreadMessages = await getAllChatMessagesInOrder(threadId);
      if (currentThreadMessages.length === 0) {
        console.log('[i] No messages in current thread');
        return 'What are your thoughts on this topic?';
      }

      // Load all messages from other threads in this session
      const allSessionMessages = await getAllMessagesForSessionSorted(
        this.config.sessionId,
      );

      // Filter out messages from the current thread
      const otherThreadMessages = allSessionMessages.filter(
        (m) => m.thread_id !== threadId,
      );

      if (otherThreadMessages.length === 0) {
        console.log('[i] No messages from other threads found');
        return "You're the first participant in this session. What are your initial thoughts?";
      }

      // Group messages by thread for better context
      const threadGroups = otherThreadMessages.reduce((groups, msg) => {
        const group = groups.get(msg.thread_id) || [];
        group.push(msg);
        groups.set(msg.thread_id, group);
        return groups;
      }, new Map<string, Message[]>());

      // Process each thread to create meaningful conversation summaries
      const processedThreads = Array.from(threadGroups.entries()).map(
        ([threadId, messages], threadIndex) => {
          // Sort messages chronologically
          const sortedMessages = messages.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );

          // Extract user messages only for insights
          const userMessages = sortedMessages
            .filter((m) => m.role === 'user')
            .map((m) => m.content);

          // Extract conversation as pairs of messages for context
          const conversationPairs = [];
          for (let i = 0; i < sortedMessages.length; i += 2) {
            if (i + 1 < sortedMessages.length) {
              conversationPairs.push({
                question: sortedMessages[i].content,
                answer: sortedMessages[i + 1].content,
              });
            } else {
              conversationPairs.push({
                question: sortedMessages[i].content,
                answer: null,
              });
            }
          }

          return {
            threadId,
            userMessages,
            conversationPairs,
            messageCount: sortedMessages.length,
          };
        },
      );

      const crossPollinationPrompt =
        await getPromptInstructions('CROSS_POLLINATION');

      // Make a single LLM call to analyze and generate a question
      const response = await this.generateEngine.chat({
        messages: [
          {
            role: 'system',
            content: crossPollinationPrompt,
          },
          {
            role: 'user',
            content: JSON.stringify({
              sessionInfo: {
                topic: sessionData?.topic || 'No topic specified',
                goal: sessionData?.goal || 'No goal specified',
                description: sessionData?.description || '',
              },
              currentConversation: {
                messages: currentThreadMessages.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                summary: `The current conversation has ${currentThreadMessages.length} messages and is focused on ${sessionData?.topic || 'the session topic'}.`,
              },
              otherConversations: processedThreads.map((thread) => ({
                threadId: thread.threadId,
                messageCount: thread.messageCount,
                userMessages: thread.userMessages,
                keyInsights: thread.conversationPairs
                  .slice(0, 3)
                  .map((pair) =>
                    pair.answer
                      ? `Q: ${pair.question.slice(0, 100)}... A: ${pair.answer.slice(0, 100)}...`
                      : `Q: ${pair.question.slice(0, 100)}...`,
                  ),
              })),
            }),
          },
        ],
      });

      const responseText = response.message.content.toString().trim();
      console.log('[i] Cross-pollination question generated:', responseText);

      // Update the last cross-pollination timestamp
      this.setLastCrossPollination();

      return responseText;
    } catch (error) {
      console.error('[x] Error generating cross-pollination question:', error);
      return 'What do you think about the perspectives other participants have shared on this topic?';
    }
  }

  private getLastCrossPollinationTime(): number {
    return Date.now() - (this.lastCrossPollination || 0);
  }

  setLastCrossPollination(): void {
    this.lastCrossPollination = Date.now();
  }
}
