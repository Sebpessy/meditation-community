import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";

interface LiveChatProps {
  userId?: number;
  sessionDate: string;
  onOnlineCountChange?: (count: number) => void;
}

export function LiveChat({ userId, sessionDate, onOnlineCountChange }: LiveChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, onlineCount, isConnected, sendMessage } = useWebSocket(userId, sessionDate);

  // Update parent component when online count changes
  useEffect(() => {
    if (onOnlineCountChange) {
      onOnlineCountChange(onlineCount);
    }
  }, [onlineCount, onOnlineCountChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await apiRequest("GET", `/api/meditation/chat/${sessionDate}`);
        // Initial messages are loaded via WebSocket connection
      } catch (error) {
        console.error("Failed to load chat messages:", error);
      }
    };

    loadMessages();
  }, [sessionDate]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && isConnected && userId) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-neutral-200 bg-white sticky top-0 z-10 md:relative">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-800">Live Chat</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-neutral-400'}`} />
              <span className="text-sm text-neutral-600">
                {onlineCount} online
              </span>
            </div>
          </div>
        </div>

        {/* Chat Messages - Mobile: Limited to 1/3 screen height, scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 md:max-h-[400px] max-h-[33vh] pb-4">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id} className="flex items-start space-x-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={message.user.profilePicture || ""} alt={message.user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {message.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-neutral-800">
                      {message.user.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 break-words">
                    {message.message}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Chat Input - Mobile: Fixed at bottom of viewport, outside of Card */}
      <div className="p-px border-t border-neutral-200 bg-white md:bg-transparent md:relative md:static fixed md:relative bottom-0 left-0 right-0 z-50 shadow-lg md:shadow-none">
        {userId ? (
          <div className="flex items-center space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share your thoughts..."
              className="flex-1"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              size="sm"
              className="p-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center text-neutral-500 py-2">
            <p>Please sign in to join the chat</p>
          </div>
        )}
      </div>
    </div>
  );
}
