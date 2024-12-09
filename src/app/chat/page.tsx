import { Metadata } from "next";
import StandaloneChat from "./StandaloneChat";
import * as db from '@/lib/db';
import { getGeneratedMetadata } from "app/api/metadata";

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds

export async function generateMetadata(
  { searchParams }: { searchParams: { s: string } } ,
): Promise<Metadata> {
  if (!searchParams.s) {
    throw new Error('No Chat ID provided');
  }
  return await getGeneratedMetadata(`/chat?s=${searchParams.s}`)
}

export default function Chat() {
  return <StandaloneChat/>
}