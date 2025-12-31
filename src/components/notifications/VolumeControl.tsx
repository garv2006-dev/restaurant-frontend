import React, { useState, useEffect, useRef } from 'react';
import { Button, OverlayTrigger, Popover, Form } from 'react-bootstrap';
import { VolumeX, Volume1, Volume2, VolumeOff } from 'lucide-react';
import { notificationSoundService } from '../../services/NotificationSoundService';
import '../../styles/volume-control.css';

interface VolumeControlProps {
  className?: string;
  size?: 'sm' | 'lg';
}

const VolumeControl: React.FC<VolumeControlProps> = ({ className = '', size = 'sm' }) => {
  const [volume, setVolume] = useState(notificationSoundService.getVolumePercentage());
  const [isEnabled, setIsEnabled] = useState(notificationSoundService.isSoundEnabled());
  const [showPopover, setShowPopover] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const volumeRef = useRef<HTMLInputElement>(null);

  // Listen for volume changes from other components
  useEffect(() => {
    const handleVolumeChange = (event: CustomEvent) => {
      setVolume(Math.round(event.detail.volume * 100));
      setIsEnabled(event.detail.enabled);
    };

    const handleSoundToggle = (event: CustomEvent) => {
      setIsEnabled(event.detail.enabled);
    };

    window.addEventListener('notificationVolumeChange', handleVolumeChange as EventListener);
    window.addEventListener('notificationSoundToggle', handleSoundToggle as EventListener);

    return () => {
      window.removeEventListener('notificationVolumeChange', handleVolumeChange as EventListener);
      window.removeEventListener('notificationSoundToggle', handleSoundToggle as EventListener);
    };
  }, []);

  // Initialize audio on first interaction
  useEffect(() => {
    let isInitialized = false;

    const initAudio = async () => {
      if (isInitialized) return;
      
      try {
        await notificationSoundService.initializeOnUserInteraction();
        isInitialized = true;
        console.log('Audio initialized from VolumeControl');
      } catch (error) {
        console.error('Failed to initialize audio from VolumeControl:', error);
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const getVolumeIcon = () => {
    if (!isEnabled || volume === 0) return VolumeX;
    if (volume < 30) return VolumeOff;
    if (volume < 70) return Volume1;
    return Volume2;
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 14;
      case 'lg': return 20;
      default: return 16;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    notificationSoundService.setVolumePercentage(newVolume);
    setIsEnabled(newVolume > 0);
  };

  const handleMuteToggle = () => {
    if (isEnabled && volume > 0) {
      // Mute
      notificationSoundService.setSoundEnabled(false);
      setIsEnabled(false);
    } else {
      // Unmute
      const targetVolume = volume > 0 ? volume : 70;
      notificationSoundService.setVolumePercentage(targetVolume);
      setVolume(targetVolume);
      setIsEnabled(true);
    }
  };

  const handleTestSound = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      console.log('Testing notification sound...');
      await notificationSoundService.testSound();
      console.log('Test sound completed');
    } catch (error) {
      console.error('Failed to test sound:', error);
      alert('Failed to play test sound. Please check your browser audio settings.');
    } finally {
      setTimeout(() => setIsPlaying(false), 1000);
    }
  };

  const VolumeIcon = getVolumeIcon();

  const popoverContent = (
    <Popover id="volume-control-popover" className="volume-control-popover">
      <Popover.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span>Notification Volume</span>
          <Button
            variant="link"
            size="sm"
            onClick={handleTestSound}
            disabled={isPlaying || (!isEnabled && volume === 0)}
            className="test-sound-btn p-0"
          >
            {isPlaying ? 'Playing...' : 'Test'}
          </Button>
        </div>
      </Popover.Header>
      <Popover.Body>
        <div className="volume-control-content">
          <div className="volume-slider-container">
            <VolumeX size={14} className="volume-icon-min" />
            <Form.Range
              ref={volumeRef}
              min={0}
              max={100}
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="volume-slider"
              disabled={isPlaying}
            />
            <Volume2 size={14} className="volume-icon-max" />
          </div>
          
          <div className="volume-info">
            <div className="volume-percentage">
              {volume}%
            </div>
            <div className="volume-status">
              {!isEnabled || volume === 0 ? 'Muted' : 
               volume < 30 ? 'Low' : 
               volume < 70 ? 'Medium' : 'High'}
            </div>
          </div>

          <div className="volume-presets">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleVolumeChange(25)}
              className="preset-btn"
            >
              25%
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleVolumeChange(50)}
              className="preset-btn"
            >
              50%
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleVolumeChange(75)}
              className="preset-btn"
            >
              75%
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleVolumeChange(100)}
              className="preset-btn"
            >
              100%
            </Button>
          </div>
        </div>
      </Popover.Body>
    </Popover>
  );

  return (
    <div className={`volume-control ${className}`}>
      <OverlayTrigger
        trigger="click"
        placement="bottom"
        overlay={popoverContent}
        show={showPopover}
        onToggle={setShowPopover}
        rootClose
      >
        <Button
          variant={isEnabled && volume > 0 ? "primary" : "outline-secondary"}
          size={size}
          className={`volume-toggle-btn`}
          onClick={handleMuteToggle}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowPopover(!showPopover);
          }}
          title={`Volume: ${volume}% ${isEnabled ? '(Enabled)' : '(Muted)'}`}
        >
          <VolumeIcon size={getIconSize()} />
          {size !== 'sm' && (
            <span className="volume-text ms-1">
              {volume}%
            </span>
          )}
        </Button>
      </OverlayTrigger>
    </div>
  );
};

export default VolumeControl;