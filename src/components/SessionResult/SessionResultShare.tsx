import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Share2 } from "lucide-react";
import QRCode from 'qrcode.react';

interface SessionResultShareProps {
  sessionId: string;
}

export  default function SessionResultShare({ sessionId }: SessionResultShareProps) {
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function getUrl() {
    return `${window.location.origin}/chat?s=${sessionId}`;
  }

  const copyToClipboard = () => {
    const url = getUrl();
    navigator.clipboard.writeText(url).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    });
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  return (
    <Card className="flex-grow bg-yellow-50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">Share</CardTitle>
          <Share2 className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <h2 className="font-bold mb-2">
          Share <a className="underline" href={getUrl()}>your session</a> with participants:
        </h2>
          <Button className="me-2" onClick={copyToClipboard}>
            Copy link
          </Button>
          {showToast && (
            <div className="fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded shadow-lg">
              URL copied to clipboard
            </div>
          )}

      </CardContent>
    </Card>
  );
}