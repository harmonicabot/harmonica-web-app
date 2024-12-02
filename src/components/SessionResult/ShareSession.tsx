'use client'
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share } from '../icons';
import { Copy } from 'lucide-react';

export default function ShareSession({
  makeSessionId,
}: {
  makeSessionId: string;
}) {
  const [chatUrl, setChatUrl] = useState(''); 
  const [showToast, setShowToast] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setChatUrl(`${window.location.origin}/chat?s=${makeSessionId}`)
  }, [makeSessionId])

  const copyToClipboard = (url: string, event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <Card className='w-fit'>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">Share</CardTitle>
          <Share />
        </div>
      </CardHeader>
      <CardContent>
        <h2 className="font-bold mb-2 text-gray-500">
          Share your session to start generating results
        </h2>
        <div className="mt-4 mb-4 bg-black p-4 rounded-lg inline-block">
          <QRCode
            className=" md:w-96 md:h-96 lg:w-[512px] lg:h-[512px]"
            value={chatUrl}
            size={250}
          />
        </div>
        <div className="flex justify-between items-center">
          <Button onClick={(e) => copyToClipboard(chatUrl, e)}>
            <Copy className="mr-2" /> Copy Link
          </Button>
          {showToast && (
            <div
              className="fixed bg-green-500 text-white px-2 py-1 rounded shadow text-sm"
              style={{
                left: `${mousePosition.x + 15}px`,
                top: `${mousePosition.y + 12}px`,
              }}
            >
              Copied to clipboard!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
