'use client';

import { useSyncExternalStore, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Wifi, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Custom hook for online status that works with SSR
function useOnlineStatus() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    return navigator.onLine;
  }, []);

  const getServerSnapshot = useCallback(() => {
    // Always return true on server to match initial client render
    return true;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ServiceWorkerRegistration() {
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('SW registered:', registration.scope);
          
          // Force update check
          registration.update().catch(() => {});
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available!');
                  // Auto-activate new version
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
        
      // Handle controller change (new version activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
      });
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    (deferredPrompt as BeforeInstallPromptEvent).prompt();

    // Wait for the user's response
    const { outcome } = await (deferredPrompt as BeforeInstallPromptEvent).userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
      setIsInstallable(false);
      setShowInstallBanner(false);
    }

    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm"
          >
            <WifiOff className="w-4 h-4" />
            <span>You&apos;re offline - Core features still work!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install Banner */}
      <AnimatePresence>
        {showInstallBanner && isInstallable && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-[100] bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Install RakshaTap</p>
                <p className="text-zinc-400 text-xs">Add to home screen for offline access</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setShowInstallBanner(false)}
                >
                  Later
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleInstall}
                >
                  Install
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed bottom-24 right-4 z-50 bg-amber-600 rounded-full p-2 shadow-lg">
          <WifiOff className="w-5 h-5 text-white" />
        </div>
      )}
    </>
  );
}

// Type for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA Status Component
export function PWAStatus() {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-500 text-xs">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-amber-500" />
          <span className="text-amber-500 text-xs">Offline Mode</span>
        </>
      )}
    </div>
  );
}
