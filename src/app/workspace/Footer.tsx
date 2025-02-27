'use client';
import React, { useState, useRef, useEffect } from 'react';
import { FooterConfig } from './footer';
import { Check, ImageIcon, Pencil, Save, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/permissions';
import * as db from '@/lib/db';

interface FooterProps {
  workspaceId: string;
  config: FooterConfig;
  onUpdate?: (config: FooterConfig) => void;
}

export function Footer({ workspaceId, config, onUpdate }: FooterProps) {
  const { loading, hasMinimumRole, role } = usePermissions(workspaceId)
  const [isEditable, setIsEditable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<FooterConfig>(config);

  useEffect(() => {
    const checkEditable = async () => {
      const workspace = await db.getWorkspaceById(workspaceId);
      setIsEditable(hasMinimumRole('owner') || workspace != null);
    };
    checkEditable();
  }, [workspaceId, loading, role]);

  useEffect(() => {
    if (!isEditing) {
      setEditedConfig(config);
    }
  }, [config, isEditing]);

  const handleSave = () => {
    onUpdate?.(editedConfig);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedConfig(config);
    setIsEditing(false);
  };

  const handleInstitutionChange = (index: number, field: keyof typeof editedConfig.institutions[0], value: string) => {
    const newInstitutions = [...editedConfig.institutions];
    newInstitutions[index] = { ...newInstitutions[index], [field]: value };
    setEditedConfig({ ...editedConfig, institutions: newInstitutions });
  };

  const handleQuickLinkChange = (index: number, field: keyof typeof editedConfig.quickLinks[0], value: string) => {
    const newQuickLinks = [...editedConfig.quickLinks];
    newQuickLinks[index] = { ...newQuickLinks[index], [field]: value };
    setEditedConfig({ ...editedConfig, quickLinks: newQuickLinks });
  };

  const handleContactChange = (field: keyof typeof editedConfig.contact, value: string) => {
    setEditedConfig({
      ...editedConfig,
      contact: {
        ...editedConfig.contact,
        [field]: value
      }
    });
  };

  const handleSocialChange = (platform: keyof typeof editedConfig.contact.social, value: string) => {
    setEditedConfig({
      ...editedConfig,
      contact: {
        ...editedConfig.contact,
        social: {
          ...editedConfig.contact.social,
          [platform]: value
        }
      }
    });
  };

  const handleCopyrightChange = (field: keyof typeof editedConfig.copyright, value: string) => {
    setEditedConfig({
      ...editedConfig,
      copyright: {
        ...editedConfig.copyright,
        [field]: value
      }
    });
  };

  const LogoEditor = ({ 
    institution, 
    index, 
    onChange 
  }: { 
    institution: typeof editedConfig.institutions[0], 
    index: number, 
    onChange: (index: number, field: keyof typeof editedConfig.institutions[0], value: string) => void 
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [logoUrl, setLogoUrl] = useState(institution.logo);
    
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    
    const handleDragLeave = () => {
      setIsDragging(false);
    };
    
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          // In a real implementation, you would upload this file to storage
          // For now, we'll create a local object URL
          const imageUrl = URL.createObjectURL(file);
          onChange(index, 'logo', imageUrl);
          setShowPopup(false);
        }
      }
    };
    
    const handleUrlSubmit = () => {
      onChange(index, 'logo', logoUrl);
      setShowPopup(false);
    };
    
    if (!isEditing) {
      return institution.logo ? (
        <img 
          src={institution.logo} 
          alt={institution.name} 
          className="h-8 w-auto mr-2" 
        />
      ) : null;
    }
    
    return (
      <div className="relative mr-2">
        {institution.logo ? (
          <div className="group/logo relative"
            onClick={() => setShowPopup(true)}
          >
            <img 
              className="h-8 w-auto" 
              src={institution.logo} 
              alt={institution.name} 
            />
            <div className="absolute cursor-pointer inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded-md">
              <Pencil className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : (
          <div 
            className={`h-8 w-8 border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'} rounded flex items-center justify-center cursor-pointer group/logo`}
            onClick={() => setShowPopup(true)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-gray-400 hover:text-blue-500 hover:border-blue-500" />
            </div>
          </div>
        )}
        
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPopup(false)}>
            <div className="absolute inset-0 bg-black/20" />
            <div 
              className="bg-white shadow-lg rounded-lg p-4 w-[300px] z-10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold mb-3">Set Logo</h3>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">Enter logo URL</label>
                <div className="flex gap-1">
                  <input 
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                    placeholder="https://..."
                  />
                  <Button 
                    size="sm" 
                    className="px-2 py-0 h-[30px]" 
                    onClick={handleUrlSubmit}
                  >
                    Set
                  </Button>
                </div>
              </div>
              
              <div className="mb-1">
                <label className="block text-xs text-gray-600 mb-1">Or drop an image file</label>
                <div 
                  className={`border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'} rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer text-gray-500`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-6 w-6 mb-2" />
                  <p className="text-xs">Drag & drop or click to browse</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPopup(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  

  // Update the EditableContent component (around lines 238-248) with this implementation
  const EditableContent = ({ 
    value, 
    onChange, 
    className = "",
    placeholder = "Edit this text..."
  }: { 
    value: string, 
    onChange: (value: string) => void, 
    className?: string,
    placeholder?: string
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    
    const handleFocus = () => {
      setIsFocused(true);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      setIsFocused(false);
      onChange(e.target.innerText);
    };

    // Style for when the content is empty and not focused
    const placeholderStyle = !value && !isFocused ? "text-gray-400 italic" : "";

    return (
      <div
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`${className} ${isEditing ? 'outline-none border-b border-dashed border-gray-300 focus:border-blue-500' : ''} ${placeholderStyle}`}
      >
        {value || (isFocused ? '' : placeholder)}
      </div>
    );
  };


  return (
    <footer 
      className="mt-16 bg-gray-50 border-t border-gray-200 relative group"
    >      
      {isEditable && !isEditing && (
        <Button
          variant="outline"
          size="icon"
          className="bg-white/10 hover:bg-white/20 absolute top-4 right-4 z-20"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      {isEditing && (
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          <Button size="sm" variant="outline" className="hover:bg-green-500/10" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="hover:bg-red-500/10" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">
              <EditableContent 
                value="Participating Institutions" 
                onChange={() => {}} 
                className="font-semibold"
              />
            </h3>
            <div className="space-y-4">
              {editedConfig.institutions.map((institution, index) => (
                <div key={index} className="flex items-center">
                  {isEditing ? (
                    <div className="flex flex-col w-full">
                      <div className="flex items-center">
                        <LogoEditor 
                          institution={institution} 
                          index={index} 
                          onChange={handleInstitutionChange} 
                        />
                        <EditableContent
                          value={institution.name}
                          onChange={(value) => handleInstitutionChange(index, 'name', value)}
                          className="hover:text-blue-600"
                          placeholder="Enter institution name..."
                        />
                      </div>
                      <div className="ml-10 text-xs text-gray-500 mt-1">
                        Logo URL:&nbsp; <EditableContent
                          value={institution.logo}
                          onChange={(value) => handleInstitutionChange(index, 'logo', value)}
                          className="inline"
                        />
                        <br />
                        Website:&nbsp; <EditableContent
                          value={institution.url}
                          onChange={(value) => handleInstitutionChange(index, 'url', value)}
                          className="inline"
                        />
                      </div>
                    </div>
                  ) : (
                    <a href={institution.url} className="flex items-center hover:text-blue-600">
                      <img src={institution.logo} alt={institution.name} className="h-8 w-auto mr-2" />
                      <span>{institution.name}</span>
                    </a>
                  )}
                </div>
              ))}
              {isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditedConfig({
                    ...editedConfig, 
                    institutions: [...editedConfig.institutions, { name: '', url: '', logo: '' }]
                  })}
                >
                  Add Institution
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">
              <EditableContent 
                value="Quick Links" 
                onChange={() => {}} 
                className="font-semibold"
              />
            </h3>
            <ul className="space-y-2">
              {editedConfig.quickLinks.map((link, index) => (
                <li key={index}>
                  {isEditing ? (
                    <div>
                      <EditableContent
                        value={link.label}
                        onChange={(value) => handleQuickLinkChange(index, 'label', value)}
                        className="hover:text-blue-600"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        URL: <EditableContent
                          value={link.url}
                          onChange={(value) => handleQuickLinkChange(index, 'url', value)}
                          className="inline"
                        />
                      </div>
                    </div>
                  ) : (
                    <a href={link.url} className="hover:text-blue-600" target="_blank">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
              {isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditedConfig({
                    ...editedConfig, 
                    quickLinks: [...editedConfig.quickLinks, { label: '', url: '' }]
                  })}
                >
                  Add Link
                </Button>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">
              <EditableContent 
                value="Connect With Us" 
                onChange={() => {}} 
                className="font-semibold"
              />
            </h3>
            <div className="space-y-4">
              <div className="flex space-x-4">
                {editedConfig.contact.social.twitter && (
                  <a href={editedConfig.contact.social.twitter} className="text-gray-600 hover:text-red-600" target="_blank">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                  </a>
                )}
                {editedConfig.contact.social.linkedin && (
                  <a href={editedConfig.contact.social.linkedin} className="text-gray-600 hover:text-blue-600" target="_blank">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"></path>
                    </svg>
                  </a>
                )}
              </div>
              {isEditing && (
                <div className="text-xs text-gray-500">
                  Twitter URL: <EditableContent
                    value={editedConfig.contact.social.twitter || ''}
                    onChange={(value) => handleSocialChange('twitter', value)}
                    className="inline"
                    placeholder="Add Twitter URL"
                  />
                  <br />
                  LinkedIn URL: <EditableContent
                    value={editedConfig.contact.social.linkedin || ''}
                    onChange={(value) => handleSocialChange('linkedin', value)}
                    className="inline"
                    placeholder="Add LinkedIn URL"
                  />
                </div>
              )}
              <div className="mt-4">
                <h4 className="font-medium mb-2">Contact</h4>
                <p className="text-sm text-gray-600">
                  Email:{' '}
                  {isEditing ? (
                    <EditableContent
                      value={editedConfig.contact.email}
                      onChange={(value) => handleContactChange('email', value)}
                      className="inline"
                    />
                  ) : (
                    <a href={`mailto:${editedConfig.contact.email}`} target="_blank">
                      {editedConfig.contact.email}
                    </a>
                  )}{' '}
                  <br />
                  {(editedConfig.contact.phone || isEditing) && (
                    <>
                      Phone:{' '}
                      <EditableContent
                        value={editedConfig.contact.phone || ''}
                        onChange={(value) => handleContactChange('phone', value)}
                        className="inline"
                        placeholder="Add phone number"
                      />
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-12 pt-8 text-center text-sm text-gray-600">
          <p>
            <EditableContent
              value={editedConfig.copyright.text}
              onChange={(value) => handleCopyrightChange('text', value)}
            />
          </p>
          <p className="mt-2">
            <EditableContent
              value={editedConfig.copyright.subtext || ''}
              onChange={(value) => handleCopyrightChange('subtext', value)}
            />
          </p>
        </div>
      </div>
    </footer>
  );
}
