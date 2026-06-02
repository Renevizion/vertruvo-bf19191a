import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface LeadCardDisplaySettings {
  showEmail: boolean;
  showPhone: boolean;
  showValue: boolean;
  showScore: boolean;
  showSource: boolean;
  showDateReceived: boolean;
  showCompany: boolean;
  showActivities: boolean;
}

interface LeadCardSettingsProps {
  settings: LeadCardDisplaySettings;
  onSettingsChange: (settings: LeadCardDisplaySettings) => void;
}

export const LeadCardSettings = ({ settings, onSettingsChange }: LeadCardSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSettingsChange(localSettings);
    setOpen(false);
  };

  const toggleSetting = (key: keyof LeadCardDisplaySettings) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Card Display
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Lead Cards</DialogTitle>
          <DialogDescription>
            Choose which information to display on lead cards
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="cursor-pointer">Email Address</Label>
            <Switch
              id="email"
              checked={localSettings.showEmail}
              onCheckedChange={() => toggleSetting('showEmail')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="phone" className="cursor-pointer">Phone Number</Label>
            <Switch
              id="phone"
              checked={localSettings.showPhone}
              onCheckedChange={() => toggleSetting('showPhone')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="company" className="cursor-pointer">Company</Label>
            <Switch
              id="company"
              checked={localSettings.showCompany}
              onCheckedChange={() => toggleSetting('showCompany')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="value" className="cursor-pointer">Deal Value</Label>
            <Switch
              id="value"
              checked={localSettings.showValue}
              onCheckedChange={() => toggleSetting('showValue')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="score" className="cursor-pointer">Lead Score</Label>
            <Switch
              id="score"
              checked={localSettings.showScore}
              onCheckedChange={() => toggleSetting('showScore')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="source" className="cursor-pointer">Source</Label>
            <Switch
              id="source"
              checked={localSettings.showSource}
              onCheckedChange={() => toggleSetting('showSource')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dateReceived" className="cursor-pointer">Date Received</Label>
            <Switch
              id="dateReceived"
              checked={localSettings.showDateReceived}
              onCheckedChange={() => toggleSetting('showDateReceived')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="activities" className="cursor-pointer">Recent Activities</Label>
            <Switch
              id="activities"
              checked={localSettings.showActivities}
              onCheckedChange={() => toggleSetting('showActivities')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
