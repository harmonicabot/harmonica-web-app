'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from '@/components/icons';

interface CanvasInputProps {
  placeholder?: string;
  initialValue?: string;
  onSubmit: (message: string) => void;
  large?: boolean;
}

export default function CanvasInput({
  placeholder = 'Type idea here',
  initialValue = '',
  onSubmit,
  large = false,
}: CanvasInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue && textareaRef.current) {
      setValue(initialValue);
      textareaRef.current.value = initialValue;
    }
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
        setValue('');
        if (textareaRef.current) {
          textareaRef.current.value = '';
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize textarea only for large version
    if (large) {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-foreground tracking-wide uppercase">
        YOU
      </p>
      <form onSubmit={handleSubmit} className="relative">
        {large ? (
          <div className="bg-yellow-100 border border-border p-3.5 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                handleInput(e);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent border-none outline-none resize-none text-lg font-medium placeholder:text-muted-foreground min-h-10 pr-12 pb-12"
              style={{ height: '192px' }}
            />
            <button
              type="submit"
              className="absolute bottom-3.5 right-3.5 bg-yellow-300 hover:bg-yellow-400 w-8 h-10 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send />
            </button>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-border px-1.5 py-1.5 flex items-center justify-between gap-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                handleInput(e);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none px-1.5 resize-none text-lg font-medium placeholder:text-muted-foreground"
              rows={1}
            />
            <button
              type="submit"
              className="bg-yellow-300 hover:bg-yellow-400 w-8 h-10 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

