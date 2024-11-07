import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { start } from "repl";

interface SessionResultStatusProps {
  finalReportSent: boolean;
  startTime: Date | string;
  numSessions: number;
  completedSessions: number;
}

export default function SessionResultStatus({
  finalReportSent,
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
          {finalReportSent ? (
            <Badge variant="outline" className="text-purple-900 bg-purple-100 mb-3">
              Finished
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-lime-100 text-lime-900 mb-3"
            >
              Active
            </Badge>
          )}
          <p> Started on
            <span className="font-medium"> {startTimeString}</span>
          </p>
        </CardContent>
      </Card>
      <Card className="flex-grow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-md">Participants</CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p><span className="font-medium">{numSessions}</span> <span className="text-yellow-800">Started</span></p>
          <p><span className="font-medium">{completedSessions}</span> <span className="text-lime-800">Completed</span></p>
        </CardContent>
      </Card>
    </div>
  );
}