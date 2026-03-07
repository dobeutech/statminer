import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '@/types';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  send: (data: WebSocketMessage) => void;
  close: () => void;
  reconnect: () => void;
}

export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectAttempts = 2,
    reconnectInterval = 10000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const urlRef = useRef(url);

  // Update URL ref when it changes
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = urlRef.current.startsWith('/')
        ? `${protocol}//${window.location.host}${urlRef.current}`
        : urlRef.current;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = (event) => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectCountRef.current = 0;
        onOpen?.(event);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          onMessage?.(event.data);
        }
      };

      wsRef.current.onerror = (event) => {
        setError('WebSocket connection error');
        onError?.(event);
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          // Unexpected close, attempt to reconnect
          reconnectCountRef.current += 1;
          setError(`Connection lost. Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          setError('Connection failed. Maximum reconnection attempts reached.');
        }
        
        onClose?.(event);
      };
    } catch (err) {
      setIsConnecting(false);
      setError('Failed to create WebSocket connection');
      console.error('WebSocket connection error:', err);
    }
  }, [onMessage, onError, onOpen, onClose, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectCountRef.current = 0;
  }, []);

  const send = useCallback((data: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
        setError('Failed to send message');
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Initial connection
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    send,
    close: disconnect,
    reconnect,
  };
};