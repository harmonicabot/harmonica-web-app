'use client';

import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { ResultTabsVisibilityConfig } from '@/lib/types';

interface VisibilitySettingsProps {
  config: ResultTabsVisibilityConfig;
  onChange: (newConfig: ResultTabsVisibilityConfig) => void;
  isWorkspace?: boolean;
  className?: string;
}

export function VisibilitySettings({ config, onChange, isWorkspace, className }: VisibilitySettingsProps) {
  const toggleSetting = (key: keyof ResultTabsVisibilityConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Settings className="h-4 w-4 mr-2" />
          View Settings
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Configure View Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-4 space-y-4">
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