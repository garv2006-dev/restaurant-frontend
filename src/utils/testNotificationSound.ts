/**
 * Test Utility for Notification Sound
 * Use this in browser console to test notification sounds
 */

import { notificationSoundService } from '../services/NotificationSoundService';

// Comprehensive test function
(window as any).testNotificationSound = async (type: string = 'promotion') => {
  console.log('=== 🔊 Testing Notification Sound ===');
  console.log('Type:', type);
  console.log('Sound Enabled:', notificationSoundService.isSoundEnabled());
  console.log('Volume:', notificationSoundService.getVolumePercentage() + '%');
  
  try {
    await notificationSoundService.testSound();
    console.log('✅ Test sound completed successfully');
  } catch (error) {
    console.error('❌ Test sound failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message
      });
    }
  }
};

// Diagnostic function
(window as any).diagnoseNotificationSound = () => {
  console.log('=== 🔍 Notification Sound Diagnostics ===');
  
  // Get detailed state from service
  const audioState = notificationSoundService.getAudioState();
  
  console.log('1. Sound Service State:');
  console.log('   - Initialized:', (audioState as any).isInitialized);
  console.log('   - Audio Unlocked:', (audioState as any).audioUnlocked);
  console.log('   - Enabled:', (audioState as any).soundEnabled);
  console.log('   - Volume:', Math.round((audioState as any).soundVolume * 100) + '%');
  console.log('   - Tab Visible:', (audioState as any).isTabVisible);
  console.log('   - AudioContext State:', (audioState as any).audioContextState);
  console.log('   - Has Audio Element:', (audioState as any).hasAudioElement);
  console.log('   - Pending Queue Size:', (audioState as any).pendingQueueSize);
  console.log('   - Is Ready:', notificationSoundService.isReady());
  
  console.log('2. Browser Audio Support:');
  console.log('   - AudioContext:', !!(window.AudioContext || (window as any).webkitAudioContext));
  console.log('   - HTMLAudioElement:', !!window.HTMLAudioElement);
  
  console.log('3. User Preferences:');
  try {
    const soundEnabled = localStorage.getItem('notificationSoundEnabled');
    const soundVolume = localStorage.getItem('notificationSoundVolume');
    console.log('   - Stored Enabled:', soundEnabled);
    console.log('   - Stored Volume:', soundVolume);
  } catch (e) {
    console.log('   - Cannot access localStorage:', e);
  }
  
  console.log('4. Browser Autoplay Policy:');
  console.log('   - User must interact with page before audio can play');
  console.log('   - Click anywhere on the page to enable audio');
  
  console.log('\n💡 Troubleshooting Tips:');
  console.log('   1. Click anywhere on the page to initialize audio');
  console.log('   2. Check browser console for audio errors');
  console.log('   3. Ensure volume is not 0%');
  console.log('   4. Try: testNotificationSound()');
  console.log('   5. Try: notificationSoundService.setVolumePercentage(70)');
  
  return audioState;
};

// Enable sound function
(window as any).enableNotificationSound = (volume: number = 70) => {
  console.log('🔊 Enabling notification sound...');
  notificationSoundService.setSoundEnabled(true);
  notificationSoundService.setVolumePercentage(volume);
  console.log('✅ Sound enabled at', volume + '%');
  console.log('💡 Now try: testNotificationSound()');
};

// Disable sound function
(window as any).disableNotificationSound = () => {
  console.log('🔇 Disabling notification sound...');
  notificationSoundService.setSoundEnabled(false);
  console.log('✅ Sound disabled');
};

// Initialize audio function
(window as any).initializeNotificationAudio = async () => {
  console.log('🎬 Initializing notification audio...');
  try {
    await notificationSoundService.initializeOnUserInteraction();
    console.log('✅ Audio initialized successfully');
    console.log('💡 Now try: testNotificationSound()');
  } catch (error) {
    console.error('❌ Failed to initialize audio:', error);
    console.log('💡 Make sure you clicked on the page first');
  }
};

// Make notification service available for debugging
(window as any).notificationSoundService = notificationSoundService;

console.log('🔊 Notification Sound Test Utility Loaded');
console.log('═══════════════════════════════════════');
console.log('Available Commands:');
console.log('  testNotificationSound()              - Test with default type');
console.log('  testNotificationSound("payment")     - Test with specific type');
console.log('  diagnoseNotificationSound()          - Run diagnostics');
console.log('  enableNotificationSound(70)          - Enable sound at 70%');
console.log('  disableNotificationSound()           - Disable sound');
console.log('  initializeNotificationAudio()        - Initialize audio manually');
console.log('  notificationSoundService             - Access service directly');
console.log('═══════════════════════════════════════');
console.log('💡 Quick Start:');
console.log('  1. Click anywhere on the page');
console.log('  2. Run: testNotificationSound()');
console.log('═══════════════════════════════════════');
