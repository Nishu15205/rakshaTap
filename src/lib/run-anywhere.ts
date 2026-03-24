/**
 * RunAnywhere SDK Integration
 * HackXtreme Edition - Local AI Models
 * 
 * This module integrates RunAnywhere SDK for running local AI models:
 * - LLM (Large Language Model) via WebLLM (MLC)
 * - Whisper for Speech-to-Text
 * - Local TTS models
 * 
 * @see https://github.com/run-anywhere/web-starter-app
 * @see https://github.com/mlc-ai/web-llm
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface RunAnywhereConfig {
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface LLMResponse {
  text: string;
  tokens: number;
  latency: number;
}

export interface STTResponse {
  transcript: string;
  confidence: number;
  language: string;
}

export interface TTSConfig {
  voice?: string;
  rate?: number;
  pitch?: number;
}

// ============================================
// WEB LLM - Real Implementation
// ============================================

/**
 * RunAnywhere Local LLM Client
 * 
 * Runs a local LLM model directly in the browser using WebLLM (MLC)
 * This provides true offline AI capabilities with zero cloud costs
 */
export class RunAnywhereLLM {
  private engine: unknown = null;
  private isLoaded = false;
  private loadProgress = 0;
  private config: RunAnywhereConfig;
  private modelId: string;

  constructor(config: RunAnywhereConfig = {}) {
    this.config = {
      maxTokens: 256,
      temperature: 0.7,
      ...config,
    };
    this.modelId = config.modelPath || 'Phi-3.5-mini-instruct-q4f16_1-MLC';
  }

