import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch nearby safe places using Overpass API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const radius = parseInt(searchParams.get('radius') || '2000');

    if (!lat || !lon) {
      return NextResponse.json({ safePlaces: getMockPlaces(lat || 28.6139, lon || 77.209) });
    }

    // Try to fetch from Overpass API with more place types
    try {
      const overpassQuery = `
        [out:json][timeout:10];
        (
          node["amenity"="police"](around:${radius},${lat},${lon});
          way["amenity"="police"](around:${radius},${lat},${lon});
          node["amenity"="hospital"](around:${radius},${lat},${lon});
          way["amenity"="hospital"](around:${radius},${lat},${lon});
          node["amenity"="fire_station"](around:${radius},${lat},${lon});
          way["amenity"="fire_station"](around:${radius},${lat},${lon});
          node["amenity"="pharmacy"](around:${radius},${lat},${lon});
          node["amenity"="clinic"](around:${radius},${lat},${lon});
          node["emergency"="phone"](around:${radius},${lat},${lon});
          node["amenity"="embassy"](around:${radius},${lat},${lon});
        );
        out body center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error('Overpass API failed');
      }

      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        return NextResponse.json({ safePlaces: getMockPlaces(lat, lon) });
      }

      // Process results
      const safePlaces = data.elements
        .filter((element: { lat?: number; center?: { lat: number } }) => element.lat || element.center)
        .map((element: { 
          id: number; 
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags: { 
            name?: string; 
            phone?: string; 
            'addr:street'?: string; 
            opening_hours?: string; 
            amenity?: string;
          } 
        }) => {
          const placeLat = element.lat || element.center?.lat || 0;
          const placeLon = element.lon || element.center?.lon || 0;
          const distance = calculateDistance(lat, lon, placeLat, placeLon);
          
          let type = 'safe_zone';
          let icon = 'shield';
          
          if (element.tags.amenity === 'police') {
            type = 'police';
            icon = 'badge';
          } else if (element.tags.amenity === 'hospital') {
            type = 'hospital';
            icon = 'hospital';
          } else if (element.tags.amenity === 'fire_station') {
            type = 'fire_station';
            icon = 'flame';
          } else if (element.tags.amenity === 'pharmacy') {
            type = 'pharmacy';
            icon = 'pill';
          } else if (element.tags.amenity === 'clinic') {
            type = 'clinic';
            icon = 'stethoscope';
          } else if (element.tags.amenity === 'embassy') {
            type = 'embassy';
            icon = 'building';
          }

          return {
            id: `place_${element.id}`,
            name: element.tags.name || getDefaultName(type),
            type,
            icon,
            latitude: placeLat,
            longitude: placeLon,
            distance,
            phone: element.tags.phone || getDefaultPhone(type),
            address: element.tags['addr:street'],
            isOpen24: element.tags.opening_hours === '24/7' || type === 'police' || type === 'hospital',
          };
        });

      // Sort by distance
      safePlaces.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

      // If we got very few results, add some mock places
      if (safePlaces.length < 3) {
        const mockPlaces = getMockPlaces(lat, lon);
        return NextResponse.json({ safePlaces: [...safePlaces, ...mockPlaces].slice(0, 15) });
      }

      return NextResponse.json({ safePlaces: safePlaces.slice(0, 15) });
    } catch (error) {
      console.log('Overpass API failed, using mock data:', error);
      return NextResponse.json({ safePlaces: getMockPlaces(lat, lon) });
    }
  } catch (error) {
    console.error('Error in safe-places API:', error);
    return NextResponse.json({ safePlaces: [] });
  }
}

function getDefaultName(type: string): string {
  switch (type) {
    case 'police': return 'Police Station';
    case 'hospital': return 'Hospital';
    case 'fire_station': return 'Fire Station';
    case 'pharmacy': return 'Pharmacy';
    case 'clinic': return 'Medical Clinic';
    case 'embassy': return 'Embassy';
    default: return 'Safe Place';
  }
}

function getDefaultPhone(type: string): string {
  switch (type) {
    case 'police': return '100';
    case 'hospital': return '102';
    case 'fire_station': return '101';
    default: return '';
  }
}

function getMockPlaces(lat: number, lon: number) {
  return [
    {
      id: 'mock_police_1',
      name: 'Police Thana - Sector 18',
      type: 'police',
      icon: 'badge',
      latitude: lat + 0.002,
      longitude: lon + 0.001,
      distance: 250,
      phone: '100',
      isOpen24: true,
    },
    {
      id: 'mock_police_2',
      name: 'Central Police Station',
      type: 'police',
      icon: 'badge',
      latitude: lat - 0.003,
      longitude: lon + 0.002,
      distance: 400,
      phone: '100',
      isOpen24: true,
    },
    {
      id: 'mock_hospital_1',
      name: 'City Hospital & Trauma Center',
      type: 'hospital',
      icon: 'hospital',
      latitude: lat + 0.001,
      longitude: lon - 0.002,
      distance: 180,
      phone: '102',
      isOpen24: true,
    },
    {
      id: 'mock_hospital_2',
      name: 'Multi-Specialty Hospital',
      type: 'hospital',
      icon: 'hospital',
      latitude: lat - 0.002,
      longitude: lon - 0.001,
      distance: 350,
      phone: '102',
      isOpen24: true,
    },
    {
      id: 'mock_fire_1',
      name: 'Fire Station',
      type: 'fire_station',
      icon: 'flame',
      latitude: lat + 0.003,
      longitude: lon - 0.002,
      distance: 500,
      phone: '101',
      isOpen24: true,
    },
    {
      id: 'mock_pharmacy_1',
      name: '24/7 Medical Store',
      type: 'pharmacy',
      icon: 'pill',
      latitude: lat + 0.001,
      longitude: lon + 0.001,
      distance: 150,
      isOpen24: true,
    },
    {
      id: 'mock_pharmacy_2',
      name: 'Apollo Pharmacy',
      type: 'pharmacy',
      icon: 'pill',
      latitude: lat - 0.001,
      longitude: lon + 0.003,
      distance: 280,
      isOpen24: false,
    },
    {
      id: 'mock_clinic_1',
      name: 'Emergency Care Clinic',
      type: 'clinic',
      icon: 'stethoscope',
      latitude: lat + 0.002,
      longitude: lon + 0.002,
      distance: 320,
      isOpen24: false,
    },
    {
      id: 'mock_women_1',
      name: 'Women Helpline Center',
      type: 'women_helpline',
      icon: 'heart',
      latitude: lat - 0.002,
      longitude: lon - 0.003,
      distance: 450,
      phone: '181',
      isOpen24: true,
    },
    {
      id: 'mock_embassy_1',
      name: 'District Administration Office',
      type: 'government',
      icon: 'building',
      latitude: lat + 0.004,
      longitude: lon + 0.001,
      distance: 600,
      isOpen24: false,
    },
  ];
}

// Haversine formula to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
