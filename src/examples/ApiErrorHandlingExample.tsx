/**
 * Example: How to use the new error handling utilities
 * 
 * This file demonstrates best practices for handling API errors,
 * timeouts, and providing user-friendly feedback.
 */

import React, { useState, useEffect } from 'react';
import { roomsAPI } from '../services/api';
import useApiError from '../hooks/useApiError';
import LoadingWithTimeout from '../components/LoadingWithTimeout';

const ApiErrorHandlingExample: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { error, handleError, clearError, retry, isRetrying } = useApiError();

  const fetchRooms = async () => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await roomsAPI.getAllRooms();
      if (response.success && response.data) {
        setRooms(response.data.rooms);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRetry = () => {
    retry(fetchRooms);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Rooms List</h2>

      {/* Loading indicator with timeout warning */}
      <LoadingWithTimeout 
        isLoading={isLoading || isRetrying}
        slowThreshold={5000}
        message="Loading rooms..."
        slowMessage="Server is starting up. This may take up to 60 seconds on first request."
      />

      {/* Error display with retry option */}
      {error && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: error.isTimeout ? '#fff3cd' : '#f8d7da',
          border: `1px solid ${error.isTimeout ? '#ffc107' : '#dc3545'}`,
          borderRadius: '4px',
          color: error.isTimeout ? '#856404' : '#721c24',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>
              {error.isTimeout ? '⏱️' : error.isNetworkError ? '🌐' : '⚠️'}
            </span>
            <div style={{ flex: 1 }}>
              <strong>{error.isTimeout ? 'Timeout' : error.isNetworkError ? 'Network Error' : 'Error'}</strong>
              <p style={{ margin: '5px 0 0' }}>{error.message}</p>
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                opacity: isRetrying ? 0.6 : 1,
              }}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={clearError}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && rooms.length === 0 && (
        <p>No rooms available.</p>
      )}

      {!isLoading && rooms.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {rooms.map((room) => (
            <div key={room.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor: 'white',
            }}>
              <h3>{room.name}</h3>
              <p>{room.type}</p>
              <p style={{ fontWeight: 'bold' }}>${room.pricePerNight}/night</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiErrorHandlingExample;

/**
 * USAGE NOTES:
 * 
 * 1. The useApiError hook automatically:
 *    - Detects timeout errors
 *    - Detects network errors
 *    - Provides user-friendly messages
 *    - Offers retry functionality
 * 
 * 2. LoadingWithTimeout component:
 *    - Shows normal loading for first 5 seconds
 *    - Shows "taking longer" message after threshold
 *    - Explains cold start behavior to users
 * 
 * 3. Error display:
 *    - Different colors for different error types
 *    - Retry button for recoverable errors
 *    - Dismiss button to clear error
 * 
 * 4. Best practices:
 *    - Always clear errors before new requests
 *    - Show loading state during requests
 *    - Provide retry option for timeouts
 *    - Explain cold starts to users
 */
