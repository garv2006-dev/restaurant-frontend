import React, { useState, useEffect } from 'react';

interface LoadingWithTimeoutProps {
  isLoading: boolean;
  slowThreshold?: number; // milliseconds before showing "taking longer" message
  message?: string;
  slowMessage?: string;
}

const LoadingWithTimeout: React.FC<LoadingWithTimeoutProps> = ({
  isLoading,
  slowThreshold = 5000, // 5 seconds
  message = 'Loading...',
  slowMessage = 'This is taking longer than usual. The server may be starting up. Please wait...',
}) => {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSlow(true);
    }, slowThreshold);

    return () => clearTimeout(timer);
  }, [isLoading, slowThreshold]);

  if (!isLoading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px',
        }} />
        <p style={{
          margin: 0,
          fontSize: '16px',
          color: isSlow ? '#856404' : '#333',
          fontWeight: isSlow ? 'bold' : 'normal',
        }}>
          {isSlow ? slowMessage : message}
        </p>
        {isSlow && (
          <p style={{
            margin: '10px 0 0',
            fontSize: '14px',
            color: '#666',
          }}>
            ⏱️ Cold start detected - this may take up to 60 seconds
          </p>
        )}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoadingWithTimeout;
