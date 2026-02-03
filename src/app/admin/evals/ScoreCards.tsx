import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/clientUtils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ScoreSummary } from './api';

const SCORE_ORDER = [
  'relevance',
  'question_quality',
  'goal_alignment',
  'tone',
  'conciseness',
];

function formatName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function scoreColor(score: number) {
  if (score >= 0.8)
    return {
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      indicator: 'bg-emerald-500',
    };
  if (score >= 0.6)
    return {
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800/60',
      indicator: 'bg-amber-500',
    };
  return {
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800/60',
    indicator: 'bg-red-500',
  };
}

interface ScoreCardsProps {
  scores: Record<string, ScoreSummary>;
}

export function ScoreCards({ scores }: ScoreCardsProps) {
  const orderedScores = SCORE_ORDER.filter((key) => key in scores).map(
    (key) => scores[key],
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {orderedScores.map((score) => {
        const colors = scoreColor(score.score);
        const pct = Math.round(score.score * 100);

        return (
          <Card
            key={score.name}
            className={cn('border transition-colors', colors.border, colors.bg)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn('h-2 w-2 rounded-full shrink-0', colors.indicator)}
                />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                  {formatName(score.name)}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-3xl font-semibold tabular-nums tracking-tight',
                    colors.text,
                  )}
                >
                  {pct}
                </span>
                <span className="text-sm text-muted-foreground">%</span>
              </div>

              {score.diff !== undefined && score.diff !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {score.diff > 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                  )}
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      score.diff > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {score.diff > 0 ? '+' : ''}
                    {(score.diff * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {(score.diff === undefined || score.diff === 0) && (
                <div className="flex items-center gap-1 mt-2">
                  <Minus className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground/50">
                    no change
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
