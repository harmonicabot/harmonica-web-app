import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { HostSession, UserSession } from "@/lib/schema"
import { intlFormatDistance } from "date-fns"

export default function SessionSummaryCard({
  hostData,
  stats,
  userData,
  id
}: {
  hostData: HostSession
  stats: any
  userData: UserSession[]
  id: string
}) {
  const totalMessages = Object.values(stats).reduce((acc: number, curr: any) => 
    acc + curr.num_messages, 0)
  
  return (
    <Link href={`/ens/${id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span className="text-xl truncate">{hostData.topic}</span>
            <Badge variant={hostData.active ? "default" : "secondary"}>
              {hostData.active ? "Active" : "Completed"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Participants</dt>
              <dd className="text-2xl font-semibold">{userData.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Messages</dt>
              <dd className="text-2xl font-semibold">{totalMessages}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Started</dt>
              <dd className="text-sm">
              {Date.now() - new Date(hostData.start_time).getTime() > 7 * 24 * 60 * 60 * 1000 
                ? new Date(hostData.start_time).toLocaleDateString()
                : intlFormatDistance(new Date(hostData.start_time), new Date())}
              </dd>
            </div>
            {hostData.goal && (
              <div className="col-span-2">
                <dt className="text-sm text-gray-500">Objective</dt>
                <dd className="text-sm line-clamp-3">{hostData.goal}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </Link>
  )
}
