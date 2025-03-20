export async function fetchPromptTypes() {
  const response = await fetch('/api/admin/prompt-types');
  if (!response.ok) throw new Error('Failed to fetch prompt types');
  return response.json();
}

export async function fetchPrompts() {
  const response = await fetch('/api/admin/prompts');
  if (!response.ok) throw new Error('Failed to fetch prompts');
  return response.json();
}

export async function createPrompt(data: {
  prompt_type: string;
  instructions: string;
  active: boolean;
}) {
  const response = await fetch('/api/admin/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create prompt');
  return response.json();
}

export async function updatePrompt(
  id: string,
  data: { prompt_type: string; instructions: string; active: boolean },
) {
  const response = await fetch(`/api/admin/prompts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update prompt');
  return response.json();
}

export async function deletePrompt(id: string) {
  const response = await fetch(`/api/admin/prompts/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete prompt');
  }

  return response.json();
}
