'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { LoaderCircle, Check, Mail, KeyRound, Download, Trash2, AlertTriangle } from 'lucide-react';
import {
  fetchUserData,
  updateUserName,
  requestPasswordReset,
  deleteUserData,
  deleteUserAccount,
} from './actions';
import { useRouter, useSearchParams } from 'next/navigation';
import ApiKeysTab from './ApiKeysTab';
import HarmonicaMdTab from './HarmonicaMdTab';

export default function SettingsPage() {
  const { user, error: userError, isLoading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const router = useRouter();

  // Profile editing state
  const [editName, setEditName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Password reset state
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Account action states
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accountDeleteLoading, setAccountDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (user && !userLoading) {
      loadUserData();
    }
  }, [user, userLoading]);

  // Initialize edit name from user data
  useEffect(() => {
    if (userData?.user?.name || user?.name) {
      setEditName(userData?.user?.name || user?.name || '');
    }
  }, [userData, user]);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const data = await fetchUserData();
      setUserData(data);
    } catch (error) {
      showMessage('Failed to load user data', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    // Don't save if unchanged
    const currentName = userData?.user?.name || user?.name || '';
    if (trimmed === currentName) return;

    setNameLoading(true);
    try {
      const result = await updateUserName(trimmed);
      if (result.success) {
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2000);
        // Update local state
        if (userData?.user) {
          setUserData({ ...userData, user: { ...userData.user, name: trimmed } });
        }
      } else {
        showMessage(result.message || 'Failed to update name', 'error');
      }
    } catch (error) {
      showMessage('Failed to update name', 'error');
      console.error(error);
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setPasswordResetLoading(true);
    try {
      const result = await requestPasswordReset();
      if (result.success) {
        setPasswordResetSent(true);
        showMessage('Password reset email sent. Check your inbox.', 'success');
      } else {
        showMessage(result.message || 'Failed to send reset email', 'error');
      }
    } catch (error) {
      showMessage('Failed to send password reset email', 'error');
      console.error(error);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      if (!userData && !loading) {
        await loadUserData();
      }

      const exportData = {
        ...userData,
        permissions: undefined,
        exportDate: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `harmonica-user-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showMessage('Data exported successfully', 'success');
    } catch (error) {
      showMessage('Failed to export data', 'error');
      console.error(error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (
      !confirm(
        'Are you sure you want to delete all your data? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeleteLoading(true);
    try {
      const result = await deleteUserData();
      if (result.success) {
        setUserData(null);
        showMessage('All user data has been deleted', 'success');
      } else {
        showMessage(result.message || 'Failed to delete user data', 'error');
      }
    } catch (error) {
      showMessage('Failed to delete user data', 'error');
      console.error(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setAccountDeleteLoading(true);
    try {
      // Prevent InvitationProcessor from re-creating the user during deletion
      sessionStorage.setItem('account_deleting', 'true');
      const result = await deleteUserAccount();
      if (result.success) {
        showMessage('Account deleted. Redirecting to logout...', 'success');
        setTimeout(() => {
          window.location.href = '/api/auth/logout';
        }, 2000);
      } else {
        sessionStorage.removeItem('account_deleting');
        showMessage(result.message || 'Failed to delete account', 'error');
        setAccountDeleteLoading(false);
      }
    } catch (error) {
      sessionStorage.removeItem('account_deleting');
      showMessage('Failed to delete account', 'error');
      console.error(error);
      setAccountDeleteLoading(false);
    }
  };

  const isEmailPasswordUser = user?.sub?.toString().startsWith('auth0|');
  const loginProvider = isEmailPasswordUser
    ? 'Email & Password'
    : user?.sub?.toString().startsWith('google-oauth2|')
      ? 'Google'
      : user?.sub?.toString().startsWith('github|')
        ? 'GitHub'
        : 'Social login';

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoaderCircle className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Error: {userError.message}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Please sign in to view your settings.</p>
      </div>
    );
  }

  const messageStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      {message && (
        <div
          className={`border rounded-lg px-4 py-3 mb-6 text-sm ${messageStyles[message.type]}`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="harmonica-md">HARMONICA.md</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>
                Your personal information visible to other participants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt="Avatar"
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-medium text-muted-foreground">
                    {(editName || user.name || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{editName || user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Avatar synced from {loginProvider}
                  </p>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <div className="flex gap-2">
                  <Input
                    id="display-name"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setNameSaved(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                    }}
                    placeholder="Your display name"
                    className="max-w-sm"
                    maxLength={255}
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={
                      nameLoading ||
                      !editName.trim() ||
                      editName.trim() === (userData?.user?.name || user?.name || '')
                    }
                    size="sm"
                    variant={nameSaved ? 'outline' : 'default'}
                    className="shrink-0"
                  >
                    {nameLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : nameSaved ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Saved
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is how other participants will see you in sessions.
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{userData?.user?.email || user.email}</p>
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {loginProvider}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Managed by your authentication provider. Cannot be changed here.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Password section — only for email/password users */}
          {isEmailPasswordUser && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Password</CardTitle>
                <CardDescription>
                  Change your account password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  We&apos;ll send a password reset link to your email address.
                </p>
                <Button
                  onClick={handlePasswordReset}
                  disabled={passwordResetLoading || passwordResetSent}
                  variant="outline"
                  size="sm"
                >
                  {passwordResetLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                  ) : passwordResetSent ? (
                    <Mail className="h-4 w-4 mr-2" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  {passwordResetSent ? 'Reset email sent' : 'Send reset email'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── HARMONICA.md Tab ── */}
        <TabsContent value="harmonica-md">
          <HarmonicaMdTab />
        </TabsContent>

        {/* ── Account Tab ── */}
        <TabsContent value="account" className="space-y-6">
          {/* Usage overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage</CardTitle>
              <CardDescription>
                Your activity on Harmonica
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-semibold">{userData.sessions?.length || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sessions joined</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-semibold">{userData.hostSessions?.length || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sessions owned</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-semibold">{userData.workspaces?.length || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Projects</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available.</p>
              )}
            </CardContent>
          </Card>

          {/* Data export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Data</CardTitle>
              <CardDescription>
                Download all your personal data in a machine-readable format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportData}
                disabled={exportLoading}
                variant="outline"
                size="sm"
              >
                {exportLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {exportLoading ? 'Exporting...' : 'Export My Data'}
              </Button>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Delete all data</p>
                  <p className="text-xs text-muted-foreground">
                    Remove all your messages, and sessions/projects where you are the sole owner.
                    Your account will remain active.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDeleteData}
                  disabled={deleteLoading}
                  size="sm"
                  className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {deleteLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {deleteLoading ? 'Deleting...' : 'Delete data'}
                </Button>
              </div>

              <div className="border-t pt-6 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Delete account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all associated data.
                    You will be logged out immediately.
                  </p>
                </div>
                <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
                  setDeleteDialogOpen(open);
                  if (!open) setDeleteConfirmText('');
                }}>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    size="sm"
                    className="shrink-0"
                  >
                    Delete account
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete account</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account ({user?.email}) and all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="delete-confirm" className="text-sm">
                        Type <span className="font-mono font-semibold">DELETE</span> to confirm
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE"
                        disabled={accountDeleteLoading}
                        autoComplete="off"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={accountDeleteLoading}>Cancel</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || accountDeleteLoading}
                      >
                        {accountDeleteLoading ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            Deleting...
                          </>
                        ) : (
                          'Delete account'
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                For GDPR-related requests, contact our Data Protection Officer at{' '}
                <a href="mailto:privacy@harmonica.chat" className="underline">
                  privacy@harmonica.chat
                </a>
              </p>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── API Keys Tab ── */}
        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
