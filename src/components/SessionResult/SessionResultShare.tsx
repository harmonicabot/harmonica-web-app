'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  Share2,
  Clipboard,
  QrCode,
  ClipboardCheck,
} from 'lucide-react';
import QRCode from 'qrcode.react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface SessionResultShareProps {
  sessionId: string;
}

export default function SessionResultShare({
  sessionId,
}: SessionResultShareProps) {
  const [url, setUrl] = useState('');
  const [urlDomainOnly, setUrlDomainOnly] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Need to set the URL in useEffect, otherwise next.js is doing SSR on the server side where window isn't available
    setUrl(`${window.location.origin}/chat?s=${sessionId}`);
    setUrlDomainOnly(`${window.location.host}/chat?s=${sessionId}`);
  }, [sessionId]);

  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setCopiedToClipboard(true);
    });
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const path = usePathname();
  const isWorkspacePath = path?.match(/^\/workspace\/[^/]+\/[^/]+$/);

  return (
    <Card className="flex-grow bg-yellow-50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">
            {isWorkspacePath ? 'Join the action' : 'Share'}
          </CardTitle>
          <Share2 className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {isWorkspacePath ? (
          <div className="flex items-center">
            <Button className="mr-2">
              <Link href={url} target="_blank">
                {`Participate`}
              </Link>
            </Button>
            <div
                className="flex mx-2 hover:cursor-pointer"
                onClick={copyToClipboard}
              >
                {copiedToClipboard
                  ? <ClipboardCheck/>
                  : <Clipboard/>
                }
              </div>
            <QrCode
              className="ml-2 hover:cursor-pointer"
              onClick={toggleModal}
            />
          </div>
        ) : (
          <>
            <h2 className="font-bold mb-2">
              {'Share your session with participants'}
            </h2>
            <p className="text-sm mb-2">
              <a href={url} target="_blank">
                {urlDomainOnly}
                <ExternalLink className="inline-block ml-1 mb-3 w-2 h-2" />
              </a>
            </p>
            <div className="flex items-center">
              <div
                className="flex mr-2 hover:cursor-pointer"
                onClick={copyToClipboard}
              >
                Copy link
                {copiedToClipboard
                  ? <ClipboardCheck className="mx-2" />
                  : <Clipboard className="mx-2" />
                }
              </div>
              <div
                className="flex mx-2 hover:cursor-pointer"
                onClick={toggleModal}
              >
                QR code
                <QrCode className="mx-2" />
              </div>
            </div>
          </>
        )}

        {showToast && (
          <div className="fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded shadow-lg">
            URL copied to clipboard
          </div>
        )}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="relative bg-white p-4 rounded shadow-lg">
              <QRCode
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
      </CardContent>
    </Card>
  );
}
