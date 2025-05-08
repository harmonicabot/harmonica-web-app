'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Link as LinkIcon, Upload, Image as ImageIcon, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface BackgroundDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
}

export default function CreateWorkspace() {
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradientFrom, setGradientFrom] = useState('#6B21A8');
  const [gradientTo, setGradientTo] = useState('#9333EA');
  const [useGradient, setUseGradient] = useState(true);
  const [backgroundText, setBackgroundText] = useState('');
  const [documents, setDocuments] = useState<BackgroundDocument[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
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

  const onDocumentDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setDocuments(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          size: file.size,
          type: file.type,
          content: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps: getDocumentRootProps, getInputProps: getDocumentInputProps } = useDropzone({
    onDrop: onDocumentDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    }
  });

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const bannerStyle = useGradient
    ? {
        backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
      }
    : {
        backgroundImage: bannerImage ? `url(${bannerImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };

  return (
    <div className="p-4 md:p-8">
      {/* Banner Section with Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <div
            className="w-full text-white rounded-lg p-8 mb-8 hover:opacity-90 transition-all cursor-pointer group relative min-h-[200px]"
            style={bannerStyle}
            {...getRootProps()}
          >
            {isDragActive ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xl">Drop your image here</p>
                </div>
              </div>
            ) : !bannerImage && useGradient ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <Upload className="w-12 h-12 opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="text-center">
                  <h2 className="text-2xl font-semibold mb-2">
                    {title || 'Add Project Details'}
                  </h2>
                  <p className="text-gray-300">
                    {description || 'Click to upload a banner image and set project details'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter project title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter project description"
              />
            </div>
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
                    onClick={() => setBannerImage(null)}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Background Information Section */}
      <Card className="mt-8">
        <CardHeader>
          <h2 className="text-2xl font-semibold">Background Information</h2>
          <p className="text-sm text-gray-500">Add context and supporting documents for this project</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-2">
              <Label htmlFor="backgroundText">Context</Label>
              <Textarea
                id="backgroundText"
                value={backgroundText}
                onChange={(e) => setBackgroundText(e.target.value)}
                placeholder="Add any relevant background information or context for this project..."
                className="h-[120px] resize-none"
              />
            </div>
            
            <div className="col-span-4 space-y-2">
              <Label>Supporting Documents</Label>
              <div
                {...getDocumentRootProps()}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors h-[120px] flex flex-col items-center justify-center"
              >
                <input {...getDocumentInputProps()} />
                <FileText className="w-6 h-6 text-gray-500 mb-2" />
                <p className="text-sm text-gray-600">
                  Drop documents or click to select
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, TXT
                </p>
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(doc.id)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions Section */}
      <Card className="mt-4">
        <CardHeader>
          <h2 className="text-2xl font-semibold">Configure Sessions</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Session Card */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] space-y-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Create New Session</h3>
                  <p className="text-sm text-gray-500">
                    Start a new discussion session from scratch
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Link Existing Session Card */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] space-y-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <LinkIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Link Existing Session</h3>
                  <p className="text-sm text-gray-500">
                    Connect an existing session to this project
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end space-x-4">
        <Button variant="outline">Cancel</Button>
        <Button>Create Project</Button>
      </div>
    </div>
  );
}
