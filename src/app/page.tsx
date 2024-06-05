'use client';

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';
import { Amplify } from 'aws-amplify';

Amplify.configure(outputs);
const client = generateClient<Schema>();

import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <>
      <p className="pb-2">Harmonica</p>
      <Button>Say hi</Button>
    </>
  );
}
