import { Badge } from '@/components/ui/badge';

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  REPORT_SENT = 'REPORT_SENT',
  // Add other statuses as needed
}

interface SessionResultHeaderProps {
  topic: string;
  status: SessionStatus;
}

export default function SessionResultHeader({ topic, status }: SessionResultHeaderProps) {
  return (
    <div className="flex mb-6 align-items-center">
      <h1 className="text-3xl font-bold">
        {topic || 'Session name'}
      </h1>
      <Badge 
        variant="outline" 
        className={"hidden md:block " +
          (status === SessionStatus.REPORT_SENT 
          ? "text-purple-900 bg-purple-100 ms-4"
          : "bg-lime-100 text-lime-900 ms-4")
        }
      >
        {status === SessionStatus.REPORT_SENT ? 'Finished' : 'Active'}
      </Badge>
    </div>
  );
}