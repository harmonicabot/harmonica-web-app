'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { sendApiCall } from '@/lib/utils';
import { ApiAction, ApiTarget, TemplateBuilderData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { MagicWand } from '@/components/icons';
import { Label } from '@/components/ui/label';

export default function ReviewPrompt({ initialPrompt, onComplete }) {
  
  const [prompt, setPrompt] = useState(initialPrompt);
  
  return (
    <div className="flex justify-between">
      <Button
        type="submit"
        onClick={onComplete}
        className="w-full m-2"
      >
      </Button>
    </div>
  );
}
