import React, { useState, useEffect } from 'react';
import { Volume2, AlertCircle } from 'lucide-react';
import { notificationSoundService } from '../../services/NotificationSoundService';
import { Alert } from 'react-bootstrap';

const AudioStatusIndicator: React.FC = () => {
  const [audioReady, setAudioReady] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  useEffect(() => {
    // Check audio state periodically
    const checkAudioState = () => {
      const isReady = notificationSoundService.isReady();
      setAudioReady(isReady);
      
      // Hide warning after audio is ready
      if (isReady && showWarning) {
        setTimeout(() => setShowWarning(false), 3000);
      }
    };

    // Check immediately
    checkAudioState();

    // Check every 2 seconds
    const interval = setInterval(checkAudioState, 2000);

    // Listen for initialization event
    const handleInitialized = () => {
      setAudioReady(true);
      setTimeout(() => setShowWarning(false), 3000);
    };

    window.addEventListener('notificationSoundInitialized', handleInitialized);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationSoundInitialized', handleInitialized);
    };
  }, [showWarning]);

  // Don't show anything if audio is ready and warning dismissed
  if (audioReady && !showWarning) {
    return null;
  }

  // Show warning if audio not ready
  if (!audioReady && showWarning) {
    return (
      <Alert 
        variant="warning" 
        dismissible 
        onClose={() => setShowWarning(false)}
        className="audio-status-alert"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9998,
          maxWidth: '400px'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <AlertCircle size={20} />
          <div>
            <strong>Notification Sounds Disabled</strong>
            <p className="mb-0 small">
              Click anywhere on the page to enable notification sounds.
            </p>
          </div>
        </div>
      </Alert>
    );
  }

  // Show success message briefly after initialization
  if (audioReady && showWarning) {
    return (
      <Alert 
        variant="success" 
        dismissible 
        onClose={() => setShowWarning(false)}
        className="audio-status-alert"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9998,
          maxWidth: '400px'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Volume2 size={20} />
          <div>
            <strong>Notification Sounds Enabled</strong>
            <p className="mb-0 small">
              You'll hear a sound when new notifications arrive.
            </p>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
};

export default AudioStatusIndicator;
