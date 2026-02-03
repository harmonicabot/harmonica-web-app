export interface ExperimentListItem {
  id: string;
  name: string;
  created: string;
}

export interface ScoreSummary {
  name: string;
  score: number;
  diff?: number;
  improvements: number;
  regressions: number;
}

export interface ExperimentRecord {
  input: {
    name: string;
    topic: string;
    goal: string;
  };
  output: string;
  scores: Record<string, number>;
}

export interface ExperimentDetail {
  summary: {
    scores: Record<string, ScoreSummary>;
    experimentUrl?: string;
    experimentName: string;
    comparisonExperimentName?: string;
  };
  records: ExperimentRecord[];
}

export async function fetchExperiments(): Promise<ExperimentListItem[]> {
  const res = await fetch('/api/admin/evals');
  if (!res.ok) {
    throw new Error('Failed to fetch experiments');
  }
  return res.json();
}

export async function fetchExperimentDetail(
  name: string,
): Promise<ExperimentDetail> {
  const res = await fetch(
    `/api/admin/evals?experiment=${encodeURIComponent(name)}`,
  );
  if (!res.ok) {
    throw new Error('Failed to fetch experiment detail');
  }
  return res.json();
}
