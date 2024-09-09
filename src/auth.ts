import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

import { getServerSession } from "next-auth"
const authOptions = {
  providers: [GoogleProvider({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }),],
}

export const handler = NextAuth(authOptions)

export async function getSession() {
  return await getServerSession(authOptions)
}