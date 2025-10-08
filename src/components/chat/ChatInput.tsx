'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, StartRecording, StopRecording } from '../icons';
import { Loader2, Sparkles } from 'lucide-react';

interface ChatInputProps {
  chat: {
    formData: { messageText: string };
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    placeholder: string;
    isLoading: boolean;
    isHost?: boolean;
    isParticipantSuggestionLoading: boolean;
    generateParticipantSuggestion: () => void;
    isAskAi?: boolean;
  };
  hasBottomLeftButtons?: boolean;
  className?: string;
}

export function ChatInput({
  chat,
  hasBottomLeftButtons = false,
  className = "flex-shrink-0 pb-2 w-full border-t border-gray-200 px-3",
}: ChatInputProps) {
  const {
    formData,
    handleInputChange,
    handleKeyDown,
    handleSubmit,
    textareaRef,
    placeholder,
    isLoading,
    isHost = false,
    isParticipantSuggestionLoading = false,
    generateParticipantSuggestion,
    isAskAi = false,
  } = chat;

  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setRecordingStatus('processing');
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        try {
          const audioFormData = new FormData();
          audioFormData.append('audio', audioBlob);
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: audioFormData,
          });
          
          if (!response.ok) {
            throw new Error('Transcription failed');
          }
          
          const data = await response.json();
          const transcription = data.transcription || '';
          
          if (textareaRef.current && transcription) {
            const currentText = textareaRef.current.value;
            const newText = currentText ? `${currentText} ${transcription}` : transcription;
            
            textareaRef.current.value = newText;
            
            const syntheticEvent = {
              target: textareaRef.current
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
            
            // Trigger the onInput handler to adjust height
            const inputEvent = new Event('input', { bubbles: true });
            textareaRef.current.dispatchEvent(inputEvent);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed');
          console.error('Transcription error:', err);
        } finally {
          // Cleanup stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          setRecordingStatus('idle');
        }
      };

      mediaRecorder.start();
      setRecordingStatus('recording');
    } catch (err) {
      setError('Microphone access denied');
      console.error('Recording error:', err);
      setRecordingStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = useCallback(() => {
    if (recordingStatus === 'idle') {
      startRecording();
    } else if (recordingStatus === 'recording') {
      stopRecording();
    }
  }, [recordingStatus]);

  return (
    <div className={className}>
      <form
        className={`space-y-4 mt-4 ${isAskAi ? '-mx-6' : ''}`}
        onSubmit={handleSubmit}
      >
        <div className="relative">
          <Textarea
            disabled={isLoading || recordingStatus === 'recording' || recordingStatus === 'processing'}
            name="messageText"
            value={formData.messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 144) + 'px';
              
              // Auto-scroll to keep cursor visible when content overflows
              if (target.scrollHeight > target.clientHeight) {
                target.scrollTop = target.scrollHeight;
              }
            }}
            placeholder={placeholder}
            className={`flex-grow pr-12 ${hasBottomLeftButtons ? 'pb-16' : 'pb-4'} text-base min-h-[44px] max-h-[144px] overflow-y-auto resize-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-yellow-300`}
            ref={textareaRef}
          />
          {isHost && generateParticipantSuggestion && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateParticipantSuggestion}
              disabled={isLoading || isParticipantSuggestionLoading}
              className="absolute bottom-3 left-3 flex items-center gap-2"
            >
              {isParticipantSuggestionLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span className="text-xs">
                {isParticipantSuggestionLoading
                  ? 'Generating...'
                  : 'AI Suggestion'}
              </span>
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            size="icon"
            className={`absolute bottom-3 right-14 h-10 w-10 text-lg rounded-3xl mr-2
              ${recordingStatus === 'idle' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              ${recordingStatus === 'recording' ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}
            `}
            onClick={toggleRecording}
            disabled={isLoading || recordingStatus === 'processing'}
          >
            {recordingStatus === 'idle' && <StartRecording />}
            {recordingStatus === 'recording' && <StopRecording />}
            {recordingStatus === 'processing' && <Loader2 className="animate-spin" />}
          </Button>
          <Button
            type="submit"
            variant="default"
            size="icon"
            className="absolute bottom-3 right-3 h-10 w-10"
            disabled={isLoading || recordingStatus === 'recording' || recordingStatus === 'processing'}
          >
            <Send />
          </Button>
        </div>
        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}
      </form>
    </div>
  );
}