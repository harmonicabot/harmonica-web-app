'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useToast } from 'hooks/use-toast';
import { format } from 'date-fns';

interface Template {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  facilitation_prompt: string | null;
  default_session_name: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const ICON_OPTIONS = [
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
];

const emptyForm = {
  title: '',
  description: '',
  icon: '',
  facilitation_prompt: '',
  default_session_name: '',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/templates');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({
        title: 'Error loading templates',
        description: 'Please refresh the page',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create');
      toast({ title: 'Template created successfully' });
      setShowCreateDialog(false);
      setForm(emptyForm);
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Error creating template',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !form.title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast({ title: 'Template updated successfully' });
      setEditingTemplate(null);
      setForm(emptyForm);
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Error updating template',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      const res = await fetch(`/api/admin/templates/${deletingTemplate.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ title: 'Template deleted successfully' });
      setDeletingTemplate(null);
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Error deleting template',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (template: Template) => {
    setForm({
      title: template.title,
      description: template.description || '',
      icon: template.icon || '',
      facilitation_prompt: template.facilitation_prompt || '',
      default_session_name: template.default_session_name || '',
    });
    setEditingTemplate(template);
  };

  const openCreateDialog = () => {
    setForm(emptyForm);
    setShowCreateDialog(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const templateForm = (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Template title"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of the template"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <Select
          value={form.icon}
          onValueChange={(value) => setForm({ ...form, icon: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an icon" />
          </SelectTrigger>
          <SelectContent>
            {ICON_OPTIONS.map((icon) => (
              <SelectItem key={icon.value} value={icon.value}>
                {icon.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="default_session_name">Default Session Name</Label>
        <Input
          id="default_session_name"
          value={form.default_session_name}
          onChange={(e) =>
            setForm({ ...form, default_session_name: e.target.value })
          }
          placeholder="Default name when creating a session from this template"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="facilitation_prompt">Facilitation Prompt</Label>
        <Textarea
          id="facilitation_prompt"
          value={form.facilitation_prompt}
          onChange={(e) =>
            setForm({ ...form, facilitation_prompt: e.target.value })
          }
          placeholder="If provided, users skip the multi-step form and go directly to review"
          className="min-h-[120px]"
        />
        <p className="text-xs text-muted-foreground">
          If a facilitation prompt is provided, users skip the multi-step form
          and go directly to review when selecting this template.
        </p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Templates
        </h1>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Icon</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">{template.title}</TableCell>
              <TableCell className="max-w-[300px] truncate">
                {template.description}
              </TableCell>
              <TableCell>{template.icon}</TableCell>
              <TableCell>
                {template.facilitation_prompt ? (
                  <Badge>Has prompt</Badge>
                ) : (
                  <Badge variant="secondary">No prompt</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(template.created_at)}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingTemplate(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            {templateForm}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            {templateForm}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTemplate(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the template{' '}
            <span className="font-semibold">{deletingTemplate?.title}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTemplate(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
