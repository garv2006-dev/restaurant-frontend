import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Toast } from 'react-bootstrap';
import { notificationSoundService } from '../../services/NotificationSoundService';
import './SoundPermissionToast.css';

interface SoundPermissionToastProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

/**
 * SoundPermissionToast - Browser-style permission prompt for notification sounds
 * 
 * Features:
 * - Appears only once per user (unless permission is reset)
 * - Respects browser autoplay policies
 * - Stores user preference in localStorage
 * - Non-intrusive toast design
 * - Smooth animations and transitions
 * - Accessible with ARIA labels
 */
const SoundPermissionToast: React.FC<SoundPermissionToastProps> = ({
  onPermissionGranted,
  onPermissionDenied
}) => {
  const [show, setShow] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if we should show the permission prompt
    const shouldShow = notificationSoundService.shouldShowPermissionPrompt();
    
    if (shouldShow) {
      // Delay showing the toast to avoid overwhelming the user on page load
      // This also ensures the page is fully loaded and interactive
      const timer = setTimeout(() => {
        setShow(true);
        console.log('🔔 Showing sound permission prompt');
      }, 2000); // 2 second delay for better UX
      
      return () => clearTimeout(timer);
    } else {
      const permissionState = notificationSoundService.getPermissionState();
      console.log('🔕 Not showing permission prompt. Current state:', permissionState);
    }
  }, []);

  const handleAllow = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    console.log('✅ User clicked "Enable Sounds"');
    
    try {
      // Grant permission and initialize audio
      // This counts as a valid user interaction for browser autoplay policies
      await notificationSoundService.grantSoundPermission();
      
      // Play a test sound to confirm it works and provide immediate feedback
      await notificationSoundService.playNotificationSound('system');
      
      // Hide the toast with smooth animation
      setShow(false);
      
      // Callback for parent component
      onPermissionGranted?.();
      
      console.log('✅ Sound permission granted successfully');
    } catch (error) {
      console.error('❌ Failed to enable sounds:', error);
      // Still hide the toast even if there's an error
      // The permission is saved, user can test manually later
      setShow(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = () => {
    if (isProcessing) return;
    
    console.log('🔇 User clicked "Not Now" or closed the toast');
    
    // Deny permission and remember the choice
    // This prevents the prompt from appearing again
    notificationSoundService.denySoundPermission();
    
    // Hide the toast with smooth animation
    setShow(false);
    
    // Callback for parent component
    onPermissionDenied?.();
    
    console.log('🔇 Sound permission denied - will not prompt again');
  };

  // Don't render anything if not showing
  if (!show) {
    return null;
  }

  return (
    <div 
      className="sound-permission-toast-container"
      role="alertdialog"
      aria-labelledby="sound-permission-title"
      aria-describedby="sound-permission-description"
    >
      <Toast 
        show={show} 
        onClose={handleDeny}
        className="sound-permission-toast"
        autohide={false}
      >
        <Toast.Header closeButton={false}>
          <Volume2 
            className="me-2 text-primary" 
            size={20} 
            aria-hidden="true"
          />
          <strong 
            className="me-auto" 
            id="sound-permission-title"
          >
            Notification Sounds Disabled
          </strong>
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss notification sound prompt"
            onClick={handleDeny}
            disabled={isProcessing}
          />
        </Toast.Header>
        <Toast.Body>
          <p 
            className="mb-3" 
            id="sound-permission-description"
          >
            Enable notification sounds to hear alerts for bookings, payments, and important updates. 
            You can change this later in your settings.
          </p>
          <div className="d-flex gap-2 justify-content-end">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={handleDeny}
              disabled={isProcessing}
              aria-label="Dismiss and keep sounds disabled"
            >
              <VolumeX size={16} className="me-1" aria-hidden="true" />
              Not Now
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleAllow}
              disabled={isProcessing}
              aria-label="Enable notification sounds"
            >
              <Volume2 size={16} className="me-1" aria-hidden="true" />
              {isProcessing ? 'Enabling...' : 'Enable Sounds'}
            </button>
          </div>
        </Toast.Body>
      </Toast>
    </div>
  );
};

export default SoundPermissionToast;
