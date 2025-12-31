/**
 * Enhanced NotificationSoundService - Complete notification sound management
 * Handles playing notification sounds with volume control, browser compatibility and user preferences
 * 
 * Features:
 * - Cross-browser support (Chrome, Firefox, Edge, Safari)
 * - Browser autoplay policy compliance
 * - User interaction requirement handling
 * - Tab visibility awareness
 * - Sound throttling to prevent spam
 * - Volume control with persistence
 * - Graceful fallback between Web Audio API and HTML5 Audio
 */

class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private soundVolume: number = 0.7;
  private lastPlayTime: number = 0;
  private minPlayInterval: number = 500;
  private audioElement: HTMLAudioElement | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized: boolean = false;
  private isTabVisible: boolean = true;
  private pendingSoundQueue: string[] = [];
  private maxQueueSize: number = 3;
  private initializationPromise: Promise<void> | null = null;
  private audioUnlocked: boolean = false;

  constructor() {
    this.loadUserPreferences();
    this.initializeAudioContext();
    this.createAudioElement();
    this.setupVisibilityListener();
    this.setupUnlockListener();
  }

  /**
   * Setup listener to unlock audio on first user interaction
   * Required for browser autoplay policies
   */
  private setupUnlockListener(): void {
    if (typeof document === 'undefined') return;

    const unlockAudio = async () => {
      if (this.audioUnlocked) return;
      
      console.log('🔓 Attempting to unlock audio on user interaction...');
      
      try {
        // Resume AudioContext if suspended
        if (this.audioContext?.state === 'suspended') {
          await this.audioContext.resume();
          console.log('✅ AudioContext resumed');
        }
        
        // Play silent audio to unlock HTML5 Audio
        if (this.audioElement) {
          const originalVolume = this.audioElement.volume;
          this.audioElement.volume = 0;
          try {
            await this.audioElement.play();
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
          } catch (e) {
            // Ignore errors during unlock attempt
          }
          this.audioElement.volume = originalVolume;
        }
        
        this.audioUnlocked = true;
        console.log('✅ Audio unlocked successfully');
        
        // Remove listeners after successful unlock
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      } catch (error) {
        console.warn('⚠️ Audio unlock attempt failed:', error);
      }
    };

    // Listen for user interactions
    document.addEventListener('click', unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('touchend', unlockAudio, { passive: true });
    document.addEventListener('keydown', unlockAudio, { passive: true });
  }

  /**
   * Setup visibility change listener to handle tab switching
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;
    
    // Set initial state
    this.isTabVisible = document.visibilityState === 'visible';
    
    document.addEventListener('visibilitychange', () => {
      const wasHidden = !this.isTabVisible;
      this.isTabVisible = document.visibilityState === 'visible';
      console.log('👁️ Tab visibility changed:', this.isTabVisible ? 'visible' : 'hidden');
      
      // Play ONE queued sound when tab becomes visible (avoid spam)
      if (this.isTabVisible && wasHidden && this.pendingSoundQueue.length > 0) {
        const nextSound = this.pendingSoundQueue.shift();
        this.pendingSoundQueue = []; // Clear remaining to avoid spam
        
        if (nextSound && this.soundEnabled) {
          console.log('🔊 Playing queued notification sound');
          // Delay slightly to ensure tab is fully active
          setTimeout(() => {
            this.playNotificationSound(nextSound).catch(console.error);
          }, 100);
        }
      }
    });
  }

  /**
   * Create HTML5 Audio element for fallback and volume control
   */
  private createAudioElement(): void {
    try {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';
      this.audioElement.volume = this.soundVolume;
      
      // Create a high-quality notification sound
      this.generateNotificationAudioData();
      
    } catch (error) {
      console.warn('Failed to create audio element:', error);
    }
  }

  /**
   * Generate high-quality notification sound data
   */
  private generateNotificationAudioData(): void {
    if (!this.audioElement) return;

    try {
      const sampleRate = 44100;
      const duration = 0.6;
      const samples = Math.floor(sampleRate * duration);
      
      // Create WAV file buffer
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + samples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, samples * 2, true);
      
      // Generate pleasant notification sound with multiple tones
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 4) * (1 - Math.exp(-t * 20)); // Attack-decay envelope
        
        let sample = 0;
        
        // Multi-tone notification sound
        if (t < 0.15) {
          // First tone - C6 (1047 Hz)
          sample = Math.sin(2 * Math.PI * 1047 * t) * envelope * 0.4;
        } else if (t < 0.3) {
          // Second tone - E6 (1319 Hz)
          sample = Math.sin(2 * Math.PI * 1319 * t) * envelope * 0.35;
        } else if (t < 0.45) {
          // Third tone - G6 (1568 Hz)
          sample = Math.sin(2 * Math.PI * 1568 * t) * envelope * 0.3;
        } else {
          // Final tone - C7 (2093 Hz)
          sample = Math.sin(2 * Math.PI * 2093 * t) * envelope * 0.25;
        }
        
        const intSample = Math.floor(sample * 32767);
        view.setInt16(44 + i * 2, intSample, true);
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      this.audioElement.src = URL.createObjectURL(blob);
      
    } catch (error) {
      console.warn('Failed to generate notification audio data:', error);
    }
  }

  /**
   * Initialize Web Audio API context with gain control
   */
  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        
        // Create master gain node for volume control
        if (this.audioContext) {
          this.gainNode = this.audioContext.createGain();
          this.gainNode.connect(this.audioContext.destination);
          this.gainNode.gain.setValueAtTime(this.soundVolume, this.audioContext.currentTime);
        }
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Load user sound preferences from localStorage
   */
  private loadUserPreferences(): void {
    try {
      const soundEnabled = localStorage.getItem('notificationSoundEnabled');
      const soundVolume = localStorage.getItem('notificationSoundVolume');
      
      this.soundEnabled = soundEnabled !== 'false'; // Default to true
      this.soundVolume = soundVolume ? Math.max(0, Math.min(1, parseFloat(soundVolume))) : 0.7;
      
      // Update audio elements
      this.updateVolume();
      
    } catch (error) {
      console.warn('Failed to load sound preferences:', error);
    }
  }

  /**
   * Save user sound preferences to localStorage
   */
  private saveUserPreferences(): void {
    try {
      localStorage.setItem('notificationSoundEnabled', this.soundEnabled.toString());
      localStorage.setItem('notificationSoundVolume', this.soundVolume.toString());
    } catch (error) {
      console.warn('Failed to save sound preferences:', error);
    }
  }

  /**
   * Update volume across all audio systems
   */
  private updateVolume(): void {
    // Update HTML5 Audio volume
    if (this.audioElement) {
      this.audioElement.volume = this.soundVolume;
    }
    
    // Update Web Audio API gain
    if (this.gainNode && this.audioContext) {
      try {
        this.gainNode.gain.setValueAtTime(this.soundVolume, this.audioContext.currentTime);
      } catch (error) {
        console.warn('Failed to update Web Audio gain:', error);
      }
    }
  }

  /**
   * Generate notification sound using Web Audio API with volume control
   */
  private generateWebAudioSound(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext || !this.gainNode) {
        reject(new Error('Web Audio API not available'));
        return;
      }

      try {
        const now = this.audioContext.currentTime;
        
        // Create oscillators for rich notification sound
        const oscillators: OscillatorNode[] = [];
        const frequencies = [1047, 1319, 1568, 2093]; // C6, E6, G6, C7
        const timings = [0, 0.1, 0.2, 0.3];
        const durations = [0.2, 0.2, 0.2, 0.3];
        
        frequencies.forEach((freq, index) => {
          const oscillator = this.audioContext!.createOscillator();
          const envelope = this.audioContext!.createGain();
          
          oscillator.connect(envelope);
          envelope.connect(this.gainNode!);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(freq, now + timings[index]);
          
          // Envelope for smooth sound
          const startTime = now + timings[index];
          const endTime = startTime + durations[index];
          
          envelope.gain.setValueAtTime(0, startTime);
          envelope.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
          envelope.gain.exponentialRampToValueAtTime(0.001, endTime);
          
          oscillator.start(startTime);
          oscillator.stop(endTime);
          
          oscillators.push(oscillator);
        });
        
        // Resolve when sound completes
        setTimeout(() => resolve(), 700);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Play notification sound with proper volume control
   * Handles browser autoplay policies and various edge cases
   */
  public async playNotificationSound(notificationType: string): Promise<void> {
    // Check if sound is enabled
    if (!this.soundEnabled || this.soundVolume === 0) {
      console.log('🔇 Sound disabled or volume is 0');
      return;
    }

    // Only play sound for specific notification types
    const soundEnabledTypes = ['promotion', 'room_booking', 'payment', 'system'];
    if (!soundEnabledTypes.includes(notificationType)) {
      console.log('🔕 Sound not enabled for notification type:', notificationType);
      return;
    }

    // Handle tab visibility - queue sound if tab is hidden
    if (!this.isTabVisible) {
      console.log('👁️ Tab hidden, queueing notification sound');
      if (this.pendingSoundQueue.length < this.maxQueueSize) {
        this.pendingSoundQueue.push(notificationType);
      }
      return;
    }

    // Throttle sound playing to prevent spam
    const now = Date.now();
    if (now - this.lastPlayTime < this.minPlayInterval) {
      console.log('⏱️ Sound throttled - too soon since last play');
      return;
    }

    console.log('🔊 Playing notification sound for type:', notificationType);

    try {
      // Ensure audio is initialized
      if (!this.isInitialized) {
        console.log('⚠️ Audio not initialized, initializing now...');
        await this.initializeOnUserInteraction();
      }

      // Ensure audio context is ready
      await this.ensureAudioContextReady();
      
      // Update last play time BEFORE attempting to play
      // This prevents rapid retries if playback fails
      this.lastPlayTime = now;
      
      // Try HTML5 Audio first (more reliable across browsers)
      let playSuccess = false;
      
      try {
        await this.playHTML5Audio();
        playSuccess = true;
        console.log('✅ Sound played via HTML5 Audio');
      } catch (html5Error) {
        console.warn('⚠️ HTML5 Audio failed:', html5Error);
      }
      
      // Fallback to Web Audio API if HTML5 failed
      if (!playSuccess) {
        try {
          await this.generateWebAudioSound();
          playSuccess = true;
          console.log('✅ Sound played via Web Audio API');
        } catch (webAudioError) {
          console.warn('⚠️ Web Audio API failed:', webAudioError);
        }
      }
      
      if (!playSuccess) {
        console.error('❌ All audio playback methods failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to play notification sound:', error);
      // Fail silently - don't break the UI
    }
  }

  /**
   * Play sound using HTML5 Audio with volume control
   */
  private playHTML5Audio(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioElement) {
        console.error('❌ Audio element not available');
        reject(new Error('Audio element not available'));
        return;
      }

      if (!this.audioElement.src) {
        console.error('❌ Audio element has no source');
        reject(new Error('Audio element has no source'));
        return;
      }

      try {
        // Reset and configure audio
        this.audioElement.currentTime = 0;
        this.audioElement.volume = this.soundVolume;
        
        console.log('🎵 Playing HTML5 audio with volume:', this.soundVolume);
        console.log('🎵 Audio element state:', {
          src: this.audioElement.src.substring(0, 50) + '...',
          readyState: this.audioElement.readyState,
          paused: this.audioElement.paused,
          volume: this.audioElement.volume,
          muted: this.audioElement.muted
        });
        
        const playPromise = this.audioElement.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ HTML5 audio play promise resolved');
              resolve();
            })
            .catch((error) => {
              console.error('❌ HTML5 audio play promise rejected:', error);
              console.error('Error name:', error.name);
              console.error('Error message:', error.message);
              reject(error);
            });
        } else {
          console.log('⚠️ HTML5 audio play returned undefined (legacy browser)');
          resolve();
        }
        
      } catch (error) {
        console.error('❌ HTML5 audio play threw error:', error);
        reject(error);
      }
    });
  }

  /**
   * Ensure audio context is ready for playback
   */
  private async ensureAudioContextReady(): Promise<void> {
    if (!this.audioContext) {
      console.log('⚠️ No audio context available');
      return;
    }

    console.log('🎧 Audio context state:', this.audioContext.state);

    if (this.audioContext.state === 'suspended') {
      try {
        console.log('▶️ Resuming suspended audio context...');
        await this.audioContext.resume();
        console.log('✅ Audio context resumed, new state:', this.audioContext.state);
        
        // Wait a bit for the context to fully resume
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error('❌ Failed to resume audio context:', error);
        throw error;
      }
    } else if (this.audioContext.state === 'running') {
      console.log('✅ Audio context already running');
    } else {
      console.warn('⚠️ Audio context in unexpected state:', this.audioContext.state);
    }
  }

  /**
   * Enable/disable notification sounds
   */
  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.saveUserPreferences();
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('notificationSoundToggle', { 
      detail: { enabled: this.soundEnabled } 
    }));
  }

  /**
   * Set notification sound volume (0.0 to 1.0)
   */
  public setSoundVolume(volume: number): void {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    
    // Update all audio systems
    this.updateVolume();
    
    // Auto-enable sound if volume > 0
    if (this.soundVolume > 0 && !this.soundEnabled) {
      this.soundEnabled = true;
    } else if (this.soundVolume === 0) {
      this.soundEnabled = false;
    }
    
    this.saveUserPreferences();
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('notificationVolumeChange', { 
      detail: { volume: this.soundVolume, enabled: this.soundEnabled } 
    }));
  }

  /**
   * Get current sound enabled status
   */
  public isSoundEnabled(): boolean {
    return this.soundEnabled && this.soundVolume > 0;
  }

  /**
   * Get current sound volume
   */
  public getSoundVolume(): number {
    return this.soundVolume;
  }

  /**
   * Initialize audio context on user interaction
   * This is required by browser autoplay policies
   */
  public async initializeOnUserInteraction(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    if (this.isInitialized) {
      console.log('✅ Audio already initialized');
      return;
    }

    this.initializationPromise = this._doInitialize();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Internal initialization logic
   */
  private async _doInitialize(): Promise<void> {
    console.log('🎬 Initializing audio system...');

    try {
      // Resume AudioContext if suspended
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
        console.log('✅ AudioContext resumed');
      }
      
      // Preload audio element
      if (this.audioElement && this.audioElement.src) {
        try {
          this.audioElement.load();
          
          // Wait for audio to be ready with timeout
          await Promise.race([
            new Promise<void>((resolve) => {
              if (this.audioElement!.readyState >= 2) {
                resolve();
              } else {
                this.audioElement!.addEventListener('canplay', () => resolve(), { once: true });
              }
            }),
            new Promise<void>((_, reject) => 
              setTimeout(() => reject(new Error('Audio load timeout')), 3000)
            )
          ]);
          
          console.log('✅ Audio element preloaded');
        } catch (loadError) {
          console.warn('⚠️ Audio preload failed (non-critical):', loadError);
        }
      }
      
      this.isInitialized = true;
      this.audioUnlocked = true;
      console.log('✅ Notification sound service initialized');
      
      // Dispatch event for UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notificationSoundInitialized'));
      }
      
    } catch (error) {
      console.error('❌ Audio initialization failed:', error);
      throw error;
    }
  }

  /**
   * Test notification sound with current volume
   */
  public async testSound(): Promise<void> {
    console.log('Testing notification sound...');
    console.log('Sound enabled:', this.soundEnabled);
    console.log('Sound volume:', this.soundVolume);
    console.log('Is initialized:', this.isInitialized);
    
    // Temporarily bypass throttling for test
    this.lastPlayTime = 0;
    
    // Ensure audio is initialized
    if (!this.isInitialized) {
      console.log('Audio not initialized, initializing now...');
      try {
        await this.initializeOnUserInteraction();
      } catch (error) {
        console.error('Failed to initialize audio for test:', error);
        throw new Error('Audio initialization failed. Please click anywhere on the page first.');
      }
    }
    
    try {
      await this.playNotificationSound('promotion');
      console.log('Test sound completed successfully');
    } catch (error) {
      console.error('Failed to test notification sound:', error);
      throw error;
    }
  }

  /**
   * Get volume as percentage (0-100)
   */
  public getVolumePercentage(): number {
    return Math.round(this.soundVolume * 100);
  }

  /**
   * Set volume from percentage (0-100)
   */
  public setVolumePercentage(percentage: number): void {
    const volume = Math.max(0, Math.min(100, percentage)) / 100;
    this.setSoundVolume(volume);
  }

  /**
   * Check if audio system is ready to play
   */
  public isReady(): boolean {
    return this.isInitialized && this.audioUnlocked;
  }

  /**
   * Get current audio state for debugging
   */
  public getAudioState(): object {
    return {
      isInitialized: this.isInitialized,
      audioUnlocked: this.audioUnlocked,
      soundEnabled: this.soundEnabled,
      soundVolume: this.soundVolume,
      isTabVisible: this.isTabVisible,
      audioContextState: this.audioContext?.state || 'not-created',
      hasAudioElement: !!this.audioElement,
      pendingQueueSize: this.pendingSoundQueue.length
    };
  }

  /**
   * Clean up audio resources
   */
  public dispose(): void {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        if (this.audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(this.audioElement.src);
        }
        this.audioElement = null;
      }
      
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      this.gainNode = null;
      this.isInitialized = false;
      this.audioUnlocked = false;
      this.pendingSoundQueue = [];
      
      console.log('🧹 NotificationSoundService disposed');
    } catch (error) {
      console.error('Error disposing audio resources:', error);
    }
  }
}

// Export singleton instance
export const notificationSoundService = new NotificationSoundService();
export default notificationSoundService;