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
          {hostData.goal && (
            <div>
              <dt className="text-sm text-gray-500">Objective</dt>
              <p className="text-sm mt-2 line-clamp-2">
                {hostData.goal}
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Participants</dt>
              <dd className="text-2xl font-semibold">{userData.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Started</dt>
              <dd className="text-sm">
                {Date.now() - new Date(hostData.start_time).getTime() > 7 * 24 * 60 * 60 * 1000 
                  ? new Date(hostData.start_time).toLocaleDateString()
                  : intlFormatDistance(new Date(hostData.start_time), new Date())}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  )
}