'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createAndSendInvitations } from '../../app/actions/invitations';

interface InviteUsersProps {
  workspaceId: string;
}

export default function InviteUsers({ workspaceId }: InviteUsersProps) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState('viewer');
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
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
        resourceId: workspaceId,
        resourceType: 'WORKSPACE',
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
          description: `Successfully sent ${result.results?.successful.length} invitation${result.results?.successful.length! > 1 ? 's' : ''}.`,
        });
      }
      
      if (result.results?.failed.length! > 0) {
        toast({
          title: 'Some Invitations Failed',
          description: `Failed to send invitations to ${result.results?.failed.length} email${result.results?.failed.length! > 1 ? 's' : ''}.`,
          variant: 'destructive',
        });
      }
      
      // Reset form and close dialog
      setEmails('');
      setRole('viewer');
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast({
        title: 'Invitation Error',
        description: error instanceof Error ? error.message : 'Failed to send invitations',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Users
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Email Addresses</Label>
            <Input
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter email addresses (comma-separated)"
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">
              Separate multiple email addresses with commas
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Access Level</Label>
            <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  Viewer (can view and participate)
                </SelectItem>
                <SelectItem value="editor">
                  Editor (can modify workspace)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Viewers can participate in sessions. Editors can also modify the workspace.
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
        <DialogFooter>
          <Button 
            variant="outline" 
            className="mr-2" 
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invites'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 