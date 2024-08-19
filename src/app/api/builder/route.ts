import { TemplateBuilderData } from '@/lib/types'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body: TemplateBuilderData = await req.json()

    // Compose a prompt out of the template builder data, and store the answer in json format:
    // ... actually, ... scratch that. Just querying a template builder assistant directly
    //  with one simple objective prompt is actually way easier 😅
    
    const assistants = await client.beta.assistants.list()
    const templateBuilder = assistants.data.find(assistant => assistant.name.includes("Template Builder"))

    if (!templateBuilder) {
      throw new Error("Template Builder assistant not found")
    }

    const thread = await client.beta.threads.create();
    const message = await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `
        Create a template builder for a template with the following information:
        - AI Role/Personality: ${body.aiRole}
        - Task/Description/Goal: ${body.taskDescription}
      `
    })


    let responseText = ''

    const run = client.beta.threads.runs.stream(thread.id, {
      assistant_id: templateBuilder.id
    })
      .on('textCreated', (text) => {
        responseText += '\nassistant > '
        process.stdout.write('\nassistant > ')
      })
      .on('textDelta', (textDelta, snapshot) => {
        responseText += textDelta.value
        process.stdout.write(textDelta.value)
      })
      .on('toolCallCreated', (toolCall) => {
        responseText += `\nassistant > ${toolCall.type}\n\n`
        process.stdout.write(`\nassistant > ${toolCall.type}\n\n`)
      })
    
    const assistant = await client.beta.assistants.create({
      name: body.templateName,
      instructions: responseText,
      model: "gpt-4o-mini",
    })

    // Todo: Add the assistant to a database?
    //  Or from here, directly go to a prefilled create session page with that assistant?
    
    return NextResponse.json({ response: responseText, assistantId: assistant.id })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500 })
  }
}
