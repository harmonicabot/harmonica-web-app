import { Metadata } from "next";
import StandaloneChat from "./StandaloneChat";
import * as db from '@/lib/db';

export async function generateMetadata(
  { searchParams }: { searchParams: { s: string } } ,
): Promise<Metadata> {
  const { s: sessionId } = searchParams;
  const hostData = await db.getHostSessionById(sessionId);
  
  return {
    title: {
      absolute: `${hostData.topic} | powered by Harmonica`,
    },
    description: `Ready to share your perspective? Join this AI-facilitated conversation to help shape decisions and move your group forward together.`,
    openGraph: {
      description:`Join an AI-facilitated conversation to share your thoughts and help shape collective decisions. Contribute meaningfully to your group's goals through guided dialogue.`,
    },
  };
}

export default function Chat() {
  return <StandaloneChat/>
} 