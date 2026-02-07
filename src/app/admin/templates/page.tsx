'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  X,
  Link2,
  GitBranch,
} from 'lucide-react';
import { useToast } from 'hooks/use-toast';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type {
  Template,
  ChainStep,
  ChainConfig,
} from './types';
import { ICON_OPTIONS, CONTEXT_MODE_OPTIONS } from './types';

// ─── Helpers ───────────────────────────────────────────────

type View = 'list' | 'chain-editor';

const emptyForm = {
  title: '',
  description: '',
  icon: '',
  facilitation_prompt: '',
  default_session_name: '',
};

function createEmptyStep(index: number): ChainStep {
  return {
    id: uuidv4(),
    title: `Step ${index + 1}`,
    description: '',
    facilitation_prompt: '',
    default_session_name: '',
    context_mode: index === 0 ? 'none' : 'previous_summary',
    context_template: '',
  };
}

function parseChainConfig(raw: any): ChainConfig | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw as ChainConfig;
}

function formatDate(dateString: string) {
  return format(new Date(dateString), 'MMM d, yyyy');
}

// ─── Main Component ────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState('all');

  // Single template dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSingle, setEditingSingle] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Chain editor state
  const [chainTemplate, setChainTemplate] = useState<Template | null>(null);
  const [chainForm, setChainForm] = useState({ title: '', description: '', icon: '' });
  const [chainSteps, setChainSteps] = useState<ChainStep[]>([]);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [isNewChain, setIsNewChain] = useState(false);

  const { toast } = useToast();

  // ─── Data loading ──────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/templates');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const parsed = data.map((t: any) => ({
        ...t,
        chain_config: parseChainConfig(t.chain_config),
      }));
      setTemplates(parsed);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({ title: 'Error loading templates', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ─── Filter ────────────────────────────────────────────

  const filtered = templates.filter((t) => {
    if (tab === 'single') return t.template_type === 'single';
    if (tab === 'chain') return t.template_type === 'chain';
    return true;
  });

  // ─── Single Template CRUD ──────────────────────────────

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, template_type: 'single' }),
      });
      if (!res.ok) throw new Error('Failed to create');
      toast({ title: 'Template created' });
      setShowCreateDialog(false);
      setForm(emptyForm);
      loadTemplates();
    } catch {
      toast({ title: 'Error creating template', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSingle || !form.title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${editingSingle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, template_type: 'single' }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast({ title: 'Template updated' });
      setEditingSingle(null);
      setForm(emptyForm);
      loadTemplates();
    } catch {
      toast({ title: 'Error updating template', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      const res = await fetch(`/api/admin/templates/${deletingTemplate.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ title: 'Template deleted' });
      setDeletingTemplate(null);
      loadTemplates();
    } catch {
      toast({ title: 'Error deleting template', variant: 'destructive' });
    }
  };

  // ─── Chain Template CRUD ───────────────────────────────

  const openChainEditor = (template?: Template) => {
    if (template) {
      setChainTemplate(template);
      setChainForm({
        title: template.title,
        description: template.description || '',
        icon: template.icon || '',
      });
      const config = template.chain_config;
      setChainSteps(config?.steps || [createEmptyStep(0)]);
      setIsNewChain(false);
    } else {
      setChainTemplate(null);
      setChainForm({ title: '', description: '', icon: '' });
      setChainSteps([createEmptyStep(0)]);
      setIsNewChain(true);
    }
    setExpandedStepId(null);
    setView('chain-editor');
  };

  const handleSaveChain = async () => {
    if (!chainForm.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (chainSteps.length === 0) {
      toast({ title: 'Add at least one step', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const chainConfig: ChainConfig = { steps: chainSteps };
    const payload = {
      title: chainForm.title,
      description: chainForm.description || null,
      icon: chainForm.icon || null,
      facilitation_prompt: null,
      default_session_name: null,
      template_type: 'chain',
      chain_config: chainConfig,
    };

    try {
      const url = isNewChain
        ? '/api/admin/templates'
        : `/api/admin/templates/${chainTemplate!.id}`;
      const method = isNewChain ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast({ title: isNewChain ? 'Chain template created' : 'Chain template updated' });
      setView('list');
      loadTemplates();
    } catch {
      toast({ title: 'Error saving chain template', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Step Management ───────────────────────────────────

  const addStep = () => {
    const newStep = createEmptyStep(chainSteps.length);
    setChainSteps([...chainSteps, newStep]);
    setExpandedStepId(newStep.id);
  };

  const removeStep = (id: string) => {
    setChainSteps(chainSteps.filter((s) => s.id !== id));
    if (expandedStepId === id) setExpandedStepId(null);
  };

  const updateStep = (id: string, updates: Partial<ChainStep>) => {
    setChainSteps(chainSteps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chainSteps.length) return;
    const newSteps = [...chainSteps];
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    // Reset context_mode for step at index 0
    if (newSteps[0].context_mode !== 'none') {
      newSteps[0] = { ...newSteps[0], context_mode: 'none', context_template: '' };
    }
    setChainSteps(newSteps);
  };

  // ─── Open edit for single template ─────────────────────

  const openEditSingle = (t: Template) => {
    setForm({
      title: t.title,
      description: t.description || '',
      icon: t.icon || '',
      facilitation_prompt: t.facilitation_prompt || '',
      default_session_name: t.default_session_name || '',
    });
    setEditingSingle(t);
  };

  // ─── Render: Loading ───────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // ─── Render: Chain Editor View ─────────────────────────

  if (view === 'chain-editor') {
    return (
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
            <Button onClick={handleSaveChain} disabled={isSaving}>
              {isSaving ? 'Saving...' : isNewChain ? 'Create Chain' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-lg border bg-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold">Chain Template</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chain-title">Title</Label>
              <Input
                id="chain-title"
                value={chainForm.title}
                onChange={(e) => setChainForm({ ...chainForm, title: e.target.value })}
                placeholder="e.g. Wardley Mapping Workshop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chain-desc">Description</Label>
              <Input
                id="chain-desc"
                value={chainForm.description}
                onChange={(e) => setChainForm({ ...chainForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chain-icon">Icon</Label>
              <Select
                value={chainForm.icon}
                onValueChange={(v) => setChainForm({ ...chainForm, icon: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select icon" /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>{icon.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Session Chain ({chainSteps.length} {chainSteps.length === 1 ? 'step' : 'steps'})
          </h3>
        </div>

        <div className="relative">
          {/* Vertical connecting line */}
          {chainSteps.length > 1 && (
            <div
              className="absolute left-[19px] top-[28px] w-0.5 bg-amber-300 dark:bg-amber-700"
              style={{ height: `calc(100% - 80px)` }}
            />
          )}

          {/* Steps */}
          <div className="space-y-0">
            {chainSteps.map((step, index) => {
              const isExpanded = expandedStepId === step.id;
              const isFirst = index === 0;
              const isLast = index === chainSteps.length - 1;

              return (
                <div key={step.id}>
                  {/* Context flow indicator (between steps) */}
                  {!isFirst && (
                    <div className="flex items-center gap-3 pl-[11px] py-2">
                      <div className="w-[18px] flex justify-center">
                        <Link2 className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {step.context_mode === 'none'
                          ? 'No context passed'
                          : step.context_mode === 'previous_summary'
                            ? 'Previous session summary flows in'
                            : step.context_mode === 'all_summaries'
                              ? 'All previous summaries flow in'
                              : 'Custom context template'}
                      </span>
                    </div>
                  )}

                  {/* Step node */}
                  <div className="flex gap-3">
                    {/* Circle */}
                    <div className="flex-shrink-0 w-10 flex justify-center pt-1">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-sm z-10 relative">
                        {index + 1}
                      </div>
                    </div>

                    {/* Step card */}
                    <div className="flex-1 min-w-0 mb-2">
                      <div
                        className={`rounded-lg border transition-colors ${
                          isExpanded
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                            : 'bg-card hover:border-amber-200 dark:hover:border-amber-800'
                        }`}
                      >
                        {/* Collapsed header */}
                        <div
                          className="flex items-center justify-between px-4 py-3 cursor-pointer"
                          onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {step.title || `Step ${index + 1}`}
                            </p>
                            {!isExpanded && step.facilitation_prompt && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {step.facilitation_prompt.slice(0, 80)}
                                {step.facilitation_prompt.length > 80 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <Button
                              variant="ghost" size="sm"
                              onClick={(e) => { e.stopPropagation(); moveStep(index, -1); }}
                              disabled={isFirst}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={(e) => { e.stopPropagation(); moveStep(index, 1); }}
                              disabled={isLast}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                              disabled={chainSteps.length <= 1}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded editor */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-amber-200 dark:border-amber-800 pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Step Title</Label>
                                <Input
                                  value={step.title}
                                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                                  placeholder="e.g. Landscape Mapping"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Default Session Name</Label>
                                <Input
                                  value={step.default_session_name}
                                  onChange={(e) => updateStep(step.id, { default_session_name: e.target.value })}
                                  placeholder="e.g. Wardley - Landscape"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={step.description}
                                onChange={(e) => updateStep(step.id, { description: e.target.value })}
                                placeholder="Admin-facing note about this step"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Facilitation Prompt</Label>
                              <Textarea
                                value={step.facilitation_prompt}
                                onChange={(e) => updateStep(step.id, { facilitation_prompt: e.target.value })}
                                placeholder="The AI facilitator instructions for this session..."
                                className="min-h-[120px] font-mono text-sm"
                              />
                            </div>

                            {/* Context injection (not for first step) */}
                            {!isFirst && (
                              <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                                <Label className="text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                  <Link2 className="h-3.5 w-3.5" />
                                  Context Injection
                                </Label>

                                <RadioGroup
                                  value={step.context_mode}
                                  onValueChange={(v) =>
                                    updateStep(step.id, { context_mode: v as ChainStep['context_mode'] })
                                  }
                                  className="grid grid-cols-2 gap-2"
                                >
                                  {CONTEXT_MODE_OPTIONS.filter(o => o.value !== 'none').map((opt) => (
                                    <label
                                      key={opt.value}
                                      className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                                        step.context_mode === opt.value
                                          ? 'border-amber-400 bg-white dark:bg-amber-950/50'
                                          : 'border-transparent hover:border-amber-200 dark:hover:border-amber-800'
                                      }`}
                                    >
                                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                                      <div>
                                        <p className="text-sm font-medium">{opt.label}</p>
                                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                                      </div>
                                    </label>
                                  ))}
                                </RadioGroup>

                                {step.context_mode === 'custom' && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">Context Template</Label>
                                    <Textarea
                                      value={step.context_template}
                                      onChange={(e) => updateStep(step.id, { context_template: e.target.value })}
                                      placeholder={'Review the previous analysis:\n\n{{previous_summary}}\n\nNow focus on...'}
                                      className="min-h-[100px] font-mono text-sm"
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="text-xs text-muted-foreground">Variables:</span>
                                      {[
                                        '{{previous_summary}}',
                                        '{{all_summaries}}',
                                        ...Array.from({ length: index }, (_, i) => `{{step_${i + 1}_summary}}`),
                                      ].map((v) => (
                                        <button
                                          key={v}
                                          type="button"
                                          className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                                          onClick={() => {
                                            updateStep(step.id, {
                                              context_template: step.context_template + v,
                                            });
                                          }}
                                        >
                                          {v}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {isFirst && (
                              <p className="text-xs text-muted-foreground italic">
                                First step in the chain — no context injection from previous sessions.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Step */}
          <div className="flex gap-3 mt-2">
            <div className="w-10 flex justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-300 dark:border-amber-700 flex items-center justify-center z-10 relative bg-background">
                <Plus className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={addStep}
              className="border-dashed border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              Add Step
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: List View ─────────────────────────────────

  const singleFormFields = (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Template title"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select
            value={form.icon}
            onValueChange={(v) => setForm({ ...form, icon: v })}
          >
            <SelectTrigger><SelectValue placeholder="Select icon" /></SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((icon) => (
                <SelectItem key={icon.value} value={icon.value}>{icon.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Session Name</Label>
          <Input
            value={form.default_session_name}
            onChange={(e) => setForm({ ...form, default_session_name: e.target.value })}
            placeholder="Default name"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Facilitation Prompt</Label>
        <Textarea
          value={form.facilitation_prompt}
          onChange={(e) => setForm({ ...form, facilitation_prompt: e.target.value })}
          placeholder="If provided, users skip the multi-step form and go directly to review"
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground">
          If a facilitation prompt is provided, users skip the multi-step form when selecting this template.
        </p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Templates</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setForm(emptyForm); setShowCreateDialog(true); }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
          <Button onClick={() => openChainEditor()}>
            <GitBranch className="h-4 w-4 mr-2" />
            New Chain
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({templates.length})</TabsTrigger>
          <TabsTrigger value="single">
            Single ({templates.filter((t) => t.template_type === 'single').length})
          </TabsTrigger>
          <TabsTrigger value="chain">
            Chains ({templates.filter((t) => t.template_type === 'chain').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Template Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {tab === 'chain'
            ? 'No chain templates yet. Create one to define multi-session workflows.'
            : 'No templates found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const isChain = template.template_type === 'chain';
            const steps = template.chain_config?.steps || [];

            return (
              <Card
                key={template.id}
                className="group hover:border-amber-200 dark:hover:border-amber-800 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base truncate">{template.title}</CardTitle>
                        <Badge
                          variant={isChain ? 'default' : 'secondary'}
                          className={isChain ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100' : ''}
                        >
                          {isChain ? 'Chain' : 'Single'}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-xs">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Chain step preview */}
                  {isChain && steps.length > 0 && (
                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                      {steps.map((step, i) => (
                        <span key={step.id} className="flex items-center gap-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">
                            {step.title || `Step ${i + 1}`}
                          </span>
                          {i < steps.length - 1 && (
                            <span className="text-amber-400 text-xs">&rarr;</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Single template info */}
                  {!isChain && (
                    <div className="flex items-center gap-2 mb-3">
                      {template.icon && (
                        <span className="text-xs text-muted-foreground">{template.icon}</span>
                      )}
                      {template.facilitation_prompt ? (
                        <Badge variant="outline" className="text-xs">Has prompt</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">No prompt</Badge>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(template.created_at)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          isChain
                            ? openChainEditor(template)
                            : openEditSingle(template)
                        }
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:text-destructive"
                        onClick={() => setDeletingTemplate(template)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Dialogs ────────────────────────────────────── */}

      {/* Create Single Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateSingle}>
            {singleFormFields}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Single Dialog */}
      <Dialog open={!!editingSingle} onOpenChange={(open) => !open && setEditingSingle(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSingle}>
            {singleFormFields}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingSingle(null)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Delete Template</DialogTitle></DialogHeader>
          <p>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deletingTemplate?.title}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
