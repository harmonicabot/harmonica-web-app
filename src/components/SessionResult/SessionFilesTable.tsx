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
import { getSessionFiles, deleteSessionFile } from 'actions/session-files';
import { FileText, Trash2, ExternalLink, FileIcon } from 'lucide-react';
import { useToast } from 'hooks/use-toast';
import { format } from 'date-fns';

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

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const sessionFiles = await getSessionFiles(sessionId);
      setFiles(sessionFiles);
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

  const handleDeleteFile = async (fileId: number, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await deleteSessionFile(fileId, fileUrl);
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
                    {file.file_type.split('/')[1]?.toUpperCase() ||
                      file.file_type}
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteFile(file.id, file.file_url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
