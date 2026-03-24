'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  MapPin, 
  Volume2, 
  Vibrate, 
  MessageSquare,
  Bell,
  Shield,
  Info,
  MessageCircle,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Save,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useRakshaStore } from '@/store/raksha-store';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  className?: string;
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const { settings, updateSettings } = useRakshaStore();
  const [localMessage, setLocalMessage] = useState(settings.alertMessage);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [enableTelegram, setEnableTelegram] = useState(false);
  const [smsWebhookUrl, setSmsWebhookUrl] = useState('');
  const [enableSMS, setEnableSMS] = useState(false);
  const [emailWebhookUrl, setEmailWebhookUrl] = useState('');
  const [enableEmail, setEnableEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        if (data.user?.settings) {
          setTelegramBotToken(data.user.settings.telegramBotToken || '');
          setEnableTelegram(data.user.settings.enableTelegram || false);
          setSmsWebhookUrl(data.user.settings.smsWebhookUrl || '');
          setEnableSMS(data.user.settings.enableSMS || false);
          setEmailWebhookUrl(data.user.settings.emailWebhookUrl || '');
          setEnableEmail(data.user.settings.enableEmail || false);
          setLocalMessage(data.user.settings.alertMessage || settings.alertMessage);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, [settings.alertMessage]);

  const handleSaveMessage = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { alertMessage: localMessage },
        }),
      });
      updateSettings({ alertMessage: localMessage });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  const handleSaveTelegram = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            telegramBotToken,
            enableTelegram,
          },
        }),
      });
      updateSettings({ telegramBotToken, enableTelegram });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  const handleSaveSMS = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            smsWebhookUrl,
            enableSMS,
          },
        }),
      });
      updateSettings({ enableSMS });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  const handleSaveEmail = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            emailWebhookUrl,
            enableEmail,
          },
        }),
      });
      updateSettings({ enableEmail });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Telegram Setup Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Telegram Notifications
            </CardTitle>
            {enableTelegram && telegramBotToken && (
              <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          <CardDescription className="text-zinc-500">
            Get real-time emergency alerts via Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Setup Instructions */}
          <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
            <p className="text-zinc-300 font-medium mb-2">📱 How to set up Telegram alerts:</p>
            <ol className="text-zinc-400 space-y-1 text-xs list-decimal list-inside">
              <li>Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">@BotFather <ExternalLink className="w-3 h-3" /></a></li>
              <li>Copy your bot token (looks like: 123456789:ABC...)</li>
              <li>Paste it below and enable Telegram notifications</li>
              <li>Add your contacts&apos; Telegram Chat IDs (message <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">@userinfobot <ExternalLink className="w-3 h-3" /></a> to get it)</li>
            </ol>
          </div>

          {/* Bot Token Input */}
          <div>
            <Label className="text-white text-sm">Bot Token</Label>
            <Input
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="bg-zinc-800 border-zinc-700 text-white mt-1 font-mono text-sm"
              type="password"
            />
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white text-sm">Enable Telegram Alerts</Label>
              <p className="text-zinc-500 text-xs">Send alerts via Telegram when SOS is triggered</p>
            </div>
            <Switch
              checked={enableTelegram}
              onCheckedChange={setEnableTelegram}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          {/* Save Button */}
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleSaveTelegram}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Telegram Settings</>}
          </Button>
        </CardContent>
      </Card>

      {/* SMS Setup Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Phone className="w-5 h-5 text-green-500" />
              SMS Notifications
            </CardTitle>
            {enableSMS && smsWebhookUrl && (
              <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          <CardDescription className="text-zinc-500">
            Send emergency alerts via SMS to phone numbers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Setup Instructions */}
          <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
            <p className="text-zinc-300 font-medium mb-2">📱 SMS Setup Options:</p>
            <ul className="text-zinc-400 space-y-1 text-xs list-disc list-inside">
              <li><strong>Twilio:</strong> Create a Twilio Function and add the webhook URL</li>
              <li><strong>MSG91:</strong> Use their API endpoint as webhook</li>
              <li><strong>TextLocal:</strong> Configure their API URL</li>
              <li><strong>Custom:</strong> Any webhook that accepts POST requests</li>
            </ul>
          </div>

          {/* Webhook URL Input */}
          <div>
            <Label className="text-white text-sm">SMS Webhook URL</Label>
            <Input
              value={smsWebhookUrl}
              onChange={(e) => setSmsWebhookUrl(e.target.value)}
              placeholder="https://api.twilio.com/..."
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm"
            />
            <p className="text-zinc-500 text-xs mt-1">Webhook receives: to, message, latitude, longitude, timestamp</p>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white text-sm">Enable SMS Alerts</Label>
              <p className="text-zinc-500 text-xs">Send alerts via SMS to emergency contacts</p>
            </div>
            <Switch
              checked={enableSMS}
              onCheckedChange={setEnableSMS}
              className="data-[state=checked]:bg-green-600"
            />
          </div>

          {/* Save Button */}
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handleSaveSMS}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save SMS Settings</>}
          </Button>
        </CardContent>
      </Card>

      {/* Email Setup Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Mail className="w-5 h-5 text-purple-500" />
              Email Notifications
            </CardTitle>
            {enableEmail && emailWebhookUrl && (
              <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          <CardDescription className="text-zinc-500">
            Send emergency alerts via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Setup Instructions */}
          <div className="bg-zinc-800/50 rounded-lg p-3 text-sm">
            <p className="text-zinc-300 font-medium mb-2">📧 Email Setup Options:</p>
            <ul className="text-zinc-400 space-y-1 text-xs list-disc list-inside">
              <li><strong>Resend:</strong> Create an API endpoint and add the URL</li>
              <li><strong>SendGrid:</strong> Use their webhook integration</li>
              <li><strong>Amazon SES:</strong> Configure Lambda + API Gateway</li>
            </ul>
          </div>

          {/* Webhook URL Input */}
          <div>
            <Label className="text-white text-sm">Email Webhook URL</Label>
            <Input
              value={emailWebhookUrl}
              onChange={(e) => setEmailWebhookUrl(e.target.value)}
              placeholder="https://api.resend.com/..."
              className="bg-zinc-800 border-zinc-700 text-white mt-1 text-sm"
            />
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white text-sm">Enable Email Alerts</Label>
              <p className="text-zinc-500 text-xs">Send alerts via email to contacts</p>
            </div>
            <Switch
              checked={enableEmail}
              onCheckedChange={setEnableEmail}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          {/* Save Button */}
          <Button
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={handleSaveEmail}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Email Settings</>}
          </Button>
        </CardContent>
      </Card>

      {/* General Settings Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Settings className="w-5 h-5 text-red-500" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Settings */}
          <div className="space-y-3">
            <h4 className="text-zinc-400 text-xs uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Location
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-sm">Auto-share Location</Label>
                <p className="text-zinc-500 text-xs">Automatically share location in emergencies</p>
              </div>
              <Switch
                checked={settings.autoShareLocation}
                onCheckedChange={(checked) => updateSettings({ autoShareLocation: checked })}
                className="data-[state=checked]:bg-red-600"
              />
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Alert Settings */}
          <div className="space-y-3">
            <h4 className="text-zinc-400 text-xs uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Alert Message
            </h4>
            <div className="space-y-2">
              <Input
                value={localMessage}
                onChange={(e) => setLocalMessage(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white text-sm"
                placeholder="Emergency alert message..."
              />
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800"
                onClick={handleSaveMessage}
                disabled={isSaving}
              >
                Save Message
              </Button>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Notification Settings */}
          <div className="space-y-3">
            <h4 className="text-zinc-400 text-xs uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-3 h-3" />
              App Notifications
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-sm">Sound Alerts</Label>
                <p className="text-zinc-500 text-xs">Play alarm when SOS is activated</p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                className="data-[state=checked]:bg-red-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-sm">Vibration</Label>
                <p className="text-zinc-500 text-xs">Vibrate device during emergencies</p>
              </div>
              <Switch
                checked={settings.vibrationEnabled}
                onCheckedChange={(checked) => updateSettings({ vibrationEnabled: checked })}
                className="data-[state=checked]:bg-red-600"
              />
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* About */}
          <div className="space-y-3">
            <h4 className="text-zinc-400 text-xs uppercase tracking-wider flex items-center gap-2">
              <Info className="w-3 h-3" />
              About
            </h4>
            <div className="text-sm text-zinc-500 space-y-1">
              <p><strong className="text-zinc-400">RakshaTap</strong> v1.0.0</p>
              <p>One-tap emergency safety platform</p>
              <p className="text-xs text-zinc-600 mt-2">
                Designed for real-life danger situations where every second matters.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Status */}
      {saveStatus === 'saved' && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-950/50 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          Settings saved successfully!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          Failed to save settings
        </div>
      )}
    </div>
  );
}
