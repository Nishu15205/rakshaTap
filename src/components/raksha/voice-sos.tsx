'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, Brain, Shield, AlertTriangle, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface VoiceSOSPanelProps {
  onVoiceActivate?: () => void;
  onVoiceDeactivate?: () => void;
  className?: string;
}

export function VoiceSOSPanel({
  onVoiceActivate,
  onVoiceDeactivate,
  className,
}: VoiceSOSPanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Check support on initial render
  const [isSupported, setIsSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  });
  
  const [keepAwake, setKeepAwake] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognitionRef.current = recognition;
    }
    
    synthesisRef.current = window.speechSynthesis;
  }, []);

  // Voice command detection
  const checkEmergencyKeywords = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const emergencyKeywords = [
      'help', 'help me', 'emergency', 'sos', 'danger', 
      'save me', 'bachao', 'madad', 'raksha', 'save',
      'attack', 'follow', 'scared', 'afraid'
    ];
    
    const cancelKeywords = [
      'cancel', 'stop', 'safe', 'i am safe', 'false alarm',
      'rukho', 'band karo', 'theek hai'
    ];
    
    for (const keyword of emergencyKeywords) {
      if (lowerText.includes(keyword)) {
        console.log('Emergency keyword detected:', keyword);
        // Dispatch custom event for global SOS
        window.dispatchEvent(new CustomEvent('voice-sos-activate'));
        synthesisRef.current?.cancel();
        synthesisRef.current?.speak(new SpeechSynthesisUtterance('Emergency SOS activated! Sending alerts now.'));
        onVoiceActivate?.();
        return true;
      }
    }
    
    for (const keyword of cancelKeywords) {
      if (lowerText.includes(keyword)) {
        console.log('Cancel keyword detected:', keyword);
        window.dispatchEvent(new CustomEvent('voice-sos-deactivate'));
        synthesisRef.current?.cancel();
        synthesisRef.current?.speak(new SpeechSynthesisUtterance('Emergency cancelled. Stay safe!'));
        onVoiceDeactivate?.();
        return true;
      }
    }
    
    return false;
  }, [onVoiceActivate, onVoiceDeactivate]);

  // Start listening
  const startListening = useCallback(() => {
    setError(null);
    const recognition = recognitionRef.current;
    
    if (!recognition) {
      setError('Speech recognition not available');
      return;
    }

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;
      
      setTranscript(text);
      
      if (isFinal) {
        checkEmergencyKeywords(text);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      if (event.error !== 'no-speech') {
        setError(`Error: ${event.error}`);
      }
      // Auto-restart on error
      if (isListening && event.error !== 'not-allowed') {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Already started
          }
        }, 100);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (isListening) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      synthesisRef.current?.speak(new SpeechSynthesisUtterance('Voice activation enabled. Say help or emergency to trigger SOS.'));
    } catch (err) {
      console.error('Failed to start:', err);
      setError('Failed to start voice recognition');
    }
  }, [isListening, checkEmergencyKeywords]);

  // Stop listening
  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    setTranscript('');
  }, []);

  // Keep screen awake for background listening
  const toggleKeepAwake = useCallback(() => {
    if (!keepAwake) {
      // Request wake lock
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen')
          .then((wakeLock) => {
            console.log('Wake lock acquired');
            setKeepAwake(true);
          })
          .catch((err) => {
            console.error('Wake lock failed:', err);
          });
      } else {
        setKeepAwake(true);
      }
    } else {
      setKeepAwake(false);
    }
  }, [keepAwake]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isSupported) {
    return (
      <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-amber-400">
            <MicOff className="w-5 h-5" />
            <div>
              <p className="font-medium">Voice Not Supported</p>
              <p className="text-sm text-zinc-500">
                Try Chrome or Edge browser for voice features
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="text-white font-medium">Voice-Activated SOS</span>
          </div>
          <div className="flex items-center gap-2">
            {keepAwake && (
              <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400 text-xs">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Active
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                isListening
                  ? 'bg-green-950 border-green-700 text-green-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              )}
            >
              {isListening ? '🔴 Listening' : '⚪ Inactive'}
            </Badge>
          </div>
        </div>

        {/* Voice Status */}
        <div
          className={cn(
            'rounded-lg p-4 transition-all',
            isListening
              ? 'bg-gradient-to-r from-purple-900/30 to-red-900/30 border border-purple-700/50'
              : 'bg-zinc-800/50'
          )}
        >
          <div className="flex items-center justify-center gap-4">
            {/* Voice Waves Animation */}
            {isListening && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [16, 32, 16],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                    className="w-1 bg-red-500 rounded-full"
                    style={{ height: 16 }}
                  />
                ))}
              </div>
            )}

            {/* Mic Icon */}
            <motion.div
              animate={isListening ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                isListening
                  ? 'bg-red-600 shadow-lg shadow-red-500/50'
                  : 'bg-zinc-700'
              )}
            >
              {isListening ? (
                <Mic className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-zinc-400" />
              )}
            </motion.div>

            {isListening && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [16, 32, 16],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: (5 - i) * 0.1,
                    }}
                    className="w-1 bg-red-500 rounded-full"
                    style={{ height: 16 }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-white mt-3 text-sm"
            >
              &quot;{transcript}&quot;
            </motion.p>
          )}

          {/* Error */}
          {error && (
            <p className="text-center text-red-400 mt-2 text-sm">{error}</p>
          )}

          {/* Status Text */}
          <p className="text-center text-zinc-400 text-sm mt-2">
            {isListening
              ? 'Say "HELP", "BACHAO" or "EMERGENCY" to trigger SOS'
              : 'Click below to enable voice activation'}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={isListening ? 'destructive' : 'default'}
            className={cn(
              isListening
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-purple-600 hover:bg-purple-700'
            )}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Enable Voice SOS
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className={cn(
              keepAwake
                ? 'border-green-700 text-green-400 bg-green-950'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
            )}
            onClick={toggleKeepAwake}
          >
            <Radio className={cn('w-4 h-4 mr-2', keepAwake && 'animate-pulse')} />
            {keepAwake ? 'Always On' : 'Keep Active'}
          </Button>
        </div>

        {/* Emergency Keywords */}
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <p className="text-zinc-400 text-xs mb-2">Voice Commands:</p>
          <div className="flex flex-wrap gap-2">
            {['HELP', 'EMERGENCY', 'SOS', 'DANGER', 'BACHAO', 'SAVE ME'].map((keyword) => (
              <Badge
                key={keyword}
                variant="outline"
                className="bg-red-950/50 border-red-800 text-red-400 text-xs"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Shield className="w-3 h-3" />
          <span>100% Offline • Runs Locally • Zero Cloud Costs</span>
        </div>
      </CardContent>
    </Card>
  );
}

// AI Emergency Advisor Component
export function AIAdvisorPanel({ className }: { className?: string }) {
  const [selectedSituation, setSelectedSituation] = useState<string | null>(null);
  const [advice, setAdvice] = useState<{
    situation: string;
    immediate: string[];
    safety: string[];
    resources: string[];
  } | null>(null);
  
  const situations = ['stalking', 'assault', 'harassment', 'domestic', 'accident', 'lost'];
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthesisRef.current = window.speechSynthesis;
  }, []);

  const getAdvice = (situation: string) => {
    const adviceMap: Record<string, typeof advice> = {
      stalking: {
        situation: 'Someone is following you',
        immediate: [
          'Head to a crowded area immediately',
          'Enter a shop or restaurant',
          'Call someone and share location',
          'Do NOT go home',
        ],
        safety: [
          'Vary your daily routes',
          'Save all evidence',
        ],
        resources: ['Police: 100', 'Women Helpline: 181'],
      },
      assault: {
        situation: 'Physical threat or attack',
        immediate: [
          'Scream "FIRE!" - people respond faster',
          'Run towards crowds',
          'Target eyes, nose, throat if grabbed',
        ],
        safety: [
          'Carry pepper spray',
          'Learn self-defense',
        ],
        resources: ['Emergency: 112', 'Ambulance: 102'],
      },
      harassment: {
        situation: 'Harassment or inappropriate behavior',
        immediate: [
          'Say "STOP" loudly and clearly',
          'Draw attention from others',
          'Move to a public area',
        ],
        safety: [
          'Document everything',
          'Report to authorities',
        ],
        resources: ['Women Helpline: 181', 'Police: 100'],
      },
      domestic: {
        situation: 'Domestic violence situation',
        immediate: [
          'Prioritize physical safety',
          'Have an escape plan',
          'Keep documents accessible',
        ],
        safety: [
          'Build support network',
          'Know shelter locations',
        ],
        resources: ['Women Helpline: 181', 'Emergency: 112'],
      },
      accident: {
        situation: 'Medical emergency or accident',
        immediate: [
          'Check for injuries',
          'Call emergency services',
          'Do not move seriously injured',
        ],
        safety: [
          'Know basic first aid',
          'Carry medical ID',
        ],
        resources: ['Ambulance: 102', 'Emergency: 112'],
      },
      lost: {
        situation: 'Lost or stranded',
        immediate: [
          'Stay calm - panic makes it worse',
          'Check GPS on phone',
          'Look for landmarks',
        ],
        safety: [
          'Keep phone charged',
          'Share live location',
        ],
        resources: ['Share location via SMS/WhatsApp'],
      },
    };
    
    return adviceMap[situation] || null;
  };

  const handleSituationSelect = (situation: string) => {
    setSelectedSituation(situation);
    const result = getAdvice(situation);
    setAdvice(result);
  };

  const speakAdvice = () => {
    if (advice) {
      const text = `Emergency advice for ${advice.situation}. Immediate actions: ${advice.immediate.slice(0, 2).join('. ')}. Remember: ${advice.resources[0]}`;
      synthesisRef.current?.speak(new SpeechSynthesisUtterance(text));
    }
  };

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-500" />
          <span className="text-white font-medium">AI Emergency Advisor</span>
          <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400 text-xs ml-auto">
            OFFLINE
          </Badge>
        </div>

        <p className="text-zinc-400 text-sm">
          Get instant emergency guidance - works 100% offline.
        </p>

        {/* Situation Selector */}
        <div className="grid grid-cols-2 gap-2">
          {situations.map((situation) => (
            <Button
              key={situation}
              variant="outline"
              size="sm"
              className={cn(
                'capitalize text-xs',
                selectedSituation === situation
                  ? 'bg-blue-950 border-blue-700 text-blue-300'
                  : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              )}
              onClick={() => handleSituationSelect(situation)}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {situation}
            </Button>
          ))}
        </div>

        {/* Advice Display */}
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-white text-sm font-medium mb-2">{advice.situation}</p>
              
              <div className="space-y-2">
                <p className="text-red-400 text-xs font-medium">⚠️ Immediate Actions:</p>
                <ul className="text-zinc-300 text-xs space-y-1">
                  {advice.immediate.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-400">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 mt-3">
                <p className="text-green-400 text-xs font-medium">📞 Emergency Numbers:</p>
                <div className="flex flex-wrap gap-2">
                  {advice.resources.map((resource, i) => (
                    <Badge key={i} variant="outline" className="bg-green-950 border-green-700 text-green-400 text-xs">
                      {resource}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={speakAdvice}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Read Aloud
            </Button>
          </motion.div>
        )}

        <p className="text-zinc-600 text-xs text-center">
          💡 Runs entirely on your device - works offline, no data sent anywhere.
        </p>
      </CardContent>
    </Card>
  );
}
