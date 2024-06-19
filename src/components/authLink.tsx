import Link from 'next/link';
import { signOut } from 'aws-amplify/auth';
import { getCurrentUser } from "aws-amplify/auth";
  
export default async function AuthLink() {

  let username = undefined
  // const { username, userId, signInDetails } = await getCurrentUser();

  const loggedInOrOut = () => {
    switch (username) {
      case undefined:
        return (
          <>
            <Link
              href="/auth"
              className="hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign In
            </Link>
          </>
        );
      default:
        return (
          <>
            <p>Hello {username}</p>
            <button onClick={signOut}>Sign Out</button>
          </>
        );
    }
  }


  return <>{loggedInOrOut()}</>;
}
