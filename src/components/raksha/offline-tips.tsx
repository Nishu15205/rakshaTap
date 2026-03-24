'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  Phone,
  MapPin,
  Users,
  AlertTriangle,
  Heart,
  Shield,
  Car,
  Home,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Offline Emergency Knowledge Base
const EMERGENCY_TIPS = [
  {
    id: 'stalking',
    icon: Users,
    title: 'Being Followed',
    color: 'text-red-400',
    bg: 'bg-red-950/30',
    tips: [
      'Head to crowded areas immediately',
      'Enter shops, restaurants, or public buildings',
      'Call someone and share your live location',
      'Do NOT go home - they may follow',
      'Take photos/videos if safe to do so',
    ],
    helpline: 'Women Helpline: 181',
  },
  {
    id: 'assault',
    icon: AlertTriangle,
    title: 'Physical Threat',
    color: 'text-orange-400',
    bg: 'bg-orange-950/30',
    tips: [
      'Scream "FIRE!" - people respond faster',
      'Run towards crowds or open shops',
      'Use your SOS alarm to attract attention',
      'Target eyes, nose, throat if grabbed',
      'Drop to ground if being dragged',
    ],
    helpline: 'Emergency: 112',
  },
  {
    id: 'harassment',
    icon: Shield,
    title: 'Harassment',
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/30',
    tips: [
      'Say "STOP" loudly and clearly',
      'Draw public attention to the harasser',
      'Move towards people, shops',
      'Document evidence if possible',
      'Report to authorities',
    ],
    helpline: 'Police: 100',
  },
  {
    id: 'domestic',
    icon: Home,
    title: 'Domestic Violence',
    color: 'text-purple-400',
    bg: 'bg-purple-950/30',
    tips: [
      'Have an escape plan ready',
      'Keep documents accessible',
      'Know safe places nearby',
      'Keep phone charged',
      'Build a support network',
    ],
    helpline: 'Women Helpline: 181',
  },
  {
    id: 'medical',
    icon: Heart,
    title: 'Medical Emergency',
    color: 'text-pink-400',
    bg: 'bg-pink-950/30',
    tips: [
      'Call ambulance immediately: 102',
      'Do not move seriously injured',
      'Apply first aid if trained',
      'Stay calm and provide clear info',
      'Know your blood type',
    ],
    helpline: 'Ambulance: 102',
  },
  {
    id: 'travel',
    icon: Car,
    title: 'Travel Safety',
    color: 'text-blue-400',
    bg: 'bg-blue-950/30',
    tips: [
      'Share live location with contacts',
      'Keep emergency numbers handy',
      'Use verified transport services',
      'Avoid isolated areas at night',
      'Travel with companions when possible',
    ],
    helpline: 'Police: 112',
  },
];

// Indian Emergency Numbers
const EMERGENCY_NUMBERS = [
  { id: 'emergency', name: 'Emergency', number: '112', icon: AlertTriangle },
  { id: 'police', name: 'Police', number: '100', icon: Shield },
  { id: 'women-helpline', name: 'Women Helpline', number: '181', icon: Heart },
  { id: 'ambulance', name: 'Ambulance', number: '102', icon: Phone },
  { id: 'child-helpline', name: 'Child Helpline', number: '1098', icon: Users },
  { id: 'domestic-violence', name: 'Domestic Violence', number: '181', icon: Home },
];

interface OfflineTipsProps {
  className?: string;
}

export function OfflineEmergencyTips({ className }: OfflineTipsProps) {
  const [selectedTip, setSelectedTip] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState(false);

  const selectedTipData = EMERGENCY_TIPS.find((t) => t.id === selectedTip);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Emergency Numbers Quick Access */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Phone className="w-5 h-5 text-red-500" />
              Emergency Numbers
            </CardTitle>
            <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400 text-xs">
              OFFLINE
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {EMERGENCY_NUMBERS.slice(0, 6).map((item) => (
              <a
                key={item.id}
                href={`tel:${item.number}`}
                className="flex flex-col items-center justify-center p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <item.icon className="w-5 h-5 text-red-400 mb-1" />
                <span className="text-white font-bold text-lg">{item.number}</span>
                <span className="text-zinc-500 text-xs">{item.name}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Safety Tips */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Safety Guides
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tip Categories */}
          <div className="grid grid-cols-2 gap-2">
            {EMERGENCY_TIPS.map((tip) => (
              <Button
                key={tip.id}
                variant="outline"
                className={cn(
                  'h-auto py-3 flex flex-col items-start',
                  selectedTip === tip.id
                    ? `${tip.bg} border-current`
                    : 'border-zinc-700 hover:bg-zinc-800'
                )}
                onClick={() => setSelectedTip(selectedTip === tip.id ? null : tip.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <tip.icon className={cn('w-4 h-4', tip.color)} />
                  <span className={cn('text-sm font-medium', tip.color)}>
                    {tip.title}
                  </span>
                </div>
                <span className="text-zinc-500 text-xs">{tip.tips.length} tips</span>
              </Button>
            ))}
          </div>

          {/* Selected Tip Details */}
          <AnimatePresence>
            {selectedTipData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn('rounded-lg p-4', selectedTipData.bg)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <selectedTipData.icon className={cn('w-5 h-5', selectedTipData.color)} />
                  <span className={cn('font-medium', selectedTipData.color)}>
                    {selectedTipData.title}
                  </span>
                </div>

                <ul className="space-y-2">
                  {selectedTipData.tips.map((tip, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      {tip}
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <a
                    href={`tel:${selectedTipData.helpline.split(': ')[1]}`}
                    className="flex items-center gap-2 text-green-400 text-sm hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    {selectedTipData.helpline}
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Quick Location Share */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-white font-medium text-sm">Quick Location Share</p>
                <p className="text-zinc-500 text-xs">Share location via SMS/WhatsApp</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-green-700 text-green-400"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                    const message = `🚨 My current location: ${url}`;
                    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
                    window.location.href = smsUrl;
                  });
                }
              }}
            >
              Share Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
