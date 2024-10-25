import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function handleResponse(client: OpenAI, threadId: string, assistantId: string, instructions: string, stream: boolean) {
  if (stream) {
    const streamData = streamResponse(client, threadId, assistantId, instructions);
    return new NextResponse(streamData, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    const response = await finishedResponse(client, threadId, assistantId, instructions);
    console.log('response from finishedResponse:', response);
    return NextResponse.json({ fullPrompt: response });
  }
}

export async function finishedResponse(client: OpenAI, threadId: string, assistantId: string, instructions: string) {
  console.log('threadId:', threadId);
  console.log('assistantId:', assistantId);
  console.log('instructions:', instructions);
  
  await client.beta.threads.messages.create(threadId, {
    role: "user",
    content: instructions
  })

  const run = await client.beta.threads.runs.create(threadId, { assistant_id: assistantId })
  await waitForRunCompletion(client, threadId, run.id)

  const messages = await client.beta.threads.messages.list(threadId)
  const content = getTextContent(messages.data[0].content)
  console.log('Generated FullPrompt Content: ', content);

  return content
}

export async function waitForRunCompletion(client: OpenAI, threadId: string, runId: string) {
  while (true) {
    const run = await client.beta.threads.runs.retrieve(threadId, runId)
    if (run.status === 'completed') {
      return
    } else if (run.status === 'failed' || run.status === 'cancelled') {
      throw new Error(`Run ${runId} ${run.status}`)
    }
    // Wait for 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

export function streamResponse(client: OpenAI, threadId: string, assistantId: string, instructions: string) {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      await client.beta.threads.messages.create(threadId, {
        role: "user",
        content: instructions
      })

      const run = await client.beta.threads.runs.create(threadId, { assistant_id: assistantId })

      while (true) {
        const runStatus = await client.beta.threads.runs.retrieve(threadId, run.id)
        
        if (runStatus.status === 'completed') {
          const messages = await client.beta.threads.messages.list(threadId)
          const content = getTextContent(messages.data[0].content)
          controller.enqueue(encoder.encode(content))
          break
        } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
          controller.error('Run failed or was cancelled')
          break
        }

        // If the run is still in progress, we can optionally send partial results here
        // For now, we'll just wait and check again
        console.log("Waiting for status update. Run Status: ", runStatus.status)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      controller.close()
    }
  })
}

function getTextContent(content: OpenAI.Beta.Threads.Messages.MessageContent[]): string {
  const textContent = content.find(item => item.type === 'text')
  if (textContent && 'text' in textContent) {
    return textContent.text.value
  }
  throw new Error('No text content found in the message')
}