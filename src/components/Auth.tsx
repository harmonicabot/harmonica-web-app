'use client';

import { ReactNode } from "react";
import { Amplify } from "aws-amplify"
import { signIn, SignInInput, signUp, SignUpInput } from "aws-amplify/auth"
import outputs from "@/amplify_outputs.json"
import { useUser } from '@/context/UserContext';
import { Authenticator } from "@aws-amplify/ui-react";
import '@aws-amplify/ui-react/styles.css';

Amplify.configure(outputs)

export default function Auth({ children }: { children: ReactNode }) {
  const { user, setUser: setUser } = useUser();

  const services = {
    async handleSignIn(input: SignInInput) {
      var signInResult = await signIn({ ...input });
      if (signInResult.isSignedIn) {
        setUser({ username: input.username, newUser: false });
      }
      return signInResult;
    },
    // Todo: For some reason this isn't being called.
    async handleSignUp(input: SignUpInput) {
      var signUpResult = await signUp({ ...input });
      console.log("Sign up result: ", signUpResult);
      if (signUpResult.isSignUpComplete) {
        console.log("Sign up complete, setting user. Signup Result: ", signUpResult);
        setUser({ username: input.username, newUser: true });
        console.log("User set: ", user);
      }
      return signUpResult;
    }
  };

  return (
    <Authenticator services={services}>
        {children}
    </Authenticator>
  )
}