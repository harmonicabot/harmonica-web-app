import { Button } from '@/components/ui/button';
import Link from 'next/link';
// import { UsersIcon } from './icons';

export default function User() {
  return (
    <a href="/api/auth/logout">
      <Button variant="link" type="submit">
        {'Sign Out'}            
      </Button>
    </a>
  );
}
