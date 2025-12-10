import { getLLM } from '@/lib/modelConfig';

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  typeValue: string;
  required: boolean;
  options?: string[];
}

export async function generateFormAnswers(
  questions: FormQuestion[],
  userContext: Record<string, string>,
  prompt?: string,
): Promise<string> {
  const llm = getLLM('SMALL', 0.5);

  const answers: Record<string, string> = {};
  console.log('[i] prompt', prompt);

  const textQuestions = questions.filter(
    (q) => q.type !== 'Options' || !q.options,
  );
  const optionQuestions = questions.filter(
    (q) => q.type === 'Options' && q.options,
  );

  // Handle text questions in batch
  if (textQuestions.length > 0) {
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    let lastError = '';

    while (!success && attempts < maxAttempts) {
      try {
        console.log('\n=== LLM Request ===');
        console.log('Context:', userContext);
        console.log(
          'Questions:',
          textQuestions.map((q) => q.label),
        );

        const systemContent = `You are generating realistic survey responses for a user: ${prompt || `Context: ${JSON.stringify(userContext)}`}

IMPORTANT GUIDELINES:
1. Keep answers short - one sentence maximum
2. Be specific and concrete, avoid vague responses
3. Use natural, conversational language
4. Stay consistent with the provided context
5. Avoid using complex terminology
6. Don't include explanations or additional comments
7. Format each answer exactly as "Question: Answer"
8. ALWAYS provide an answer for EVERY question
9. For age questions, provide a realistic number
10. For education questions, provide a specific field of study
11. For application questions, list 1-2 specific use cases`;

        const userContent = `Generate brief, realistic answers for these questions. Format each answer EXACTLY as "Question: Answer" with one answer per line:

${textQuestions.map((q) => q.label).join('\n')}

${attempts > 0 ? `Previous attempt failed with: ${lastError}\nIMPORTANT: Ensure EVERY question has an answer and each answer contains a colon (:)` : ''}`;

        console.log('\nSystem Content:', systemContent);
        console.log('\nUser Content:', userContent);

        const response = await llm.chat({
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userContent },
          ],
          tag: 'form_answer_generation',
        });

        console.log('\n=== LLM Response ===');
        console.log('Raw response:', response);

        const answerLines = response
            .split('\n')
            .filter((line) => line.trim().length > 0) || [];

        console.log('\nParsed answer lines:', answerLines);

        textQuestions.forEach((question) => {
          // Find matching answer line by looking for the start of the question text
          const answerLine = answerLines.find((line) =>
            line
              .toLowerCase()
              .startsWith(question.label.toLowerCase().split('(')[0].trim()),
          );

          if (answerLine) {
            // Extract everything after the last colon as the answer
            const lastColonIndex = answerLine.lastIndexOf(':');
            if (lastColonIndex !== -1) {
              const answer = answerLine.substring(lastColonIndex + 1).trim();
              answers[question.label] = answer;
              console.log(`Matched answer for "${question.label}":`, answer);
            } else {
              console.log(
                `No colon found in answer line for question: "${question.label}"`,
              );
            }
          } else {
            // Special case for pseudonym which might have different format
            if (
              question.label.includes('Pseudonym') &&
              answerLines[0]?.includes('Pseudonym:')
            ) {
              const answer = answerLines[0].split(':')[1].trim();
              answers[question.label] = answer;
              console.log(`Matched pseudonym answer:`, answer);
            } else {
              console.log(`No match found for question: "${question.label}"`);
            }
          }
        });

        const missingAnswers = textQuestions.filter((q) => !answers[q.label]);
        if (missingAnswers.length > 0) {
          lastError = `Missing answers for: ${missingAnswers.map((q) => q.label).join(', ')}`;
          console.log('\nMissing answers:', lastError);
          throw new Error(lastError);
        }
        success = true;
        console.log('\nSuccessfully generated all answers:', answers);
      } catch (error) {
        console.error(`\nAttempt ${attempts + 1} failed:`, error);
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      attempts++;
    }

    if (!success) {
      console.error(
        `Failed to generate answers after ${maxAttempts} attempts. Last error: ${lastError}`,
      );
      // Fill missing answers with fallback value
      textQuestions.forEach((q) => {
        if (!answers[q.label]) {
          answers[q.label] = 'Not provided (LLM generation failed)';
        }
      });
    }
  }

  // Handle option questions separately
  for (const question of optionQuestions) {
    const weights = generateWeights(question.options!.length);
    const randomIndex = weightedRandomIndex(weights);
    answers[question.label] = question.options![randomIndex];
  }

  // Format the output string
  const formattedAnswers = Object.entries(answers)
    .map(([question, answer]) => `${question}: ${answer}`)
    .join('; ');

  // Add preferred language if provided in context
  const preferredLanguage = userContext.preferred_language || 'English';
  const languageString = `preferred_language: ${preferredLanguage}`;

  return `User shared the following context: ${formattedAnswers}; ${languageString}`;
}

function generateWeights(length: number): number[] {
  // Generate weights that favor middle options but work for any length
  const weights = new Array(length).fill(0);
  const middle = Math.floor(length / 2);

  for (let i = 0; i < length; i++) {
    // Distance from middle, normalized to 0-1
    const distanceFromMiddle = Math.abs(i - middle) / length;
    // Convert to weight (higher for middle values)
    weights[i] = 1 - distanceFromMiddle;
  }

  // Normalize weights to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

function weightedRandomIndex(weights: number[]): number {
  const random = Math.random();
  let sum = 0;

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random < sum) {
      return i;
    }
  }

  return Math.floor(weights.length / 2); // Default to middle option
}
