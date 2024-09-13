import { Button } from "@/components/ui/button";
import QRCode from "qrcode.react";

export default function ShareSession({ sessionName, telegramBotId, makeSessionId, assistantId }: { sessionName: string, telegramBotId: string, makeSessionId: string, assistantId: string }) {
  const telegramUrl = `https://t.me/${telegramBotId}?start=${makeSessionId}`;
  const sendToChat = () => {
    //router.push({
    //   pathname: `/chat`,
    //   query: {
    //     assistantId,
    //     entryMessage: "Hello, would you like to start this session?"
    //   }
    // });
    window.location.href = `/chat?assistantId=${assistantId}`;
  };

  return (
    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
      <p className="mb-2">Session Setup Successful!</p>
      <p className="mb-2">Share with your participants</p>
      <h2 className="font-bold mb-2"></h2>
      <div className="flex items-center space-x-2">
        Open in Telegram: <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {telegramUrl}
        </a>
        {copyToClipboard(telegramUrl)}
      </div>
      <p id="copyStatus" className="text-sm text-green-600 mt-2 hidden">
        Link copied to clipboard!
      </p>
      <QRCode className="m-6 w-64 h-64 md:w-96 md:h-96 lg:w-[512px] lg:h-[512px]" value={telegramUrl} />
      
      <Button onClick={sendToChat}>
        Go to WebChat
      </Button>
    </div>
  );

  function copyToClipboard(whatToCopy) {
    return <button
      onClick={() => {
        navigator.clipboard.writeText(whatToCopy);
        document.getElementById('copyStatus').classList.remove('hidden');
        setTimeout(() => {
          document.getElementById('copyStatus').classList.add('hidden');
        }, 2000);
      } }
      className="p-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>;
  }
}
