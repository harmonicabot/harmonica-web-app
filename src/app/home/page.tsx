'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="flex justify-center">
        <div className="flex flex-col space-y-8">
          <Link href="/sessions/create" className="w-full">
            <button
              className="bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full"
            >
              Start new session
            </button>
          </Link>
          <Link href='/sessions' className="w-full">
            <button
              className="bg-accent text-gray-800 py-2 px-4 rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 w-full"
            >
              See all sessions
            </button>
          </Link>
          <Link href='/builder' className="w-full">
            <button
              className="bg-accent text-gray-800 py-2 px-4 rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 w-full"
            >
              Build a Template
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
