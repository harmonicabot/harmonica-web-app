'use client';

import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { useState } from 'react';
import { removeResourcePermission, updateResourcePermission } from 'app/actions/permissions';

interface VisibilitySettingsProps {
  config: ResultTabsVisibilityConfig;
  onChange: (newConfig: ResultTabsVisibilityConfig) => void;
  isWorkspace?: boolean;
  className?: string;
  isPublic?: boolean;
  resourceId: string;
}

export function VisibilitySettings({ 
  config, 
  onChange, 
  isWorkspace = false, 
  className, 
  isPublic = false, 
  resourceId,
}: VisibilitySettingsProps) {
  const [localIsPublic, setLocalIsPublic] = useState(isPublic);

  const toggleSetting = (key: keyof ResultTabsVisibilityConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };
  
  const handlePublicToggle = async (checked: boolean) => {
    // Update local state immediately for UI feedback
    setLocalIsPublic(checked);    
    try {
      console.log(`Toggling public status for ${isWorkspace ? 'workspace' : 'session'} ${resourceId}: isPublic:`, checked);
      if (checked) {
        updateResourcePermission(resourceId, 'public', 'viewer', isWorkspace ? 'WORKSPACE' : 'SESSION');
      } else {
        removeResourcePermission(resourceId, 'public', isWorkspace ? 'WORKSPACE' : 'SESSION');
      }
    } catch (error) {
      console.error('Error toggling public status:', error);
      // Revert local state on error
      setLocalIsPublic(!checked);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Settings className="h-4 w-4 mr-2" />
          View Settings
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Configure View Settings</DropdownMenuLabel>
        <div className='ml-2 text-sm italic'>Change what visitors can see</div>
        <DropdownMenuSeparator />
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="public-access" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Public Access
            </label>
            <Switch
              id="public-access"
              checked={localIsPublic}
              onCheckedChange={handlePublicToggle}
            />
          </div>
          <div className="text-xs text-gray-500 italic mb-2">
            When public, anyone with the link can view without logging in
          </div>
          <DropdownMenuSeparator />
      
          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="summary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Show Summary
            </label>
            <Switch
              id="summary"
              checked={config.showSummary}
              onCheckedChange={() => toggleSetting('showSummary')}
            />
          </div>
          
          {!isWorkspace && (
            <div className="flex items-center justify-between space-x-2">
              <label htmlFor="recap" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Show Session Recap
              </label>
              <Switch
                id="recap"
                checked={config.showSessionRecap}
                onCheckedChange={() => toggleSetting('showSessionRecap')}
              />
            </div>
          )}

          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="participants" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Show Participants
            </label>
            <Switch
              id="participants"
              checked={config.showParticipants}
              onCheckedChange={() => toggleSetting('showParticipants')}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="insights" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Show Custom Insights
            </label>
            <Switch
              id="insights"
              checked={config.showCustomInsights}
              onCheckedChange={() => toggleSetting('showCustomInsights')}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="insights" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Show SimScore
            </label>
            <Switch
              id="simscore"
              checked={config.showSimScore}
              onCheckedChange={() => toggleSetting('showSimScore')}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="chat" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Show Chat
            </label>
            <Switch
              id="chat"
              checked={config.showChat}
              onCheckedChange={() => toggleSetting('showChat')}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="edit-insights" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Allow Editing Insights
            </label>
            <Switch
              id="edit-insights"
              checked={config.allowCustomInsightsEditing}
              onCheckedChange={() => toggleSetting('allowCustomInsightsEditing')}
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 