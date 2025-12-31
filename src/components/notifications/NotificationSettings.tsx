import React, { useState, useEffect } from 'react';
import { VolumeX, Volume2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { notificationSoundService } from '../../services/NotificationSoundService';
import '../../styles/notification-settings.css';

interface NotificationSettingsProps {
  className?: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className = '' }) => {
  const { isSoundEnabled, setSoundEnabled, testNotificationSound } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());

  // Sync with context
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, [isSoundEnabled]);

  // Initialize audio context on component mount
  useEffect(() => {
    const initAudio = () => {
      notificationSoundService.initializeOnUserInteraction();
    };
    
    // Initialize on first user interaction
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  const handleToggleSound = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const newState = !soundEnabled;
      setSoundEnabled(newState);
      setSoundEnabledState(newState);
      
      // Play a test sound when enabling (with slight delay)
      if (newState) {
        setTimeout(() => {
          testNotificationSound();
        }, 300);
      }
    } catch (error) {
      console.error('Error toggling sound:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  return (
    <div className={`notification-sound-control ${className}`}>
      <button
        className={`sound-toggle-button ${soundEnabled ? 'enabled' : 'disabled'} ${isLoading ? 'loading' : ''}`}
        onClick={handleToggleSound}
        disabled={isLoading}
        title={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
        aria-label={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
        type="button"
      >
        <div className="sound-icon-container">
          {soundEnabled ? (
            <Volume2 size={16} className="sound-icon" />
          ) : (
            <VolumeX size={16} className="sound-icon" />
          )}
        </div>
        {isLoading && <div className="loading-spinner"></div>}
      </button>
      
      <div className="sound-status-text">
        <span className={`status-label ${soundEnabled ? 'enabled' : 'disabled'}`}>
          {soundEnabled ? 'Sound On' : 'Sound Off'}
        </span>
      </div>
    </div>
  );
};

export default NotificationSettings;