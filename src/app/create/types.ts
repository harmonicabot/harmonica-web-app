export enum QuestionType {
  SHORT_FIELD = 'Short field',
  EMAIL = 'Email',
  OPTIONS = 'Options',
}

// Add a type guard to ensure proper serialization
export function isQuestionType(value: any): value is QuestionType {
  return Object.values(QuestionType).includes(value);
}

export interface QuestionInfo {
  id: string;
  label: string;
  type: QuestionType;
  typeValue: keyof typeof QuestionType;
  required: boolean;
  options?: string[];
  optionsInput?: string;
}

export const STEPS = ['Template', 'Create', 'Refine', 'Share'] as const;
export type Step = (typeof STEPS)[number];
