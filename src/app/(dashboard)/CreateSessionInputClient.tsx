'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { MagicWand } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CreateSessionInputClient() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError('Please enter your session objective.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Generate session name from first 6 words
      const sessionName = value.trim().split(/\s+/).slice(0, 6).join(' ');
      
      // Store in session storage
      const prefillData = {
        goal: value.trim(),
        sessionName: sessionName,
        timestamp: Date.now()
      };
      
      const setSessionStorage = (key: string, storageValue: string) => {
        try {
          sessionStorage.setItem(key, storageValue);
          return true;
        } catch (error) {
          console.warn('Session storage not available:', error);
          return false;
        }
      };
      
      const success = setSessionStorage('createSessionPrefill', JSON.stringify(prefillData));
      
      if (!success) {
        throw new Error('Unable to save your input. Please try again.');
      }
      
      // Navigate to creation flow
      router.push('/create');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-background border rounded-lg p-3 w-full relative min-h-[80px]">
      <div className="relative">
        <Textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to find out?"
          className="min-h-[44px] md:min-h-[44px] flex-1 resize-none bg-background border-0 focus-visible:ring-0 focus-visible:border-0 shadow-none text-base placeholder:text-muted-foreground pr-[120px] rounded-none"
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={loading}
          className="absolute bottom-2 right-2"
          variant="default"
          size="default"
        >
          <MagicWand color="white" />
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </div>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </form>
  );
} 