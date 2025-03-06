'use client';
import React, { useState, useRef, useEffect } from 'react';
import { FooterConfig } from './footer';
import { Check, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/permissions';
import * as db from '@/lib/db';

interface FooterProps {
  workspaceId: string;
  config: FooterConfig;
  onUpdate?: (config: FooterConfig) => void;
}

export function Footer({ workspaceId, config, onUpdate }: FooterProps) {
  const { loading, hasMinimumRole } = usePermissions(workspaceId)
  const [isEditable, setIsEditable] = useState(true);
  const [isEditing, setIsEditing] = useState(true);
  const [editedConfig, setEditedConfig] = useState<FooterConfig>(config);

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
    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      onChange(e.target.innerText);
    };

    return (
      <div
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        onBlur={handleBlur}
        className={`${className} ${isEditing ? 'outline-none border-b border-dashed border-gray-300 focus:border-blue-500' : ''}`}
        data-placeholder={placeholder}
      >
        {value || (isEditing ? '' : placeholder)}
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
                        <img 
                          src={institution.logo} 
                          alt={institution.name} 
                          className="h-8 w-auto mr-2" 
                        />
                        <EditableContent
                          value={institution.name}
                          onChange={(value) => handleInstitutionChange(index, 'name', value)}
                          className="hover:text-blue-600"
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
