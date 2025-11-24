'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail, X } from 'lucide-react';
import { cn } from '@/lib/clientUtils';
import Image from 'next/image';

const DONATE_URL =
  'https://opencollective.com/harmonica/donate?interval=oneTime&amount=20&contributeAs=me';
const STORAGE_KEY = 'harmonica.globalDonationToast.dismissed';

export default function DonationToast() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-[80] w-[320px] rounded-2xl border border-muted bg-white/95 p-5 shadow-2xl backdrop-blur',
        'animate-in fade-in-0 slide-in-from-bottom-4',
      )}
      role="alert"
      aria-live="polite"
    >
      <button
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted/30"
        onClick={handleDismiss}
        aria-label="Close donation notice"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <Image
            src="/art-pfp.jpeg"
            alt="Artem profile photo"
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
          <p className="text-xs text-muted-foreground">Artem from Harmonica</p>  
          </div>
          <p className="text-sm font-semibold text-foreground">Consider donating to Harmonica</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Hi there, Harmonica is currently free to use, but donations help us keep building the features you&apos;re trying today.
        If you find value (or see the potential), your support keeps us shipping.
        <br />
        <br />
        Thank you,
        <br />
        Artem
      </p>
      <div className="mt-4 flex gap-2">
        <Link href={DONATE_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm">Donate</Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          Maybe later
        </Button>
      </div>
    </div>
  );
}

