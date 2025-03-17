'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';

interface InviteUsersProps {
  workspaceId: string;
}

export default function InviteUsers({ workspaceId }: InviteUsersProps) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState('viewer');
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    // TODO: Implement invite functionality
    const emailList = emails.split(',').map(email => email.trim());
    console.log('Inviting users:', { emailList, role, message, workspaceId });
    
    // Reset form and close dialog
    setEmails('');
    setRole('viewer');
    setMessage('');
    setIsOpen(false);
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
            />
            <p className="text-sm text-gray-500">
              Separate multiple email addresses with commas
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Access Level</Label>
            <Select value={role} onValueChange={setRole}>
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            className="mr-2" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Send Invites</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 