import { getSessionFiles } from '@/lib/db';

// Helper to fetch file content from a URL
async function fetchFileContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file content');
    return await response.text();
  } catch (error) {
    return '[Error reading file]';
  }
}

/**
 * Fetches all files for a session, reads their content, and generates a summary string.
 * You can later replace the summary logic with an LLM call if needed.
 */
export async function generateFileSummary(sessionId: string): Promise<string> {
  const files = await getSessionFiles(sessionId);
  if (!files || files.length === 0) return 'No files uploaded.';

  // Read content for each file (limit to first 3 files for performance)
  const filesWithContent = await Promise.all(
    files.slice(0, 3).map(async (file: any) => {
      const content = await fetchFileContent(file.file_url);
      return {
        ...file,
        content: content.slice(0, 500), // Only first 500 chars for summary
      };
    })
  );

  // Simple summary logic: list file names and a snippet of their content
  let summary = `Session has ${files.length} file(s):\n`;
  summary += filesWithContent
    .map(
      (file, idx) =>
        `${idx + 1}. ${file.file_name} (${file.file_type}, ${file.file_size} bytes)\nSnippet: ${file.content}\n`
    )
    .join('\n');

  if (files.length > 3) {
    summary += `...and ${files.length - 3} more file(s) not shown in summary.`;
  }

  return summary;
} 