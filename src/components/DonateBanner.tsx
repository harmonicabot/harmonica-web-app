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
              Support Harmonica by donating in Crypto or Traditional Currency!
            </h2>
            <p className="text-base text-gray-600 text-center md:text-left">
              Harmonica is a free, open-source tool for collective sense-making,
              helping communities align before making decisions.
            </p>
            <p className="text-base text-gray-600 text-center md:text-left">
              You can support our mission by donating in{' '}
              <span className="text-black font-semibold">
                crypto or traditional currency
              </span>
              . Every contribution helps us develop critical functionality and
              expand access to more changemakers.
            </p>

            <div className="flex gap-4">
              <Link href="https://opencollective.com/harmonica" target="_blank">
                <Button variant="outline" className="border-2">
                  Normal currency
                </Button>
              </Link>
              <Link
                href="https://giveth.io/project/harmonica-ai-agent-for-multiplayer-sensemaking"
                target="_blank"
              >
                <Button variant="outline" className="border-2">
                  Cryptocurrency
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative w-full h-[300px] md:h-[280px] flex items-center justify-center">
            <Image
              src="/dashboard_banner.jpg"
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
