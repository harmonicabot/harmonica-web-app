'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ExternalLink, RefreshCw, FlaskConical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScoreCards } from './ScoreCards';
import { TestCaseTable } from './TestCaseTable';
import {
  fetchExperiments,
  fetchExperimentDetail,
  type ExperimentListItem,
  type ExperimentDetail,
} from './api';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EvalsPage() {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<string>('');
  const [detail, setDetail] = useState<ExperimentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExperiments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchExperiments();
      setExperiments(data);
      if (data.length > 0 && !selectedExperiment) {
        setSelectedExperiment(data[0].name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load experiments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (name: string) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const data = await fetchExperimentDetail(name);
      setDetail(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load experiment detail');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadExperiments();
  }, [loadExperiments]);

  useEffect(() => {
    if (selectedExperiment) {
      loadDetail(selectedExperiment);
    }
  }, [selectedExperiment, loadDetail]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Evals
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedExperiment}
            onValueChange={setSelectedExperiment}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select experiment" />
            </SelectTrigger>
            <SelectContent>
              {experiments.map((exp) => (
                <SelectItem key={exp.id} value={exp.name}>
                  <span className="flex items-center gap-2">
                    <span className="truncate">{exp.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(exp.created)}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {detail?.summary.experimentUrl && (
            <a
              href={detail.summary.experimentUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Braintrust
              </Button>
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadExperiments}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {experiments.length === 0 && !error && (
        <div className="text-center py-16">
          <FlaskConical className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No experiments found. Run{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              /run-evals
            </code>{' '}
            to generate your first eval.
          </p>
        </div>
      )}

      {isLoadingDetail && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      )}

      {detail && !isLoadingDetail && (
        <div className="space-y-8">
          {detail.summary.comparisonExperimentName && (
            <p className="text-xs text-muted-foreground">
              Compared against:{' '}
              <span className="font-medium">
                {detail.summary.comparisonExperimentName}
              </span>
            </p>
          )}

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Aggregate Scores
            </h2>
            <ScoreCards scores={detail.summary.scores} />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Per Test Case
            </h2>
            <TestCaseTable records={detail.records} />
          </section>
        </div>
      )}
    </div>
  );
}
