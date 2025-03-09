'use server';

import { Message } from './schema';
import {
  CrossPollinationManager,
  type CrossPollinationConfig,
} from './crossPollinationManager';

export async function analyzeSessionState(
  threadId: string,
  config: CrossPollinationConfig,
): Promise<boolean> {
  const manager = new CrossPollinationManager(config);
  return manager.analyzeSessionState(threadId);
}

export async function generateCrossPollinationQuestion(
  threadId: string,
  config: CrossPollinationConfig,
): Promise<string> {
  const manager = new CrossPollinationManager(config);
  return manager.generateCrossPollinationQuestion(threadId);
}

export async function initializeCrossPollination(
  sessionId: string,
  config: Partial<CrossPollinationConfig> = {},
): Promise<CrossPollinationManager> {
  return new CrossPollinationManager({
    sessionId,
    enabled: true,
    maxParticipants: 100,
    feedbackFrequency: 5,
    feedbackDepth: 3,
    ...config,
  });
}
