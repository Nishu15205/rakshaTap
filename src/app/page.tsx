'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, AlertTriangle, Brain, Mic } from 'lucide-react';
import { SOSButton } from '@/components/raksha/sos-button';
import { LocationMap, SafePlacesList } from '@/components/raksha/location-map';
import { ContactsPanel } from '@/components/raksha/contacts-panel';
import { SettingsPanel } from '@/components/raksha/settings-panel';
import { AlertHistory } from '@/components/raksha/alert-history';
import { Header, BottomNav } from '@/components/raksha/bottom-nav';
import { VoiceSOSPanel, AIAdvisorPanel } from '@/components/raksha/voice-sos';
import { OfflineEmergencyTips } from '@/components/raksha/offline-tips';
import { useRakshaStore } from '@/store/raksha-store';
import { Badge } from '@/components/ui/badge';
import { 
  RunAnywhereStatus, 
  LocalLLMChat, 
  RunAnywhereVoiceInput
} from '@/components/run-anywhere-panel';
import { DocumentScanner } from '@/components/document-scanner';

// Location tracking hook with caching
function useLocationTracking() {
  const {
    setCurrentLocation,
    setLocationLoading,
    setLocationError,
    currentLocation,
    setSafePlaces,
  } = useRakshaStore();

  useEffect(() => {
    // Try to load cached location first
    const cachedLocation = localStorage.getItem('rakshatap_last_location');
    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation);
        setCurrentLocation(parsed);
        setLocationLoading(false);
      } catch {
        // Ignore parse errors
      }
    }

    if (!navigator.geolocation) {
      // Use cached location if available
      if (cachedLocation) {
        setLocationError(null);
      } else {
        setLocationError('Geolocation is not supported by your browser');
      }
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setCurrentLocation(newLocation);
        setLocationLoading(false);
        setLocationError(null);
        
        // Cache the location for offline use
        localStorage.setItem('rakshatap_last_location', JSON.stringify(newLocation));
      },
      (error) => {
        // Don't show error if we have cached location
        if (cachedLocation) {
          setLocationError(null);
        } else {
          let message = 'Unable to get location - Using last known location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Using last known location.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location unavailable. Using last known location.';
              break;
            case error.TIMEOUT:
              message = 'Location timeout. Using last known location.';
              break;
          }
          setLocationError(message);
        }
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Allow cached position up to 1 minute
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [setCurrentLocation, setLocationLoading, setLocationError]);

  // Fetch nearby safe places when location changes
  useEffect(() => {
    if (!currentLocation) return;

    const fetchSafePlaces = async () => {
      try {
        const response = await fetch(
          `/api/safe-places?lat=${currentLocation.latitude}&lon=${currentLocation.longitude}&radius=2000`
        );
        const data = await response.json();
        if (data.safePlaces) {
          setSafePlaces(data.safePlaces);
        }
      } catch {
        // Silent fail for safe places
      }
    };

    fetchSafePlaces();
  }, [currentLocation, setSafePlaces]);
}

