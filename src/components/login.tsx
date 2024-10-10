'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError('Sign-in failed. Check your credentials.');
    }
    // Remove all query parameters from the URL
    router.replace(window.location.pathname);
  }, [searchParams]);

  const handleEmailChange = (e) => {
    if (error.length) setError('');
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    if (error.length) setError('');
    setPassword(e.target.value);
  };

  const handleLoginClick = async () => {
    if (error.length) setError('');
    const result = await signIn('email', {
      email,
      password,
      redirect: true,
    });

    if (result.error) {
      setError('Sign-in failed. Check your credentials.');
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-[400px] lg:grid-cols-2 xl:min-h-[600px] items-center justify-center">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={handleEmailChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                required
              />
              {error && <div className="text-red-500 text-center">{error}</div>}
            </div>
            <Button onClick={handleLoginClick} className="w-full">
              Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
