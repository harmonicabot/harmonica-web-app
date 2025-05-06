'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from 'hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface SessionFile {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export default function SessionFilesTable({
  sessionId,
  refreshTrigger,
}: {
  sessionId: string;
  refreshTrigger?: number;
}) {
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [fileToDelete, setFileToDelete] = useState<SessionFile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/files`);
      if (!response.ok) throw new Error('Failed to fetch session files');
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      toast({
        title: 'Error loading files',
        description: 'Could not load session files',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [sessionId, refreshTrigger]);

  const handleDeleteFile = async (fileId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/files?fileId=${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete file');
      toast({
        title: 'File deleted',
        description: 'The file has been deleted successfully',
      });
      loadFiles(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Error deleting file',
        description: 'Could not delete the file',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('json')) return '📋';
    if (fileType.includes('text')) return '📝';
    return '📎';
  };

  const getFriendlyFileType = (fileType: string) => {
    if (fileType === 'application/pdf') return 'PDF';
    if (fileType === 'application/json') return 'JSON';
    if (fileType === 'text/plain') return 'Text';
    // Add more mappings as needed
    return fileType;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Session Files
        </CardTitle>
        <CardDescription>Files uploaded for this session</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No files have been uploaded for this session
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Size</TableHead>
                <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <span className="mr-2">
                        {getFileIcon(file.file_type)}
                      </span>
                      <span className="truncate max-w-[200px]">
                        {file.file_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getFriendlyFileType(file.file_type)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatFileSize(file.file_size)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(file.uploaded_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.file_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setFileToDelete(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete file?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <b>{fileToDelete?.file_name}</b>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => setFileToDelete(null)}
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                if (fileToDelete) {
                                  await handleDeleteFile(fileToDelete.id);
                                  setFileToDelete(null);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
