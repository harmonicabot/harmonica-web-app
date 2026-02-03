Run the Harmonica facilitation eval suite against the current LLM configuration.

## Before running

Confirm with the user:
- This will run 7 test cases through the LLM (task) + 5 LLM-as-judge scorers per case = ~42 LLM calls
- Estimated cost: $0.50–$1.50 per run depending on the configured LLM tier
- Ask: "Ready to run facilitation evals? (~$0.50–$1.50 in LLM costs)"

## Run the eval

```bash
cd harmonica-web-app && npx tsx evals/facilitation.eval.ts
```

The eval uses Braintrust's `Eval()` API. It will:
1. Run 7 facilitation test cases through `handleGenerateAnswer`-style prompt construction
2. Score each with 5 LLM-as-judge criteria: relevance, question_quality, goal_alignment, tone, conciseness
3. Log results to Braintrust and print a summary table to stdout

## Parse and present results

After the eval completes, parse the stdout for:
- **Experiment name** and **URL** (look for the Braintrust experiment link)
- **Score summary** — extract the scores table

Present results as a formatted table:

```
| Scorer           | Score  |
|------------------|--------|
| relevance        | XX.X%  |
| question_quality | XX.X%  |
| goal_alignment   | XX.X%  |
| tone             | XX.X%  |
| conciseness      | XX.X%  |
```

Include the Braintrust experiment URL so the user can view full details.

If any score is below 60%, flag it with a warning.

## After running

Remind the user they can view detailed per-test-case results at `/admin/evals` in the Harmonica admin panel.
