import { signIn, providerMap } from '@/lib/auth';
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { Button } from './ui/button';

export function LoginButtons() {
  
  return (
    <>
      <div className='flex items-center justify-center'>
      {Object.values(providerMap).map((provider) =>
        (
          <form
            action={async () => {
              "use server"
              try {
                await signIn(provider.id)
              } catch (error) {
                // Signin can fail for a number of reasons, such as the user
                // not existing, or the user not having the correct role.
                // In some cases, you may want to redirect to a custom error
                if (error instanceof AuthError) {
                  return redirect(`/error?type=${error.type}`)
                }
 
                // Otherwise if a redirects happens Next.js can handle it
                // so you can just re-thrown the error and let Next.js handle it.
                // Docs:
                // https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
                throw error
              }
            }}
          >
            <Button type="submit" className='m-4'>
              <span>Sign in with {provider.name}</span>
            </Button>
          </form>
        )
        )}
        </div>
    </>
  );
}
