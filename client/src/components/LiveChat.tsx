import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  isAdmin?: boolean;
  isGardenAngel?: boolean;
}

export function LiveChat({ userId, sessionDate, onOnlineCountChange, isAdmin, isGardenAngel }: LiveChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [clickedUser, setClickedUser] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
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

  // Delete message mutation (admin/Garden Angel only)
  const deleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest('DELETE', `/api/messages/${messageId}`);
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      return messageId;
    },
    onSuccess: (deletedMessageId) => {
      // Remove message from UI immediately (WebSocket will broadcast deletion to others)
      // The actual removal will be handled by WebSocket message
      console.log('Message deleted successfully:', deletedMessageId);
    },
    onError: (error) => {
      console.error('Failed to delete message:', error);
    },
  });

  const handleDeleteMessage = (messageId: number) => {
    if (!isAdmin && !isGardenAngel) return;
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMutation.mutate(messageId);
    }
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

  const handleUserClick = (userId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    // Toggle name display on click
    if (clickedUser === userId) {
      setClickedUser(null);
      setTooltipPosition(null);
    } else {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const tooltipWidth = 120; // Estimated tooltip width
      
      let x = rect.left + rect.width / 2;
      
      // Ensure tooltip doesn't go off screen
      if (x - tooltipWidth / 2 < 10) {
        x = tooltipWidth / 2 + 10;
      } else if (x + tooltipWidth / 2 > screenWidth - 10) {
        x = screenWidth - tooltipWidth / 2 - 10;
      }
      
      setTooltipPosition({
        x: x,
        y: rect.top - 10
      });
      setClickedUser(userId);
    }
  };

  // Click anywhere to dismiss tooltip
  useEffect(() => {
    const handleClickOutside = () => {
      setClickedUser(null);
      setTooltipPosition(null);
    };

    if (clickedUser) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [clickedUser]);

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-full flex-col">
        <Card className="h-full flex flex-col bg-white dark:bg-[var(--chat-background)] border-neutral-200 dark:border-[var(--border)]">
          {/* Desktop Chat Header */}
          <div className="border-b border-neutral-200 dark:border-[var(--border)] bg-white dark:bg-[var(--chat-background)] flex-shrink-0 overflow-visible">
            <div className="p-2 pb-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-neutral-800 dark:text-[var(--text-high-contrast)] text-sm">Live Chat</h3>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-400 dark:bg-neutral-600'}`} />
                  <span className="text-xs text-neutral-600 dark:text-white font-medium whitespace-nowrap">
                    {onlineCount} online
                  </span>
                </div>
              </div>
            </div>
            
            {/* Online Users Display - Second Line */}
            {onlineUsers.length > 0 && (
              <div className="px-2 pb-2 relative overflow-visible">
                {onlineUsers.length > 10 && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-full bg-gradient-to-r from-white dark:from-[var(--chat-background)] to-transparent z-10 flex items-center justify-start pointer-events-none">
                    <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                )}
                <div className="flex gap-1 overflow-x-auto scrollbar-none scroll-smooth" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="relative flex-shrink-0" style={{ zIndex: clickedUser === user.id ? 9999 : 1 }}>
                      <Avatar 
                        className="w-8 h-8 md:w-10 md:h-10 border border-white dark:border-neutral-700 cursor-pointer transition-transform hover:scale-110"
                        onClick={(e) => handleUserClick(user.id, e)}
                      >
                        <AvatarImage src={user.profilePicture || ""} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs md:text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                    </div>
                  ))}
                </div>
                {onlineUsers.length > 10 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-full bg-gradient-to-l from-white dark:from-[var(--chat-background)] to-transparent z-10 flex items-center justify-end pointer-events-none">
                    <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Chat Messages */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0 min-h-0 relative">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-500 dark:text-[var(--text-low-contrast)] py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3 p-1 rounded-lg bg-white dark:bg-[var(--chat-message)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] transition-colors">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={message.user.profilePicture || ""} alt={message.user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {message.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <a
                          href={`/admin#users`}
                          className="text-sm font-medium text-neutral-800 dark:text-[var(--text-high-contrast)] hover:text-primary hover:underline cursor-pointer"
                          onClick={(e) => {
                            if (isAdmin || isGardenAngel) {
                              // Allow navigation to admin page
                            } else {
                              e.preventDefault();
                            }
                          }}
                        >
                          {message.user.name}
                        </a>
                        {(message.user as any).isGardenAngel && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">
                            (Gardien Angel)
                          </span>
                        )}
                        <span className="text-xs text-neutral-500 dark:text-[var(--text-low-contrast)]">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      {(isAdmin || isGardenAngel) && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      )}
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

      {/* Portal-based Tooltip */}
      {clickedUser && tooltipPosition && onlineUsers && (
        createPortal(
          <div 
            className="fixed z-[10000] pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="bg-black text-white text-[10px] font-medium rounded px-2 py-1 whitespace-nowrap shadow-xl border border-white">
              {onlineUsers.find(user => user.id === clickedUser)?.name}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-black"></div>
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
}
