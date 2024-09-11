import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import type { Provider } from "next-auth/providers"

const providers: Provider[] = [GitHub, Google];
export const providerMap = providers
  .filter((provider) => typeof provider === "function")
  .map((provider) => {
    const providerData = (provider as () => any)();
    return { id: providerData.id, name: providerData.name}
  });

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: providers,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth
    },
  },
});

