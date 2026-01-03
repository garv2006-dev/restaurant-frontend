import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionTimestamp: number; // Track when socket connected/reconnected
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionTimestamp: Date.now()
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

// Create socket instance OUTSIDE component to persist across re-renders
let socketInstance: Socket | null = null;

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionTimestamp, setConnectionTimestamp] = useState(Date.now());
  const isInitialized = useRef(false);
  const hasJoinedUserRoom = useRef(false);

  useEffect(() => {
    // Prevent multiple socket connections (React StrictMode protection)
    if (isInitialized.current) {
      console.log('Socket already initialized, reusing existing connection');
      if (socketInstance) {
        setSocket(socketInstance);
        setIsConnected(socketInstance.connected);
      }
      return;
    }

    console.log('Initializing Socket.io connection...');
    isInitialized.current = true;

    // Create socket with both polling and websocket support
    socketInstance = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      transports: ['polling', 'websocket'], // Try polling first, upgrade to websocket
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false, // Reuse existing connection
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.io connected with ID:', socketInstance?.id);
      const timestamp = Date.now();
      setIsConnected(true);
      setConnectionTimestamp(timestamp);
      console.log('📅 Connection timestamp updated:', new Date(timestamp).toISOString());
      
      // CRITICAL FIX: Auto-join user room on connection if user is logged in
      try {
        const userStr = localStorage.getItem('user');
        console.log('🔍 Checking localStorage for user:', userStr ? 'Found' : 'Not found');
        
        if (userStr) {
          const user = JSON.parse(userStr);
          console.log('🔍 Parsed user object:', { id: user?.id, _id: user?._id, name: user?.name });
          
          // Try both 'id' and '_id' fields (MongoDB uses _id)
          const userId = user?.id || user?._id;
          
          if (userId) {
            socketInstance?.emit('join-user-room', userId);
            hasJoinedUserRoom.current = true;
            console.log('✅ Auto-joined user room on connection:', userId);
          } else {
            console.warn('⚠️ User object found but no id field:', user);
          }
        } else {
          console.warn('⚠️ No user found in localStorage - will join room after login');
        }
      } catch (error) {
        console.error('❌ Failed to auto-join user room:', error);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('⚠️ Socket.io disconnected. Reason:', reason);
      setIsConnected(false);
      hasJoinedUserRoom.current = false; // Reset flag on disconnect
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, manually reconnect
        socketInstance?.connect();
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.io reconnected after', attemptNumber, 'attempts');
      const timestamp = Date.now();
      setIsConnected(true);
      setConnectionTimestamp(timestamp);
      console.log('📅 Reconnection timestamp updated:', new Date(timestamp).toISOString());
      
      // CRITICAL FIX: Re-join user room on reconnection
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          // Try both 'id' and '_id' fields (MongoDB uses _id)
          const userId = user?.id || user?._id;
          
          if (userId) {
            socketInstance?.emit('join-user-room', userId);
            hasJoinedUserRoom.current = true;
            console.log('✅ Re-joined user room on reconnection:', userId);
          }
        }
      } catch (error) {
        console.warn('Failed to re-join user room on reconnection:', error);
      }
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.warn('❌ Reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket.io reconnection failed after all attempts');
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('❌ Connection error:', error.message);
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('❌ Socket.io error:', error);
    });

    setSocket(socketInstance);

    // CRITICAL: Do NOT disconnect on unmount
    // Socket should persist across component re-renders and page navigation
    return () => {
      console.log('SocketProvider unmounting (socket will remain connected)');
      // Do NOT call socketInstance.disconnect() here
      // Socket persists for the entire app lifecycle
    };
  }, []); // Empty dependency array - run only once

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionTimestamp }}>
      {children}
    </SocketContext.Provider>
  );
};

// Cleanup function for app shutdown (call this on logout or app close)
export const disconnectSocket = () => {
  if (socketInstance) {
    console.log('Manually disconnecting socket...');
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default SocketContext;
