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
import {
  FileText,
  Trash2,
  ExternalLink,
  Users,
  MessageSquare,
  Hash,
  Plus,
  Upload,
  Tag,
  Loader2,
} from 'lucide-react';
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
import ImportResponsesModal from './ImportResponsesModal';
import { Badge } from '@/components/ui/badge';

interface SessionFile {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  file_purpose?: 'TRANSCRIPT' | 'KNOWLEDGE';
  metadata?: {
    num_participants?: number;
    key_topics?: string[];
    num_messages?: number;
  };
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { toast } = useToast();
  const [fileToDelete, setFileToDelete] = useState<SessionFile | null>(null);

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
      const response = await fetch(
        `/api/sessions/${sessionId}/files?fileId=${fileId}`,
        {
          method: 'DELETE',
        },
      );
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
    return fileType;
  };

  const renderFileActions = (file: SessionFile) => (
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
              Are you sure you want to delete <b>{fileToDelete?.file_name}</b>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileToDelete(null)}>
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
  );

  const renderTranscriptFile = (file: SessionFile) => (
    <div key={file.id} className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <span className="mr-2">{getFileIcon(file.file_type)}</span>
          <span className="font-medium">{file.file_name}</span>
        </div>
        {renderFileActions(file)}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Users className="h-4 w-4 mr-2" />
            <span>{file.metadata?.num_participants || 0} participants</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <MessageSquare className="h-4 w-4 mr-2" />
            <span>{file.metadata?.num_messages || 0} messages</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Hash className="h-4 w-4 mr-2" />
            <span>{file.metadata?.key_topics?.length || 0} topics</span>
          </div>
        </div>

        {file.metadata?.key_topics && file.metadata.key_topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {file.metadata.key_topics.map((topic, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs font-normal text-muted-foreground bg-transparent hover:bg-muted/50"
              >
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderKnowledgeFile = (file: SessionFile) => (
    <TableRow key={file.id}>
      <TableCell className="font-medium">
        <div className="flex items-center">
          <span className="mr-2">{getFileIcon(file.file_type)}</span>
          <span className="truncate max-w-[200px]">{file.file_name}</span>
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
      <TableCell className="text-right">{renderFileActions(file)}</TableCell>
    </TableRow>
  );

  const transcriptFiles = files.filter(
    (file) => file.file_purpose === 'TRANSCRIPT',
  );
  const knowledgeFiles = files.filter(
    (file) => file.file_purpose === 'KNOWLEDGE' || !file.file_purpose,
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-24 h-24 mb-6 text-muted-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-6" />
          <path d="M8 18v-1" />
          <path d="M16 18v-3" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">No files uploaded yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Upload transcripts or knowledge files to keep track of important
        information and insights from your session.
      </p>
      <Button onClick={() => setIsImportModalOpen(true)} size="lg">
        <Upload className="mr-2 h-5 w-5" />
        Upload Files
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl flex items-center">
            Session Files
          </CardTitle>
          <CardDescription>Files uploaded for this session</CardDescription>
        </div>
        <Button onClick={() => setIsImportModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add File
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center mb-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse hidden md:block" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse hidden md:block" />
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse hidden md:block" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : files.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Files
                </p>
                <p className="text-2xl font-bold">{files.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Size
                </p>
                <p className="text-2xl font-bold">
                  {formatFileSize(
                    files.reduce((acc, file) => acc + file.file_size, 0),
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Transcripts
                </p>
                <p className="text-2xl font-bold">{transcriptFiles.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Knowledge Files
                </p>
                <p className="text-2xl font-bold">{knowledgeFiles.length}</p>
              </div>
            </div>

            {transcriptFiles.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Transcripts</h3>
                {transcriptFiles.map(renderTranscriptFile)}
              </div>
            )}

            {knowledgeFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Knowledge Files</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Type
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Size
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Uploaded
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knowledgeFiles.map(renderKnowledgeFile)}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>

      <ImportResponsesModal
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        sessionId={sessionId}
        onFileUploaded={loadFiles}
      />
    </Card>
  );
}
