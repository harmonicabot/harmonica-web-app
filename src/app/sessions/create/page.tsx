'use client';

import { useEffect, useState } from 'react';
import { sendCallToMake } from '@/lib/utils';
import QRCode from 'qrcode.react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react'
import { ApiAction, ApiTarget } from '@/lib/types';

export default function CreateSession() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Loading...</div>}>
        <SearchParamsWrapper />
      </Suspense>
    </div>
  );
}

const SearchParamsWrapper = () => {
  const searchParams = useSearchParams();
  const assistantId = searchParams.get('assistantId');
  const templateName = searchParams.get('templateName');
  const botName = searchParams.get('botName');
  const contextDescription = searchParams.get('contextDescription');

  return (
    <CreateSessionForm
      assistantId={assistantId}
      templateName={templateName}
      botName={botName}
      contextDescription={contextDescription}
    />
  );
};

function CreateSessionForm({
  assistantId,
  templateName,
  botName,
  contextDescription,
}: {
  assistantId: string | null;
  templateName: string | null;
  botName: string | null;
  contextDescription: string | null;
}) {
  
  const [botId, setBotId] = useState(botName || '');
  const [template, setTemplate] = useState(assistantId || '');
  const [topic, setTopic] = useState(templateName || '');
  const [context, setContext] = useState('');
  const [resultElement, setResultElement] = useState<JSX.Element>();

  const [availableTemplates, setAvailableTemplates] = useState([])

  useEffect(() => {
    const fetchAvailableAssistants = async () => {
      const response = await fetch('/api/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const templates = await response.json()
      setAvailableTemplates(templates);
    };
    fetchAvailableAssistants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assistantTemplate = availableTemplates.find(tpl => tpl.name === template);
    let templateId;
    if (assistantTemplate) {
      templateId = assistantTemplate.id;
    } else {
      templateId = template
    }
    const payload = {
      target: ApiTarget.Session,
      action: ApiAction.CreateSession,
      data: {
        template: templateId,
        context: context,
        topic: topic,
        bot_id: botId,
        host_chat_id: 'WebApp',
      },
    };
    sendCallToMake(payload).then((response) => {
      const botUrl = `https://t.me/${botId}?start=${response.session_id}`;
      setResultElement(
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
                document
                  .getElementById('copyStatus')
                  .classList.remove('hidden');
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
        </div>,
      );
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {!resultElement ? (
        <>
          <h1 className="text-2xl font-bold mb-6">Create New Session</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="template"
                className="block text-sm font-medium text-gray-700"
              >
                Template *
              </label>
              <input
                list="templates"
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                required
                placeholder="Select a template or enter an assistant ID"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <datalist id="templates">
                <option value="Daily review">Daily review</option>
                <option value="Red-Teaming">Red-Teaming</option>
                <option value="End-Of-Talk">End-Of-Talk</option>
                {availableTemplates?.map((template) => (
                  <option key={template.id} value={template.name}>
                    {template.id}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label
                htmlFor="botId"
                className="block text-sm font-medium text-gray-700"
              >
                Bot ID *
              </label>
              <select
                id="botId"
                value={botId}
                onChange={(e) => setBotId(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="">Select the bot channel that should be used.</option>
                <option value="octant_harmonibot">Octant Chat Bot</option>
                <option value="harmonica_chat_bot">Harmonica Chat Bot</option>
                <option value="harmonica_end_of_day_review_bot">End of day Bot</option>
                <option value="harmonica_red_teaming_bot">Red-Teaming Bot</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="topic"
                className="block text-sm font-medium text-gray-700"
              >
                Topic *
              </label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label
                htmlFor="context"
                className="block text-sm font-medium text-gray-700"
              >
                Context {contextDescription ? '*' : ''}
              </label>
              <textarea
                id="context"
                value={context}
                placeholder={ contextDescription ? contextDescription : ''}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                required={contextDescription ? true : false}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              ></textarea>
            </div>
            <div>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleSubmit}
              >
                Create Session
              </button>
            </div>
          </form>
        </>
      ) : (
        resultElement
      )}
    </div>
  );
}
