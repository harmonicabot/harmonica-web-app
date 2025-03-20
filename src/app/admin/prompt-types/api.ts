export async function fetchPromptTypes() {
  const response = await fetch('/api/admin/prompt-types');
  if (!response.ok) throw new Error('Failed to fetch prompt types');
  return response.json();
}

export async function createPromptType(data: {
  name: string;
  description: string;
}) {
  const response = await fetch('/api/admin/prompt-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create prompt type');
  return response.json();
}

export async function updatePromptType(
  id: string,
  data: { name: string; description: string },
) {
  const response = await fetch(`/api/admin/prompt-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update prompt type');
  return response.json();
}

export async function deletePromptType(name: string) {
  const response = await fetch(`/api/admin/prompt-types/${name}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete prompt type');
  return response.json();
}
