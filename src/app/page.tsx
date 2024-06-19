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
      <Authenticator className="p-8 items-center justify-center h-full">
        {({ signOut, user }) => (
          // This will be shown if the user is signed in
          <div>
            <Intro />
            <button onClick={signOut}>Sign out</button>
          </div>
        )}
      </Authenticator>
    </>
  );
}
