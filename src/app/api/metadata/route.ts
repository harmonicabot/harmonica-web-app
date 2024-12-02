import { getGeneratedMetadata } from './metadata'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('Metadata request');
  const metadata = await getGeneratedMetadata(new URL(request.url).pathname);
  console.log('Generated Metadata: ', metadata)
  return NextResponse.json(metadata);
}
