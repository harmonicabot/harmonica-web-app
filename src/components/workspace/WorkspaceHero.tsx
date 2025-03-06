'use client';
import { MapPin, Upload, ImageIcon, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface WorkspaceHeroProps {
  workspaceId: string;
  exists: boolean;
  title?: string;
  description?: string;
  location?: string;
  isEditable?: boolean;
  onUpdate?: (data: { title?: string; description?: string; location?: string }) => void;
}

export default function WorkspaceHero({
  workspaceId,
  exists,
  title = 'Create New Workspace',
  description = 'Get started by adding workspace details',
  location = 'you can set a location if you want',
  isEditable = false,
  onUpdate
}: WorkspaceHeroProps) {
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [gradientFrom, setGradientFrom] = useState('#6B21A8');
  const [gradientTo, setGradientTo] = useState('#9333EA');
  const [useGradient, setUseGradient] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState({ title, description, location });

  const bannerStyle = useGradient
    ? { backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }
    : {
        backgroundImage: bannerImage ? `url(${bannerImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };

  const handleSave = () => {
    onUpdate?.(values);
    setIsEditing(false);
  };

  const content = (
    <div className="bg-gradient-to-r from-purple-900 to-purple-400 text-white rounded-lg p-8 relative group">
      <div className="absolute top-2 right-2 z-20 flex gap-2">
        {isEditable && exists && (
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
      
        <div 
          className={`relative group/edit ${exists ? '' : 'cursor-pointer'}`}
          onClick={() => !exists && isEditable && setIsEditing(true)}
        >
          {(!exists) && (
            <div className="absolute -inset-8 hidden group-hover/edit:flex items-center justify-center bg-black/20 rounded transition-all">
              <Pencil className="w-16 h-16 text-white/50" />
            </div>
          )}
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          <p className="text-xl mb-4">{description}</p>
          {location && (
            <div className="flex items-center gap-2 text-blue-100">
              <MapPin className="h-5 w-5" />
              <span>{location}</span>
            </div>
          )}
        </div>
    </div>
  );

  return (
    <>
      {content}
      {isEditable && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Workspace Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={values.title}
                  onChange={(e) => setValues(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter workspace title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={values.description}
                  onChange={(e) => setValues(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter workspace description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location/Organization</Label>
                <Input
                  id="location"
                  value={values.location}
                  onChange={(e) => setValues(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location or organization"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 