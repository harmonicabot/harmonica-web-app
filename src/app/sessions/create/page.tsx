'use client'

import { useEffect, useState } from 'react'
import { sendApiCall } from 'utils/utils'
import { AccumulatedSessionData, RequestData, Sessions } from "utils/types"
import { useRouter } from 'next/router'


export default function CreateSession() {
  const [channelId, setChannelId] = useState('')
  const [template, setTemplate] = useState('')
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [resultElement, setResultElement] = useState<JSX.Element>();

  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    if (!token) {
      router.push('/login');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Submitting form...: ", e)
    sendApiCall({
      action: 'new_session',
      data: {
        template: template,
        context: context,
        topic: topic,
        channelId: channelId,
        host_chat_id: 'WebApp',
      },
    }).then((response) => {
      setResultElement(
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <h2 className="font-bold mb-2">Session Setup Successful!</h2>
          <p className="mb-2">Send this link to participants:</p>
          <div className="flex items-center space-x-2">
            <a
              href={`https://t.me/harmomica_test_bot?start=${response.session_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://t.me/harmomica_test_bot?start={response.session_id}
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://t.me/harmomica_test_bot?start=${response.session_id}`)
                document.getElementById('copyStatus').classList.remove('hidden')
                setTimeout(() => {
                  document.getElementById('copyStatus').classList.add('hidden')
                }, 2000)
              }}
              className="p-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p id="copyStatus" className="text-sm text-green-600 mt-2 hidden">Link copied to clipboard!</p>
        </div>
      )
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!resultElement ? (
        <>
          <h1 className="text-2xl font-bold mb-6">Create New Session</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="channelId" className="block text-sm font-medium text-gray-700">
                Channel ID
              </label>
              <input
                type="text"
                id="channelId"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label htmlFor="template" className="block text-sm font-medium text-gray-700">Template *</label>
              <select
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="">Select a template</option>
                <option value="Daily review">Daily review</option>
                <option value="Red-Teaming">Red-Teaming</option>
              </select>
            </div>
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topic *</label>
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
              <label htmlFor="context" className="block text-sm font-medium text-gray-700">Context *</label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              ></textarea>
            </div>
            <div>
              <button type="submit"
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
  )
}
