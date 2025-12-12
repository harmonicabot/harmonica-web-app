'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface StickyNoteProps {
  id: string;
  content: string;
  position: { x: number; y: number };
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onPositionUpdate: (id: string, position: { x: number; y: number }) => void;
}

export default function StickyNote({
  id,
  content,
  position,
  onUpdate,
  onDelete,
  onPositionUpdate,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editContent.trim() && editContent !== content) {
      onUpdate(id, editContent.trim());
    } else {
      setEditContent(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditContent(content);
      setIsEditing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    // Store the offset from mouse position to the element's current position
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // Calculate new position: mouse position minus the initial offset
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      // Constrain to canvas bounds (optional, can be removed)
      const constrainedPosition = {
        x: Math.max(0, newPosition.x),
        y: Math.max(0, newPosition.y),
      };
      onPositionUpdate(id, constrainedPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, id, onPositionUpdate]);

  return (
    <div
      ref={noteRef}
      className="absolute bg-yellow-100 border border-border rounded-lg p-3.5 hover:shadow-lg transition-shadow group"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '286px',
        cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none resize-none text-lg font-medium min-h-10"
            autoFocus
            style={{ fontFamily: 'inherit' }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="flex-1 text-lg font-medium text-foreground break-words">
            {content}
          </p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className={`transition-opacity p-1 hover:bg-yellow-200 rounded ${
            isHovered || isEditing ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

