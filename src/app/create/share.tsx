import { Button } from '@/components/ui/button';
import QRCode from 'qrcode.react';
import { useState } from 'react';

export default function ShareSession({
  sessionName,
  telegramBotId,
  makeSessionId,
  assistantId,
}: {
  sessionName: string;
  telegramBotId: string;
  makeSessionId: string;
  assistantId: string;
}) {
  const chatUrl = `${window.location.origin}/chat?s=${makeSessionId}`;
  const sendToChat = () => {
    window.location.href = `/chat?assistantId=${assistantId}`;
  };
  const [showToast, setShowToast] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(chatUrl)
      .then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="bg-white p-6 rounded-lg">
      <h2 className="font-bold mb-2 text-gray-500">
        Share with your participants
      </h2>
      <h3 className="mb-2 text-xl">{sessionName}</h3>
      <div className="flex items-center space-x-2">
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-small"
        >
          {chatUrl}
        </a>
      </div>
      <div className="mt-8 mb-8 bg-black p-4 rounded-lg inline-block">
        <QRCode
          className=" md:w-96 md:h-96 lg:w-[512px] lg:h-[512px]"
          value={chatUrl}
          size={250}
        />
      </div>
      <div>
        <Button onClick={copyToClipboard}>Copy Link</Button>
        {showToast && (
          <div className="fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded shadow-lg">
            URL copied to clipboard
          </div>
        )}
      </div>
    </div>
  );
}
