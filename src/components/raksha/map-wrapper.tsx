'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

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

export function LocationMap({ showNearbyPlaces = true, className }: LocationMapProps) {
  return (
    <LocationMapComponent
      showNearbyPlaces={showNearbyPlaces}
      className={className}
    />
  );
}
