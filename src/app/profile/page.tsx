'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoaderCircle } from 'lucide-react';
import { fetchUserData, deleteUserData, deleteUserAccount } from './actions';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const { user, error: userError, isLoading: userLoading } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [accountDeleteLoading, setAccountDeleteLoading] =
    useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    if (user && !userLoading) {
      loadUserData();
    }
  }, [user, userLoading]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const data = await fetchUserData();
      setUserData(data);
    } catch (error) {
      setMessage('An error occurred while fetching user data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      if (!userData && !loading) {
        await loadUserData();
      }

      // Remove permissions & add export date
      const exportData = {
        ...userData,
        permissions: undefined, // We don't want/need to export those I think
        exportDate: new Date().toISOString(),
      };

      // Create a Blob from the data
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `harmonica-user-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage('Data exported successfully');
    } catch (error) {
      setMessage('An error occurred while exporting user data');
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
        setMessage('All user data has been deleted successfully');
      } else {
        setMessage(result.message || 'Failed to delete user data');
      }
    } catch (error) {
      setMessage('An error occurred while deleting user data');
      console.error(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'WARNING: Are you absolutely sure you want to delete your entire account? This will permanently remove your account and all associated data. This action CANNOT be undone.'
      )
    ) {
      return;
    }

    // Double confirmation for account deletion
    if (
      !confirm(
        'Please confirm once more that you want to delete your account. You will be logged out immediately.'
      )
    ) {
      return;
    }

    setAccountDeleteLoading(true);
    try {
      const result = await deleteUserAccount();
      if (result.success) {
        setMessage(
          'Your account has been deleted successfully. Redirecting to logout...'
        );
        // Redirect to logout after a short delay
        setTimeout(() => {
          router.push('/api/auth/logout');
        }, 2000);
      } else {
        setMessage(result.message || 'Failed to delete account');
      }
    } catch (error) {
      setMessage('An error occurred while deleting your account');
      console.error(error);
    } finally {
      setAccountDeleteLoading(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoaderCircle className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user data...</span>
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
        <p>Please sign in to view your profile and data.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

      {message && (
        <div
          className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6"
          role="alert"
        >
          <p>{message}</p>
        </div>
      )}

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="account">Account Information</TabsTrigger>
          <TabsTrigger value="data">Your Data</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent>
              {userData ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Username:</p>
                    <p>{userData.name || user.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Email:</p>
                    <p>{userData.user.email || user.email || 'Not provided'}</p>
                  </div>
                </div>
              ) : (
                <p>Loading user information...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Your Data</CardTitle>
              <CardDescription>
                Overview of your data stored in our system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Participation</h3>
                    <p>
                      You have participated in {userData.sessions?.length || 0}{' '}
                      sessions and sent {userData.messages?.length || 0} messages.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Owned Sessions</h3>
                    <p>
                      You have ownership of {userData.hostSessions?.length || 0}{' '}
                      session{userData.hostSessions?.length === 1 ? '' : 's'}.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Workspaces</h3>
                    <p>
                      You have ownership of {userData.workspaces?.length || 0}{' '}
                      workspace{userData.workspaces?.length === 1 ? '' : 's'}.
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <div className="mt-4 space-y-6">
                      <div>
                        <p className="mb-2 text-sm text-gray-600">
                          You can export all your personal data in a
                          machine-readable format.
                        </p>
                        <Button
                          onClick={handleExportData}
                          disabled={exportLoading}
                          size="sm"
                        >
                          {exportLoading ? (
                            <>
                              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                              Exporting...
                            </>
                          ) : (
                            'Export My Data'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 border-t pt-6 w-full">
                    <h3 className="text-lg font-medium text-red-600 mb-2">
                      Danger Zone
                    </h3>

                    <div>
                      <p className="mb-2 text-sm text-gray-600">
                        You can request the deletion of all your personal data
                        from our systems. (This includes all your messages, and all the sessions and workspaces where you are the sole owner)
                      </p>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteData}
                        disabled={deleteLoading}
                        size="sm"
                      >
                        {deleteLoading ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete All My Data'
                        )}
                      </Button>
                    </div>
                    <div className="mt-6">
                      <p className="mb-2 text-sm text-gray-600">
                        Deleting your account will permanently remove all your
                        data and access to Harmonica services.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={accountDeleteLoading}
                      >
                        {accountDeleteLoading ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Deleting Account...
                          </>
                        ) : (
                          'Delete My Account'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p>No data available.</p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <p className="text-sm text-gray-500">
                For any additional GDPR-related requests or questions, please
                contact our Data Protection Officer at privacy@harmonica.chat
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
