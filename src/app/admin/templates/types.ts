export interface ChainStep {
  id: string;
  title: string;
  description: string;
  facilitation_prompt: string;
  default_session_name: string;
  context_mode: 'none' | 'previous_summary' | 'all_summaries' | 'custom';
  context_template: string;
}

export interface ChainConfig {
  steps: ChainStep[];
}

export interface Template {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  facilitation_prompt: string | null;
  default_session_name: string | null;
  is_public: boolean;
  template_type: 'single' | 'chain';
  chain_config: ChainConfig | null;
  created_at: string;
  updated_at: string;
}

export const ICON_OPTIONS = [
  { value: 'lightbulb', label: 'Lightbulb' },
  { value: 'history', label: 'History' },
  { value: 'grid-2x2', label: 'Grid' },
  { value: 'target', label: 'Target' },
  { value: 'list-ordered', label: 'List Ordered' },
  { value: 'activity-square', label: 'Activity' },
  { value: 'list-checks', label: 'List Checks' },
  { value: 'shield-alert', label: 'Shield Alert' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'map', label: 'Map' },
] as const;

export const CONTEXT_MODE_OPTIONS = [
  { value: 'none', label: 'None', description: 'No context from previous sessions' },
  { value: 'previous_summary', label: 'Previous Summary', description: 'Summary from the immediately previous session' },
  { value: 'all_summaries', label: 'All Summaries', description: 'Summaries from all previous sessions in the chain' },
  { value: 'custom', label: 'Custom Template', description: 'Custom template with variable substitution' },
] as const;
