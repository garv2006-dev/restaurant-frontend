import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface ApiErrorState {
  message: string;
  isTimeout: boolean;
  isNetworkError: boolean;
  statusCode?: number;
}

export const useApiError = () => {
  const [error, setError] = useState<ApiErrorState | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((err: any): ApiErrorState => {
    let errorState: ApiErrorState = {
      message: 'An unexpected error occurred',
      isTimeout: false,
      isNetworkError: false,
    };

    // Check if it's our enhanced timeout error
    if (err.isTimeout) {
      errorState = {
        message: err.message || 'The server is taking longer than expected. This may be due to server startup. Please try again.',
        isTimeout: true,
        isNetworkError: false,
      };
    }
    // Check for network errors
    else if (!err.response && (err.code === 'ERR_NETWORK' || err.message.includes('Network Error'))) {
      errorState = {
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        isTimeout: false,
        isNetworkError: true,
      };
    }
    // Check for timeout specifically
    else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      errorState = {
        message: 'Request timed out. The server may be starting up. Please wait a moment and try again.',
        isTimeout: true,
        isNetworkError: false,
      };
    }
    // Handle HTTP errors
    else if (err.response) {
      const status = err.response.status;
      errorState.statusCode = status;

      switch (status) {
        case 400:
          errorState.message = err.response.data?.message || 'Invalid request. Please check your input.';
          break;
        case 401:
          errorState.message = 'Authentication required. Please log in.';
          break;
        case 403:
          errorState.message = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorState.message = 'The requested resource was not found.';
          break;
        case 409:
          errorState.message = err.response.data?.message || 'A conflict occurred. Please try again.';
          break;
        case 429:
          errorState.message = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          errorState.message = 'Server error. Please try again later.';
          break;
        case 502:
        case 503:
          errorState.message = 'The server is temporarily unavailable. Please try again in a moment.';
          break;
        case 504:
          errorState.message = 'Gateway timeout. The server is taking too long to respond.';
          errorState.isTimeout = true;
          break;
        default:
          errorState.message = err.response.data?.message || `An error occurred (${status})`;
      }
    }
    // Generic error
    else if (err.message) {
      errorState.message = err.message;
    }

    setError(errorState);
    return errorState;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(async (fn: () => Promise<any>) => {
    setIsRetrying(true);
    clearError();
    try {
      const result = await fn();
      setIsRetrying(false);
      return result;
    } catch (err) {
      setIsRetrying(false);
      handleError(err);
      throw err;
    }
  }, [clearError, handleError]);

  return {
    error,
    handleError,
    clearError,
    retry,
    isRetrying,
  };
};

export default useApiError;
