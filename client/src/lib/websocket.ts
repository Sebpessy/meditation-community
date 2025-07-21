import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: number;
  message: string;
  timestamp: string;
  user: {
    id: number;
    name: string;
    profilePicture?: string;
  };
}

export interface OnlineUser {
  id: number;
  name: string;
  profilePicture?: string;
}

export interface WebSocketMessage {
  type: string;
  onlineUsers?: OnlineUser[];
  [key: string]: any;
}

export function useWebSocket(userId?: number, sessionDate?: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  // Keep messages in sync with ref for persistence
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const connectWebSocket = () => {
    if (!userId || !sessionDate) {
      console.log('WebSocket connection skipped: userId =', userId, 'sessionDate =', sessionDate);
      return null;
    }
    
    console.log('Starting WebSocket connection for user:', userId, 'session:', sessionDate);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected for user:', userId, 'session:', sessionDate);
      setIsConnected(true);
      setSocket(ws);
      
      // Join session
      ws.send(JSON.stringify({
        type: 'join-session',
        userId,
        sessionDate
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'new-message':
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const exists = prev.some(msg => msg.id === message.message.id);
              if (exists) return prev;
              
              const newMessages = [...prev, message.message];
              // Keep only last 30 messages for memory management
              return newMessages.length > 30 ? newMessages.slice(-30) : newMessages;
            });
            break;
          case 'user-joined':
          case 'user-left':
            console.log('Online count updated:', message.onlineCount);
            setOnlineCount(message.onlineCount);
            if (message.onlineUsers) {
              setOnlineUsers(message.onlineUsers);
            }
            break;
          case 'initial-messages':
            // Load initial messages and keep last 30, avoiding duplicates
            const initialMessages = message.messages.slice(-30);
            setMessages(prev => {
              // Create a map of existing message IDs for quick lookup
              const existingIds = new Set(prev.map(msg => msg.id));
              
              // Filter out messages that already exist
              const newMessages = initialMessages.filter((msg: ChatMessage) => !existingIds.has(msg.id));
              
              // Combine existing messages with new ones
              const combined = [...prev, ...newMessages];
              
              // Keep only last 30 messages
              return combined.length > 30 ? combined.slice(-30) : combined;
            });
            break;
          case 'message-deleted':
            setMessages(prev => prev.filter(msg => msg.id !== message.messageId));
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
      setIsConnected(false);
      setSocket(null);
      
      // Auto-reconnect if should reconnect and connection was lost unexpectedly
      // Continue reconnecting even during fullscreen/PiP modes
      if (shouldReconnectRef.current && reconnectTimeoutRef.current === null) {
        console.log('Scheduling WebSocket reconnection in 2 seconds...');
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          if (shouldReconnectRef.current) {
            connectWebSocket();
          }
        }, 2000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  };

  useEffect(() => {
    const ws = connectWebSocket();
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && (!socket || socket.readyState !== WebSocket.OPEN)) {
        console.log('Page became visible, reconnecting WebSocket...');
        connectWebSocket();
      }
    };

    // Handle window focus
    const handleWindowFocus = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log('Window focused, reconnecting WebSocket...');
        connectWebSocket();
      }
    };

    // Handle clicks to reconnect
    const handleClick = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log('Click detected, reconnecting WebSocket...');
        connectWebSocket();
      }
    };

    // Handle fullscreen changes - maintain connection during fullscreen
    const handleFullscreenChange = () => {
      console.log('Fullscreen changed, ensuring WebSocket connection:', !!document.fullscreenElement);
      // Maintain connection during fullscreen mode
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log('Reconnecting WebSocket during fullscreen change...');
        connectWebSocket();
      }
    };

    // Handle picture-in-picture changes - maintain connection during PiP
    const handlePiPChange = () => {
      console.log('PiP state changed, ensuring WebSocket connection:', !!document.pictureInPictureElement);
      // Maintain connection during picture-in-picture mode
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log('Reconnecting WebSocket during PiP change...');
        connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleClick);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave-session',
          userId,
          sessionDate
        }));
      }
      ws?.close();
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, [userId, sessionDate]);

  const sendMessage = (text: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat-message',
        text
      }));
    }
  };

  return {
    messages,
    onlineCount,
    onlineUsers,
    isConnected,
    sendMessage
  };
}
