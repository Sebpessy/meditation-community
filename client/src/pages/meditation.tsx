import { useState, useEffect } from "react";
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
  const [countdown, setCountdown] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();

  const { data: meditation, isLoading, error } = useQuery<TodaysMeditation>({
    queryKey: ["/api/meditation/today"],
    retry: 1,
  });

  const { data: onlineData } = useQuery<{count: number}>({
    queryKey: ["/api/meditation/online-count", meditation?.date || new Date().toISOString().split('T')[0]],
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
            const registerResponse = await apiRequest("POST", "/api/auth/register", {
              email: user.email,
              name: user.displayName || user.email?.split('@')[0] || "User",
              firebaseUid: user.uid
            });
            if (registerResponse.ok) {
              const userData = await registerResponse.json();
              setCurrentUserId(userData.id);
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

  // Countdown timer
  useEffect(() => {
    if (!meditation) return;

    const updateCountdown = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const scheduledDateTime = new Date(`${today}T${meditation.scheduledTime}:00`);
      
      // If scheduled time has passed, set for next day
      if (scheduledDateTime <= now) {
        scheduledDateTime.setDate(scheduledDateTime.getDate() + 1);
      }

      const timeDiff = scheduledDateTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setCountdown("00:00");
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [meditation]);

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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Badge variant="outline" className="mb-4">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(meditation.date)}
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-800 mb-2">
          {meditation.title}
        </h1>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          {meditation.description}
        </p>
      </div>

      {/* Countdown Timer */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-6 py-3 bg-white rounded-full shadow-sm border border-neutral-200">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-neutral-700">Session starts in:</span>
          <span className="text-lg font-bold text-primary">{countdown}</span>
        </div>
      </div>

      {/* Main Content */}
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
            participants={onlineCount}
            sessionSteps={meditation.sessionSteps}
          />
        </div>

        {/* Live Chat */}
        <div className="lg:col-span-1">
          <LiveChat
            userId={currentUserId}
            sessionDate={meditation.date}
          />
        </div>
      </div>

      {/* Community Stats */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
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
  );
}
