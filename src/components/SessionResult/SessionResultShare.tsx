'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ExternalLink,
  Share2,
  Clipboard,
  QrCode,
  ClipboardCheck,
  User,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

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

  return (
    <>
      <Card className="flex-grow bg-yellow-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-md">Participants</CardTitle>
            <div className='flex gap-2 items-center'>
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{1}</span> <span className="text-yellow-800">Started</span>
              <span className="font-medium">{11}</span> <span className="text-lime-800">Completed</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div className="invite">
              <h2 className="font-bold mb-2">
                {'Get the link to participate:'}
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
                  {copiedToClipboard ? (
                    <ClipboardCheck className="mx-2" />
                  ) : (
                    <Clipboard className="mx-2" />
                  )}
                </div>
                <div
                  className="flex mx-2 hover:cursor-pointer"
                  onClick={toggleModal}
                >
                  QR code
                  <QrCode className="mx-2" />
                </div>
              </div>
              {showToast && (
                <div className="fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded shadow-lg">
                  URL copied to clipboard
                </div>
              )}
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
