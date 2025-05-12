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
import {
  removeResourcePermission,
  updateResourcePermission,
} from 'app/actions/permissions';

interface VisibilitySettingsProps {
  config: ResultTabsVisibilityConfig;
  onChange: (newConfig: ResultTabsVisibilityConfig) => void;
  isWorkspace?: boolean;
  className?: string;
  resourceId: string;
}

export function VisibilitySettings({
  config,
  onChange,
  isWorkspace = false,
  className,
  resourceId,
}: VisibilitySettingsProps) {
  const toggleSetting = (key: keyof ResultTabsVisibilityConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
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
        <DropdownMenuSeparator />

        <div className="p-4 space-y-4">
          <div className="text-sm italic">Control what visitors can see:</div>
          <div className="flex items-center justify-between space-x-2">
            <label
              htmlFor="summary"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
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
              <label
                htmlFor="recap"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show Session Recap
              </label>
              <Switch
                id="recap"
                checked={config.showSessionRecap}
                onCheckedChange={() => toggleSetting('showSessionRecap')}
              />
            </div>
          )}

          {!isWorkspace && ( // Disabled for workspaces, we show 'sessions' instead, always.
            <div className="flex items-center justify-between space-x-2">
              <label
                htmlFor="responses"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show Responses
              </label>
              <Switch
                id="responses"
                checked={config.showResponses}
                onCheckedChange={() => toggleSetting('showResponses')}
              />
            </div>
          )}

          {!isWorkspace && ( // Disabled for workspaces for now
            <div className="flex items-center justify-between space-x-2">
              <label
                htmlFor="insights"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show Custom Insights
              </label>
              <Switch
                id="insights"
                checked={config.showCustomInsights}
                onCheckedChange={() => toggleSetting('showCustomInsights')}
              />
            </div>
          )}

          {/* Disable SimScore, it's not working well enough.
          
          <div className="flex items-center justify-between space-x-2">
            <label
              htmlFor="insights"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show SimScore
            </label>
            <Switch
              id="simscore"
              checked={config.showSimScore}
              onCheckedChange={() => toggleSetting('showSimScore')}
            />
          </div> */}

          <div className="flex items-center justify-between space-x-2">
            <label
              htmlFor="chat"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show Chat
            </label>
            <Switch
              id="chat"
              checked={config.showChat}
              onCheckedChange={() => toggleSetting('showChat')}
            />
          </div>

          {!isWorkspace && (
            <div className="flex items-center justify-between space-x-2">
              <label
                htmlFor="edit-insights"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Allow Editing Insights
              </label>
              <Switch
                id="edit-insights"
                checked={config.allowCustomInsightsEditing}
                onCheckedChange={() =>
                  toggleSetting('allowCustomInsightsEditing')
                }
              />
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
