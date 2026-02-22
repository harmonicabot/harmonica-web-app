'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Plus, Copy, Trash2, Check, LoaderCircle, Terminal } from 'lucide-react';
import { format } from 'date-fns';

interface ApiKey {
  id: string;
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/api-keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setKeys((prev) => [
          {
            id: data.id,
            name: data.name,
            key_prefix: data.key_prefix,
            created_at: data.created_at,
            last_used_at: null,
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInstallCommand = (key: string) =>
    `claude mcp add-json harmonica '{"command":"npx","args":["-y","harmonica-mcp"],"env":{"HARMONICA_API_KEY":"${key}"}}'`;

  const handleCopyInstall = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(getInstallCommand(newKey));
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setNewKey(null);
    setCreateName('');
    setCopied(false);
    setCopiedInstall(false);
  };

  const handleRevoke = async () => {
    if (!revoking) return;
    setRevokeLoading(true);
    try {
      const res = await fetch(`/api/v1/api-keys/${revoking}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== revoking));
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    } finally {
      setRevokeLoading(false);
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage keys for programmatic access to the Harmonica API
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-10 w-10 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-1">No API keys yet</p>
              <p className="text-sm text-muted-foreground/70 mb-4">
                Create a key to access sessions, responses, and summaries via
                the API.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">
                      {k.name || (
                        <span className="text-muted-foreground">Unnamed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {k.key_prefix}...
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(k.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.last_used_at
                        ? format(new Date(k.last_used_at), 'MMM d, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setRevoking(k.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MCP Install Instructions — always visible */}
      <Card className="mt-4">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Connect to Claude Code</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Run this in your terminal to add Harmonica as an MCP server. Replace <code className="bg-muted px-1 py-0.5 rounded text-[11px]">&lt;YOUR_API_KEY&gt;</code> with your API key.
          </p>
          <div className="relative group">
            <pre className="text-xs bg-zinc-900 text-zinc-100 px-3 py-3 rounded-md font-mono break-all whitespace-pre-wrap select-all leading-relaxed">
              {getInstallCommand('<YOUR_API_KEY>')}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 h-7 px-2 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
              onClick={async () => {
                await navigator.clipboard.writeText(getInstallCommand('<YOUR_API_KEY>'));
                setCopiedInstall(true);
                setTimeout(() => setCopiedInstall(false), 2000);
              }}
            >
              {copiedInstall ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Works with any MCP-compatible client (Claude Code, Cursor, Windsurf). The full command with your key is shown when you create a new API key.
          </p>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) handleCloseCreate();
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {newKey ? 'Your new API key' : 'Create API Key'}
            </DialogTitle>
            <DialogDescription>
              {newKey
                ? 'Make sure to copy your key now. You won\u2019t be able to see it again.'
                : 'Give your key a name to help you identify it later.'}
            </DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2.5 rounded-md font-mono break-all select-all">
                  {newKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Install command for Claude Code / MCP clients */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Connect to Claude Code</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Run this in your terminal to add Harmonica as an MCP server:
                </p>
                <div className="relative group">
                  <pre className="text-xs bg-zinc-900 text-zinc-100 px-3 py-3 rounded-md font-mono break-all whitespace-pre-wrap select-all leading-relaxed">
                    {getInstallCommand(newKey)}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 h-7 px-2 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
                    onClick={handleCopyInstall}
                  >
                    {copiedInstall ? (
                      <Check className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Store this key securely. It provides access to your Harmonica
                sessions and data.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name (optional)</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. My integration"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newKey ? (
              <Button onClick={handleCloseCreate}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseCreate}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <>
                      <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={!!revoking}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              This key will immediately stop working. Any integrations using it
              will lose access. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeLoading}
            >
              {revokeLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
