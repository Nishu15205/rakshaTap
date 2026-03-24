'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Mic, 
  MicOff, 
  Volume2, 
  Loader2, 
  Check, 
  AlertTriangle,
  Cpu,
  WifiOff,
  Sparkles,
  MessageSquare,
  Send,
  Scan,
  Video,
  Play,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  getRunAnywhereLLM,
  getRunAnywhereSTT,
  getRunAnywhereTTS,
  checkRunAnywhereAvailability,
  type LLMResponse,
} from '@/lib/run-anywhere';

// ============================================
// RUN ANYWHERE STATUS COMPONENT
// ============================================

export function RunAnywhereStatus() {
  const [status, setStatus] = useState({
    llm: false,
    stt: false,
    tts: false,
    vision: false,
    webgpu: false,
    overall: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const availability = await checkRunAnywhereAvailability();
      setStatus(availability);
      setIsLoading(false);
    };

    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking RunAnywhere status...
      </div>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Cpu className="w-5 h-5 text-purple-500" />
          RunAnywhere SDK Status
          <Badge 
            variant="outline" 
            className={cn(
              "ml-auto",
              status.overall 
                ? "bg-green-950 border-green-700 text-green-400" 
                : "bg-amber-950 border-amber-700 text-amber-400"
            )}
          >
            {status.overall ? 'Ready' : 'Partial'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              status.llm ? "bg-green-950" : "bg-zinc-800"
            )}>
              {status.llm ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Brain className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <span className={cn("text-xs", status.llm ? "text-green-400" : "text-zinc-500")}>
              LLM
            </span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              status.stt ? "bg-green-950" : "bg-zinc-800"
            )}>
              {status.stt ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Mic className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <span className={cn("text-xs", status.stt ? "text-green-400" : "text-zinc-500")}>
              STT
            </span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              status.tts ? "bg-green-950" : "bg-zinc-800"
            )}>
              {status.tts ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <span className={cn("text-xs", status.tts ? "text-green-400" : "text-zinc-500")}>
              TTS
            </span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              status.vision ? "bg-green-950" : "bg-zinc-800"
            )}>
              {status.vision ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Scan className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <span className={cn("text-xs", status.vision ? "text-green-400" : "text-zinc-500")}>
              Vision
            </span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              status.webgpu ? "bg-green-950" : "bg-amber-950"
            )}>
              {status.webgpu ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Cpu className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <span className={cn("text-xs", status.webgpu ? "text-green-400" : "text-amber-400")}>
              WebGPU
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// LOCAL LLM CHAT COMPONENT
// ============================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
  latency?: number;
}

