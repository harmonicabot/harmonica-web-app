import { ApiAction, AssistantBuilderData, RequestData, TemplateBuilderData } from '@/lib/types'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  const data: RequestData = await req.json()

  switch (data.action) {
    case ApiAction.CreatePrompt:
      return handleCreatePrompt(data.data as TemplateBuilderData)
    case ApiAction.CreateAssistant:
      return handleCreateAssistant(data.data as AssistantBuilderData)
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

async function handleCreatePrompt(data: TemplateBuilderData) {
  try {    
    const assistants = await client.beta.assistants.list()
    const templateBuilder = assistants.data.find(assistant => assistant.name.includes("Template Builder"))

    if (!templateBuilder) {
      throw new Error("Template Builder assistant not found")
    }

    const createSummaryInstructions = data.createSummary ? "Create a summary of the conversation at the end." : ""
    const allowIterationsOnSummary = data.summaryFeedback ? "Ask the user whether the summary is accurate and iterate on it if necessary." : ""
    const includeContextInstructions = data.requireContext
      ? `When the session is started, the host will provide context about: ${data.contextDescription}. Use this as [CONTEXT] where appropriate.`
      : ""

    const thread = await client.beta.threads.create();
    const message = await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `
        Create a template builder for a template with the following information:
        Template Name: ${data.templateName}
        Task Description: ${data.taskDescription}
        ${createSummaryInstructions}
        ${allowIterationsOnSummary}
        ${includeContextInstructions}
      `
    })

    const stream = new ReadableStream({
      async start(controller) {

        const run = client.beta.threads.runs.stream(thread.id, {
          assistant_id: templateBuilder.id
        })
          .on('textCreated', (text) => {
            controller.enqueue(text.value)
          })
          .on('textDelta', (textDelta, snapshot) => {
            controller.enqueue(textDelta.value)
          })
          .on('end', () => {
            controller.close()
          })
      }
    })
  
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function handleCreateAssistant(data: AssistantBuilderData) {
  return NextResponse.json({ assistantId: 'xyz123' })
  // const assistant = await client.beta.assistants.create({
  //   name: data.name,
  //   instructions: data.prompt,
  //   model: "gpt-4o-mini",
  // }) 
  // return NextResponse.json({ assistantId: assistant.id })
}