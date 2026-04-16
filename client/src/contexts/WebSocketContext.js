import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const { checkAuth } = useAuth();
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN)) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WS] Connecting to', url);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[WS] Connected');
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload || !payload.type) return;

          console.log('[WS] Received:', payload.type);

          // Handle specific events
          
          // 1. User Data Updates (Points, Votes, etc.)
          if (
            payload.type === 'user_points_updated' ||
            payload.type === 'user_contribution_submitted' ||
            payload.type === 'contribution_approved' ||
            payload.type === 'contribution_rejected' ||
            payload.type === 'user_voting_updated' ||
            payload.type === 'user_overrides_updated' ||
            payload.type === 'user_vote_submitted'
          ) {
            // Refresh user data in AuthContext
            checkAuth();
            // Dispatch event for admin components
            window.dispatchEvent(new Event('users:update'));
          }

          // 2. Global Data Updates (Rounds, Votes, etc.)
          if (
            payload.type === 'contribution_round_updated' ||
            payload.type === 'setting_updated' ||
            /vote_(started|paused|resumed|completed|created|updated|deleted)/i.test(payload.type)
          ) {
            // Dispatch event for components listening to datastore updates
            // This is compatible with existing Voting.js and ContributionTimer.js logic
            window.dispatchEvent(new Event('datastore:update'));
          }

        } catch (err) {
          console.error('[WS] Message error:', err);
        }
      };

      ws.current.onclose = () => {
        console.log('[WS] Disconnected');
        ws.current = null;
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[WS] Reconnecting in ${delay}ms...`);
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      };

      ws.current.onerror = (err) => {
        console.error('[WS] Error:', err);
        if (ws.current) ws.current.close();
      };

    } catch (err) {
      console.error('[WS] Connection failed:', err);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) ws.current.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ ws: ws.current }}>
      {children}
    </WebSocketContext.Provider>
  );
};
