/**
 * Local AI Service - HackXtreme Edition
 * 
 * Runs AI models 100% locally using:
 * - Web Speech API (Browser built-in STT/TTS)
 * - RunAnywhere SDK (When available)
 * 
 * NO CLOUD APIs - Complete Privacy
 */

// ============================================
// SPEECH RECOGNITION (STT) - Local
// ============================================

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class LocalSpeechRecognition {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onResultCallback?: (result: SpeechRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN'; // Indian English
        this.setupListeners();
      }
    }
  }

  private setupListeners() {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      
      this.onResultCallback?.({
        transcript,
        confidence,
        isFinal: result.isFinal,
      });

      // Check for voice commands
      this.checkVoiceCommands(transcript.toLowerCase(), result.isFinal);
    };

    this.recognition.onerror = (event) => {
      this.onErrorCallback?.(event.error);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if we should still be listening
        this.recognition?.start();
      }
    };
  }

  private checkVoiceCommands(transcript: string, isFinal: boolean) {
    if (!isFinal) return;

    const emergencyKeywords = [
      'help me',
      'help',
      'emergency',
      'sos',
      'danger',
      'save me',
      'bachao', // Hindi
      'madad', // Hindi
      'emergency',
    ];

    const cancelKeywords = [
      'cancel',
      'stop',
      'i am safe',
      'safe',
      'false alarm',
      'rukho', // Hindi
    ];

    const lowerTranscript = transcript.toLowerCase();

    if (emergencyKeywords.some(keyword => lowerTranscript.includes(keyword))) {
      // Trigger SOS
      window.dispatchEvent(new CustomEvent('voice-sos-activate'));
    }

    if (cancelKeywords.some(keyword => lowerTranscript.includes(keyword))) {
      // Cancel SOS
      window.dispatchEvent(new CustomEvent('voice-sos-deactivate'));
    }
  }

  start() {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition not supported');
      return false;
    }
    
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    if (this.recognition) {
      this.isListening = false;
      this.recognition.stop();
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void) {
    this.onResultCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }
}

// ============================================
// TEXT-TO-SPEECH (TTS) - Local
// ============================================

export class LocalTextToSpeech {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private loadVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth!.getVoices();
    };

    loadVoices();
    this.synth.onvoiceschanged = loadVoices;
  }

  speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  }) {
    if (!this.synth) return false;

    // Stop any current speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set options
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;
    utterance.lang = options?.lang ?? 'en-IN';

    // Try to find an Indian English voice
    const indianVoice = this.voices.find(v => 
      v.lang.includes('en-IN') || v.lang.includes('en_IN')
    );
    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    
    return true;
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  isSupported(): boolean {
    return this.synth !== null;
  }
}

// ============================================
// LOCAL LLM - AI Emergency Advisor
// ============================================

interface EmergencyAdvice {
  situation: string;
  immediate: string[];
  safety: string[];
  resources: string[];
}

// Pre-built emergency knowledge base (Works OFFLINE!)
const EMERGENCY_KNOWLEDGE_BASE: Record<string, EmergencyAdvice> = {
  'stalking': {
    situation: 'Someone is following or stalking you',
    immediate: [
      'Head to a crowded, well-lit area immediately',
      'Enter a shop, restaurant, or public building',
      'Call someone and tell them your exact location',
      'Do NOT go home - the stalker may follow',
      'Use your phone to record or take photos if safe',
    ],
    safety: [
      'Vary your daily routes and times',
      'Inform friends/family about the situation',
      'Save all evidence: messages, photos, call logs',
      'Consider filing a police report',
    ],
    resources: [
      'India Women Helpline: 181',
      'Police: 100 or 112',
      'Share your live location with trusted contacts',
    ],
  },
  'assault': {
    situation: 'Physical assault or threat of violence',
    immediate: [
      'Scream "FIRE!" - people respond faster than to "HELP"',
      'Run towards crowds or open shops',
      'Use personal alarm or SOS button',
      'If grabbed, target eyes, nose, throat, groin',
      'Drop to the ground if grabbed - harder to move',
    ],
    safety: [
      'Carry pepper spray or personal alarm',
      'Learn basic self-defense moves',
      'Stay in well-lit areas at night',
      'Travel with companions when possible',
    ],
    resources: [
      'Emergency: 112',
      'Women Helpline: 181',
      'Medical Emergency: 102',
    ],
  },
  'harassment': {
    situation: 'Verbal or physical harassment',
    immediate: [
      'Clearly say "STOP" or "NO" loudly',
      'Draw attention - shout if needed',
      'Move away and head towards people',
      'Document the incident if safe',
      'Call for help or use SOS',
    ],
    safety: [
      'Report to authorities',
      'Save all evidence',
      'Tell friends/family',
      'Avoid being alone with the harasser',
    ],
    resources: [
      'Women Helpline: 181',
      'Police: 100',
      'Share incident with trusted contacts',
    ],
  },
  'domestic': {
    situation: 'Domestic violence or abuse',
    immediate: [
      'Prioritize your physical safety',
      'Have an escape plan ready',
      'Keep important documents accessible',
      'Know safe places to go',
      'Keep phone charged and accessible',
    ],
    safety: [
      'Build a support network',
      'Save evidence discreetly',
      'Know local shelter locations',
      'Have emergency cash hidden',
    ],
    resources: [
      'Women Helpline: 181',
      'Domestic Violence: 181',
      'Emergency: 112',
    ],
  },
  'accident': {
    situation: 'Accident or medical emergency',
    immediate: [
      'Check for injuries',
      'Call emergency services',
      'Do not move seriously injured people',
      'Apply first aid if trained',
      'Stay calm and provide clear information',
    ],
    safety: [
      'Know basic first aid',
      'Keep emergency numbers handy',
      'Know your blood type',
      'Carry medical ID',
    ],
    resources: [
      'Ambulance: 102',
      'Emergency: 112',
      'Share location with emergency contacts',
    ],
  },
  'lost': {
    situation: 'Lost or stranded',
    immediate: [
      'Stay calm - panic makes it worse',
      'Check GPS on your phone',
      'Look for landmarks or street signs',
      'Ask shopkeepers for directions',
      'Call a trusted contact',
    ],
    safety: [
      'Share live location with contacts',
      'Stay in populated areas',
      'Keep phone battery charged',
      'Know your destination address',
    ],
    resources: [
      'Google Maps works offline with downloaded maps',
      'Share location via SMS/WhatsApp',
      'Ask at police stations for help',
    ],
  },
};

