import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: number;
  message: string;
  timestamp: string;
  user: {
    id: number;
    name: string;
  };
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(userId?: number, sessionDate?: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId || !sessionDate) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
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
            setMessages(prev => [...prev, message.message]);
            break;
          case 'user-joined':
          case 'user-left':
            setOnlineCount(message.onlineCount);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave-session',
          userId,
          sessionDate
        }));
      }
      ws.close();
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
    isConnected,
    sendMessage
  };
}