// Data loading hook
function useDataLoader() {
  const { setContacts, setSosAlerts, updateSettings } = useRakshaStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Initialize demo data
        await fetch('/api/setup', { method: 'POST' });

        // Load contacts
        const contactsRes = await fetch('/api/contacts');
        const contactsData = await contactsRes.json();
        if (contactsData.contacts) {
          setContacts(
            contactsData.contacts.map(
              (c: {
                id: string;
                name: string;
                phone: string;
                email?: string;
                telegramChatId?: string;
                relationship?: string;
                isPrimary: boolean;
                priority: number;
              }) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                telegramChatId: c.telegramChatId,
                relationship: c.relationship,
                isPrimary: c.isPrimary,
                priority: c.priority,
              })
            )
          );
        }

        // Load alerts
        const alertsRes = await fetch('/api/alerts');
        const alertsData = await alertsRes.json();
        if (alertsData.alerts) {
          setSosAlerts(
            alertsData.alerts.map(
              (a: {
                id: string;
                latitude: number;
                longitude: number;
                address?: string;
                status: string;
                notificationType?: string;
                createdAt: string;
              }) => ({
                id: a.id,
                latitude: a.latitude,
                longitude: a.longitude,
                address: a.address,
                status: a.status,
                notificationType: a.notificationType,
                createdAt: a.createdAt,
              })
            )
          );
        }

        // Load user settings
        const userRes = await fetch('/api/user');
        const userData = await userRes.json();
        if (userData.user?.settings) {
          updateSettings({
            alertMessage: userData.user.settings.alertMessage,
            autoShareLocation: userData.user.settings.autoShareLocation,
            soundEnabled: userData.user.settings.soundEnabled,
            vibrationEnabled: userData.user.settings.vibrationEnabled,
            telegramBotToken: userData.user.settings.telegramBotToken,
            enableTelegram: userData.user.settings.enableTelegram,
            enableSMS: userData.user.settings.enableSMS,
            enableEmail: userData.user.settings.enableEmail,
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [setContacts, setSosAlerts, updateSettings]);
}

// Main Home Tab
function HomeTab() {
  const { currentLocation, contacts, safePlaces, activateSOS, deactivateSOS } = useRakshaStore();

  const handleActivateSOS = useCallback(async () => {
    activateSOS();

    if (currentLocation) {
      try {
        const response = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
          }),
        });
        return await response.json();
      } catch (error) {
        console.error('Error sending alerts:', error);
        throw error;
      }
    }
    return null;
  }, [activateSOS, currentLocation]);

  const handleDeactivateSOS = useCallback(() => {
    deactivateSOS();
  }, [deactivateSOS]);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Status banner */}
      {currentLocation && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Location Active</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            Accuracy: {currentLocation.accuracy?.toFixed(0) || 'Unknown'}m
          </p>
        </motion.div>
      )}

      {/* SOS Button */}
      <SOSButton onActivate={handleActivateSOS} onDeactivate={handleDeactivateSOS} />

      {/* Quick info cards */}
      <div className="w-full max-w-sm mt-8 grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-white font-bold text-xl">{contacts.length}</p>
          <p className="text-zinc-500 text-xs">Emergency Contacts</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-white font-bold text-xl">{safePlaces.length}</p>
          <p className="text-zinc-500 text-xs">Nearby Safe Places</p>
        </div>
      </div>

      {/* Tips */}
      <div className="w-full max-w-sm mt-6 bg-zinc-800/30 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Safety Tips
        </h3>
        <ul className="text-zinc-400 text-xs space-y-1">
          <li>• Hold the SOS button for 3 seconds to activate</li>
          <li>• Your location will be shared with emergency contacts</li>
          <li>• Check the Map tab for nearby police stations</li>
        </ul>
      </div>
    </div>
  );
}

// Map Tab
function MapTab() {
  return (
    <div className="py-4 px-4 space-y-4">
      <LocationMap className="h-64 w-full rounded-xl" showNearbyPlaces />
      <SafePlacesList />
    </div>
  );
}

// AI Tab - Offline-First AI Features with RunAnywhere SDK
function AITab() {
  const { activateSOS, deactivateSOS } = useRakshaStore();

  return (
    <div className="py-4 px-4 space-y-4">
      {/* RunAnywhere SDK Status */}
      <RunAnywhereStatus />

      {/* Local LLM Chat */}
      <LocalLLMChat />

      {/* Voice-Activated SOS */}
      <VoiceSOSPanel 
        onVoiceActivate={activateSOS}
        onVoiceDeactivate={deactivateSOS}
      />

      {/* RunAnywhere Voice Input */}
      <RunAnywhereVoiceInput />

      {/* Document Scanner */}
      <DocumentScanner />

      {/* AI Emergency Advisor */}
      <AIAdvisorPanel />

      {/* Offline Emergency Tips */}
      <OfflineEmergencyTips />

      {/* Features Highlight */}
      <div className="bg-gradient-to-r from-purple-950/50 to-red-950/50 rounded-xl p-4 border border-purple-800/50">
        <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          RunAnywhere SDK Features
        </h3>
        <ul className="text-zinc-300 text-xs space-y-2">
          <li className="flex items-center gap-2">
            <Brain className="w-3 h-3 text-purple-400" />
            Local LLM (WebLLM) - Dynamic AI responses offline
          </li>
          <li className="flex items-center gap-2">
            <Mic className="w-3 h-3 text-red-400" />
            Whisper STT - Voice recognition offline
          </li>
          <li className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-green-400" />
            Vision AI - Document scanning
          </li>
          <li className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Zero Cloud Costs - All AI runs locally
          </li>
        </ul>
      </div>
    </div>
  );
}

// Main App Component
function RakshaApp() {
  const { activeTab } = useRakshaStore();

  // Initialize location tracking
  useLocationTracking();

  // Load data from API
  useDataLoader();

  const tabs = {
    home: <HomeTab />,
    contacts: (
      <div className="py-4 px-4">
        <ContactsPanel />
      </div>
    ),
    ai: <AITab />,
    map: <MapTab />,
    history: (
      <div className="py-4 px-4">
        <AlertHistory />
      </div>
    ),
    settings: (
      <div className="py-4 px-4">
        <SettingsPanel />
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Header />

      <main className="flex-1 pt-14 pb-20 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-lg mx-auto"
          >
            {tabs[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}

export default function Page() {
  return <RakshaApp />;
}
