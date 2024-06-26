'use client';

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css'
import Intro from '@/components/onboarding/welcome';
import { useUser } from '@/context/UserContext';
import Home from './home/page';

Amplify.configure(outputs);
const client = generateClient<Schema>();

export default function App() {
  const { user } = useUser();
  console.log("User: ", user);
  return (
    <div>
      {user?.newUser ? <Intro goToAfter={"/home"}/> : <Home />}
    </div>
  );
}
