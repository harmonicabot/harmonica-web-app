import { ApiAction, AssistantBuilderData, RequestData, SessionBuilderData, TemplateEditingData } from '@/lib/types'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { finishedResponse, handleResponse, streamResponse, waitForRunCompletion } from './utils'
import { finished } from 'stream'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  const data: RequestData = await req.json()
  console.log("Received data: ", data)
  // Todo: We should possibly switch this to always use 'handleResponse', 
  //  so that we can easier switch between streaming and not. But not now.
  switch (data.action) {
    case ApiAction.CreatePrompt:
      return await createNewPrompt(data.data as SessionBuilderData)
    case ApiAction.EditPrompt:
      console.log("Editing prompt for data: ", data.data)
      const d = data.data as TemplateEditingData 
      return handleResponse(client, d.threadId, d.assistantId, d.instructions, data.stream)
    case ApiAction.CreateAssistant:
      return await handleCreateAssistant(data.data as AssistantBuilderData)
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

async function createNewPrompt(data: SessionBuilderData) {
  console.log("Creating prompt for data: ", data)
  try {
    const templateBuilder = await getTemplateBuilder()
    console.log("Template Builder assistant found, generating full prompt")
    const [threadId, fullPrompt] = await generateFullPrompt(data, templateBuilder.id)
    return NextResponse.json({ threadId, assistantId: templateBuilder.id, fullPrompt })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getTemplateBuilder() {
  const assistants = await client.beta.assistants.list()
  const templateBuilder = assistants.data.find(assistant => assistant.name.includes("Template Builder"))
  if (!templateBuilder) {
    console.log("Template Builder assistant not found")
    throw new Error("Template Builder assistant not found")
  }
  console.log("Template Builder assistant found: ", templateBuilder)
  return templateBuilder
}

async function generateFullPrompt(data: SessionBuilderData, assistantId: string) {
  const thread = await client.beta.threads.create()
  const content = await finishedResponse(client, thread.id, assistantId, createPromptContent(data))
  return [thread.id, await content.json()]
}

function createPromptContent(data: SessionBuilderData) {
  const createSummaryInstructions = data.createSummary ? "Create a summary of the conversation at the end." : ""
  const allowIterationsOnSummary = data.summaryFeedback ? "Ask the user whether the summary is accurate and iterate on it if necessary." : ""
  const includeContextInstructions = data.requireContext
    ? `When the session is started, the host will provide context about: ${data.contextDescription}. Use this as [CONTEXT] where appropriate.`
    : ""

  return `
    Create a template with the following information:
    Session Name: ${data.sessionName}
    Task Description: ${data.goal}
    ${createSummaryInstructions}
    ${allowIterationsOnSummary}
    ${includeContextInstructions}
  `
}

async function handleCreateAssistant(data: AssistantBuilderData) {
  console.log("Creating assistant for data: ", data)

  const assistant = await client.beta.assistants.create({
    name: data.name,
    instructions: data.prompt,
    model: "gpt-4o-mini",
  }) 
  return NextResponse.json({ assistantId: assistant.id })
}