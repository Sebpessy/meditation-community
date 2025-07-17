import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Heart } from "lucide-react";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface LiveChatProps {
  userId?: number;
  sessionDate: string;
  onOnlineCountChange?: (count: number) => void;
}

export function LiveChat({ userId, sessionDate, onOnlineCountChange }: LiveChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [hoveredUser, setHoveredUser] = useState<number | null>(null);
  const [messageLikes, setMessageLikes] = useState<{ [messageId: number]: number }>({});
  const [likedMessages, setLikedMessages] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, onlineCount, onlineUsers, isConnected, sendMessage } = useWebSocket(userId, sessionDate);
  const queryClient = useQueryClient();

  // Update parent component when online count changes
  useEffect(() => {
    if (onOnlineCountChange) {
      onOnlineCountChange(onlineCount);
    }
  }, [onlineCount, onOnlineCountChange]);

  // Fetch user liked messages
  const { data: userLikedMessages } = useQuery({
    queryKey: ['liked-messages', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiRequest('GET', `/api/users/${userId}/liked-messages`);
      return response.likedMessages || [];
    },
    enabled: !!userId,
  });

  // Update liked messages state when data changes
  useEffect(() => {
    if (userLikedMessages) {
      setLikedMessages(new Set(userLikedMessages));
    }
  }, [userLikedMessages]);

  // Fetch likes for all messages
  useEffect(() => {
    const fetchLikes = async () => {
      if (messages.length === 0) return;
      
      const likesData: { [messageId: number]: number } = {};
      
      for (const message of messages) {
        try {
          const response = await apiRequest('GET', `/api/messages/${message.id}/likes`);
          const data = await response.json();
          likesData[message.id] = data.likes || 0;
        } catch (error) {
          console.error('Failed to fetch likes for message:', message.id, error);
          likesData[message.id] = 0;
        }
      }
      
      setMessageLikes(likesData);
    };

    fetchLikes();
  }, [messages]);

  // Like mutation (positive-only)
  const likeMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest('POST', `/api/messages/${messageId}/like`);
      return await response.json();
    },
    onSuccess: (data, messageId) => {
      setMessageLikes(prev => ({ ...prev, [messageId]: data.likes }));
      // Invalidate cache for this message's likes
      queryClient.invalidateQueries({ queryKey: ['liked-messages', userId] });
    },
    onError: (error) => {
      console.error('Failed to like message:', error);
    },
  });

  const handleLike = (messageId: number) => {
    if (!userId) return;
    likeMutation.mutate(messageId);
  };

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

  const handleLongPress = (userId: number) => {
    setHoveredUser(userId);
    setTimeout(() => setHoveredUser(null), 3000); // Hide after 3 seconds
  };

  const handleUserClick = (userId: number) => {
    // For mobile/touch devices
    if (hoveredUser === userId) {
      setHoveredUser(null);
    } else {
      setHoveredUser(userId);
      setTimeout(() => setHoveredUser(null), 3000);
    }
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-full flex-col">
        <Card className="h-full flex flex-col bg-white dark:bg-[var(--chat-background)] border-neutral-200 dark:border-[var(--border)]">
          {/* Desktop Chat Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-[var(--border)] bg-white dark:bg-[var(--chat-background)] flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-800 dark:text-[var(--text-high-contrast)]">Live Chat</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-400 dark:bg-neutral-600'}`} />
                <span className="text-sm text-neutral-600 dark:text-white font-medium">
                  {onlineCount} online
                </span>
              </div>
            </div>
            
            {/* Online Users Display */}
            {onlineUsers.length > 0 && (
              <div className="mt-3 flex justify-end">
                <div className="flex flex-wrap items-center justify-end gap-1 max-w-full">
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="relative">
                      <Avatar 
                        className="w-8 h-8 border-2 border-white dark:border-[var(--chat-background)] cursor-pointer hover:z-10 transition-transform hover:scale-110"
                        onMouseEnter={() => setHoveredUser(user.id)}
                        onMouseLeave={() => setHoveredUser(null)}
                        onClick={() => handleUserClick(user.id)}
                      >
                        <AvatarImage src={user.profilePicture || ""} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {hoveredUser === user.id && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20">
                          <div className="bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 text-xs rounded px-2 py-1 whitespace-nowrap">
                            {user.name}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800 dark:border-t-neutral-200"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-0 min-h-0 relative">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-500 dark:text-[var(--text-low-contrast)] py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3 p-1.5 rounded-lg bg-white dark:bg-[var(--chat-message)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] transition-colors">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={message.user.profilePicture || ""} alt={message.user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {message.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-neutral-800 dark:text-[var(--text-high-contrast)]">
                        {message.user.name}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-[var(--text-low-contrast)]">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-[var(--text-medium-contrast)] break-words mb-0">
                      {message.message}
                    </p>
                    {userId && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLike(message.id)}
                          className="flex items-center space-x-1 text-xs rounded-full px-2 py-1 transition-colors text-neutral-400 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          disabled={likeMutation.isPending}
                        >
                          <Heart 
                            size={12} 
                            className={`transition-colors ${
                              (messageLikes[message.id] || 0) > 0 
                                ? "text-red-500 fill-current" 
                                : "text-neutral-400 dark:text-neutral-600 hover:text-red-500"
                            }`}
                          />
                          <span className="dark:text-[var(--text-medium-contrast)]">{messageLikes[message.id] || 0}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
            

          </div>

          {/* Desktop Chat Input */}
          <div className="p-4 border-t border-neutral-200 dark:border-[var(--border)] bg-white dark:bg-[var(--chat-background)] flex-shrink-0">
            {userId ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share your thoughts..."
                  className="flex-1 bg-white dark:bg-[var(--input)] border-neutral-300 dark:border-[var(--border)] text-neutral-900 dark:text-[var(--text-high-contrast)] placeholder-neutral-500 dark:placeholder-[var(--text-low-contrast)]"
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
              <div className="text-center text-neutral-500 dark:text-[var(--text-low-contrast)] py-2">
                <p>Please sign in to join the chat</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mobile Layout - Handled in parent component */}
      <div className="md:hidden">
        <p className="text-center text-neutral-500 py-8">
          Mobile chat is handled by the parent component
        </p>
      </div>
    </>
  );
}
