'use client';

import { useUser } from '@/context/UserContext';
import { Button } from '@aws-amplify/ui-react';
import { signOut, getCurrentUser } from 'aws-amplify/auth';

export default function UserStatus() {
  const { user, setUser } = useUser();

  // We need this at the beginning to init the state.
  // I'm not quite sure why it doesn't have the state from the <Auth> component, but... it doesn't.
  if (!user) {
    getCurrentUser().then(({ username, userId, signInDetails }) => {
      // If this worked, then set a user.
      setUser({ username: signInDetails.loginId, newUser: false });
    }).catch(error => {
      // Otherwise, the user isn't logged in, or we just logged out. Set user to null
      console.error("Error fetching current user: ", error);
      setUser(null);
    });
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
  }

  // If the user is not logged in, then the surrounding Auth component will render the sign in / sign up form.
  // return user ? (
  //   <Button onClick={handleSignOut}>Sign Out</Button>
  // ) : (
    return <></>
  // );
}