'use client';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { updateHostSession } from '@/lib/db';
import { useHostSession, useUpsertHostSession } from '@/stores/SessionStore';
import { usePermissions } from '@/lib/permissions';
import { SessionStatus } from '@/lib/clientUtils';
import { NewHostSession } from '@/lib/schema';

interface SessionResultHeaderProps {
  sessionId: string;
  topic: string;
  status: SessionStatus;
}

export default function SessionResultHeader({ 
  sessionId, 
  topic, 
  status,  
}: SessionResultHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const editableRef = useRef<HTMLHeadingElement>(null);
  const { data: hostData } = useHostSession(sessionId);
  const upsertHostSession = useUpsertHostSession();
  const { hasMinimumRole } = usePermissions(sessionId);
  const isEditable = hasMinimumRole('editor');

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    console.log('Saving topic...')
    try {
      const content = editableRef.current?.textContent || '';
      if (content.trim() === '') {
        if (editableRef.current) {
          editableRef.current.textContent = topic;
        }
        setIsEditing(false);
        return;
      }
      
      // Update the topic in the database
      await updateHostSession(sessionId, { topic: content });

      // Update the local state in the SessionStore
      upsertHostSession.mutate({ id: sessionId, topic: content } as NewHostSession);
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating session topic:', error);
    }
  };

  const handleCancel = () => {
    if (editableRef.current) {
      editableRef.current.textContent = topic;
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent new line in contentEditable
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleDoubleClick = () => {
    if (isEditable) {
      setIsEditing(true);
    }
  };

  return (
    <div className="flex mb-6 align-items-center">
      <div className="relative group flex items-center">
        <h1 
          ref={editableRef}
          className={`text-3xl font-bold ${(isEditable && !isEditing) ? 'cursor-text hover:bg-gray-100 hover:shadow-sm hover:border-b-2 hover:border-gray-300 transition-all duration-200 rounded' : ''} ${isEditing ? 'border-b-2 border-primary outline-none' : ''}`}
          onDoubleClick={handleDoubleClick}
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          onKeyDown={handleKeyDown}
          onBlur={isEditing ? handleSave : undefined}
          title={isEditable ? "Double-click to edit" : ""}
        >
          {topic || 'Session name'}
        </h1>
        
        {isEditing && (
          <div className="flex ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="h-8 w-8"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
          </div>
        )}
      </div>
      <Badge
          variant="outline"
          className={`capitalize hidden md:flex items-center justify-center ms-4 ${
            status === SessionStatus.ACTIVE
              ? 'bg-lime-100 text-lime-900'
              : status === SessionStatus.DRAFT
                ? 'bg-purple-100 text-purple-900'
                : '' // Finished, remain white
          }`}
        >
          {status}
        </Badge>
    </div>
  );
}