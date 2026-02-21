'use client';

import { useState, useEffect } from 'react';
import { X, Plug, Copy, Check, LoaderCircle, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'harmonica_connect_ai_dismissed';

interface ConnectAIBannerProps {
  hasApiKeys: boolean;
}

const getInstallCommand = (key: string) =>
  `claude mcp add-json harmonica '{"command":"npx","args":["-y","harmonica-mcp"],"env":{"HARMONICA_API_KEY":"${key}"}}'`;

export default function ConnectAIBanner({ hasApiKeys }: ConnectAIBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(STORAGE_KEY));
  }, []);

  if (hasApiKeys || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'MCP Server' }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.key);
      }
    } catch (e) {
      console.error('Failed to generate API key:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(getInstallCommand(apiKey));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full border rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/60 border-amber-200/50 mb-6 overflow-hidden"
    >
      {/* Header row */}
      <div className="py-4 px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 h-9 w-9 rounded-full bg-amber-100/80 flex items-center justify-center">
            <Plug className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-950">
              Connect your AI tools
            </p>
            <p className="text-xs text-amber-800/60">
              Use Harmonica from Claude Code, Cursor, or any MCP-compatible agent.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!apiKey && (
            <Button
              size="sm"
              className="bg-amber-900 hover:bg-amber-800 text-white"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Get install command'
              )}
            </Button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-amber-100/60 rounded-full transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4 text-amber-700/60" />
          </button>
        </div>
      </div>

      {/* Expanded install command */}
      <AnimatePresence>
        {apiKey && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="px-5 pb-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-amber-800/60" />
                <p className="text-xs font-medium text-amber-900/80">
                  Run this in your terminal to connect Harmonica to Claude Code:
                </p>
              </div>
              <div className="relative group">
                <pre className="text-[13px] bg-zinc-900 text-amber-100/90 pl-4 pr-12 py-3.5 rounded-lg font-mono break-all whitespace-pre-wrap select-all leading-relaxed tracking-tight">
                  {getInstallCommand(apiKey)}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2.5 right-2.5 h-7 px-2 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-amber-800/50">
                This created an API key named &ldquo;MCP Server&rdquo; in your account. Manage keys in Settings.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
