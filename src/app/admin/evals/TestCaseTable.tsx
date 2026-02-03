import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/clientUtils';
import type { ExperimentRecord } from './api';

const SCORE_COLUMNS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'question_quality', label: 'Question Quality' },
  { key: 'goal_alignment', label: 'Goal Alignment' },
  { key: 'tone', label: 'Tone' },
  { key: 'conciseness', label: 'Conciseness' },
];

function formatTestName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function scoreCellClass(score: number): string {
  if (score >= 0.8)
    return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20';
  if (score >= 0.6)
    return 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20';
  return 'text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20';
}

interface TestCaseTableProps {
  records: ExperimentRecord[];
}

export function TestCaseTable({ records }: TestCaseTableProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No test case records found.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[140px] font-semibold">
              Test Case
            </TableHead>
            <TableHead className="font-semibold">Topic</TableHead>
            {SCORE_COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className="text-center font-semibold w-[110px]"
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium text-sm">
                {formatTestName(record.input.name)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {record.input.topic}
              </TableCell>
              {SCORE_COLUMNS.map((col) => {
                const score = record.scores?.[col.key];
                const hasScore = score !== undefined && score !== null;
                return (
                  <TableCell
                    key={col.key}
                    className={cn(
                      'text-center tabular-nums text-sm font-medium',
                      hasScore ? scoreCellClass(score) : '',
                    )}
                  >
                    {hasScore ? `${Math.round(score * 100)}%` : '\u2014'}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
