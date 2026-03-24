'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Brain, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getSpeechRecognition,
  getTextToSpeech,
  getAIAdvisor,
  getVoiceSOS,
} from '@/lib/local-ai';

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
  const recognitionRef = useRef<ReturnType<typeof getSpeechRecognition> | null>(null);
  const voiceSOSRef = useRef<ReturnType<typeof getVoiceSOS> | null>(null);
  const ttsRef = useRef<ReturnType<typeof getTextToSpeech> | null>(null);
  const aiAdvisorRef = useRef<ReturnType<typeof getAIAdvisor> | null>(null);

  // Initialize once
  useEffect(() => {
    recognitionRef.current = getSpeechRecognition();
    ttsRef.current = getTextToSpeech();
    aiAdvisorRef.current = getAIAdvisor();
    voiceSOSRef.current = getVoiceSOS();
    
    // Set up voice SOS callbacks
    voiceSOSRef.current.onSOSActivate(() => {
      onVoiceActivate?.();
    });

    voiceSOSRef.current.onSOSDeactivate(() => {
      onVoiceDeactivate?.();
    });
  }, [onVoiceActivate, onVoiceDeactivate]);

  // Check support using useMemo to avoid calling setState in effect
  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('Speech recognition not available');
      return;
    }

    recognition.onResult((result) => {
      setTranscript(result.transcript);
      
      // Check for emergency keywords
      if (result.isFinal) {
        const aiAdvisor = aiAdvisorRef.current;
        if (aiAdvisor) {
          const advice = aiAdvisor.quickHelp(result.transcript);
          if (advice) {
            console.log('AI Advice:', advice);
          }
        }
      }
    });

    recognition.onError((err) => {
      console.error('Speech recognition error:', err);
      setError(`Error: ${err}`);
      setIsListening(false);
    });

    const started = voiceSOSRef.current?.startListening();
    if (started) {
      setIsListening(true);
    } else {
      setError('Failed to start voice recognition');
    }
  }, []);

  const stopListening = useCallback(() => {
    voiceSOSRef.current?.stopListening();
    setIsListening(false);
    setTranscript('');
  }, []);

  const testVoice = useCallback(() => {
    ttsRef.current?.speak('Voice activation is ready. Say help or emergency to trigger SOS.', {
      rate: 0.9,
      pitch: 1,
    });
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
                Your browser doesn&apos;t support voice recognition. Try Chrome or Edge.
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

          {/* Error message */}
          {error && (
            <p className="text-center text-red-400 mt-2 text-sm">{error}</p>
          )}

          {/* Status Text */}
          <p className="text-center text-zinc-400 text-sm mt-2">
            {isListening
              ? 'Say "HELP" or "EMERGENCY" to trigger SOS'
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
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={testVoice}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Test Voice
          </Button>
        </div>

        {/* Emergency Keywords */}
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <p className="text-zinc-400 text-xs mb-2">Voice Commands:</p>
          <div className="flex flex-wrap gap-2">
            {['HELP', 'EMERGENCY', 'SOS', 'DANGER', 'BACHAO'].map((keyword) => (
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

        {/* Offline Badge */}
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
  const [advice, setAdvice] = useState<ReturnType<ReturnType<typeof getAIAdvisor>['getAdvice']>>(null);
  
  const aiAdvisor = getAIAdvisor();
  const tts = getTextToSpeech();
  const situations = aiAdvisor.getAvailableSituations();

  const handleSituationSelect = (situation: string) => {
    setSelectedSituation(situation);
    const result = aiAdvisor.getAdvice(situation);
    setAdvice(result);
  };

  const speakAdvice = () => {
    if (advice) {
      aiAdvisor.speakAdvice(advice);
    }
  };

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          <span className="text-white font-medium">AI Emergency Advisor</span>
          <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400 text-xs ml-auto">
            OFFLINE
          </Badge>
        </div>

        <p className="text-zinc-400 text-sm">
          Get instant emergency guidance - runs 100% offline on your device.
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
        <AnimatePresence>
          {advice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-white text-sm font-medium mb-2">{advice.situation}</p>
                
                <div className="space-y-2">
                  <p className="text-red-400 text-xs font-medium">⚠️ Immediate Actions:</p>
                  <ul className="text-zinc-300 text-xs space-y-1">
                    {advice.immediate.slice(0, 3).map((item, i) => (
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
        </AnimatePresence>

        {/* Offline Note */}
        <p className="text-zinc-600 text-xs text-center">
          💡 This AI advisor runs entirely on your device - works offline, no data sent anywhere.
        </p>
      </CardContent>
    </Card>
  );
}
