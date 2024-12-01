import { decryptId } from '@/lib/encryptionUtils'
import { routeMetadata } from './metadata'
import { NextResponse } from 'next/server'
import * as db from '@/lib/db'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/metadata', '')
  let title = 'Harmonica Dashboard';
  // Handle dynamic session routes
  if (path.startsWith('/sessions/')) {
    const sessionId = path.split('/')[2]
    const decryptedId = decryptId(sessionId)
    const hostData = await db.getHostSessionById(decryptedId)
    
    title = hostData.topic;
  }
  
  const metadata = routeMetadata[path] || routeMetadata['/']
  

  return NextResponse.json({
    ...metadata,
    title,
    openGraph: {
      ...metadata,
      type: 'website',
      url: `${url.host}${path}`
    }
  })
}
