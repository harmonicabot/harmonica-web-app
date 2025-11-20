'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  Clipboard,
  QrCode,
  ClipboardCheck,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'hooks/use-toast';

interface SessionResultShareProps {
  sessionId: string;
  numSessions: number
  completedSessions: number
  isFinished: boolean
}

export default function SessionResultParticipants({
  sessionId,
  numSessions,
  completedSessions,
  isFinished
}: SessionResultShareProps) {
  const [url, setUrl] = useState('');
  const [urlDomainOnly, setUrlDomainOnly] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Need to set the URL in useEffect, otherwise next.js is doing SSR on the server side where window isn't available
    setUrl(`${window.location.origin}/chat?s=${sessionId}`);
    setUrlDomainOnly(`${window.location.host}/chat?s=${sessionId}`);
  }, [sessionId]);

  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'URL copied to clipboard',
      });
      setCopiedToClipboard(true);
    });
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  return (
    <>
      <Card className="flex-grow bg-yellow-50 flex flex-col justify-between">
        <CardHeader className="pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md">Invite Participants</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex-1 flex flex-col justify-end">
            <div className="invite">
              <h3 className="text-sm text-muted-foreground mb-1">
                {isFinished ? 'This session is finished' : 'Your unique session link:'}
              </h3>
              <p className="text-sm mb-2">
                <a href={url} target="_blank">
                  {urlDomainOnly}
                  <ExternalLink className="inline-block ml-1 mb-3 w-2 h-2" />
                </a>
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  onClick={copyToClipboard}
                >
                  {copiedToClipboard ? (
                    <ClipboardCheck className="h-4 w-4" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}
                  Copy link
                </Button>
                <Button
                  variant="ghost"
                  onClick={toggleModal}
                >
                  <QrCode className="h-4 w-4" />
                  QR code
                </Button>
              </div>
              {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                  <div className="relative bg-white p-4 rounded shadow-lg">
                    <QRCodeCanvas
                      className="m-4"
                      size={250}
                      value={`${window.location.origin}/chat?s=${sessionId}`}
                    />
                    <button
                      className="absolute -top-14 -right-14 bg-white text-gray-500 text-2xl w-12 h-12 flex items-center justify-center rounded-full shadow-lg"
                      onClick={toggleModal}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