export class LocalAIAdvisor {
  private tts: LocalTextToSpeech;

  constructor() {
    this.tts = new LocalTextToSpeech();
  }

  // Get advice based on situation (100% offline)
  getAdvice(situation: string): EmergencyAdvice | null {
    const normalized = situation.toLowerCase();
    
    for (const [key, advice] of Object.entries(EMERGENCY_KNOWLEDGE_BASE)) {
      if (normalized.includes(key)) {
        return advice;
      }
    }
    
    // Check for keywords
    const keywords: Record<string, string[]> = {
      'stalking': ['follow', 'stalking', 'behind me', 'chasing'],
      'assault': ['attack', 'assault', 'hit', 'hurt', 'violence'],
      'harassment': ['harass', 'touch', 'grop', 'catcall', 'comment'],
      'domestic': ['husband', 'partner', 'family', 'home abuse'],
      'accident': ['accident', 'injured', 'blood', 'unconscious'],
      'lost': ['lost', 'stranded', 'dont know where', 'unfamiliar'],
    };

    for (const [key, words] of Object.entries(keywords)) {
      if (words.some(word => normalized.includes(word))) {
        return EMERGENCY_KNOWLEDGE_BASE[key];
      }
    }

    return null;
  }

  // Speak advice aloud (offline TTS)
  speakAdvice(advice: EmergencyAdvice) {
    const text = `Emergency advice for ${advice.situation}. 
      Immediate actions: ${advice.immediate.slice(0, 2).join('. ')}.
      Remember: ${advice.resources[0]}`;
    
    this.tts.speak(text, { rate: 0.9 });
  }

  // Get all available situations
  getAvailableSituations(): string[] {
    return Object.keys(EMERGENCY_KNOWLEDGE_BASE);
  }

  // Quick help - speaks most relevant advice
  quickHelp(situation: string) {
    const advice = this.getAdvice(situation);
    if (advice) {
      this.speakAdvice(advice);
      return advice;
    }
    return null;
  }
}

// ============================================
// VOICE-ACTIVATED SOS SYSTEM
// ============================================

export class VoiceActivatedSOS {
  private recognition: LocalSpeechRecognition;
  private tts: LocalTextToSpeech;
  private isActive = false;
  private onActivate?: () => void;
  private onDeactivate?: () => void;

  constructor() {
    this.recognition = new LocalSpeechRecognition();
    this.tts = new LocalTextToSpeech();
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for voice commands
    window.addEventListener('voice-sos-activate', () => {
      this.activate();
    });

    window.addEventListener('voice-sos-deactivate', () => {
      this.deactivate();
    });
  }

  startListening() {
    if (!this.recognition.isSupported()) {
      console.warn('Voice recognition not supported');
      return false;
    }

    const started = this.recognition.start();
    if (started) {
      this.tts.speak('Voice activation enabled. Say help or emergency to trigger SOS.');
    }
    return started;
  }

  stopListening() {
    this.recognition.stop();
    this.tts.speak('Voice activation disabled.');
  }

  private activate() {
    if (this.isActive) return;
    this.isActive = true;
    this.tts.speak('Emergency SOS activated! Sending alerts to your contacts.');
    this.onActivate?.();
  }

  private deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    this.tts.speak('Emergency cancelled. Stay safe.');
    this.onDeactivate?.();
  }

  onSOSActivate(callback: () => void) {
    this.onActivate = callback;
  }

  onSOSDeactivate(callback: () => void) {
    this.onDeactivate = callback;
  }

  isVoiceSupported(): boolean {
    return this.recognition.isSupported();
  }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

let speechRecognitionInstance: LocalSpeechRecognition | null = null;
let textToSpeechInstance: LocalTextToSpeech | null = null;
let aiAdvisorInstance: LocalAIAdvisor | null = null;
let voiceSOSInstance: VoiceActivatedSOS | null = null;

export function getSpeechRecognition(): LocalSpeechRecognition {
  if (!speechRecognitionInstance) {
    speechRecognitionInstance = new LocalSpeechRecognition();
  }
  return speechRecognitionInstance;
}

export function getTextToSpeech(): LocalTextToSpeech {
  if (!textToSpeechInstance) {
    textToSpeechInstance = new LocalTextToSpeech();
  }
  return textToSpeechInstance;
}

export function getAIAdvisor(): LocalAIAdvisor {
  if (!aiAdvisorInstance) {
    aiAdvisorInstance = new LocalAIAdvisor();
  }
  return aiAdvisorInstance;
}

export function getVoiceSOS(): VoiceActivatedSOS {
  if (!voiceSOSInstance) {
    voiceSOSInstance = new VoiceActivatedSOS();
  }
  return voiceSOSInstance;
}
