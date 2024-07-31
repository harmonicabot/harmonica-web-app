'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  console.log("Home page loaded. Env Var loaded: ", process.env.TESTING_VAR);
  return (
    <>
      <div className="flex justify-center">
        <div className="flex flex-col space-y-8">
          <Link href="/sessions/create">
          <button
            className="bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Start new session
            </button>
          </Link>
          <Link href='/sessions'><button
            className="bg-accent text-gray-800 py-2 px-4 rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            See all sessions
          </button>
          </Link>
        </div>
      </div>
    </>
  );
}
