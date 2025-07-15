import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LiveChat } from "@/components/LiveChat";
import { Loading } from "@/components/ui/loading";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

// Helper function to get current date in Central Standard Time (CST)
function getCSTDate(): string {
  const now = new Date();
  const cstOffset = -6; // CST is UTC-6
  const cstTime = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
  return cstTime.toISOString().split('T')[0];
}

// Function to calculate time remaining until midnight Central Time (outside component to prevent re-creation)
function calculateTimeUntilMidnight(): string {
  // Get current time in Central Time
  const nowInCentral = new Date().toLocaleString("en-US", {timeZone: "America/Chicago"});
  const [datePart, timePart] = nowInCentral.split(', ');
  const [time, ampm] = timePart.split(' ');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  
  // Convert to 24-hour format
  let hour24 = hours;
  if (ampm === 'PM' && hours !== 12) hour24 += 12;
  if (ampm === 'AM' && hours === 12) hour24 = 0;
  
  // Calculate remaining time
  const totalSecondsUntilMidnight = (24 * 60 * 60) - (hour24 * 60 * 60) - (minutes * 60) - seconds;
  
  if (totalSecondsUntilMidnight <= 0) {
    return "00:00:00";
  }
  
  const remainingHours = Math.floor(totalSecondsUntilMidnight / 3600);
  const remainingMinutes = Math.floor((totalSecondsUntilMidnight % 3600) / 60);
  const remainingSeconds = totalSecondsUntilMidnight % 60;
  
  return `${remainingHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Simple countdown component to prevent blinking
function CountdownTimer() {
  const [time, setTime] = useState(calculateTimeUntilMidnight());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(calculateTimeUntilMidnight());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <>
      {/* Desktop version */}
      <div className="hidden md:block mb-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-sm text-neutral-600 mb-2">Next meditation in</div>
            <div className="text-2xl font-mono font-bold text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</div>
            <div className="text-xs text-neutral-500 mt-1">Updates daily at midnight CST</div>
          </div>
        </div>
      </div>
      
      {/* Mobile version - more compact */}
      <div className="md:hidden">
        <div className="text-center">
          <div className="text-xs text-neutral-600">Next in</div>
          <div className="text-sm font-mono font-bold text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</div>
        </div>
      </div>
    </>
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
  const [showPiP, setShowPiP] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const { data: meditation, isLoading, error } = useQuery<TodaysMeditation>({
    queryKey: ["/api/meditation/today"],
    retry: 1,
  });

  const { data: onlineData } = useQuery<{count: number}>({
    queryKey: ["/api/meditation/online-count", meditation?.date || getCSTDate()],
    refetchInterval: 10000,
    enabled: !!meditation?.date,
  });

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

  // PiP scroll detection for mobile
  useEffect(() => {
    const handleScroll = () => {
      if (videoContainerRef.current) {
        const rect = videoContainerRef.current.getBoundingClientRect();
        const isVideoVisible = rect.bottom > 0 && rect.top < window.innerHeight;
        setShowPiP(!isVideoVisible);
      }
    };

    // Only add scroll listener on mobile
    if (window.innerWidth < 768) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);



  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

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

  return (
    <div className="h-screen flex flex-col md:max-w-7xl md:mx-auto md:px-4 md:sm:px-6 md:lg:px-8 md:py-8">
      {/* Mobile Header - Date left, Timer right */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-neutral-200 sticky top-0 z-20">
        <Badge variant="outline" className="text-xs">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(meditation.date)}
        </Badge>
        
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg px-3 py-1">
          <CountdownTimer />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block text-center mb-8">
        <Badge variant="outline" className="mb-4">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(meditation.date)}
        </Badge>
        
        <CountdownTimer />
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-800 mb-2">
          {meditation.title}
        </h1>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          {meditation.description}
        </p>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden flex-1 flex flex-col pb-20">
        {/* Video Player Container with PiP scroll detection */}
        <div ref={videoContainerRef} className="relative">
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

        {/* Picture-in-Picture Video - Shows when scrolled past main video */}
        {showPiP && (
          <div 
            className="fixed top-20 right-4 z-30 w-32 h-20 rounded-lg overflow-hidden shadow-lg border-2 border-white bg-black cursor-pointer"
            onClick={() => {
              // Scroll back to top to show main video
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <VideoPlayer
              videoUrl={meditation.videoUrl}
              title={meditation.title}
              instructor={meditation.instructor}
              instructorTitle={meditation.instructorTitle}
              duration={meditation.duration}
              difficulty={meditation.difficulty}
              participants={Math.max(onlineCount, wsOnlineCount)}
              sessionSteps={meditation.sessionSteps}
              isPiP={true}
            />
          </div>
        )}

        {/* Title and Description for mobile */}
        <div className="p-4 bg-white border-b border-neutral-200">
          <h1 className="text-xl font-bold text-neutral-800 mb-1">
            {meditation.title}
          </h1>
          <p className="text-sm text-neutral-600">
            {meditation.description}
          </p>
        </div>

        {/* Live Chat - Mobile: Constrained height with sticky input */}
        <div className="flex-1 flex flex-col">
          <LiveChat
            userId={currentUserId}
            sessionDate={meditation.date}
            onOnlineCountChange={setWsOnlineCount}
          />
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
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-neutral-800">2,847</h3>
          <p className="text-sm text-neutral-600">Community Members</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-neutral-800">15,423</h3>
          <p className="text-sm text-neutral-600">Sessions Completed</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-neutral-800">98,765</h3>
          <p className="text-sm text-neutral-600">Minutes Meditated</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-neutral-800">4.8</h3>
          <p className="text-sm text-neutral-600">Average Rating</p>
        </div>
        </div>
      </div>
    </div>
  );
}
