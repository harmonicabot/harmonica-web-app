import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    
    const arrayBuffer = await audioFile.arrayBuffer();
    
    
    const params = new URLSearchParams({
      punctuate: 'true',
      smart_format: 'true',
      model: 'nova-2',
      language: 'en-US', // Change to your language
      mip_opt_out: 'true', // Opt out of Model Improvement Partnership Program
      // Add custom keywords for accuracy if needed:
      // keywords: 'technical:3,specific:2'
    });
    
    const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: arrayBuffer,
    });
    
    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.status}`);
    }
    
    const data = await response.json();
    const transcription = data.results?.channels[0]?.alternatives[0]?.transcript || '';
    
    return NextResponse.json({ transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}