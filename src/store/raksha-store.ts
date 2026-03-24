import { create } from 'zustand';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  telegramChatId?: string;
  relationship?: string;
  isPrimary: boolean;
  priority: number;
}

export interface SafePlace {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'fire_station' | 'pharmacy' | 'clinic' | 'women_helpline' | 'embassy' | 'government' | 'safe_zone' | 'shelter';
  icon?: string;
  latitude: number;
  longitude: number;
  distance?: number;
  address?: string;
  phone?: string;
  isOpen24?: boolean;
}

export interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  status: string;
  notificationType?: string;
  createdAt: string;
}

interface NotificationResult {
  telegram?: { success: boolean };
  sms?: { success: boolean };
  email?: { success: boolean };
}

interface RakshaState {
  // Location
  currentLocation: Location | null;
  isLocationLoading: boolean;
  locationError: string | null;
  setCurrentLocation: (location: Location | null) => void;
  setLocationLoading: (loading: boolean) => void;
  setLocationError: (error: string | null) => void;

  // Emergency Contacts
  contacts: EmergencyContact[];
  setContacts: (contacts: EmergencyContact[]) => void;
  addContact: (contact: EmergencyContact) => void;
  updateContact: (id: string, contact: Partial<EmergencyContact>) => void;
  removeContact: (id: string) => void;

  // Safe Places
  safePlaces: SafePlace[];
  setSafePlaces: (places: SafePlace[]) => void;

  // SOS State
  isSOSActive: boolean;
  sosStartTime: number | null;
  sosAlerts: Alert[];
  lastNotificationResults: NotificationResult | null;
  activateSOS: () => void;
  deactivateSOS: () => void;
  addAlert: (alert: Alert) => void;
  setSosAlerts: (alerts: Alert[]) => void;
  setNotificationResults: (results: NotificationResult | null) => void;

  // Voice Activation State
  isVoiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;

  // UI State
  activeTab: 'home' | 'contacts' | 'map' | 'settings' | 'history' | 'ai';
  setActiveTab: (tab: 'home' | 'contacts' | 'map' | 'settings' | 'history' | 'ai') => void;
  
  // Settings
  settings: {
    autoShareLocation: boolean;
    alertMessage: string;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    telegramBotToken?: string;
    enableTelegram: boolean;
    enableSMS: boolean;
    enableEmail: boolean;
    voiceActivation: boolean;
    offlineMode: boolean;
  };
  updateSettings: (settings: Partial<RakshaState['settings']>) => void;
}

export const useRakshaStore = create<RakshaState>((set) => ({
  // Location
  currentLocation: null,
  isLocationLoading: true,
  locationError: null,
  setCurrentLocation: (location) => set({ currentLocation: location }),
  setLocationLoading: (loading) => set({ isLocationLoading: loading }),
  setLocationError: (error) => set({ locationError: error }),

  // Emergency Contacts
  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
  updateContact: (id, contact) => set((state) => ({
    contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...contact } : c)),
  })),
  removeContact: (id) => set((state) => ({
    contacts: state.contacts.filter((c) => c.id !== id),
  })),

  // Safe Places
  safePlaces: [],
  setSafePlaces: (places) => set({ safePlaces: places }),

  // SOS State
  isSOSActive: false,
  sosStartTime: null,
  sosAlerts: [],
  lastNotificationResults: null,
  activateSOS: () => set({ isSOSActive: true, sosStartTime: Date.now() }),
  deactivateSOS: () => set({ isSOSActive: false, sosStartTime: null, lastNotificationResults: null }),
  addAlert: (alert) => set((state) => ({ sosAlerts: [...state.sosAlerts, alert] })),
  setSosAlerts: (alerts) => set({ sosAlerts: alerts }),
  setNotificationResults: (results) => set({ lastNotificationResults: results }),

  // Voice Activation
  isVoiceEnabled: false,
  setVoiceEnabled: (enabled) => set({ isVoiceEnabled: enabled }),

  // UI State
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Settings
  settings: {
    autoShareLocation: true,
    alertMessage: 'EMERGENCY! I need help. This is my current location.',
    soundEnabled: true,
    vibrationEnabled: true,
    telegramBotToken: undefined,
    enableTelegram: false,
    enableSMS: false,
    enableEmail: false,
    voiceActivation: true,
    offlineMode: true,
  },
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),
}));
