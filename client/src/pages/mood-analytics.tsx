import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, TrendingUp, BarChart3, Activity, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { EnergyFlowAnimation } from "@/components/EnergyFlowAnimation";

const chakraColors = [
  { color: '#E53E3E', name: 'Root Center', description: 'Grounded & Stable' },
  { color: '#FF8C00', name: 'Sacral Center', description: 'Creative & Flowing' },
  { color: '#FFD700', name: 'Solar Plexus Center', description: 'Confident & Powerful' },
  { color: '#38A169', name: 'Heart Center', description: 'Loving & Compassionate' },
  { color: '#3182CE', name: 'Throat Center', description: 'Expressive & Clear' },
  { color: '#553C9A', name: 'Third Eye Center', description: 'Intuitive & Wise' },
  { color: '#805AD5', name: 'Crown Center', description: 'Spiritual & Connected' },
];

interface MoodEntry {
  id: number;
  userId: number;
  sessionDate: string;
  emotionLevel: number;
  moodType: 'pre' | 'post';
  createdAt: string;
  timeSpent?: number;
  comment?: string;
}

interface SessionAnalytics {
  sessionDate: string;
  preEntry?: MoodEntry;
  postEntry?: MoodEntry;
  timeSpent: number;
  improvement: number;
}



function getCSTDate(): string {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  return cstTime.toISOString().split('T')[0];
}

function getUTCDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function formatDate(dateStr: string) {
  // For display purposes, show "Today" if this is the current session date
  // This handles both CST (2025-07-16) and UTC (2025-07-17) dates correctly
  const todayCST = getCSTDate();
  const todayUTC = getUTCDate();
  
  if (dateStr === todayCST || dateStr === todayUTC) {
    return 'Today';
  }
  
  return new Date(dateStr + 'T12:00:00-06:00').toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Chicago'
  });
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export default function MoodAnalyticsPage() {
  const [user] = useAuthState(auth);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');
  const [viewMode, setViewMode] = useState<'analytics' | 'journey'>('analytics');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user', user?.uid],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.uid,
  });

  const { data: moodEntries, isLoading, error } = useQuery({
    queryKey: ['/api/mood/entries', currentUser?.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentUser,
  });

  // Remove debug logging for production

  // Fetch session durations for each day
  const { data: sessionDurations } = useQuery({
    queryKey: ['/api/session/durations', currentUser?.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentUser && !!moodEntries,
  });

  const processedData = useMemo(() => {
    if (!moodEntries || !Array.isArray(moodEntries)) return [];
    
    const sessionMap = new Map<string, SessionAnalytics>();
    
    // Group mood entries by session date, keeping the most recent entry for each type
    moodEntries.forEach((entry: MoodEntry) => {
      const sessionDate = entry.sessionDate;
      if (!sessionMap.has(sessionDate)) {
        sessionMap.set(sessionDate, {
          sessionDate,
          timeSpent: 0,
          improvement: 0,
        });
      }
      
      const session = sessionMap.get(sessionDate)!;
      
      // Get session duration from API data
      const sessionDuration = sessionDurations?.find((d: any) => d.sessionDate === sessionDate)?.duration || 0;
      session.timeSpent = sessionDuration;
      
      if (entry.moodType === 'pre') {
        // Keep the most recent pre entry for this session
        if (!session.preEntry || new Date(entry.createdAt) > new Date(session.preEntry.createdAt)) {
          session.preEntry = entry;
        }
      } else {
        // Keep the most recent post entry for this session
        if (!session.postEntry || new Date(entry.createdAt) > new Date(session.postEntry.createdAt)) {
          session.postEntry = entry;
        }
      }
    });

    // Calculate improvements and filter to only include complete sessions
    const completeSessions: SessionAnalytics[] = [];
    
    sessionMap.forEach((session) => {
      if (session.preEntry && session.postEntry) {
        session.improvement = session.postEntry.emotionLevel - session.preEntry.emotionLevel;
        completeSessions.push(session);
      }
    });

    return completeSessions.sort((a, b) => 
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );
  }, [moodEntries]);

  const filteredData = processedData.filter(session => {
    const sessionDate = new Date(session.sessionDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (timeFilter) {
      case 'week':
        return daysDiff <= 7;
      case 'month':
        return daysDiff <= 30;
      default:
        return true;
    }
  });

  const avgImprovement = filteredData.length > 0 
    ? filteredData.reduce((sum, session) => sum + (session.improvement || 0), 0) / filteredData.length
    : 0;

  // Auto-play functionality for journey mode
  useEffect(() => {
    if (!isPlaying || filteredData.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSessionIndex(prev => {
        if (prev >= filteredData.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isPlaying, filteredData.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    setCurrentSessionIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentSessionIndex(prev => Math.min(filteredData.length - 1, prev + 1));
  };

  const handleReset = () => {
    setCurrentSessionIndex(0);
    setIsPlaying(false);
  };

  const avgTimeSpent = filteredData.length > 0
    ? filteredData.reduce((sum, session) => sum + session.timeSpent, 0) / filteredData.length
    : 0;

  const totalSessions = filteredData.length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-800">Mood Analytics</h1>
        
        {/* Mobile Responsive Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* View Mode Toggle */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Analytics
            </Button>
            <Button
              variant={viewMode === 'journey' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('journey')}
            >
              <Activity className="w-4 h-4 mr-1" />
              Journey
            </Button>
          </div>
          
          {/* Time Filter */}
          <div className="flex space-x-1">
            {(['week', 'month', 'all'] as const).map((filter) => (
              <Button
                key={filter}
                variant={timeFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter(filter)}
              >
                {filter === 'all' ? 'All Time' : `Last ${filter}`}
              </Button>
            ))}
          </div>
          
          {/* Sample Data Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await apiRequest('POST', '/api/mood/sample-data', {});
                window.location.reload();
              } catch (error) {
                console.error('Failed to add sample data:', error);
              }
            }}
          >
            Add Sample Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">meditation sessions tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgImprovement > 0 ? '+' : ''}{avgImprovement.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">emotion levels per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(Math.round(avgTimeSpent))}</div>
            <p className="text-xs text-muted-foreground">spent per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredData.map((session, index) => (
              <div key={session.sessionDate} className="p-4 border rounded-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-medium">{formatDate(session.sessionDate)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(session.timeSpent)} spent
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {session.preEntry && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Before</div>
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: chakraColors[session.preEntry.emotionLevel]?.color || '#E53E3E',
                              color: chakraColors[session.preEntry.emotionLevel]?.color || '#E53E3E'
                            }}
                          >
                            {chakraColors[session.preEntry.emotionLevel]?.name || 'Root Center'}
                          </Badge>
                        </div>
                      )}
                      
                      {session.preEntry && session.postEntry && (
                        <div className="text-muted-foreground">→</div>
                      )}
                      
                      {session.postEntry && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">After</div>
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: chakraColors[session.postEntry.emotionLevel]?.color || '#E53E3E',
                              color: chakraColors[session.postEntry.emotionLevel]?.color || '#E53E3E'
                            }}
                          >
                            {chakraColors[session.postEntry.emotionLevel]?.name || 'Root Center'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {session.improvement !== 0 && (
                      <div className={`text-sm font-medium ${
                        session.improvement > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {session.improvement > 0 ? '+' : ''}{session.improvement} levels
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {session.preEntry && session.postEntry ? 'Complete' : 'Partial'}
                    </div>
                  </div>
                </div>
                
                {/* Comments Display */}
                {(session.preEntry?.comment || session.postEntry?.comment) && (
                  <div className="space-y-2 border-t pt-3">
                    {session.preEntry?.comment && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Before: </span>
                        <span className="italic">"{session.preEntry.comment}"</span>
                      </div>
                    )}
                    {session.postEntry?.comment && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">After: </span>
                        <span className="italic">"{session.postEntry.comment}"</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {filteredData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No mood tracking data found for the selected time period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Energy Centers Journey Mode */}
      {viewMode === 'journey' && filteredData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Energy Centers Flow Journey
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={currentSessionIndex === 0 && !isPlaying}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentSessionIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentSessionIndex >= filteredData.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Watch your energy flow through the chakra centers as you progress through meditation sessions.
                Energy moves up the spine, blockages dissolve, and balance improves over time.
              </p>
              {filteredData[currentSessionIndex] && (
                <div className="flex items-center space-x-4 text-sm">
                  <Badge variant="outline">
                    {formatDate(filteredData[currentSessionIndex].sessionDate)}
                  </Badge>
                  <span className="text-muted-foreground">
                    Session {currentSessionIndex + 1} of {filteredData.length}
                  </span>
                  {filteredData[currentSessionIndex].improvement > 0 && (
                    <Badge variant="secondary" className="text-green-600">
                      +{filteredData[currentSessionIndex].improvement} levels improved
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <EnergyFlowAnimation
              sessionData={filteredData}
              isPlaying={isPlaying}
              currentSessionIndex={currentSessionIndex}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}