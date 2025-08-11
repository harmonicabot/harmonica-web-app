'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Settings } from 'lucide-react';
import { Share2, Loader2, X, UserCog, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from 'hooks/use-toast';
import { useUser } from '@auth0/nextjs-auth0/client';
import { createAndSendInvitations } from '../app/actions/invitations';
import {
  getResourcePermissions,
  updateResourcePermission,
  removeResourcePermission,
  cancelInvitation,
} from '../app/actions/permissions';
import { 
  getVisibilitySettings,
  updateVisibilitySettings
} from '../app/actions/visibility-settings';
import { Role, usePermissions, ROLE_HIERARCHY } from '@/lib/permissions';
import { Invitation, PermissionsTable, User, ResultTabsVisibilityConfig } from '@/lib/schema';
import { encryptId } from '@/lib/encryptionUtils';
import { Spinner } from './icons';
import { Description } from '@radix-ui/react-alert-dialog';

interface ShareSettingProps {
  resourceId: string;
  resourceType: PermissionsTable['resource_type'];
  initialIsOpen?: boolean;
  onClose?: () => void;
}

type UserAndRole = User & { role: Role };

export default function ShareSettings({
  resourceId,
  resourceType,
  initialIsOpen,
  onClose
}: ShareSettingProps) {
  const { loading, isPublic, hasRoleHigherThan } = usePermissions(resourceId);

  // Invitation form state
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState('viewer');
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(initialIsOpen || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('invite');
  const isWorkspace = resourceType === 'WORKSPACE';
  const resourceTypeName = resourceType === 'WORKSPACE' ? 'Project' : 'Session';
  const [urlCopied, setUrlCopied] = useState(false);
  const [localIsPublic, setLocalIsPublic] = useState(!loading && isPublic);
  
  // Local visibility state management
  const [localVisibilityConfig, setLocalVisibilityConfig] = useState<ResultTabsVisibilityConfig>(
    { // Defaults:
      showSummary: true,
      showResponses: resourceType === 'SESSION', 
      showCustomInsights: resourceType === 'SESSION',
      showSimScore: false,
      showChat: true,
      allowCustomInsightsEditing: true,
      showSessionRecap: true,
      showKnowledge: resourceType === 'WORKSPACE',
    }
  );
  const [isLoadingVisibility, setIsLoadingVisibility] = useState(false);

  // Permissions and invitations state
  const [userAndRole, setUserAndRole] = useState<UserAndRole[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [cancelingInvitationId, setCancelingInvitationId] = useState<
    string | null
  >(null);

  const { toast } = useToast();
  const { user } = useUser();


  const assignableRoles = Object.keys(ROLE_HIERARCHY)
      .filter((role) => role !== 'none' && hasRoleHigherThan(role as Role))
      .map((role) => role as Role);

  const roleLabelsAndDescription: Record<Role, { label: string; description: string }> = {
    admin: { label: "Admin", description: "can manage everything" },
    owner: { label: "Owner", description: "owns this and can delete it" },
    editor: { label: "Editor", description: `can modify ${resourceTypeName.toLocaleLowerCase()}` },
    viewer: { label: "Viewer", description: "can view and participate" },
    none: { label: "None", description: "Should not be able to access this resource" },
  };

  console.log("Assignable roles: ", assignableRoles)
  
  const handleOpenChange = (open: boolean) => {
    if (!open && onClose) {
      onClose();
    } else {
      setIsOpen(open);
    }
  };

  // Fetch existing permissions and visibility settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      fetchVisibilitySettings();
    }
  }, [isOpen, resourceId]);

  useEffect(() => {
    if (!loading) {
      setLocalIsPublic(isPublic);
    }
  }, [isPublic, loading]);
  
  // Function to fetch visibility settings from the server
  const fetchVisibilitySettings = async () => {
    setIsLoadingVisibility(true);
    try {
      const result = await getVisibilitySettings(resourceId, resourceType);
      
      if (result.success && result.visibilityConfig) {
        setLocalVisibilityConfig(result.visibilityConfig);
      } else {
        throw new Error(result.error || 'Failed to fetch visibility settings');
      }
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load display settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVisibility(false);
    }
  };
  
  // Handler for visibility toggle changes
  const handleVisibilityToggle = async (key: keyof ResultTabsVisibilityConfig) => {
    if (!localVisibilityConfig) return;
    
    // Create updated config
    const updatedConfig = {
      ...localVisibilityConfig,
      [key]: !localVisibilityConfig[key],
    };
    
    // Store original config for rollback
    const originalConfig = { ...localVisibilityConfig };
    
    // Update local state immediately for UI feedback
    setLocalVisibilityConfig(updatedConfig);
    
    try {
      // Save to database using server action
      const result = await updateVisibilitySettings(resourceId, updatedConfig, resourceType);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update display settings');
      }
      
      // Show success toast
      toast({
        title: 'Settings Updated',
        description: 'Display settings have been saved',
      });
    } catch (error) {
      console.error('Error updating visibility settings:', error);
      
      // Revert local state on error
      setLocalVisibilityConfig(originalConfig);
      
      toast({
        title: 'Error',
        description: 'Failed to update display settings',
        variant: 'destructive',
      });
    }
  };
  
  const handlePublicToggle = async (checked: boolean) => {
    // Update local state immediately for UI feedback
    setLocalIsPublic(checked);
    try {
      console.log(
        `Toggling public status for ${resourceType} ${resourceId}: isPublic:`,
        checked
      );
      if (checked) {
        await updateResourcePermission(
          resourceId,
          'public',
          'viewer',
          resourceType
        );
      } else {
        await removeResourcePermission(resourceId, 'public', resourceType);
      }
      toast({
        title: checked ? 'Made Public' : 'Made Private',
        description: checked
          ? `This ${resourceTypeName.toLocaleLowerCase()} is now publicly accessible with the link.`
          : `This ${resourceTypeName.toLocaleLowerCase()} is now private.`,
      });
    } catch (error) {
      console.error('Error toggling public status:', error);
      // Revert local state on error
      setLocalIsPublic(!checked);
      toast({
        title: 'Error',
        description: `Failed to change public access setting.`,
        variant: 'destructive',
      });
    }
  };

  const getPublicUrl = () => {
    const resourcePath = resourceType === 'WORKSPACE' ? 'workspace' : 'sessions';
    const urlId = resourceType === 'WORKSPACE' ? resourceId : encryptId(resourceId);
    return `${window.location.origin}/${resourcePath}/${urlId}?access=public`;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const fetchPermissions = async () => {
    setIsLoadingPermissions(true);
    try {
      const result = await getResourcePermissions(resourceId, resourceType);
      if (result.success) {
        if (result.permissions) {
          // Now we use the actual user data from our database
          const permissions = result.permissions.map((p) => ({
            ...p,
            // Fallback values if data isn't available
            email: p.email || 'Unknown',
            name: p.name || 'User ' + p.id.substring(0, 8),
          }));
          setUserAndRole(permissions);
        }

        if (result.pendingInvitations) {
          setPendingInvitations(result.pendingInvitations);
        }
      } else {
        throw new Error(result.error || 'Failed to load permissions');
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: `Failed to load ${resourceTypeName.toLocaleLowerCase()} members`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleInvite = async () => {
    if (!emails.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter at least one email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAndSendInvitations({
        emails,
        resourceId: resourceId,
        resourceType: resourceType,
        role,
        message: message.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send invitations');
      }

      // Show success/failure message
      if (result.results?.successful.length! > 0) {
        toast({
          title: 'Invitations Sent',
          description: `Successfully sent ${
            result.results?.successful.length
          } invitation${result.results?.successful.length! > 1 ? 's' : ''}.`,
        });
      }

      if (result.results?.failed.length! > 0) {
        toast({
          title: 'Some Invitations Failed',
          description: `Failed to send invitations to ${
            result.results?.failed.length
          } email${result.results?.failed.length! > 1 ? 's' : ''}.`,
          variant: 'destructive',
        });
      }

      // Reset form
      setEmails('');
      setRole('viewer');
      setMessage('');

      // Refresh permissions list if on manage tab
      if (activeTab === 'manage') {
        fetchPermissions();
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast({
        title: 'Invitation Error',
        description:
          error instanceof Error ? error.message : 'Failed to send invitations',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePermission = async (
    userId: string,
    newRole: 'admin' | 'owner' | 'editor' | 'viewer' | 'none'
  ) => {
    setUpdatingUserId(userId);
    try {
      const result = await updateResourcePermission(
        resourceId,
        userId,
        newRole,
        resourceType
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update permission');
      }

      // Update local state optimistically
      setUserAndRole(
        userAndRole.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );

      toast({
        title: 'Permission Updated',
        description: 'User access level has been updated.',
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Update Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update permission',
        variant: 'destructive',
      });
      // Refresh permissions to ensure UI is in sync with server
      fetchPermissions();
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRemovePermission = async (userId: string) => {
    if (user?.sub === userId) {
      toast({
        title: 'Cannot Remove Self',
        description: `You cannot remove your own access to this ${resourceTypeName.toLocaleLowerCase()}.`,
        variant: 'destructive',
      });
      return;
    }

    setUpdatingUserId(userId);
    try {
      const result = await removeResourcePermission(
        resourceId,
        userId,
        resourceType
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove user');
      }

      // Update local state optimistically
      setUserAndRole(userAndRole.filter((p) => p.id !== userId));

      toast({
        title: 'User Removed',
        description: `User has been removed from the ${resourceTypeName.toLocaleLowerCase()}.`,
      });
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: 'Remove Error',
        description:
          error instanceof Error ? error.message : 'Failed to remove user',
        variant: 'destructive',
      });
      // Refresh permissions to ensure UI is in sync with server
      fetchPermissions();
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setCancelingInvitationId(invitationId);
    try {
      const result = await cancelInvitation(invitationId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel invitation');
      }

      // Update local state optimistically
      setPendingInvitations(
        pendingInvitations.filter((inv) => inv.id !== invitationId)
      );

      toast({
        title: 'Invitation Canceled',
        description: 'The invitation has been canceled.',
      });
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast({
        title: 'Cancel Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to cancel invitation',
        variant: 'destructive',
      });
      // Refresh to ensure UI is in sync with server
      fetchPermissions();
    } finally {
      setCancelingInvitationId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {initialIsOpen === undefined && (
        <DialogTrigger asChild>
          <Button>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share {resourceTypeName}</DialogTitle>
        </DialogHeader>

        <div className="border rounded-md p-4 mb-4">
          <div className="flex items-center justify-between space-x-2 mb-2">
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-2 text-blue-500" />
              <label
                htmlFor="public-access"
                className="text-sm font-medium leading-none"
              >
                Public Access
              </label>
            </div>
            {loading
              ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              : <Switch
                id="public-access"
                checked={localIsPublic}
                onCheckedChange={handlePublicToggle}
              />
            }
          </div>
          <p className="text-xs text-gray-500 mb-3">
            When public, anyone with the link can view this{' '}
            {resourceTypeName.toLocaleLowerCase()}.
          </p>

          {localIsPublic && (
            <div className="mt-2 flex items-center space-x-2">
              <Input
                value={getPublicUrl()}
                readOnly
                className="text-xs bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getPublicUrl())}
              >
                {urlCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invite">Invite Users</TabsTrigger>
            <TabsTrigger value="manage">Manage Access</TabsTrigger>
            <TabsTrigger value="visibility">Content Display</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="mt-4">
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="emails">Email Addresses</Label>
                <Input
                  id="emails"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="Enter email addresses (comma-separated)"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">
                  Separate multiple email addresses with commas
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Access Level</Label>
                <Select
                  value={role}
                  onValueChange={setRole}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {roleLabelsAndDescription[role].label} ({roleLabelsAndDescription[role].description})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Viewers can participate in sessions. Editors can also modify
                  the {resourceTypeName.toLocaleLowerCase()}.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Input
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to the invitation"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visibility" className="mt-4">
            <div className="space-y-4">
              {isLoadingVisibility ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <div className="text-sm italic mb-4">Control which content is displayed to visitors:</div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <label
                      htmlFor="summary"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show Summary
                    </label>
                    <Switch
                      id="summary"
                      checked={localVisibilityConfig?.showSummary}
                      onCheckedChange={() => handleVisibilityToggle('showSummary')}
                    />
                  </div>
                  
                  {!isWorkspace && (
                    <div className="flex items-center justify-between space-x-2">
                      <label
                        htmlFor="recap"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Show Session Recap
                      </label>
                      <Switch
                        id="recap"
                        checked={localVisibilityConfig?.showSessionRecap}
                        onCheckedChange={() => handleVisibilityToggle('showSessionRecap')}
                      />
                    </div>
                  )}
                  
                  {!isWorkspace && (
                    <div className="flex items-center justify-between space-x-2">
                      <label
                        htmlFor="responses"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Show Responses
                      </label>
                      <Switch
                        id="responses"
                        checked={localVisibilityConfig?.showResponses}
                        onCheckedChange={() => handleVisibilityToggle('showResponses')}
                      />
                    </div>
                  )}
                  
                  {!isWorkspace && (
                    <div className="flex items-center justify-between space-x-2">
                      <label
                        htmlFor="insights"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Show Custom Insights
                      </label>
                      <Switch
                        id="insights"
                        checked={localVisibilityConfig?.showCustomInsights}
                        onCheckedChange={() => handleVisibilityToggle('showCustomInsights')}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between space-x-2">
                    <label
                      htmlFor="chat"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show Chat
                    </label>
                    <Switch
                      id="chat"
                      checked={localVisibilityConfig?.showChat}
                      onCheckedChange={() => handleVisibilityToggle('showChat')}
                    />
                  </div>
                  
                  {!isWorkspace && (
                    <div className="flex items-center justify-between space-x-2">
                      <label
                        htmlFor="edit-insights"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Allow Editing Insights
                      </label>
                      <Switch
                        id="edit-insights"
                        checked={localVisibilityConfig?.allowCustomInsightsEditing}
                        onCheckedChange={() => handleVisibilityToggle('allowCustomInsightsEditing')}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="manage" className="mt-4">
            <div className="space-y-4">
              {isLoadingPermissions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : userAndRole.length === 0 &&
                pendingInvitations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserCog className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>
                    No users have access to this{' '}
                    {resourceTypeName.toLocaleLowerCase()} yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Existing permissions */}
                  {userAndRole.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">
                        Members
                      </h3>
                      {userAndRole.map((usr) => (
                        <div
                          key={usr.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {usr.name || usr.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasRoleHigherThan(usr.role) &&
                              <Select
                                value={usr.role}
                                onValueChange={(newRole) =>
                                  handleUpdatePermission(usr.id, newRole as any)
                                }
                                disabled={
                                  updatingUserId === usr.id ||
                                  user?.sub === usr.id
                                }
                              >
                                <SelectTrigger className="w-[140px] h-8">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {assignableRoles.map(role => (
                                    <SelectItem key={role} value={role}>{roleLabelsAndDescription[role].label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            }

                            {user?.sub !== usr.id && hasRoleHigherThan(usr.role) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-500"
                                onClick={() => handleRemovePermission(usr.id)}
                                disabled={updatingUserId === usr.id}
                              >
                                {updatingUserId === usr.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending invitations */}
                  {pendingInvitations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">
                        Pending Invitations
                      </h3>
                      {pendingInvitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-100 rounded-md"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {invitation.email}
                            </p>
                            <div className="flex items-center">
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                Pending
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(
                                  invitation.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {invitation.role}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-500"
                              onClick={() =>
                                handleCancelInvitation(invitation.id)
                              }
                              disabled={cancelingInvitationId === invitation.id}
                            >
                              {cancelingInvitationId === invitation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="mt-6 w-full flex justify-between items-center">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="mr-2"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting || isLoadingPermissions}
              >
                Close
              </Button>

              {activeTab === 'invite' && (
                <Button onClick={handleInvite} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invites'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
