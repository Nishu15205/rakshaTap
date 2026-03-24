'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useRakshaStore } from '@/store/raksha-store';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const userIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: linear-gradient(135deg, #ef4444, #dc2626);
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const policeIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: #3b82f6;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const hospitalIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: #22c55e;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const fireStationIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: #ef4444;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const pharmacyIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: #a855f7;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(168, 85, 247, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"></path>
        <circle cx="18" cy="18" r="3"></circle>
        <path d="M18 14v8"></path>
        <path d="M14 18h8"></path>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const clinicIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: #06b6d4;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(6, 182, 212, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const womenHelplineIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: #ec4899;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(236, 72, 153, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const safeZoneIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background: #eab308;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(234, 179, 8, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapUpdater() {
  const { currentLocation } = useRakshaStore();
  const map = useMap();

  useEffect(() => {
    if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 15);
    }
  }, [currentLocation, map]);

  return null;
}

function getIconForPlaceType(type: string) {
  switch (type) {
    case 'police':
      return policeIcon;
    case 'hospital':
      return hospitalIcon;
    case 'fire_station':
      return fireStationIcon;
    case 'pharmacy':
      return pharmacyIcon;
    case 'clinic':
      return clinicIcon;
    case 'women_helpline':
      return womenHelplineIcon;
    case 'safe_zone':
    case 'shelter':
    case 'embassy':
    case 'government':
    default:
      return safeZoneIcon;
  }
}

interface LocationMapClientProps {
  showNearbyPlaces?: boolean;
  className?: string;
}

export function LocationMapClient({ showNearbyPlaces = true, className }: LocationMapClientProps) {
  const { currentLocation, isLocationLoading, locationError, safePlaces } = useRakshaStore();

  // Default location if geolocation not available
  const defaultCenter: [number, number] = currentLocation
    ? [currentLocation.latitude, currentLocation.longitude]
    : [28.6139, 77.209]; // Default to New Delhi

  return (
    <div className={cn('relative rounded-xl overflow-hidden', className)}>
      <MapContainer
        center={defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater />

        {/* User location marker */}
        {currentLocation && (
          <>
            <Circle
              center={[currentLocation.latitude, currentLocation.longitude]}
              radius={currentLocation.accuracy || 50}
              pathOptions={{
                fillColor: '#ef4444',
                fillOpacity: 0.15,
                color: '#ef4444',
                weight: 1,
              }}
            />
            <Marker
              position={[currentLocation.latitude, currentLocation.longitude]}
              icon={userIcon}
            >
              <Popup>
                <div className="text-center">
                  <strong>Your Location</strong>
                  <p className="text-xs text-gray-500">
                    Accuracy: {currentLocation.accuracy?.toFixed(0) || 'Unknown'}m
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Nearby safe places */}
        {showNearbyPlaces &&
          safePlaces.map((place) => (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={getIconForPlaceType(place.type)}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <strong className="block mb-1">{place.name}</strong>
                  <p className="text-xs text-gray-500 capitalize">{place.type.replace('_', ' ')}</p>
                  {place.distance && (
                    <p className="text-xs text-blue-500">{place.distance.toFixed(0)}m away</p>
                  )}
                  {place.phone && (
                    <p className="text-xs mt-1">
                      <a href={`tel:${place.phone}`} className="text-blue-600 underline">
                        {place.phone}
                      </a>
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Loading overlay */}
      {isLocationLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-zinc-900 px-4 py-2 rounded-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">Getting location...</span>
          </div>
        </div>
      )}

      {/* Location error */}
      {locationError && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-red-950 border border-red-800 px-3 py-2 rounded-lg text-red-300 text-sm">
            {locationError}
          </div>
        </div>
      )}
    </div>
  );
}
