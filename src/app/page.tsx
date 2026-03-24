'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, AlertTriangle } from 'lucide-react';
import { SOSButton } from '@/components/raksha/sos-button';
import { LocationMap, SafePlacesList } from '@/components/raksha/location-map';
import { ContactsPanel } from '@/components/raksha/contacts-panel';
import { SettingsPanel } from '@/components/raksha/settings-panel';
import { AlertHistory } from '@/components/raksha/alert-history';
import { Header, BottomNav } from '@/components/raksha/bottom-nav';
import { useRakshaStore } from '@/store/raksha-store';

// Location tracking hook
function useLocationTracking() {
  const {
    setCurrentLocation,
    setLocationLoading,
    setLocationError,
    currentLocation,
    setSafePlaces,
  } = useRakshaStore();

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setLocationLoading(false);
        setLocationError(null);
      },
      (error) => {
        let message = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
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
