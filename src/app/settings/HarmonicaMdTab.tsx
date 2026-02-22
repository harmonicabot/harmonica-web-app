'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, Check, FileText, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchHarmonicaMd, saveHarmonicaMd } from './actions';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import OnboardingChat from '@/components/OnboardingChat';

const CHAR_LIMIT = 6000;

const SECTIONS = [
  {
    key: 'about',
    title: 'About',
    description: 'Who is your team, organization, or community?',
    placeholder: 'e.g., We are the Product team at Acme Corp (12 people). We build a B2B SaaS tool for supply chain management.',
  },
  {
    key: 'goals',
    title: 'Goals & Strategy',
    description: 'What are you working towards?',
    placeholder: 'e.g., Q1 priorities: reduce churn by 15%, launch self-serve onboarding, hire 2 senior engineers.',
  },
  {
    key: 'participants',
    title: 'Participants',
    description: 'Who typically participates in your sessions?',
    placeholder: 'e.g., Sarah (CEO, strategic vision), Mike (CTO, technical feasibility), Priya (Head of Product, customer insights).',
  },
  {
    key: 'vocabulary',
    title: 'Vocabulary',
    description: 'Domain-specific terminology, acronyms, and jargon.',
    placeholder: 'e.g., ARR = Annual Recurring Revenue. "The monolith" = our legacy backend. NPS = Net Promoter Score.',
  },
  {
    key: 'prior_decisions',
    title: 'Prior Decisions',
    description: 'What has already been decided or explored?',
    placeholder: 'e.g., We decided to use React Native for mobile (Q4 2025). The pricing restructure is final.',
  },
  {
    key: 'facilitation',
    title: 'Facilitation Preferences',
    description: 'How should the AI facilitator behave with your group?',
    placeholder: 'e.g., Be direct, push back on vague answers. We prefer structured outputs (bullet points, action items).',
  },
  {
    key: 'constraints',
    title: 'Constraints',
    description: 'Decision-making processes, approvals, or regulatory requirements.',
    placeholder: 'e.g., Any spend over $5K needs board approval. We\'re SOC2 compliant.',
  },
  {
    key: 'success',
    title: 'Success Patterns',
    description: 'What does a good session outcome look like?',
    placeholder: 'e.g., Good sessions end with clear next steps, explicit disagreements surfaced, and a shareable summary.',
  },
];

type SectionValues = Record<string, string>;

function parseSections(markdown: string): SectionValues {
  const values: SectionValues = {};
  const sectionMap: Record<string, string> = {
    'about': 'about',
    'goals & strategy': 'goals',
    'goals': 'goals',
    'participants': 'participants',
    'vocabulary': 'vocabulary',
    'prior decisions': 'prior_decisions',
    'prior decisions & context': 'prior_decisions',
    'facilitation preferences': 'facilitation',
    'constraints': 'constraints',
    'success patterns': 'success',
  };

  const lines = markdown.split('\n');
  let currentKey = '';

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[1].trim().toLowerCase();
      currentKey = sectionMap[title] || '';
      continue;
    }
    if (currentKey && line.trim() !== '# HARMONICA.md') {
      values[currentKey] = ((values[currentKey] || '') + '\n' + line).trim();
    }
  }

  return values;
}

function assembleSections(values: SectionValues): string {
  const parts = ['# HARMONICA.md', ''];
  for (const section of SECTIONS) {
    const content = values[section.key]?.trim();
    if (content) {
      parts.push(`## ${section.title}`);
      parts.push(content);
      parts.push('');
    }
  }
  return parts.join('\n').trim();
}

export default function HarmonicaMdTab() {
  const [sections, setSections] = useState<SectionValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const totalChars = assembleSections(sections).length;
  const isOverLimit = totalChars > CHAR_LIMIT;

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const content = await fetchHarmonicaMd();
      if (content) {
        setSections(parseSections(content));
        setHasContent(true);
        // Expand sections that have content
        const exp: Record<string, boolean> = {};
        const parsed = parseSections(content);
        for (const s of SECTIONS) {
          if (parsed[s.key]?.trim()) exp[s.key] = true;
        }
        setExpanded(exp);
      } else {
        // Expand first 3 sections for new users
        setExpanded({ about: true, goals: true, participants: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    const content = assembleSections(sections);
    if (isOverLimit) return;

    setSaving(true);
    setError(null);
    try {
      const result = await saveHarmonicaMd(content);
      if (result.success) {
        setSaved(true);
        setHasContent(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.message || 'Failed to save');
      }
    } catch (e) {
      setError('Failed to save');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [sections, isOverLimit]);

  const handleRegenerateComplete = () => {
    setShowRegenerate(false);
    loadContent();
  };

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  HARMONICA.md
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Persistent context about your organization that the AI facilitator uses in every session.
                  Like CLAUDE.md for code — but for group facilitation.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegenerate(true)}
                className="shrink-0"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {hasContent ? 'Regenerate' : 'Generate with AI'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {SECTIONS.map((section) => {
              const isExpanded = expanded[section.key];
              return (
                <div
                  key={section.key}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{section.title}</span>
                      {!isExpanded && sections[section.key]?.trim() && (
                        <span className="ml-2 text-xs text-muted-foreground truncate">
                          — {sections[section.key]?.trim().slice(0, 60)}...
                        </span>
                      )}
                    </div>
                    {sections[section.key]?.trim() && (
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <p className="text-xs text-muted-foreground mb-2">{section.description}</p>
                      <Textarea
                        value={sections[section.key] || ''}
                        onChange={(e) => {
                          setSections(prev => ({ ...prev, [section.key]: e.target.value }));
                          setSaved(false);
                        }}
                        placeholder={section.placeholder}
                        className="min-h-[80px] text-sm resize-y"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className={`text-xs ${isOverLimit ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                {totalChars.toLocaleString()} / {CHAR_LIMIT.toLocaleString()} characters
              </span>
              <Button
                onClick={handleSave}
                disabled={saving || isOverLimit}
                size="sm"
                variant={saved ? 'outline' : 'default'}
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Saved
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showRegenerate} onOpenChange={setShowRegenerate}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <OnboardingChat
            onComplete={handleRegenerateComplete}
            onSkip={() => setShowRegenerate(false)}
            embedded
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
