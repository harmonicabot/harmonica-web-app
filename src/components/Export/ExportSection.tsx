import { HostSession, Message, UserSession } from '@/lib/schema';
import * as db from '@/lib/db';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Spinner } from '../icons';
import { Button } from '../ui/button';
import { usePermissions } from '@/lib/permissions';
import { useCustomResponses } from '../SessionResult/ResultTabs/hooks/useCustomResponses';
import { Download } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// ExportSection.tsx
export default function ExportSection({
  hostData,
  userData,
  id,
  className,
  isOpen,
  onOpenChange,
}: {
  hostData: HostSession;
  userData: UserSession[];
  id: string;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { addResponse } = useCustomResponses(id);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [isExportPopupVisible, setIsExportPopupVisible] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const modalVisible = isOpen !== undefined ? isOpen : isExportPopupVisible;
  const setModalVisible = onOpenChange || setIsExportPopupVisible;
  const [onlyIncluded, setOnlyIncluded] = useState(true);
  const [onlyFinished, setOnlyFinished] = useState(true);
  const [noResultsWarning, setNoResultsWarning] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [includeSessionDetails, setIncludeSessionDetails] = useState(true);

  // Initialize selected participants to match include_in_summary when modal opens
  useEffect(() => {
    if (modalVisible) {
      const includedParticipants = userData
        .filter(u => u.include_in_summary)
        .map(u => u.id);
      setSelectedParticipants(new Set(includedParticipants));
    }
  }, [modalVisible]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalVisible) {
        setModalVisible(false);
      }
    };

    if (modalVisible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [modalVisible, setModalVisible]);

  const exportSessionResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportInProgress(true);
    setNoResultsWarning(false);

    let filteredUserData = userData;
    if (selectedParticipants.size > 0) {
      filteredUserData = filteredUserData.filter(u => selectedParticipants.has(u.id));
    }
    if (filteredUserData.length === 0) {
      setNoResultsWarning(true);
      setExportInProgress(false);
      return;
    }

    const allMessages = await db.getAllMessagesForUsersSorted(filteredUserData);
    const exportData = filteredUserData.map((user) => {
      const user_name = user.user_name;
      const introString = `Use it in communication. Don't ask it again. Start the session.\n`;
      const messagesForOneUser = allMessages.filter(
        (msg) => msg.thread_id === user.thread_id,
      );
      if (messagesForOneUser.length === 0) return;
      if (messagesForOneUser[0].content.includes(introString)) {
        messagesForOneUser.shift();
      }
      const chat_text = concatenateMessages(messagesForOneUser);
      return {
        user_name,
        chat_text,
      };
    });

    // Add session details if checkbox is checked
    const finalExportData = includeSessionDetails ? {
      session_details: {
        topic: hostData.topic,
        goal: hostData.goal,
        critical: hostData.critical,
        context: hostData.context,
        start_time: hostData.start_time,
        last_edit: hostData.last_edit,
      },
      participants: exportData
    } : exportData;

    exportAndDownload(
      new Blob([JSON.stringify(finalExportData, null, 2)], {
        type: 'application/json',
      }),
      document.createElement('a'),
      `Harmonica_${hostData.topic ?? id}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
    );
    setExportInProgress(false);
    setModalVisible(false);
  };

  const exportAllData = async () => {
    const allMessages = await db.getAllMessagesForUsersSorted(userData);
    const exportData = userData.map((user) => {
      const user_name = user.user_name;
      const introString = `Use it in communication. Don't ask it again. Start the session.\n`;
      const messagesForOneUser = allMessages.filter(
        (msg) => msg.thread_id === user.thread_id,
      );
      if (messagesForOneUser.length === 0) return;
      if (messagesForOneUser[0].content.includes(introString)) {
        messagesForOneUser.shift();
      }
      const chat_text = concatenateMessages(messagesForOneUser);
      return {
        user_name,
        chat_text,
      };
    });

    // Add session details if checkbox is checked
    const finalExportData = includeSessionDetails ? {
      session_details: {
        topic: hostData.topic,
        goal: hostData.goal,
        critical: hostData.critical,
        context: hostData.context,
        start_time: hostData.start_time,
        last_edit: hostData.last_edit,
      },
      participants: exportData
    } : exportData;

    exportAndDownload(
      new Blob([JSON.stringify(finalExportData, null, 2)], {
        type: 'application/json',
      }),
      document.createElement('a'),
      `Harmonica_${hostData.topic ?? id}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
    );
    setExportInProgress(false);
    setModalVisible(false);
  };

  const handleShowExportPopup = () => {
    setModalVisible(true);
  };

  const handleCloseExportPopup = () => {
    setModalVisible(false);
  };

  const handleSelectAll = () => {
    if (selectedParticipants.size === userData.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(userData.map(u => u.id)));
    }
  };

  const handleSelectAllClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelectAll();
  };

  const handleSelectParticipant = (participantId: string) => {
    const newSelected = new Set(selectedParticipants);
    if (newSelected.has(participantId)) {
      newSelected.delete(participantId);
    } else {
      newSelected.add(participantId);
    }
    setSelectedParticipants(newSelected);
  };

  function concatenateMessages(messagesFromOneUser: Message[]) {
    messagesFromOneUser.sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
    );
    return messagesFromOneUser
      .map((message) => `${message.role} : ${message.content}`)
      .join('\n');
  }

  function exportAndDownload(
    blob: Blob,
    link: HTMLAnchorElement,
    filename: string,
  ) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const { hasMinimumRole, loading } = usePermissions(id);

  return (
    <>
      <Button className={className} onClick={handleShowExportPopup}>
        Export Session Details
      </Button>
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle>Export Results</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Export participant transcripts
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={exportSessionResults}>
                <div className="flex flex-col gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Select participants to export</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedParticipants.size} selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllClick}
                        >
                          {selectedParticipants.size === userData.length ? 'Deselect all' : 'Select all'}
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-lg max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <div className="flex items-center">
                                <Checkbox
                                  checked={selectedParticipants.size === userData.length && userData.length > 0}
                                  onCheckedChange={handleSelectAll}
                                />
                              </div>
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userData
                            .sort((a, b) => new Date(b.last_edit).getTime() - new Date(a.last_edit).getTime())
                            .map((participant) => (
                              <TableRow key={participant.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedParticipants.has(participant.id)}
                                    onCheckedChange={() => handleSelectParticipant(participant.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {participant.user_name || 'Anonymous'}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      participant.active ? 'capitalize' : 'capitalize bg-[#ECFCCB]'
                                    }
                                  >
                                    {participant.active ? 'Started' : 'Finished'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                      </Table>
                    </div>
                  </div>
                  <Card className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="include-session-details"
                        checked={includeSessionDetails}
                        onCheckedChange={(checked) => setIncludeSessionDetails(checked as boolean)}
                        className="mt-0.5"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="include-session-details" className="text-sm font-medium">
                          Include Session Metadata
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Session details and context included in export
                        </p>
                      </div>
                    </div>
                  </Card>
                  {noResultsWarning && (
                    <div className="text-red-600 text-sm">
                      No responses match your filters.
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
                                      <CardFooter className="flex justify-between">
                            <Button onClick={handleCloseExportPopup} variant="outline">
                              Back
                            </Button>
                                          <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">
                                Format: JSON
                              </span>
                              {exportInProgress ? (
                                <div className="flex items-center gap-2">
                                  <Spinner />
                                  Downloading...
                                </div>
                              ) : (
                                <Button onClick={exportSessionResults}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              )}
                            </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
