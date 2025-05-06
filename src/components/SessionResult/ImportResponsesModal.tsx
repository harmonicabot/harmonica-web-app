'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadFile } from 'actions/upload-file';
import { saveFileMetadata } from 'actions/save-file-metadata';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from 'hooks/use-toast';
import { useUser } from '@auth0/nextjs-auth0/client';

export default function ImportResponsesModal({
  isOpen,
  onOpenChange,
  sessionId,
  onFileUploaded,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onFileUploaded?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.sub) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to upload files',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const uploadResult = await uploadFile(formData);

      // Save file metadata to database
      await saveFileMetadata({
        sessionId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: uploadResult.url,
        uploadedBy: user?.sub,
      });

      toast({
        title: 'File uploaded successfully',
        description: `${file.name} has been uploaded and will be processed.`,
      });

      // Close the modal and reset state
      onOpenChange(false);
      setFile(null);

      // Refresh the file list
      if (onFileUploaded) {
        onFileUploaded();
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Responses</DialogTitle>
          <DialogDescription>
            Upload a file containing participant responses. Supported formats:
            PDF, TXT, JSON.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.txt,.json,application/pdf,text/plain,application/json"
              onChange={handleFileChange}
            />
            <p className="text-sm text-muted-foreground">Max file size: 10MB</p>
          </div>

          {file && (
            <div className="text-sm">
              Selected: <span className="font-medium">{file.name}</span> (
              {(file.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
