import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { SessionStatus } from "@/lib/clientUtils";

interface SessionResultStatusProps {
  status: SessionStatus;
  startTime: Date | string;
  numSessions: number;
  completedSessions: number;
}

export default function SessionResultStatus({
  status,
  startTime,
  numSessions,
  completedSessions
}: SessionResultStatusProps) {
  // In the past, some sessions did not have a start time. Just set 'a while ago' for those.
  const startTimeString = !startTime ? 'a while ago' : format(new Date(startTime), ' dd MMM yyyy');
  
  return (
    <div className="flex flex-grow gap-4">
      <Card className="flex-grow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-md">Status</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className={
            status === SessionStatus.ACTIVE ? "bg-lime-100 text-lime-900 mb-3"
              : status === SessionStatus.DRAFT ? "text-purple-900 bg-purple-100 mb-3"
                : "text-gray-500 bg-gray-100 mb-3"}>
              {status}
            </Badge>
          <p> Started on
            <span className="font-medium"> {startTimeString}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}