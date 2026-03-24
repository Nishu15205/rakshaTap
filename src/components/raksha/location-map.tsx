'use client';

import { Shield, Building2, Hospital, Home, Phone, Navigation, Flame, Pill, Stethoscope, Heart, ExternalLink } from 'lucide-react';
import { useRakshaStore } from '@/store/raksha-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LocationMapProps {
  showNearbyPlaces?: boolean;
  className?: string;
}

// Re-export from the wrapper
export { LocationMap } from './map-wrapper';

interface SafePlacesListProps {
  className?: string;
}

export function SafePlacesList({ className }: SafePlacesListProps) {
  const { safePlaces, currentLocation } = useRakshaStore();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'police':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'hospital':
        return <Hospital className="w-4 h-4 text-green-500" />;
      case 'fire_station':
        return <Flame className="w-4 h-4 text-red-500" />;
      case 'pharmacy':
        return <Pill className="w-4 h-4 text-purple-500" />;
      case 'clinic':
        return <Stethoscope className="w-4 h-4 text-cyan-500" />;
      case 'women_helpline':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'shelter':
        return <Home className="w-4 h-4 text-amber-500" />;
      default:
        return <Building2 className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'police':
        return 'bg-blue-950 border-blue-700 text-blue-400';
      case 'hospital':
        return 'bg-green-950 border-green-700 text-green-400';
      case 'fire_station':
        return 'bg-red-950 border-red-700 text-red-400';
      case 'pharmacy':
        return 'bg-purple-950 border-purple-700 text-purple-400';
      case 'clinic':
        return 'bg-cyan-950 border-cyan-700 text-cyan-400';
      case 'women_helpline':
        return 'bg-pink-950 border-pink-700 text-pink-400';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    }
  };

  // Call the place
  const callPlace = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  // Get directions to the place
  const getDirections = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  // View on map
  const viewOnMap = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const sortedPlaces = [...safePlaces].sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-blue-500" />
            Nearby Safe Places
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-zinc-800 border-zinc-700 text-zinc-400">
            {sortedPlaces.length} found
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {sortedPlaces.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No nearby safe places found</p>
            <p className="text-zinc-600 text-xs mt-1">
              Enable location to search
            </p>
          </div>
        ) : (
          sortedPlaces.map((place) => (
            <div
              key={place.id}
              className="flex flex-col gap-2 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700">
                  {getTypeIcon(place.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">{place.name}</p>
                    {place.isOpen24 && (
                      <Badge variant="outline" className="text-xs bg-green-950 border-green-700 text-green-400">
                        24/7
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn('text-xs', getTypeColor(place.type))}>
                      {place.type.replace('_', ' ')}
                    </Badge>
                    {place.distance && (
                      <span className="text-zinc-500 text-xs">
                        {place.distance < 1000
                          ? `${place.distance.toFixed(0)}m away`
                          : `${(place.distance / 1000).toFixed(1)}km away`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2 ml-13">
                {place.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-green-700 text-green-400 hover:bg-green-950"
                    onClick={() => callPlace(place.phone)}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-blue-700 text-blue-400 hover:bg-blue-950"
                  onClick={() => getDirections(place.latitude, place.longitude)}
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  Directions
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  onClick={() => viewOnMap(place.latitude, place.longitude)}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
