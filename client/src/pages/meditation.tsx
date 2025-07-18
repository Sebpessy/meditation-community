import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Heart } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LiveChat } from "@/components/LiveChat";
import { Loading } from "@/components/ui/loading";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";

function getCSTDate(): string {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  return cstTime.toISOString().split('T')[0];
}

function calculateTimeUntilMidnight(): string {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  
  // Calculate time until midnight CST
  const midnight = new Date(cstTime);
  midnight.setHours(24, 0, 0, 0);
  
  const timeUntilMidnight = midnight.getTime() - cstTime.getTime();
  const hours = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeUntilMidnight % (1000 * 60)) / 1000);
  
  return `${hours}h ${minutes}m ${seconds}s`;
}

function CountdownTimer() {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeUntilMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeUntilMidnight());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center space-x-2 text-sm text-primary">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Next in {timeRemaining}</span>
    </div>
  );
}

interface TodaysMeditation {
  id: number;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  videoUrl: string;
  thumbnailUrl: string;
  instructor: string;
  instructorTitle: string;
  sessionSteps: Array<{
    number: number;
    title: string;
    description: string;
  }>;
  scheduledTime: string;
  date: string;
}

export default function MeditationPage() {
  const [, setLocation] = useLocation();
  const [user] = useAuthState(auth);
  const [onlineCount, setOnlineCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [wsOnlineCount, setWsOnlineCount] = useState(0);
  const [inputMessage, setInputMessage] = useState("");
  const [clickedUser, setClickedUser] = useState<number | null>(null);
  const [messageLikes, setMessageLikes] = useState<{ [messageId: number]: number }>({});
  const [likedMessages, setLikedMessages] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Session tracking refs
  const sessionStartTime = useRef<number>(Date.now());
  const sessionId = useRef<number | null>(null);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  const { data: meditation, isLoading, error } = useQuery<TodaysMeditation>({
    queryKey: ["/api/meditation/today"],
    retry: 1,
  });

  const { data: onlineData } = useQuery<{count: number}>({
    queryKey: ["/api/meditation/online-count", meditation?.date || getCSTDate()],
    refetchInterval: 10000,
    enabled: !!meditation?.date,
  });

  // WebSocket integration for chat - moved to top to avoid hooks order issues
  const { 
    messages, 
    isConnected, 
    onlineCount: wsOnlineCountFromSocket, 
    onlineUsers,
    sendMessage 
  } = useWebSocket(currentUserId, getCSTDate());

  // Get current user ID from backend
  useEffect(() => {
    const fetchUser = async () => {
      if (user?.uid) {
        try {
          const response = await apiRequest("GET", `/api/auth/user/${user.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setCurrentUserId(userData.id);
          } else if (response.status === 404) {
            // User doesn't exist in backend, register them
            console.log("User not found, registering:", user.uid);
            const registerResponse = await apiRequest("POST", "/api/auth/register", {
              email: user.email,
              name: user.displayName || user.email?.split('@')[0] || "User",
              firebaseUid: user.uid
            });
            if (registerResponse.ok) {
              const userData = await registerResponse.json();
              console.log("User registered successfully:", userData);
              setCurrentUserId(userData.id);
            } else {
              console.error("Registration failed:", registerResponse.status);
            }
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
        }
      }
    };

    fetchUser();
  }, [user]);

  useEffect(() => {
    if (onlineData) {
      setOnlineCount(onlineData.count);
    }
  }, [onlineData]);

  // Update online count from WebSocket
  useEffect(() => {
    if (wsOnlineCountFromSocket > 0) {
      setWsOnlineCount(wsOnlineCountFromSocket);
    }
  }, [wsOnlineCountFromSocket]);

  // Fetch user liked messages
  const { data: userLikedMessages } = useQuery({
    queryKey: ['liked-messages', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const response = await apiRequest('GET', `/api/users/${currentUserId}/liked-messages`);
      return response.likedMessages || [];
    },
    enabled: !!currentUserId,
  });

  // Update liked messages state when data changes
  useEffect(() => {
    if (userLikedMessages) {
      setLikedMessages(new Set(userLikedMessages));
    }
  }, [userLikedMessages]);

  // Session tracking - start session when user enters page
  useEffect(() => {
    const startSession = async () => {
      if (currentUserId && !sessionId.current) {
        console.log('Starting session tracking for user:', currentUserId);
        try {
          const response = await apiRequest('POST', '/api/session/start', {
            sessionDate: getCSTDate()
          });
          if (response.ok) {
            const data = await response.json();
            sessionId.current = data.id;
            // Use the existing start time from DB or set a new one
            sessionStartTime.current = data.startTime ? new Date(data.startTime).getTime() : Date.now();
            console.log('Session started/resumed with ID:', data.id);
            
            // Update session every 30 seconds
            updateInterval.current = setInterval(async () => {
              if (sessionId.current) {
                const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
                console.log('Updating session duration:', duration, 'seconds');
                try {
                  const updateResponse = await apiRequest('PUT', `/api/session/${sessionId.current}`, {
                    duration
                  });
                  if (!updateResponse.ok) {
                    console.error('Failed to update session, status:', updateResponse.status);
                    // If session not found, clear the sessionId to trigger re-creation
                    if (updateResponse.status === 404) {
                      sessionId.current = null;
                    }
                  }
                } catch (error) {
                  console.error('Error updating session:', error);
                }
              }
            }, 30000);
          }
        } catch (error) {
          console.error('Failed to start session:', error);
        }
      }
    };

    startSession();

    // Cleanup function to update session on unmount
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      
      if (sessionId.current) {
        const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
        // Use sendBeacon for reliable unload tracking
        const data = JSON.stringify({ duration });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(`/api/session/${sessionId.current}`, blob);
      }
    };
  }, [currentUserId]);

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
      queryClient.invalidateQueries({ queryKey: ['liked-messages', currentUserId] });
    },
    onError: (error) => {
      console.error('Failed to like message:', error);
    },
  });

  const handleLike = (messageId: number) => {
    if (!currentUserId) return;
    likeMutation.mutate(messageId);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && isConnected) {
      sendMessage(inputMessage.trim());
      setInputMessage("");
    }
  }, [inputMessage, isConnected, sendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleUserClick = (userId: number) => {
    // Toggle name display on click
    if (clickedUser === userId) {
      setClickedUser(null);
    } else {
      setClickedUser(userId);
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse the date string and ensure it's interpreted as CST
    const date = new Date(dateStr + 'T12:00:00-06:00'); // Add CST timezone
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Chicago' // Force CST interpretation
    });
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !meditation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-800 mb-2">No Meditation Today</h2>
            <p className="text-neutral-600">
              There's no meditation scheduled for today. Check back tomorrow or contact an admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:max-w-7xl md:mx-auto md:px-4 md:sm:px-6 md:lg:px-8 md:py-8">
      {/* Desktop Header */}
      <div className="hidden md:block text-center mb-8">
        <Badge variant="outline" className="mb-4">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(getCSTDate())}
        </Badge>
        
        <CountdownTimer />
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-800 dark:text-white mb-2">
          {meditation.title}
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-200 max-w-2xl mx-auto">
          {meditation.description}
        </p>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden h-screen flex flex-col">
        {/* Fixed Video Player - Below banner, reduced height */}
        <div className="flex-shrink-0 bg-white dark:bg-[var(--background)]" style={{ height: '35vh' }}>
          <div className="h-full">
            <VideoPlayer
              videoUrl={meditation.videoUrl}
              title={meditation.title}
              instructor={meditation.instructor}
              instructorTitle={meditation.instructorTitle}
              duration={meditation.duration}
              difficulty={meditation.difficulty}
              participants={Math.max(onlineCount, wsOnlineCount)}
              sessionSteps={meditation.sessionSteps}
            />
          </div>
        </div>

        {/* Fixed Date and Timer - Below video */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 bg-white dark:bg-[var(--background)] border-b border-neutral-200 dark:border-[var(--border)]">
          <Badge variant="outline" className="text-xs">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(getCSTDate())}
          </Badge>
          
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg px-3 py-1">
            <CountdownTimer />
          </div>
        </div>



        {/* Fixed Chat Header - Below titles */}
        <div className="flex-shrink-0 bg-white dark:bg-[var(--chat-background)] border-b border-neutral-200 dark:border-[var(--border)]">
          <div className="p-2 pb-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-neutral-800 dark:text-white text-sm">Live Chat</h3>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-400 dark:bg-neutral-600'}`} />
                <span className="text-xs text-neutral-600 dark:text-white font-medium whitespace-nowrap">
                  {Math.max(onlineCount, wsOnlineCount)} online
                </span>
              </div>
            </div>
          </div>
          
          {/* Online Users Display - Second Line */}
          {onlineUsers && onlineUsers.length > 0 && (
            <div className="px-2 pb-2 relative">
              {onlineUsers.length > 8 && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-full bg-gradient-to-r from-white dark:from-[var(--chat-background)] to-transparent z-10 flex items-center justify-start pointer-events-none">
                  <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              )}
              <div className="flex gap-1 overflow-x-auto scrollbar-none scroll-smooth" style={{scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch'}}>
                {onlineUsers.map((user) => (
                  <div key={user.id} className="relative flex-shrink-0">
                    <Avatar 
                      className="w-7 h-7 border border-white dark:border-neutral-700 cursor-pointer hover:z-10 transition-transform active:scale-110"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <AvatarImage src={user.profilePicture || ""} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {clickedUser === user.id && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-20">
                        <div className="bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 text-xs rounded px-2 py-1 whitespace-nowrap">
                          {user.name}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800 dark:border-t-neutral-200"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {onlineUsers.length > 8 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-full bg-gradient-to-l from-white dark:from-[var(--chat-background)] to-transparent z-10 flex items-center justify-end pointer-events-none">
                  <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Chat Messages - Only this part scrolls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-0 bg-white dark:bg-[var(--chat-background)] min-h-0 relative">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={message.user.profilePicture || ""} alt={message.user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {message.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-neutral-800 dark:text-white">
                      {message.user.name}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 break-words mb-0">
                    {message.message}
                  </p>
                  {currentUserId && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLike(message.id)}
                        className="flex items-center space-x-1 text-xs rounded-full px-2 py-1 transition-colors text-neutral-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        disabled={likeMutation.isPending}
                      >
                        <Heart 
                          size={12} 
                          className={`transition-colors ${
                            (messageLikes[message.id] || 0) > 0 
                              ? "text-red-500 fill-current" 
                              : "text-neutral-400 dark:text-neutral-500 hover:text-red-500"
                          }`}
                        />
                        <span className="dark:text-neutral-400">{messageLikes[message.id] || 0}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Chat Input - Always at bottom */}
        <div className="flex-shrink-0 p-4 bg-white dark:bg-[var(--chat-background)] border-t border-neutral-200 dark:border-[var(--border)]">
          {currentUserId ? (
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
            <div className="text-center text-neutral-500 dark:text-neutral-400 py-2">
              <p>Please sign in to join the chat</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Content */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <VideoPlayer
              videoUrl={meditation.videoUrl}
              title={meditation.title}
              instructor={meditation.instructor}
              instructorTitle={meditation.instructorTitle}
              duration={meditation.duration}
              difficulty={meditation.difficulty}
              participants={Math.max(onlineCount, wsOnlineCount)}
              sessionSteps={meditation.sessionSteps}
            />
          </div>

          {/* Live Chat - Desktop */}
          <div className="lg:col-span-1 h-[600px]">
            <LiveChat
              userId={currentUserId}
              sessionDate={meditation.date}
              onOnlineCountChange={setWsOnlineCount}
            />
          </div>
        </div>
      </div>

      {/* Community Stats - Desktop only */}
      <div className="hidden md:block mt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-2">
              {Math.max(onlineCount, wsOnlineCount)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300">Active Now</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-2">
              {meditation.duration}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300">Minutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-2">
              {meditation.difficulty}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300">Level</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-2">
              {meditation.instructor}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300">Instructor</div>
          </div>
        </div>
      </div>
    </div>
  );
}