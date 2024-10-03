import NextAuth, { User } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

import type { Provider } from 'next-auth/providers';

const approvedEmails = [
  'hello@harmonica.chat',
  'felix.kufus@cmi.fi',
  'johanna.poutanen@cmi.fi',
];

const customEmailProvider = CredentialsProvider({
  id: 'email',
  name: 'Email',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  authorize: async (credentials: { email: string; password: string }) => {
    const { email, password } = credentials;
    if (approvedEmails.includes(email) && password === 'password') {
      return { id: email, email } as User;
    }
    return null;
  },
});

const providers: Provider[] = [GitHub, Google, customEmailProvider];

export const providerMap = providers
  .filter((provider) => typeof provider === 'function')
  .map((provider) => {
    const providerData = (provider as () => any)();
    return { id: providerData.id, name: providerData.name };
  });

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: providers,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redirect to the homepage after successful sign-in
      console.log('[i] Redirecting to: ', baseUrl);
      return baseUrl;
    },
    async authorized({ auth }) {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
  },
});
