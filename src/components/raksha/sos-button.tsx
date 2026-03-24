'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, MapPin, X, Send, MessageCircle, Loader2, Volume2, VolumeX, MessageSquare, Check, PhoneCall, ExternalLink, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRakshaStore } from '@/store/raksha-store';
import { audioService } from '@/lib/audio';
import { cn } from '@/lib/utils';

// Format phone with +91 for India
function formatIndianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);
  if (cleaned.length === 10) return `+91${cleaned}`;
  return phone.startsWith('+') ? phone : `+${cleaned}`;
}

// Contact action state tracking
interface ContactActionState {
  calling: boolean;
  smsSent: boolean;
  smsSending: boolean;
  whatsappOpened: boolean;
}

// Indian Emergency Helplines
const EMERGENCY_HELPLINES = [
  { name: 'Emergency', number: '112', icon: '🚨', color: 'bg-red-600' },
  { name: 'Police', number: '100', icon: '👮', color: 'bg-blue-600' },
  { name: 'Women Helpline', number: '181', icon: '👩', color: 'bg-pink-600' },
  { name: 'Ambulance', number: '102', icon: '🚑', color: 'bg-green-600' },
];

interface SOSButtonProps {
  onActivate?: () => Promise<unknown>;
  onDeactivate?: () => void;
}