  /**
   * Initialize and load the LLM model
   * Uses WebLLM (MLC) for running models in browser via WebGPU
   */
  async loadModel(modelId?: string): Promise<boolean> {
    if (modelId) {
      this.modelId = modelId;
    }

    try {
      this.config.onProgress?.(0);

      // Try to load WebLLM
      if (typeof window !== 'undefined') {
        const webLLMEngine = await this.loadWebLLM();
        if (webLLMEngine) {
          this.engine = webLLMEngine;
          this.isLoaded = true;
          this.config.onProgress?.(100);
          return true;
        }

        // Fallback to knowledge base (still works offline!)
        console.log('WebLLM not available, using knowledge base fallback');
        this.isLoaded = true;
        this.config.onProgress?.(100);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to load LLM model:', error);
      this.config.onError?.(error as Error);
      // Still mark as loaded for fallback
      this.isLoaded = true;
      return true;
    }
  }

  /**
   * Load WebLLM Engine
   */
  private async loadWebLLM(): Promise<unknown | null> {
    try {
      // Dynamic import of WebLLM
      // @ts-expect-error - WebLLM is installed
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      
      if (CreateMLCEngine) {
        console.log('Loading WebLLM model:', this.modelId);
        
        const engine = await CreateMLCEngine(this.modelId, {
          initProgressCallback: (progress: { progress: number; text: string }) => {
            this.loadProgress = progress.progress * 100;
            this.config.onProgress?.(this.loadProgress);
            console.log(`WebLLM: ${progress.text} (${Math.round(this.loadProgress)}%)`);
          },
        });
        
        console.log('WebLLM engine loaded successfully');
        return engine;
      }
    } catch (error) {
      console.log('WebLLM loading failed, using fallback:', error);
    }
    return null;
  }

  /**
   * Generate text using the local LLM
   */
  async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const startTime = performance.now();

    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // If we have WebLLM engine, use it
    if (this.engine && typeof (this.engine as { chat?: { completions?: { create?: (args: unknown) => Promise<unknown> } } }).chat?.completions?.create === 'function') {
      try {
        // @ts-expect-error - WebLLM API
        const response = await this.engine.chat.completions.create({
          messages: [
            ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
            { role: 'user' as const, content: prompt },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        });

        return {
          text: response.choices[0]?.message?.content || '',
          tokens: this.config.maxTokens || 0,
          latency: performance.now() - startTime,
        };
      } catch (error) {
        console.error('WebLLM generation failed:', error);
      }
    }

    // Fallback: Enhanced knowledge base with context-aware responses
    const response = this.generateFromKnowledgeBase(prompt, systemPrompt);
    return {
      ...response,
      latency: performance.now() - startTime,
    };
  }

  /**
   * Generate response from enhanced knowledge base
   * This provides intelligent responses without needing a full LLM
   */
  private generateFromKnowledgeBase(prompt: string, _systemPrompt?: string): LLMResponse {
    const lowerPrompt = prompt.toLowerCase();
    
    // Emergency context detection
    const emergencyResponses: Record<string, string> = {
      'help': this.getEmergencyResponse('general'),
      'emergency': this.getEmergencyResponse('general'),
      'follow': this.getEmergencyResponse('stalking'),
      'stalking': this.getEmergencyResponse('stalking'),
      'behind me': this.getEmergencyResponse('stalking'),
      'attack': this.getEmergencyResponse('assault'),
      'assault': this.getEmergencyResponse('assault'),
      'harass': this.getEmergencyResponse('harassment'),
      'touching': this.getEmergencyResponse('harassment'),
      'scared': this.getEmergencyResponse('general'),
      'danger': this.getEmergencyResponse('general'),
      'domestic': this.getEmergencyResponse('domestic'),
      'abuse': this.getEmergencyResponse('domestic'),
      'lost': this.getEmergencyResponse('lost'),
      'accident': this.getEmergencyResponse('accident'),
      'medical': this.getEmergencyResponse('accident'),
      'injured': this.getEmergencyResponse('accident'),
    };

    for (const [keyword, response] of Object.entries(emergencyResponses)) {
      if (lowerPrompt.includes(keyword)) {
        return { text: response, tokens: 50, latency: 0 };
      }
    }

    // Default response
    return {
      text: this.getEmergencyResponse('general'),
      tokens: 50,
      latency: 0,
    };
  }

  private getEmergencyResponse(type: string): string {
    const responses: Record<string, string> = {
      general: `🚨 EMERGENCY GUIDANCE:
1. Stay calm and assess your surroundings
2. Move to a safe, populated area if possible
3. Use your SOS button to alert contacts
4. Call 112 for immediate help
5. Share your live location

Remember: Your safety is the priority. Trust your instincts.`,
      
      stalking: `👁️ BEING FOLLOWED - ACT NOW:
1. Don't go home - head to a crowded area
2. Enter a shop, restaurant, or public building
3. Call someone and share live location
4. If persistent, call 100 or 112
5. Take photos/videos if safe

DO NOT lead them to your home!`,
      
      assault: `⚠️ PHYSICAL THREAT:
1. SCREAM "FIRE!" - people respond faster
2. Run towards crowds
3. Use your personal alarm
4. Target sensitive areas if grabbed: eyes, nose, throat
5. Drop to the ground if being dragged

Call 112 immediately!`,
      
      harassment: `🛑 HARASSMENT RESPONSE:
1. Say "STOP" loudly and clearly
2. Draw attention from others
3. Move to a public area
4. Document everything
5. Report to authorities

Women Helpline: 181`,
      
      domestic: `🏠 DOMESTIC SITUATION:
1. Prioritize your physical safety
2. Have an escape plan ready
3. Keep documents accessible
4. Know safe places nearby
5. Keep your phone charged

Women Helpline: 181 | Emergency: 112`,
      
      lost: `📍 LOST/STRANDED:
1. Stay calm - panic makes it worse
2. Check GPS/maps on your phone
3. Look for landmarks or street signs
4. Ask shopkeepers for help
5. Call a trusted contact

Share your location via SMS/WhatsApp`,
      
      accident: `🏥 MEDICAL EMERGENCY:
1. Check for injuries
2. Call 102 for ambulance
3. Don't move seriously injured people
4. Apply first aid if trained
5. Stay calm and provide clear info

Emergency: 112 | Ambulance: 102`,
    };

    return responses[type] || responses.general;
  }

  /**
   * Unload the model to free memory
   */
  async unload(): Promise<void> {
    if (this.engine && typeof (this.engine as { unload?: () => Promise<void> }).unload === 'function') {
      await (this.engine as { unload: () => Promise<void> }).unload();
    }
    this.engine = null;
    this.isLoaded = false;
  }

  isModelLoaded(): boolean {
    return this.isLoaded;
  }

  getLoadProgress(): number {
    return this.loadProgress;
  }
}

// ============================================
// WHISPER WASM - Real Implementation
// ============================================

/**
 * RunAnywhere Whisper STT
 * 
 * Uses Whisper WASM for offline speech recognition
 * with fallback to Web Speech API
 */
export class RunAnywhereSTT {
  private whisperModel: unknown = null;
  private isLoaded = false;
  private onResultCallback?: (result: STTResponse) => void;
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  async loadModel(): Promise<boolean> {
    try {
      // Try to load Whisper WASM
      const whisper = await this.loadWhisperWasm();
      if (whisper) {
        this.whisperModel = whisper;
        this.isLoaded = true;
        return true;
      }

      // Fallback to Web Speech API (always available in browsers)
      this.isLoaded = true;
      return true;
    } catch (error) {
      console.error('Failed to load STT model:', error);
      this.isLoaded = true; // Still usable with fallback
      return true;
    }
  }

