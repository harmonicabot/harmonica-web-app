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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type FilePurpose = 'TRANSCRIPT' | 'KNOWLEDGE';

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
  const [filePurpose, setFilePurpose] = useState<FilePurpose>('KNOWLEDGE');
  const { toast } = useToast();
  const { user } = useUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
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

      // Read file content for analysis if it's a transcript
      let fileContent: string | undefined;
      if (filePurpose === 'TRANSCRIPT') {
        try {
          fileContent = await readFileContent(file);
        } catch (error) {
          console.error('Error reading file content:', error);
          toast({
            title: 'Warning',
            description: 'Could not read file content for analysis',
            variant: 'destructive',
          });
        }
      }

      // Save file metadata to database
      await saveFileMetadata({
        sessionId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: uploadResult.url,
        uploadedBy: user?.sub,
        filePurpose,
        fileContent,
      });

      toast({
        title: 'File uploaded successfully',
        description: `${file.name} has been uploaded and will be processed.`,
      });

      // Close the modal and reset state
      onOpenChange(false);
      setFile(null);
      setFilePurpose('KNOWLEDGE'); // Reset to default

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

          <div className="space-y-2">
            <Label>File Purpose</Label>
            <RadioGroup
              value={filePurpose}
              onValueChange={(value: string) => setFilePurpose(value as FilePurpose)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="KNOWLEDGE" id="knowledge" />
                <Label htmlFor="knowledge" className="font-normal">
                  Knowledge File
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TRANSCRIPT" id="transcript" />
                <Label htmlFor="transcript" className="font-normal">
                  Transcript
                </Label>
              </div>
            </RadioGroup>
            <p className="text-sm text-muted-foreground">
              {filePurpose === 'TRANSCRIPT'
                ? 'Transcript files will be analyzed for participants, messages, and key topics.'
                : 'Knowledge files are stored as reference materials.'}
            </p>
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