export function SOSButton({ onActivate, onDeactivate }: SOSButtonProps) {
  const { isSOSActive, sosStartTime, currentLocation, contacts, settings } = useRakshaStore();
  const [isPressed, setIsPressed] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [showConfirm, setShowConfirm] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [alertStatus, setAlertStatus] = useState<'sending' | 'sent' | 'delivered' | 'failed'>('sending');
  const [notificationResults, setNotificationResults] = useState<{
    telegram?: { success: boolean; count: number };
    sms?: { success: boolean; count: number };
    email?: { success: boolean; count: number };
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [contactActions, setContactActions] = useState<Record<string, ContactActionState>>({});
  const [smsLinks, setSmsLinks] = useState<Record<string, string>>({});
  const [autoSMSSent, setAutoSMSSent] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const vibrationRef = useRef<NodeJS.Timeout | null>(null);

  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

  // Elapsed time counter when SOS is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSOSActive && sosStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sosStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSOSActive, sosStartTime]);

  // Play continuous alarm when SOS is activated
  useEffect(() => {
    if (isSOSActive) {
      // Only play sounds if enabled
      if (soundEnabled && settings.soundEnabled) {
        audioService.playContinuousAlarm();
        
        if (contacts.length > 0 && primaryContact) {
          audioService.speakEmergency(`Emergency alert activated! You have ${contacts.length} emergency contact${contacts.length > 1 ? 's' : ''}. Tap Call or SMS to contact ${primaryContact.name}.`);
        } else {
          audioService.speakEmergency('Emergency alert activated! Please add emergency contacts in the Contacts tab.');
        }
      }
      
      // Vibration works independently of sound
      if (navigator.vibrate && settings.vibrationEnabled) {
        const vibrate = () => {
          navigator.vibrate([500, 100, 500, 100, 500, 100, 500]);
        };
        vibrate();
        vibrationRef.current = setInterval(vibrate, 2000);
      }
    }
    
    return () => {
      if (!isSOSActive) {
        audioService.stopAll();
        if (vibrationRef.current) {
          clearInterval(vibrationRef.current);
          vibrationRef.current = null;
        }
        if (navigator.vibrate) {
          navigator.vibrate(0);
        }
      }
    };
  }, [isSOSActive, soundEnabled, settings.soundEnabled, settings.vibrationEnabled, contacts.length, primaryContact]);

  // Stop sound immediately when muted
  useEffect(() => {
    if (!soundEnabled && isSOSActive) {
      audioService.stopAll();
    }
  }, [soundEnabled, isSOSActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate emergency message with location
  const getEmergencyMessage = useCallback(() => {
    const mapsUrl = currentLocation 
      ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
      : '';
    return `🚨 EMERGENCY!

${settings.alertMessage}

📍 My Location: ${mapsUrl}
${currentLocation ? `Coordinates: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : ''}
📅 Time: ${new Date().toLocaleString()}

- RakshaTap Safety App`;
  }, [currentLocation, settings.alertMessage]);

  // Send SMS via API and get universal links
  const sendSMS = useCallback(async (contactId: string, contactName: string, phone: string) => {
    const formattedPhone = formatIndianPhone(phone);
    const message = getEmergencyMessage();
    
    setContactActions(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], smsSending: true }
    }));
    
    try {
      // Call our SMS API
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          message,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          userName: contactName,
        }),
      });
      
      const data = await response.json();
      
      // Store the universal links
      if (data.universalLinks) {
        setSmsLinks(prev => ({
          ...prev,
          [contactId]: data.universalLinks.sms,
        }));
        
        // Open the SMS link
        window.location.href = data.universalLinks.sms;
      }
      
      setContactActions(prev => ({
        ...prev,
        [contactId]: { ...prev[contactId], smsSending: false, smsSent: true }
      }));
      
      audioService.speakEmergency(`Opening SMS to ${contactName}`);
      
    } catch (error) {
      console.error('SMS error:', error);
      
      // Fallback to direct SMS link
      const smsUrl = `sms:${formattedPhone}?body=${encodeURIComponent(message)}`;
      window.location.href = smsUrl;
      
      setContactActions(prev => ({
        ...prev,
        [contactId]: { ...prev[contactId], smsSending: false, smsSent: true }
      }));
    }
  }, [currentLocation, getEmergencyMessage]);

  // Make direct call with universal link
  const makeDirectCall = useCallback((contactId: string | null, contactName: string, phone: string) => {
    const formattedPhone = formatIndianPhone(phone);
    const telUrl = `tel:${formattedPhone}`;
    
    if (contactId) {
      setContactActions(prev => ({
        ...prev,
        [contactId]: { ...prev[contactId], calling: true }
      }));
    }
    
    // Use window.location for better mobile compatibility
    window.location.href = telUrl;
    
    audioService.speakEmergency(`Calling ${contactName}`);
    
    if (contactId) {
      setTimeout(() => {
        setContactActions(prev => ({
          ...prev,
          [contactId]: { ...prev[contactId], calling: false }
        }));
      }, 3000);
    }
  }, []);

  // Send via WhatsApp
  const sendViaWhatsApp = useCallback((contactId: string, contactName: string, phone: string) => {
    const formattedPhone = formatIndianPhone(phone).replace('+', '');
    const message = getEmergencyMessage();
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    setContactActions(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], whatsappOpened: true }
    }));
    
    window.open(whatsappUrl, '_blank');
    audioService.speakEmergency(`Opening WhatsApp for ${contactName}`);
  }, [getEmergencyMessage]);

  // Send SMS to ALL contacts automatically
  const sendSMSToAllContacts = useCallback(async () => {
    if (contacts.length === 0 || autoSMSSent) return;
    
    setAutoSMSSent(true);
    const message = getEmergencyMessage();
    
    // Open SMS for each contact with a small delay
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const formattedPhone = formatIndianPhone(contact.phone);
      
      setContactActions(prev => ({
        ...prev,
        [contact.id]: { ...prev[contact.id], smsSending: true }
      }));
      
      // Small delay between each
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Open SMS directly
      const smsUrl = `sms:${formattedPhone}?body=${encodeURIComponent(message)}`;
      window.location.href = smsUrl;
      
      setContactActions(prev => ({
        ...prev,
        [contact.id]: { ...prev[contact.id], smsSending: false, smsSent: true }
      }));
    }
    
    audioService.speakEmergency(`Opening SMS for all ${contacts.length} contacts`);
  }, [contacts, autoSMSSent, getEmergencyMessage]);

  const handlePressStart = () => {
    if (isSOSActive) {
      setShowConfirm(true);
      return;
    }
    
    setIsPressed(true);
    setCountdown(3);
    audioService.playCountdownBeep(3);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerSOS();
          return 0;
        }
        audioService.playCountdownBeep(prev - 1);
        return prev - 1;
      });
    }, 1000);
    
    setPressTimer(timer);
  };

  const handlePressEnd = () => {
    if (pressTimer) {
      clearInterval(pressTimer);
      setPressTimer(null);
    }
    setIsPressed(false);
    setCountdown(3);
  };

  const triggerSOS = useCallback(async () => {
    setAlertStatus('sending');
    setErrorMessage(null);
    setNotificationResults(null);
    setContactActions({});
    setSmsLinks({});
    setAutoSMSSent(false);
    
    try {
      if (onActivate) {
        const result = await onActivate() as {
          results?: Array<{
            contact: string;
            status: string;
            notifications: {
              telegram?: { success: boolean };
              sms?: { success: boolean };
              email?: { success: boolean };
            };
          }>;
          deliveredCount?: number;
          failedCount?: number;
        };
        
        if (result && result.results) {
          let telegramCount = 0;
          let smsCount = 0;
          let emailCount = 0;
          
          result.results.forEach((r) => {
            if (r.notifications.telegram?.success) telegramCount++;
            if (r.notifications.sms?.success) smsCount++;
            if (r.notifications.email?.success) emailCount++;
          });
          
          setNotificationResults({
            telegram: telegramCount > 0 ? { success: true, count: telegramCount } : undefined,
            sms: smsCount > 0 ? { success: true, count: smsCount } : undefined,
            email: emailCount > 0 ? { success: true, count: emailCount } : undefined,
          });
        }
      }
      
      setAlertStatus('delivered');
      
      // AUTO SEND SMS TO ALL CONTACTS
      if (contacts.length > 0) {
        setTimeout(() => {
          sendSMSToAllContacts();
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error triggering SOS:', error);
      setAlertStatus('failed');
      setErrorMessage('Failed to send alerts. Use direct SMS/Call below.');
    }
  }, [onActivate, contacts.length, sendSMSToAllContacts]);

  const handleDeactivate = () => {
    audioService.stopAll();
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
    
    if (onDeactivate) {
      onDeactivate();
    }
    setShowConfirm(false);
    setElapsedTime(0);
    setAlertStatus('sending');
    setNotificationResults(null);
    setErrorMessage(null);
    setContactActions({});
    setSmsLinks({});
    setAutoSMSSent(false);
    
    if (soundEnabled) {
      audioService.speakEmergency('Emergency alert deactivated. Stay safe!');
    }
  };

  const toggleSound = () => {
    if (soundEnabled) {
      // Muting - stop all sounds immediately
      audioService.stopAll();
    } else {
      // Unmuting - restart alarm if SOS is active
      if (isSOSActive) {
        audioService.playContinuousAlarm();
      }
    }
    setSoundEnabled(!soundEnabled);
  };

  // Send to all contacts at once
  const sendToAllContacts = useCallback(async () => {
    for (const contact of contacts) {
      await sendSMS(contact.id, contact.name, contact.phone);
      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [contacts, sendSMS]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* SOS Button */}
      <div className="relative">
        <AnimatePresence>
          {isSOSActive && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full bg-red-500"
                />
              ))}
            </>
          )}
        </AnimatePresence>

        <motion.button
          ref={buttonRef}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className={cn(
            'relative z-10 w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center',
            'transition-all duration-300 shadow-2xl',
            'border-4',
            isSOSActive
              ? 'bg-red-600 border-red-400 shadow-red-500/50'
              : isPressed
                ? 'bg-red-500 border-red-300 shadow-red-500/30'
                : 'bg-gradient-to-br from-red-500 to-red-700 border-red-400 shadow-red-500/20 hover:shadow-red-500/40'
          )}
        >
          <AnimatePresence mode="wait">
            {isSOSActive ? (
              <motion.div
                key="active"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center"
              >
                {alertStatus === 'sending' ? (
                  <Loader2 className="w-16 h-16 text-white mb-2 animate-spin" />
                ) : (
                  <AlertTriangle className="w-16 h-16 text-white mb-2 animate-pulse" />
                )}
                <span className="text-white font-bold text-2xl">SOS ACTIVE</span>
                <span className="text-white/80 text-lg mt-1">{formatTime(elapsedTime)}</span>
              </motion.div>
            ) : isPressed ? (
              <motion.div
                key="pressed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <span className="text-white font-bold text-5xl">{countdown}</span>
                <span className="text-white/80 text-sm mt-2">Keep holding...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <AlertTriangle className="w-12 h-12 text-white mb-2" />
                <span className="text-white font-bold text-3xl">SOS</span>
                <span className="text-white/70 text-xs mt-1">Hold 3 seconds</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* No contacts warning */}
      {contacts.length === 0 && !isSOSActive && (
        <div className="bg-amber-950/50 border border-amber-700 rounded-lg p-3 max-w-sm text-center">
          <p className="text-amber-400 text-sm">
            ⚠️ No emergency contacts added. Add contacts in the Contacts tab to receive alerts.
          </p>
        </div>
      )}

      {/* EMERGENCY HELPLINES - Quick Call Buttons */}
      {!isSOSActive && (
        <div className="w-full max-w-sm">
          <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium mb-2 text-center">
            🚨 Emergency Helplines - Tap to Call
          </p>
          <div className="grid grid-cols-4 gap-2">
            {EMERGENCY_HELPLINES.map((helpline) => (
              <a
                key={helpline.number}
                href={`tel:${helpline.number}`}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-xl text-white',
                  'transition-all shadow-lg active:scale-95',
                  helpline.color
                )}
                onClick={() => audioService.speakEmergency(`Calling ${helpline.name}`)}
              >
                <span className="text-2xl mb-1">{helpline.icon}</span>
                <span className="font-bold text-lg">{helpline.number}</span>
                <span className="text-xs opacity-80">{helpline.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Status indicators */}
      {isSOSActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Card className="bg-red-950/50 border-red-800">
            <CardContent className="p-4 space-y-3">
              {/* Sound Control - PROMINENT */}
              <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    soundEnabled ? 'bg-amber-600 animate-pulse' : 'bg-zinc-700'
                  )}>
                    {soundEnabled ? (
                      <Siren className="w-5 h-5 text-white" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-white font-medium">Siren</span>
                    <p className="text-zinc-400 text-xs">
                      {soundEnabled ? '🔊 Playing alarm' : '🔇 Muted'}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  variant={soundEnabled ? 'destructive' : 'default'}
                  className={cn(
                    'min-w-[80px]',
                    soundEnabled 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  )}
                  onClick={toggleSound}
                >
                  {soundEnabled ? (
                    <>
                      <VolumeX className="w-4 h-4 mr-1" />
                      MUTE
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-1" />
                      UNMUTE
                    </>
                  )}
                </Button>
              </div>

              {/* Auto SMS Status */}
              {autoSMSSent && contacts.length > 0 && (
                <div className="bg-green-950/50 border border-green-700 rounded-lg p-2 text-center">
                  <p className="text-green-400 text-sm flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    SMS opened for {contacts.length} contact{contacts.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* No contacts message */}
              {contacts.length === 0 && (
                <div className="bg-amber-950/50 border border-amber-700 rounded-lg p-3 text-center">
                  <p className="text-amber-400 text-sm">
                    ⚠️ No emergency contacts! Add contacts to notify them.
                  </p>
                </div>
              )}

              {/* Location Status */}
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>
                    {currentLocation
                      ? `📍 Location: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                      : '📍 Acquiring location...'}
                  </span>
                </div>
                {currentLocation && (
                  <a 
                    href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs flex items-center gap-1 mt-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open in Google Maps
                  </a>
                )}
              </div>

              {/* EMERGENCY HELPLINES - During SOS */}
              <div className="space-y-2">
                <p className="text-zinc-400 text-xs uppercase tracking-wider">🚨 Emergency Helplines</p>
                <div className="grid grid-cols-4 gap-2">
                  {EMERGENCY_HELPLINES.map((helpline) => (
                    <a
                      key={helpline.number}
                      href={`tel:${helpline.number}`}
                      className={cn(
                        'flex flex-col items-center justify-center py-2 rounded-md text-white',
                        helpline.color
                      )}
                    >
                      <span className="text-lg">{helpline.icon}</span>
                      <span className="font-bold">{helpline.number}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Actions - Direct SMS & Call */}
              {contacts.length > 0 && primaryContact && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">
                      📱 Tap to Contact
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs border-blue-700 text-blue-400"
                      onClick={sendToAllContacts}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      SMS All
                    </Button>
                  </div>
                  
                  <div className="bg-zinc-800/80 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white text-sm font-medium">{primaryContact.name}</span>
                        <span className="text-zinc-500 text-xs ml-2">{formatIndianPhone(primaryContact.phone)}</span>
                      </div>
                      {primaryContact.isPrimary && (
                        <Badge variant="outline" className="text-xs bg-amber-950 border-amber-700 text-amber-400">
                          Primary
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        className={cn(
                          'text-white transition-all',
                          contactActions[primaryContact.id]?.calling 
                            ? 'bg-green-400 animate-pulse' 
                            : 'bg-green-600 hover:bg-green-700'
                        )}
                        onClick={() => makeDirectCall(primaryContact.id, primaryContact.name, primaryContact.phone)}
                        disabled={contactActions[primaryContact.id]?.calling}
                      >
                        {contactActions[primaryContact.id]?.calling ? (
                          <>
                            <PhoneCall className="w-4 h-4 mr-1 animate-pulse" />
                            Calling
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className={cn(
                          'text-white transition-all',
                          contactActions[primaryContact.id]?.smsSent 
                            ? 'bg-blue-400' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        )}
                        onClick={() => sendSMS(primaryContact.id, primaryContact.name, primaryContact.phone)}
                        disabled={contactActions[primaryContact.id]?.smsSending}
                      >
                        {contactActions[primaryContact.id]?.smsSending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Sending
                          </>
                        ) : contactActions[primaryContact.id]?.smsSent ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Opened
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            SMS
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'transition-all',
                          contactActions[primaryContact.id]?.whatsappOpened 
                            ? 'border-green-400 text-green-300 bg-green-950' 
                            : 'border-green-600 text-green-400 hover:bg-green-950'
                        )}
                        onClick={() => sendViaWhatsApp(primaryContact.id, primaryContact.name, primaryContact.phone)}
                      >
                        {contactActions[primaryContact.id]?.whatsappOpened ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <MessageCircle className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* All Contacts */}
              {contacts.length > 1 && (
                <div className="space-y-2">
                  <p className="text-zinc-400 text-xs uppercase tracking-wider">Other Contacts</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {contacts.filter(c => c.id !== primaryContact?.id).map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{contact.name}</span>
                          <span className="text-zinc-500 text-xs">{formatIndianPhone(contact.phone)}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              'h-8 w-8 transition-all',
                              contactActions[contact.id]?.calling
                                ? 'text-green-300 bg-green-900'
                                : 'text-green-400 hover:text-green-300 hover:bg-zinc-700'
                            )}
                            onClick={() => makeDirectCall(contact.id, contact.name, contact.phone)}
                            disabled={contactActions[contact.id]?.calling}
                          >
                            {contactActions[contact.id]?.calling ? (
                              <PhoneCall className="w-4 h-4 animate-pulse" />
                            ) : (
                              <Phone className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              'h-8 w-8 transition-all',
                              contactActions[contact.id]?.smsSent
                                ? 'text-blue-300 bg-blue-900'
                                : 'text-blue-400 hover:text-blue-300 hover:bg-zinc-700'
                            )}
                            onClick={() => sendSMS(contact.id, contact.name, contact.phone)}
                          >
                            {contactActions[contact.id]?.smsSent ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-zinc-700"
                            onClick={() => sendViaWhatsApp(contact.id, contact.name, contact.phone)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Button */}
              <Button
                variant="outline"
                className="w-full mt-2 border-green-700 text-green-400 hover:bg-green-800 hover:text-white"
                onClick={() => setShowConfirm(true)}
              >
                <X className="w-4 h-4 mr-2" />
                I&apos;m Safe - Stop Alarm
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick actions when not in emergency */}
      {!isSOSActive && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-red-700 text-red-400 hover:bg-red-950 hover:text-red-300"
            onClick={triggerSOS}
          >
            <Send className="w-4 h-4 mr-2" />
            Quick Alert
          </Button>
          {primaryContact && (
            <Button
              variant="outline"
              className={cn(
                'transition-all',
                contactActions[primaryContact.id]?.calling
                  ? 'border-green-400 text-green-300 bg-green-950'
                  : 'border-green-700 text-green-400 hover:bg-green-950 hover:text-green-300'
              )}
              onClick={() => makeDirectCall(primaryContact.id, primaryContact.name, primaryContact.phone)}
              disabled={contactActions[primaryContact.id]?.calling}
            >
              {contactActions[primaryContact.id]?.calling ? (
                <>
                  <PhoneCall className="w-4 h-4 mr-2 animate-pulse" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Call {primaryContact.name}
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Deactivation confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-zinc-700"
            >
              <h3 className="text-xl font-bold text-white mb-4">🛑 Cancel Emergency?</h3>
              <p className="text-zinc-400 mb-6">
                Are you safe? The alarm will stop and you can continue using the app.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
                  onClick={() => setShowConfirm(false)}
                >
                  Stay Active
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleDeactivate}
                >
                  ✓ I&apos;m Safe
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