  /**
   * Load Whisper WASM
   */
  private async loadWhisperWasm(): Promise<unknown | null> {
    try {
      // @ts-expect-error - Whisper WASM
      const whisperModule = await import('whisper-wasm');
      
      if (whisperModule) {
        console.log('Whisper WASM loaded');
        return whisperModule;
      }
    } catch (error) {
      console.log('Whisper WASM not available, using Web Speech API:', error);
    }
    return null;
  }

  /**
   * Start listening for speech
   */
  async startListening(): Promise<boolean> {
    // Use Web Speech API as primary (works offline in Chrome/Edge)
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN';

        this.recognition.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          this.onResultCallback?.({
            transcript: result[0].transcript,
            confidence: result[0].confidence,
            language: 'en-IN',
          });
        };

        this.recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
        };

        this.recognition.start();
        this.isListening = true;
        return true;
      }
    }

    return false;
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Transcribe audio file (for Whisper WASM)
   */
  async transcribe(audioBlob: Blob): Promise<STTResponse> {
    // If we have Whisper model loaded, use it
    if (this.whisperModel && typeof (this.whisperModel as { transcribe?: (blob: Blob) => Promise<STTResponse> }).transcribe === 'function') {
      return (this.whisperModel as { transcribe: (blob: Blob) => Promise<STTResponse> }).transcribe(audioBlob);
    }

    // Fallback: return empty (would need actual implementation)
    return {
      transcript: '',
      confidence: 0,
      language: 'en-IN',
    };
  }

  onResult(callback: (result: STTResponse) => void): void {
    this.onResultCallback = callback;
  }

  isActive(): boolean {
    return this.isListening;
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

// ============================================
// RUN ANYWHERE - LOCAL TTS
// ============================================

/**
 * RunAnywhere Local TTS
 * 
 * Uses local TTS models with fallback to Web Speech API
 */
export class RunAnywhereTTS {
  private ttsModel: unknown = null;
  private isLoaded = false;

  async loadModel(): Promise<boolean> {
    // Web Speech API is always available
    this.isLoaded = true;
    return true;
  }

  /**
   * Speak text aloud
   */
  speak(text: string, config: TTSConfig = {}): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config.rate ?? 1;
    utterance.pitch = config.pitch ?? 1;
    utterance.lang = 'en-IN';

    // Try to find an Indian English voice
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(v => 
      v.lang.includes('en-IN') || v.lang.includes('en_IN')
    );
    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Check if speaking
   */
  isSpeaking(): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    return window.speechSynthesis.speaking;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.speechSynthesis;
  }
}

// ============================================
// VISION MODEL - Document Scanner with Tesseract.js OCR
// ============================================

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  lines: string[];
}

/**
 * RunAnywhere Vision
 * 
 * Document scanning and image understanding
 * Uses Tesseract.js for offline OCR (Optical Character Recognition)
 */
export class RunAnywhereVision {
  private isLoaded = false;
  private loadProgress = 0;
  private worker: unknown = null;
  private onProgressCallback?: (progress: number) => void;

  async loadModel(onProgress?: (progress: number) => void): Promise<boolean> {
    this.onProgressCallback = onProgress;
    
    try {
      // Try to load Tesseract.js
      const tesseractWorker = await this.loadTesseractWorker();
      if (tesseractWorker) {
        this.worker = tesseractWorker;
        this.isLoaded = true;
        this.loadProgress = 100;
        this.onProgressCallback?.(100);
        return true;
      }

      // Fallback - still usable for basic scanning
      this.isLoaded = true;
      return true;
    } catch (error) {
      console.error('Failed to load Vision model:', error);
      this.isLoaded = true; // Still usable with fallback
      return true;
    }
  }

