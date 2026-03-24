'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRakshaStore } from '@/store/raksha-store';

// Dynamic import for map component to avoid SSR issues with Leaflet
const LocationMapComponent = dynamic(
  () => import('./location-map-client').then((mod) => mod.LocationMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="bg-zinc-900 rounded-xl flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading map...</div>
      </div>
    ),
  }
);

interface LocationMapProps {
  showNearbyPlaces?: boolean;
  className?: string;
}

// Custom hook for online status
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

export function LocationMap({ showNearbyPlaces = true, className }: LocationMapProps) {
  const isOnline = useOnlineStatus();
  const { currentLocation, safePlaces } = useRakshaStore();
  
  // Show offline map placeholder
  if (!isOnline) {
    return (
      <div className={cn('bg-zinc-900 rounded-xl flex flex-col items-center justify-center h-64 p-4', className)}>
        <WifiOff className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-white font-medium text-center">Map Offline</p>
        <p className="text-zinc-400 text-sm text-center mt-2">
          Internet connection required for map tiles
        </p>
        
        {/* Show cached location info */}
        {currentLocation && (
          <div className="mt-4 bg-zinc-800 rounded-lg p-3 w-full max-w-xs">
            <div className="flex items-center gap-2 text-white text-sm">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>Last Known Location</span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </p>
            <a 
              href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-xs mt-2 block hover:underline"
            >
              Open in Google Maps
            </a>
          </div>
        )}
        
        {/* Show nearby places count */}
        {safePlaces.length > 0 && (
          <div className="mt-2 text-zinc-500 text-xs">
            {safePlaces.length} nearby safe places cached
          </div>
        )}
      </div>
    );
  }
  
  return (
    <LocationMapComponent
      showNearbyPlaces={showNearbyPlaces}
      className={className}
    />
  );
}
