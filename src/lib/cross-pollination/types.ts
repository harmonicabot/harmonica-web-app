import { z } from 'zod';

// Input types — simplified message for clustering (no DB dependency)
export const ClusterInputMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  content: z.string(),
  role: z.enum(['user', 'assistant']),
});
export type ClusterInputMessage = z.infer<typeof ClusterInputMessageSchema>;

export const SessionContextSchema = z.object({
  topic: z.string(),
  goal: z.string(),
  description: z.string().optional(),
});
export type SessionContext = z.infer<typeof SessionContextSchema>;

// Clustering output
export const ClusterSchema = z.object({
  label: z.string(),
  type: z.enum(['convergence', 'tension', 'outlier']),
  messageIds: z.array(z.string()),
  summary: z.string(),
  participantCount: z.number(),
});
export type Cluster = z.infer<typeof ClusterSchema>;

export const ClusterResultSchema = z.object({
  clusters: z.array(ClusterSchema),
  totalMessagesAnalyzed: z.number(),
  timestamp: z.number(),
});
export type ClusterResult = z.infer<typeof ClusterResultSchema>;

// Quality check output
export const QualityResultSchema = z.object({
  passed: z.boolean(),
  failedGate: z.enum(['length', 'cluster_reference', 'novelty', 'relevance']).optional(),
  reason: z.string().optional(),
});
export type QualityResult = z.infer<typeof QualityResultSchema>;

// Scratchpad types — persistent structured session state
export const ScratchpadThemeSchema = z.object({
  label: z.string(),
  type: z.enum(['convergence', 'tension', 'outlier']),
  summary: z.string(),
  strength: z.number(), // how many participants touched this
  firstSeen: z.number(), // timestamp when this theme emerged
});
export type ScratchpadTheme = z.infer<typeof ScratchpadThemeSchema>;

export const SessionScratchpadSchema = z.object({
  themes: z.array(ScratchpadThemeSchema),
  questionsWellCovered: z.array(z.string()),
  emergingConsensus: z.array(z.string()),
  openTensions: z.array(z.string()),
  participantCount: z.number(),
  lastUpdated: z.number(),
});
export type SessionScratchpad = z.infer<typeof SessionScratchpadSchema>;
