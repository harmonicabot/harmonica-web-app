import QRCode from "qrcode.react";

export default function ShareSession({ botId, sessionId }: { botId: string, sessionId: string }) {
  const botUrl = `https://t.me/${botId}?start=${sessionId}`;
  return (
    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
      <h2 className="font-bold mb-2">Session Setup Successful!</h2>
      <p className="mb-2">Send this link to participants:</p>
      <div className="flex items-center space-x-2">
        <a
          href={botUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {botUrl}
        </a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(botUrl);
            document.getElementById('copyStatus').classList.remove('hidden');
            setTimeout(() => {
              document.getElementById('copyStatus').classList.add('hidden');
            }, 2000);
          }}
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
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
      <p id="copyStatus" className="text-sm text-green-600 mt-2 hidden">
        Link copied to clipboard!
      </p>
      <QRCode className="m-6" value={botUrl} size={512} />
    </div>
  );
}
