'use client';

import Link from 'next/link';
import Image from 'next/image';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import Logo from '@/components/ui/logo';
import Intro from '@/components/onboarding/welcome';
import { Button } from '@/components/ui/button';
import { Authenticator } from '@aws-amplify/ui-react';

Amplify.configure(outputs);
const client = generateClient<Schema>();

export default function App() {
  return (
    <>
        <section className="flex flex-row items-center justify-center min-h-screen bg-gray-100">
          <div className="w-1/2 mb-8 mr-8">
            <h2 className="text-3xl font-bold mb-4">Welcome to Harmonica</h2>
            <p className="text-lg mb-6">
              Experience the power of our innovative solution.
            </p>
            <Button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              <Link href="/about">Learn More</Link>
            </Button>
          </div>
          <div className="w-1/2">
            <Image
              src="/get_ideas_from_team.svg"
              alt="Hero Image"
              width={500}
              height={300}
            />
          </div>
        </section>

        <section className="flex flex-row items-center justify-center min-h-screen bg-blue-100">
          <div className="w-1/2 mb-8 mr-8">
            <Image
              src="/get_ideas_from_team.svg"
              alt="Feature Image 1"
              width={500}
              height={300}
            />
          </div>
          <div className="w-1/2">
            <h2 className="text-3xl font-bold mb-4">Feature 1</h2>
            <p className="text-lg">
              Discover our cutting-edge feature that will revolutionize your
              workflow.
            </p>
          </div>
        </section>

        <section className="flex flex-row items-center justify-center min-h-screen bg-green-100">
          <div className="w-1/2 mb-8 mr-8">
            <h2 className="text-3xl font-bold mb-4">Feature 2</h2>
            <p className="text-lg">
              Explore our powerful feature that will take your productivity to
              new heights.
            </p>
          </div>
          <div className="w-1/2">
            <Image
              src="/get_ideas_from_team.svg"
              alt="Feature Image 2"
              width={500}
              height={300}
            />
          </div>
        </section>
      </>
  );
}
