import { NextRequest, NextResponse } from 'next/server';

const BRAINTRUST_API_URL = 'https://api.braintrustdata.com/v1';
const PROJECT_NAME = 'harmonica-facilitation';

function getApiKey() {
  const key = process.env.BRAINTRUST_API_KEY;
  if (!key) {
    throw new Error('BRAINTRUST_API_KEY is not set');
  }
  return key;
}

/**
 * GET /api/admin/evals — List recent experiments
 * GET /api/admin/evals?experiment=<name> — Fetch experiment detail (scores + records)
 */
export async function GET(request: NextRequest) {
  const experimentName = request.nextUrl.searchParams.get('experiment');

  try {
    if (experimentName) {
      return await getExperimentDetail(experimentName);
    }
    return await listExperiments();
  } catch (error: any) {
    console.error('Evals API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch eval data' },
      { status: 500 },
    );
  }
}

async function listExperiments() {
  const apiKey = getApiKey();

  // First, get the project ID
  const projectRes = await fetch(
    `${BRAINTRUST_API_URL}/project?project_name=${encodeURIComponent(PROJECT_NAME)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!projectRes.ok) {
    throw new Error(`Failed to fetch project: ${projectRes.statusText}`);
  }

  const projectData = await projectRes.json();
  const projectId = projectData.objects?.[0]?.id;

  if (!projectId) {
    return NextResponse.json([]);
  }

  // List experiments for this project
  const expRes = await fetch(
    `${BRAINTRUST_API_URL}/experiment?project_id=${projectId}&limit=20`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!expRes.ok) {
    throw new Error(`Failed to list experiments: ${expRes.statusText}`);
  }

  const expData = await expRes.json();
  const experiments = (expData.objects || []).map(
    (exp: { id: string; name: string; created: string }) => ({
      id: exp.id,
      name: exp.name,
      created: exp.created,
    }),
  );

  return NextResponse.json(experiments);
}

async function getExperimentDetail(experimentName: string) {
  const apiKey = getApiKey();
  const { init } = await import('braintrust');

  // Open experiment in read-only mode to fetch records
  const experiment = init({
    project: PROJECT_NAME,
    experiment: experimentName,
    open: true,
  });

  const records = await experiment.fetchedData();

  // Braintrust returns two record types:
  // - Score records: input is nested as { input: { input: {...}, metadata, output }, scores: {scorer: value} }
  // - Task records: input is flat as { input: {...}, output: "...", scores: null }
  // Normalize and aggregate into one record per test case with all scores merged.
  const testCaseMap = new Map<
    string,
    { input: any; output: string; scores: Record<string, number> }
  >();

  for (const record of records as any[]) {
    // Normalize input: handle nested structure from score records
    const input = record.input?.input || record.input;
    const testName = input?.name || `test-${testCaseMap.size}`;

    if (!testCaseMap.has(testName)) {
      testCaseMap.set(testName, {
        input,
        output: typeof record.output === 'string' ? record.output : '',
        scores: {},
      });
    }

    const entry = testCaseMap.get(testName)!;

    // Prefer the task record's output (string) over score record's output ({score: n})
    if (typeof record.output === 'string' && record.output) {
      entry.output = record.output;
    }

    // Merge scores from score records
    if (record.scores) {
      for (const [name, score] of Object.entries(record.scores)) {
        if (typeof score === 'number') {
          entry.scores[name] = score;
        }
      }
    }
  }

  const formattedRecords = Array.from(testCaseMap.values());

  // Compute aggregate scores
  const scoreAggregates: Record<
    string,
    { sum: number; count: number }
  > = {};
  for (const record of formattedRecords) {
    for (const [name, score] of Object.entries(record.scores)) {
      if (typeof score !== 'number') continue;
      if (!scoreAggregates[name]) {
        scoreAggregates[name] = { sum: 0, count: 0 };
      }
      scoreAggregates[name].sum += score;
      scoreAggregates[name].count += 1;
    }
  }

  const scores: Record<
    string,
    { name: string; score: number; improvements: number; regressions: number }
  > = {};
  for (const [name, agg] of Object.entries(scoreAggregates)) {
    scores[name] = {
      name,
      score: agg.count > 0 ? agg.sum / agg.count : 0,
      improvements: 0,
      regressions: 0,
    };
  }

  // Get experiment URL from REST API
  const projectRes = await fetch(
    `${BRAINTRUST_API_URL}/project?project_name=${encodeURIComponent(PROJECT_NAME)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  let experimentUrl: string | undefined;
  if (projectRes.ok) {
    const projectData = await projectRes.json();
    const projectId = projectData.objects?.[0]?.id;
    if (projectId) {
      const expId = await experiment.id;
      experimentUrl = `https://www.braintrust.dev/app/projects/${projectId}/experiments/${expId}`;
    }
  }

  return NextResponse.json({
    summary: {
      scores,
      experimentUrl,
      experimentName,
    },
    records: formattedRecords,
  });
}