export function LocalLLMChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      const llm = getRunAnywhereLLM({
        maxTokens: 256,
        temperature: 0.7,
        onProgress: setLoadProgress,
      });
      const loaded = await llm.loadModel();
      setModelLoaded(loaded);
      setIsModelLoading(false);
    };

    loadModel();
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const llm = getRunAnywhereLLM();
      const response: LLMResponse = await llm.generate(
        input,
        `You are an emergency safety AI assistant for RakshaTap, a women's safety app. 
        Provide concise, actionable safety advice. Focus on immediate actions, emergency numbers, and practical steps.
        Keep responses under 200 words. Be empathetic but focused on safety.`
      );

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.text,
        latency: response.latency,
      }]);
    } catch (error) {
      console.error('Generation failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. In an emergency, please call 112 immediately.',
      }]);
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating]);

  // Quick emergency prompts
  const quickPrompts = [
    "I'm being followed",
    "Someone is harassing me",
    "I feel unsafe",
    "Emergency help",
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-blue-500" />
          Local LLM Chat
          <Badge 
            variant="outline" 
            className={cn(
              "ml-auto",
              modelLoaded 
                ? "bg-green-950 border-green-700 text-green-400" 
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            )}
          >
            {modelLoaded ? 'Ready' : isModelLoading ? `${Math.round(loadProgress)}%` : 'Loading...'}
          </Badge>
          <Badge variant="outline" className="bg-purple-950 border-purple-700 text-purple-400">
            WebLLM
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Loading */}
        {isModelLoading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading AI model...
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${loadProgress}%` }}
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
              />
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="max-h-64 overflow-y-auto space-y-3">
          {messages.length === 0 && modelLoaded && (
            <div className="text-center text-zinc-500 py-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask me anything about safety</p>
            </div>
          )}
          
          <AnimatePresence>
            {messages.map((message, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "rounded-lg p-3",
                  message.role === 'user' 
                    ? "bg-zinc-800 ml-8" 
                    : "bg-gradient-to-r from-purple-950/50 to-blue-950/50 mr-8"
                )}
              >
                <p className="text-white text-sm whitespace-pre-wrap">{message.content}</p>
                {message.latency && (
                  <p className="text-zinc-500 text-xs mt-1">
                    ⚡ {message.latency.toFixed(0)}ms
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isGenerating && (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating response...
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                size="sm"
                variant="outline"
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs"
                onClick={() => setInput(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for safety advice..."
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            className="bg-purple-600 hover:bg-purple-700 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isGenerating || !modelLoaded}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Offline indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <WifiOff className="w-3 h-3" />
          <span>100% Offline • Runs Locally via WebLLM + RunAnywhere SDK</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// DEMO VIDEO COMPONENT
// ============================================

export function DemoVideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Video className="w-5 h-5 text-red-500" />
          Demo Video
          <Badge variant="outline" className="bg-red-950 border-red-700 text-red-400 ml-auto">
            HackXtreme
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Placeholder */}
        <div className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden group">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center mb-4 group-hover:bg-red-600/30 transition-colors">
              {isPlaying ? (
                <Loader2 className="w-10 h-10 text-red-400 animate-spin" />
              ) : (
                <Play className="w-10 h-10 text-red-400 ml-1" />
              )}
            </div>
            <p className="text-zinc-400 text-sm">RakshaTap - Women&apos;s Safety App Demo</p>
            <p className="text-zinc-500 text-xs mt-1">Click to play demo video</p>
          </div>
          
          {/* Demo Features Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 to-transparent p-4">
            <div className="flex items-center gap-4 text-xs text-zinc-300">
              <span className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-purple-400" />
                WebLLM AI
              </span>
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3 text-red-400" />
                Whisper STT
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-green-400" />
                Vision OCR
              </span>
            </div>
          </div>
        </div>

        {/* Play Button */}
        <Button
          className="w-full bg-red-600 hover:bg-red-700"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading Demo...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Watch Demo Video
            </>
          )}
        </Button>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-white text-sm font-medium">🚨 SOS Alert</p>
            <p className="text-zinc-400 text-xs">One-tap emergency</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-white text-sm font-medium">📍 Live Location</p>
            <p className="text-zinc-400 text-xs">Real-time tracking</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-white text-sm font-medium">🤖 Offline AI</p>
            <p className="text-zinc-400 text-xs">100% local processing</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-white text-sm font-medium">📱 PWA Ready</p>
            <p className="text-zinc-400 text-xs">Install on any device</p>
          </div>
        </div>

        <p className="text-center text-zinc-500 text-xs">
          Demo video showcases all HackXtreme features including offline AI, SOS alerts, and document scanning
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================
// VOICE-TO-TEXT COMPONENT (RunAnywhere STT)
// ============================================

export function RunAnywhereVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const stt = getRunAnywhereSTT();
  const tts = getRunAnywhereTTS();

  useEffect(() => {
    setIsSupported(stt.isSupported());
  }, [stt]);

  const startListening = useCallback(async () => {
    stt.onResult((result) => {
      setTranscript(result.transcript);
    });

    const started = await stt.startListening();
    if (started) {
      setIsListening(true);
    }
  }, [stt]);

  const stopListening = useCallback(() => {
    stt.stopListening();
    setIsListening(false);
  }, [stt]);

  const speakTranscript = useCallback(() => {
    tts.speak(transcript);
  }, [transcript, tts]);

  if (!isSupported) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <span>Voice input not supported in this browser</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Mic className="w-5 h-5 text-red-500" />
          RunAnywhere Voice Input
          <Badge variant="outline" className="bg-green-950 border-green-700 text-green-400 ml-auto">
            Whisper STT
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn(
          "rounded-lg p-4 text-center",
          isListening ? "bg-red-950/30 border border-red-700/50" : "bg-zinc-800/50"
        )}>
          <motion.div
            animate={isListening ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            className={cn(
              "w-16 h-16 rounded-full mx-auto flex items-center justify-center",
              isListening ? "bg-red-600" : "bg-zinc-700"
            )}
          >
            {isListening ? (
              <Mic className="w-8 h-8 text-white" />
            ) : (
              <MicOff className="w-8 h-8 text-zinc-400" />
            )}
          </motion.div>

          {transcript && (
            <p className="text-white text-sm mt-3">&quot;{transcript}&quot;</p>
          )}

          <p className="text-zinc-400 text-xs mt-2">
            {isListening ? "Listening..." : "Click to start voice input"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={isListening ? "destructive" : "default"}
            className={isListening ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300"
            onClick={speakTranscript}
            disabled={!transcript}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Read Back
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Cpu className="w-3 h-3" />
          <span>Powered by RunAnywhere SDK - 100% Offline</span>
        </div>
      </CardContent>
    </Card>
  );
}
