'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { History, MapPin, Clock, CheckCircle, AlertTriangle, Phone, ExternalLink, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRakshaStore } from '@/store/raksha-store';
import { cn } from '@/lib/utils';

interface AlertHistoryProps {
  className?: string;
}

export function AlertHistory({ className }: AlertHistoryProps) {
  const { sosAlerts } = useRakshaStore();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-yellow-950 border-yellow-700 text-yellow-400';
      case 'delivered':
        return 'bg-blue-950 border-blue-700 text-blue-400';
      case 'acknowledged':
        return 'bg-green-950 border-green-700 text-green-400';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    }
  };

  // Open location in Google Maps
  const openLocation = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Get directions in Google Maps
  const getDirections = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <History className="w-5 h-5 text-red-500" />
          Alert History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {sosAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No emergency alerts yet</p>
            <p className="text-zinc-600 text-xs mt-1">
              Your alert history will appear here
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {sosAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-white text-sm font-medium">Emergency Alert</span>
                  </div>
                  <Badge variant="outline" className={cn('text-xs', getStatusColor(alert.status))}>
                    {alert.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(alert.createdAt)} at {formatTime(alert.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3">
                  <MapPin className="w-3 h-3 text-red-400" />
                  <span className="truncate">
                    {alert.address || `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 h-8 text-xs border-blue-700 text-blue-400 hover:bg-blue-950 hover:text-blue-300"
                    onClick={() => openLocation(alert.latitude, alert.longitude)}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    View Location
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 h-8 text-xs border-green-700 text-green-400 hover:bg-green-950 hover:text-green-300"
                    onClick={() => getDirections(alert.latitude, alert.longitude)}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
