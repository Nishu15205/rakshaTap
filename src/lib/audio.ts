// Audio Service for SOS alarms and emergency alerts

class AudioService {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private sosInterval: NodeJS.Timeout | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play continuous siren alarm (until stopped)
   */
  playContinuousAlarm(): void {
    if (this.isPlaying) return;

    try {
      const ctx = this.getContext();
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      this.isPlaying = true;

      // Create oscillator for alarm
      this.oscillator = ctx.createOscillator();
      this.gainNode = ctx.createGain();

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);

      // Siren effect - oscillating frequency
      this.oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      this.oscillator.type = 'sine';
      
      // Create LFO for siren modulation
      this.lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      this.lfo.frequency.value = 4; // 4 Hz modulation for siren effect
      lfoGain.gain.value = 300;
      this.lfo.connect(lfoGain);
      lfoGain.connect(this.oscillator.frequency);
      this.lfo.start();

      // Set volume
      this.gainNode.gain.value = 0.6;

      // Start the oscillator
      this.oscillator.start();
      
      console.log('[Audio] Continuous alarm started');
    } catch (error) {
      console.error('[Audio] Error starting alarm:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Stop the alarm
   */
  stopAlarm(): void {
    console.log('[Audio] Stopping alarm...');
    
    // Stop continuous oscillator
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch {
        // Already stopped
      }
      this.oscillator = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.lfo) {
      try {
        this.lfo.stop();
        this.lfo.disconnect();
      } catch {
        // Already stopped
      }
      this.lfo = null;
    }

    // Stop SOS interval
    if (this.sosInterval) {
      clearInterval(this.sosInterval);
      this.sosInterval = null;
    }

    this.isPlaying = false;
    console.log('[Audio] Alarm stopped');
  }

  /**
   * Play a single beep
   */
  playBeep(frequency: number = 800, duration: number = 0.15): void {
    try {
      const ctx = this.getContext();
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = frequency;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + duration - 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error('[Audio] Error playing beep:', error);
    }
  }

  /**
   * Play countdown beeps
   */
  playCountdownBeep(count: number): void {
    this.playBeep(600 + count * 100, 0.1);
  }

  /**
   * Speak emergency message using Text-to-Speech
   */
  speakEmergency(message: string): void {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      utterance.volume = 1.0;
      
      // Try to use a clear voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Speak when calling a contact
   */
  speakCallingContact(contactName: string): void {
    this.speakEmergency(`Calling ${contactName}`);
  }

  /**
   * Speak when sending SMS to a contact
   */
  speakSMSContact(contactName: string): void {
    this.speakEmergency(`Opening message to ${contactName}`);
  }

  /**
   * Stop all audio
   */
  stopAll(): void {
    this.stopAlarm();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Check if audio is playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Export singleton instance
export const audioService = new AudioService();
