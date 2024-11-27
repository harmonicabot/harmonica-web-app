'use client'
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Share2, Clipboard } from "lucide-react";
import QRCode from 'qrcode.react';

interface SessionResultShareProps {
  sessionId: string;
}

export  default function SessionResultShare({ sessionId }: SessionResultShareProps) {
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const url = `${window.location.origin}/chat?s=${sessionId}`;
  const urlDomainOnly = `${window.location.host}/chat?s=${sessionId}`;
  const copyToClipboard = () => {
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
          Share your session with participants
        </h2>
        <p className='text-sm mb-2'><a href={url} target='_blank'>
          {urlDomainOnly}
          <ExternalLink className="inline-block ml-1 mb-3 w-2 h-2" />
        </a></p>
        <div>
          <Button className="me-2" onClick={copyToClipboard}>
            <Clipboard className="mr-2" />
            Copy link
          </Button>
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
        </div>
      </CardContent>
    </Card>
  );
}