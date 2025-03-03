import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function DonateBanner() {
  return (
    <div className="container mx-auto mb-6 px-0">
      <div className="border border-gray-200 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-8">
          <div className="flex flex-col items-center md:items-start space-y-4 px-4 md:px-8">
            <h2 className="text-2xl font-semibold">
              Support us in the current Giveth QF Round!
            </h2>
            <p className="text-base text-gray-600 text-center md:text-left">
              Harmonica is a free open-source tool for collective sensemaking.
              From now until 14th February, you can support our mission to
              increase alignment in communities.
            </p>
            <p className="text-base text-gray-600 text-center md:text-left">
              Every dollar you give will affect how much we'll get from the
              $100,000 matching pool, based on the quadratic funding mechanism.
              All the money we receive from this round will be spent on
              developing the critical functionality of our product.
            </p>
            <Link
              href="https://giveth.io/project/harmonica-ai-agent-for-multiplayer-sensemaking"
              target="_blank"
            >
              <Button variant="outline" className="border-2">
                Support Harmonica
              </Button>
            </Link>
          </div>
          <div className="relative w-full h-[300px] md:h-[280px] flex items-center justify-center">
            <Image
              src="/dashboard_banner.png"
              alt="Giveth Round is Live!"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
