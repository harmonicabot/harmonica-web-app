'use client';
import Intro from '@/components/onboarding/welcome';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'


Amplify.configure(outputs);
const client = generateClient<Schema>();


export default function Auth() {
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
    )
}