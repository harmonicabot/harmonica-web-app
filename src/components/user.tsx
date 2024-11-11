import { Button } from '@/components/ui/button';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
// import { UsersIcon } from './icons';

export default function User() {
  const { user } = useUser();
  return (
    user && user.sub ? (
      <a href="/api/auth/logout">
        <Button variant="link" type="submit">
          {'Sign Out'}            
        </Button>
      </a>
    ) : (
      <Link href="/">
        <Button variant="link" type="submit">
          {'Sign in'}
        </Button>
      </Link>
    )
  );
}
