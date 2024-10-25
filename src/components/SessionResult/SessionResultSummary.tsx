import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { HRMarkdown } from '@/components/HRMarkdown';

interface SessionResultSummaryProps {
  summary: string;
  sessionData?: any;
}

export default function SessionResultSummary({
  summary,
}: SessionResultSummaryProps) {

  return (
    <>
      <Card className="h-full">
        <CardContent>
          {summary && <HRMarkdown text={summary} />}
        </CardContent>
      </Card>{' '}
    </>
  );
}
