'use client'

import { useState } from 'react'
import { useSession, signOut } from "next-auth/react"
import Login from "@/components/login"
import { Button } from "components//ui/button"

export default function UserStatus() {
  const { data: session } = useSession()
  const [showAuth, setShowAuth] = useState(false)

  if (session) {
    return (
      <>
        Signed in as {session.user.email} <br/>
        <Button onClick={() => signOut()}>Sign out</Button>
      </>
    )
  }

  return (
    <>
      <Button onClick={() => setShowAuth(true)}>Sign in</Button>
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg">
            <Login />
            <Button onClick={() => setShowAuth(false)}>Close</Button>
          </div>
        </div>
      )}
    </>
  )
}