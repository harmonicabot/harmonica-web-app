'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { EditPromptDialog } from './EditPromptDialog';
import { DeletePromptDialog } from './DeletePromptDialog';
import { fetchPrompts } from './api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Prompt {
  id: string;
  prompt_type: string;
  type_name: string;
  instructions: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function PromptList() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);

  const loadPrompts = async () => {
    try {
      const data = await fetchPrompts();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Instructions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prompts.map((prompt) => (
            <TableRow key={prompt.id}>
              <TableCell className="font-medium">{prompt.type_name}</TableCell>
              <TableCell>
                {prompt.instructions.split('\n')[0]}
                {prompt.instructions.includes('\n') && '...'}
              </TableCell>
              <TableCell>
                <Badge variant={prompt.active ? 'default' : 'secondary'}>
                  {prompt.active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(prompt.created_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(prompt.updated_at)}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPrompt(prompt)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingPrompt(prompt)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditPromptDialog
        prompt={editingPrompt}
        open={!!editingPrompt}
        onOpenChange={(open) => !open && setEditingPrompt(null)}
        onSuccess={loadPrompts}
      />

      <DeletePromptDialog
        prompt={deletingPrompt}
        open={!!deletingPrompt}
        onOpenChange={(open) => !open && setDeletingPrompt(null)}
        onSuccess={loadPrompts}
      />
    </>
  );
}