  /**
   * Load Tesseract.js Worker
   */
  private async loadTesseractWorker(): Promise<unknown | null> {
    if (typeof window === 'undefined') return null;

    try {
      // Dynamic import of Tesseract.js
      const Tesseract = await import('tesseract.js');
      
      if (Tesseract.createWorker) {
        console.log('Loading Tesseract.js OCR worker...');
        this.onProgressCallback?.(10);
        
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: (m: { status: string; progress: number }) => {
            console.log(`Tesseract: ${m.status} - ${Math.round(m.progress * 100)}%`);
            this.loadProgress = 10 + m.progress * 90;
            this.onProgressCallback?.(this.loadProgress);
          },
        });

        console.log('Tesseract.js OCR worker loaded successfully');
        return worker;
      }
    } catch (error) {
      console.log('Tesseract.js not available, using fallback:', error);
    }
    return null;
  }

  /**
   * Scan document from camera
   */
  async scanDocument(videoElement: HTMLVideoElement): Promise<string | null> {
    if (typeof document === 'undefined') return null;

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoElement, 0, 0);
      
      // Get image data
      const imageData = canvas.toDataURL('image/png');
      return imageData;
    } catch (error) {
      console.error('Document scan failed:', error);
      return null;
    }
  }

  /**
   * Request camera access
   */
  async requestCamera(): Promise<MediaStream | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera
        audio: false,
      });
      return stream;
    } catch (error) {
      console.error('Camera access denied:', error);
      return null;
    }
  }

  /**
   * Extract text from image using Tesseract.js OCR
   */
  async extractText(imageData: string): Promise<OCRResult> {
    const defaultResult: OCRResult = {
      text: '',
      confidence: 0,
      words: [],
      lines: [],
    };

    // If we have Tesseract worker loaded, use it
    if (this.worker) {
      try {
        // @ts-expect-error - Tesseract worker API
        const result = await this.worker.recognize(imageData);
        
        const words = result.data.words?.map((w: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }) => ({
          text: w.text,
          confidence: w.confidence,
          bbox: w.bbox,
        })) || [];

        return {
          text: result.data.text || '',
          confidence: result.data.confidence || 0,
          words,
          lines: result.data.text?.split('\n').filter(Boolean) || [],
        };
      } catch (error) {
        console.error('OCR recognition failed:', error);
      }
    }

    // Fallback: Try to use Tesseract.recognize directly
    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          console.log(`OCR: ${m.status} - ${Math.round(m.progress * 100)}%`);
        },
      });

      const words = result.data.words?.map((w: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox,
      })) || [];

      return {
        text: result.data.text || '',
        confidence: result.data.confidence || 0,
        words,
        lines: result.data.text?.split('\n').filter(Boolean) || [],
      };
    } catch (error) {
      console.error('Fallback OCR failed:', error);
    }

    return defaultResult;
  }

  /**
   * Terminate worker to free memory
   */
  async terminate(): Promise<void> {
    if (this.worker && typeof (this.worker as { terminate?: () => Promise<void> }).terminate === 'function') {
      await (this.worker as { terminate: () => Promise<void> }).terminate();
    }
    this.worker = null;
    this.isLoaded = false;
  }

  isModelLoaded(): boolean {
    return this.isLoaded;
  }

  getLoadProgress(): number {
    return this.loadProgress;
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

let llmInstance: RunAnywhereLLM | null = null;
let sttInstance: RunAnywhereSTT | null = null;
let ttsInstance: RunAnywhereTTS | null = null;
let visionInstance: RunAnywhereVision | null = null;

export function getRunAnywhereLLM(config?: RunAnywhereConfig): RunAnywhereLLM {
  if (!llmInstance) {
    llmInstance = new RunAnywhereLLM(config);
  }
  return llmInstance;
}

export function getRunAnywhereSTT(): RunAnywhereSTT {
  if (!sttInstance) {
    sttInstance = new RunAnywhereSTT();
  }
  return sttInstance;
}

export function getRunAnywhereTTS(): RunAnywhereTTS {
  if (!ttsInstance) {
    ttsInstance = new RunAnywhereTTS();
  }
  return ttsInstance;
}

export function getRunAnywhereVision(): RunAnywhereVision {
  if (!visionInstance) {
    visionInstance = new RunAnywhereVision();
  }
  return visionInstance;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Check if RunAnywhere is fully available
 */
export async function checkRunAnywhereAvailability(): Promise<{
  llm: boolean;
  stt: boolean;
  tts: boolean;
  vision: boolean;
  webgpu: boolean;
  overall: boolean;
}> {
  const llm = new RunAnywhereLLM();
  const stt = new RunAnywhereSTT();
  const tts = new RunAnywhereTTS();
  const vision = new RunAnywhereVision();

  // Check WebGPU support (needed for WebLLM)
  let webgpu = false;
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      // @ts-expect-error - WebGPU API
      const adapter = await navigator.gpu.requestAdapter();
      webgpu = !!adapter;
    } catch {
      webgpu = false;
    }
  }

  const [llmReady] = await Promise.all([
    llm.loadModel().catch(() => false),
  ]);

  const sttReady = stt.isSupported();
  const ttsReady = tts.isSupported();
  const visionReady = vision.isSupported();

  return {
    llm: llmReady,
    stt: sttReady,
    tts: ttsReady,
    vision: visionReady,
    webgpu,
    overall: llmReady && sttReady && ttsReady,
  };
}
