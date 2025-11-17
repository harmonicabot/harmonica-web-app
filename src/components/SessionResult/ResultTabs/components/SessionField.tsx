'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Edit2, Check, X } from 'lucide-react';

interface SessionFieldProps {
  label: string;
  value: string | boolean;
  type: 'text' | 'textarea' | 'boolean';
  onEdit: () => void;
  isEditing: boolean;
  onSave: (value: string | boolean) => void;
  onCancel: () => void;
  placeholder?: string;
}

export function SessionField({
  label,
  value,
  type,
  onEdit,
  isEditing,
  onSave,
  onCancel,
  placeholder,
}: SessionFieldProps) {
  const [editValue, setEditValue] = useState(value);
  const [showEditButton, setShowEditButton] = useState(false);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    onCancel();
  };

  const renderValue = () => {
    if (type === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch checked={value as boolean} disabled />
          <span className="text-sm text-muted-foreground">
            Allow participants to see and build upon each other's responses
          </span>
        </div>
      );
    }
    
    if (typeof value === 'string') {
      return (
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {value || <span className="text-muted-foreground italic">Not specified</span>}
        </div>
      );
    }
    
    return null;
  };

  const renderEditForm = () => {
    if (type === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={editValue as boolean}
            onCheckedChange={(checked) => setEditValue(checked)}
          />
          <span className="text-sm text-muted-foreground">
            Allow participants to see and build upon each other's responses
          </span>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <Textarea
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
        />
      );
    }

    return (
      <Input
        value={editValue as string}
        onChange={(e) => setEditValue(e.target.value)}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      </div>
      
      <div 
        className="relative group"
        onMouseEnter={() => setShowEditButton(true)}
        onMouseLeave={() => setShowEditButton(false)}
      >
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className={`absolute top-1 right-2 z-10 transition-opacity px-3 ${
              showEditButton ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      
        {isEditing ? (
          <div className="space-y-2">
            {renderEditForm()}
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          renderValue()
        )}
      </div>
    </div>
  );
}

