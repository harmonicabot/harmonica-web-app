'use client';
import { MapPin, Upload, ImageIcon, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { updateWorkspaceDetails } from 'app/workspace/[w_id]/actions';
import { useDropzone } from 'react-dropzone';
import { Workspace, WorkspaceUpdate } from '@/lib/schema';

interface WorkspaceHeroProps {
  workspaceId: string;
  exists: boolean;
  title?: string;
  description?: string;
  location?: string;
  isEditable?: boolean;
  bannerImageUrl?: string;
  initialGradientFrom?: string;
  initialGradientTo?: string;
  initialUseGradient?: boolean;
  onUpdate?: (updates: any) => void;
}

export default function WorkspaceHero({
  workspaceId,
  exists,
  title,
  description,
  location,
  isEditable = false,
  bannerImageUrl,
  initialGradientFrom,
  initialGradientTo,
  initialUseGradient,
  onUpdate,
}: WorkspaceHeroProps) {
  const [bannerImage, setBannerImage] = useState<string | undefined>(bannerImageUrl);
  const [gradientFrom, setGradientFrom] = useState(initialGradientFrom);
  const [gradientTo, setGradientTo] = useState(initialGradientTo);
  const [useGradient, setUseGradient] = useState(initialUseGradient);
  const [isEditing, setIsEditing] = useState(isEditable && !exists);
  const [values, setValues] = useState({ title, description, location });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Store the file for later upload when user confirms
      setImageFile(file);
      
      // Just show a preview
      const reader = new FileReader();
      reader.onload = () => {
        setBannerImage(reader.result as string);
        setUseGradient(false);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    noClick: true,
  });

  const bannerStyle = useGradient
    ? {
        backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
      }
    : {
        backgroundImage: bannerImage ? `url(${bannerImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };

  const handleSave = async () => {
    try {
      let finalBannerImage = useGradient ? undefined : bannerImageUrl; // Start with existing URL or otherwise a gradient
      // Only upload if we have a new image file
      if (imageFile && !useGradient) {
        // Import is inside the function to maintain client component compatibility
        const { uploadBanner } = await import('app/workspace/[w_id]/actions'); 
        // Create form data for upload
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('workspaceId', workspaceId);
        
        // Upload the image and get the URL
        finalBannerImage = await uploadBanner(formData);
        console.log('Uploaded image to url:', finalBannerImage);
        // Reset the file state
        setImageFile(null);
      }

      // Create the update data object
      const updateData: WorkspaceUpdate = {
        ...values,
        bannerImage: finalBannerImage, // This will be either undefined, existing URL, or newly uploaded URL
        gradientFrom,
        gradientTo,
        useGradient,
        status: 'active'
      };

      
      // If we got a new URL, update the local state
      if (finalBannerImage && finalBannerImage !== bannerImage) {
        setBannerImage(finalBannerImage);
      }
      
      if (onUpdate) {
        onUpdate(updateData);
      }
      
      await updateWorkspaceDetails(workspaceId, updateData);
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
    setIsEditing(false);
  };

  const content = (
    <div 
      className="text-white rounded-lg p-8 relative group min-h-[200px]"
      style={bannerStyle}
    >
      <div className="absolute top-2 right-2 z-20 flex gap-2">
        {/* Button in the top right corner*/}
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
        {!exists && (
          <div className="absolute -inset-8 hidden group-hover/edit:flex items-center justify-center bg-black/20 rounded transition-all">
            <Pencil className="w-16 h-16 text-white/50" />
          </div>
        )}
        <h1 className="text-4xl font-bold mb-4">
          {values.title || (!exists && "Add Workspace Title")}
        </h1>
        <p className="text-xl mb-4">
          {values.description || (!exists && "Add a description for your workspace")}
        </p>
        {(values.location || !exists) && (
          <div className="flex items-center gap-2 text-blue-100">
            <MapPin className="h-5 w-5" />
            <span>{values.location || (!exists && "Add location")}</span>
          </div>
        )}

      </div>
    </div>
  );

  const editDialog = (
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
              onChange={(e) =>
                setValues((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter workspace title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter workspace description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location/Organization</Label>
            <Input
              id="location"
              value={values.location}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="Enter location or organization"
            />
          </div>
          
          {/* Banner styling options */}
          <Tabs defaultValue={useGradient ? "gradient" : "image"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image" onClick={() => setUseGradient(false)}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </TabsTrigger>
              <TabsTrigger value="gradient" onClick={() => setUseGradient(true)}>
                <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-600 to-purple-400 mr-2" />
                Gradient
              </TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                <input {...getInputProps()} />
                <Button
                  variant="ghost"
                  className="w-full h-full"
                  onClick={(e) => {
                    e.preventDefault();
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setBannerImage(reader.result as string);
                          setImageFile(file);
                          setUseGradient(false);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <p>Drag & drop an image here, or click to select</p>
                </Button>
              </div>
              {bannerImage && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setBannerImage(undefined)}
                >
                  Remove Image
                </Button>
              )}
            </TabsContent>
            <TabsContent value="gradient" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gradientFrom">From Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="gradientFrom"
                      type="color"
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradientTo">To Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="gradientTo"
                      type="color"
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <div
                className="w-full h-12 rounded-lg"
                style={{
                  backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
                }}
              />
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {content}
      {isEditable && editDialog}
    </>
  );
}
