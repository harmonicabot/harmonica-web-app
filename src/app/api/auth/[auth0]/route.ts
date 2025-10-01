import { initAuth0 } from '@auth0/nextjs-auth0';

const baseURL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.AUTH0_BASE_URL;

const auth0 = initAuth0({ baseURL });

export const { GET, POST } = auth0.handleAuth();