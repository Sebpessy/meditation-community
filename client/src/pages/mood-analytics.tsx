import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, TrendingUp, BarChart3, Activity, Play, Pause, SkipBack, SkipForward, X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { EnergyFlowAnimation } from "@/components/EnergyFlowAnimation";

const chakraColors = [
  { color: '#000000', name: 'No Awareness', description: 'Disconnected' },
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
  // Get CST date using proper timezone formatting
  return now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); // YYYY-MM-DD format
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
  const [user, loading] = useAuthState(auth);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');
  const [viewMode, setViewMode] = useState<'analytics' | 'journey'>('analytics');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [showJourneyOverlay, setShowJourneyOverlay] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<SessionAnalytics | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const { data: currentUser } = useQuery<{id: number, isAdmin: boolean} | null>({
    queryKey: ['/api/auth/user', user?.uid],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.uid,
  });

  const { data: moodEntries, isLoading, error } = useQuery({
    queryKey: ['/api/mood/analytics'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentUser,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache this data
  });

  // Fetch session durations for each day - wait for Firebase auth to be ready
  const { data: sessionDurations } = useQuery({
    queryKey: ['/api/mood/sessions'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !loading && !!currentUser && !!user,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache this data
  });

  // Session durations loaded successfully

  const processedData = useMemo(() => {
    if (!moodEntries || !Array.isArray(moodEntries)) {
      console.log('No mood entries found or not an array:', moodEntries);
      return [];
    }
    
    console.log('Processing mood entries:', moodEntries.length, 'entries');
    
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

    // Merge session durations
    if (sessionDurations && Array.isArray(sessionDurations)) {
      sessionDurations.forEach((duration: any) => {
        const sessionDate = duration.sessionDate;
        if (sessionMap.has(sessionDate)) {
          const session = sessionMap.get(sessionDate)!;
          session.timeSpent = Math.round(duration.duration / 60); // Convert seconds to minutes
        } else {
          // Create a session entry for days with only duration data
          sessionMap.set(sessionDate, {
            sessionDate,
            timeSpent: Math.round(duration.duration / 60),
            improvement: 0,
          });
        }
      });
    }

    // Calculate improvements and return all sessions (not just complete ones)
    const allSessions: SessionAnalytics[] = [];
    
    sessionMap.forEach((session) => {
      if (session.preEntry && session.postEntry) {
        session.improvement = session.postEntry.emotionLevel - session.preEntry.emotionLevel;
      }
      allSessions.push(session);
    });

    return allSessions.sort((a, b) => 
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );
  }, [moodEntries, sessionDurations]);

  const filteredData = useMemo(() => {
    // Use CST time for consistency with the rest of the app
    const now = new Date();
    const cstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
    
    if (timeFilter === 'week') {
      const startOfWeek = new Date(cstTime);
      // Start week on Monday (getDay() returns 0-6, Sunday=0, Monday=1)
      const dayOfWeek = cstTime.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, else go back (day - 1) days
      startOfWeek.setDate(cstTime.getDate() - daysFromMonday + (currentWeekOffset * 7)); // Start of week + offset
      startOfWeek.setHours(0, 0, 0, 0); // Set to beginning of day
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week
      endOfWeek.setHours(23, 59, 59, 999); // Set to end of day

      console.log('Week filter debug:', {
        cstTime: cstTime.toISOString(),
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
        currentWeekOffset,
        processedDataCount: processedData.length,
        sampleSessionDates: processedData.slice(0, 3).map(s => s.sessionDate)
      });

      return processedData.filter(session => {
        // Parse session date as a date string and compare directly
        const sessionDate = new Date(session.sessionDate + 'T12:00:00'); // Add time to avoid timezone issues
        const result = sessionDate >= startOfWeek && sessionDate <= endOfWeek;
        
        if (session.sessionDate === getCSTDate()) {
          console.log('Today session filter check:', {
            sessionDate: session.sessionDate,
            sessionDateTime: sessionDate.toISOString(),
            startOfWeek: startOfWeek.toISOString(),
            endOfWeek: endOfWeek.toISOString(),
            included: result
          });
        }
        
        return result;
      });
    } else if (timeFilter === 'month') {
      const filterDate = new Date(cstTime);
      filterDate.setDate(cstTime.getDate() - 30);
      return processedData.filter(session => 
        new Date(session.sessionDate + 'T12:00:00') >= filterDate
      );
    }
    
    return processedData;
  }, [processedData, timeFilter, currentWeekOffset]);

  const searchFilteredData = useMemo(() => {
    if (!searchQuery.trim()) return filteredData;
    
    return filteredData.filter(session => {
      const dateMatch = formatDate(session.sessionDate).toLowerCase().includes(searchQuery.toLowerCase());
      const preCommentMatch = session.preEntry?.comment?.toLowerCase().includes(searchQuery.toLowerCase());
      const postCommentMatch = session.postEntry?.comment?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return dateMatch || preCommentMatch || postCommentMatch;
    });
  }, [filteredData, searchQuery]);

  const avgImprovement = searchFilteredData.length > 0 
    ? searchFilteredData.reduce((sum, session) => sum + (session.improvement || 0), 0) / searchFilteredData.length
    : 0;

  // Auto-play functionality for journey mode
  useEffect(() => {
    if (!isPlaying || searchFilteredData.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSessionIndex(prev => {
        if (prev >= searchFilteredData.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isPlaying, searchFilteredData.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    setCurrentSessionIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentSessionIndex(prev => Math.min(searchFilteredData.length - 1, prev + 1));
  };

  const handleReset = () => {
    setCurrentSessionIndex(0);
    setIsPlaying(false);
  };

  // Week navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  // Journey overlay handlers
  const handleJourneyClick = () => {
    setShowJourneyOverlay(true);
  };

  const handleCloseJourneyOverlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowJourneyOverlay(false);
    setIsPlaying(false);
  };

  // Calendar view handlers
  const handleSessionClick = (session: SessionAnalytics) => {
    setSelectedSessionDetail(session);
  };

  const handleCloseSessionDetail = () => {
    setSelectedSessionDetail(null);
  };

  // Calendar navigation functions
  const handlePreviousMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
  };

  const handleCurrentMonth = () => {
    setCalendarDate(new Date());
  };

  // Generate calendar days for the current month
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to show full calendar
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Handle escape key for closing modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showJourneyOverlay) {
          handleCloseJourneyOverlay();
        } else if (selectedSessionDetail) {
          handleCloseSessionDetail();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showJourneyOverlay, selectedSessionDetail]);

  const avgTimeSpent = searchFilteredData.length > 0
    ? searchFilteredData.reduce((sum, session) => sum + session.timeSpent, 0) / searchFilteredData.length
    : 0;

  const totalSessions = searchFilteredData.length;

  console.log('Energy Analytics Debug:', {
    isLoading,
    error,
    currentUser,
    moodEntries: Array.isArray(moodEntries) ? moodEntries.length : 0,
    sessionDurations: Array.isArray(sessionDurations) ? sessionDurations.length : 0,
    processedData: processedData.length,
    filteredData: filteredData.length
  });

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
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">Energy Analytics</h1>
        
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
              variant="ghost"
              size="sm"
              onClick={handleJourneyClick}
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
                {filter === 'all' ? 'All Time' : filter === 'week' ? 'Current week' : `Last ${filter}`}
              </Button>
            ))}
          </div>
          
          {/* Week Navigation - only show when week filter is active */}
          {timeFilter === 'week' && (
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCurrentWeek}
                disabled={currentWeekOffset === 0}
              >
                Current Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                disabled={currentWeekOffset >= 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Sample Data Button - Only for admins */}
          {currentUser?.isAdmin && (
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
          )}
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

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by date or comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Session History
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={historyViewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={historyViewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryViewMode('calendar')}
              >
                Calendar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyViewMode === 'list' ? (
            <div className="space-y-4">
            {searchFilteredData.map((session, index) => (
              <div key={session.sessionDate} className="p-4 border border-neutral-200 dark:border-[var(--border)] rounded-lg space-y-3 bg-white dark:bg-[var(--chat-message)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-neutral-900 dark:text-[var(--text-high-contrast)]">{formatDate(session.sessionDate)}</div>
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
                              borderColor: chakraColors[session.preEntry.emotionLevel - 1]?.color || '#000000',
                              color: chakraColors[session.preEntry.emotionLevel - 1]?.color || '#000000'
                            }}
                          >
                            {chakraColors[session.preEntry.emotionLevel - 1]?.name || 'No Awareness'}
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
                              borderColor: chakraColors[session.postEntry.emotionLevel - 1]?.color || '#000000',
                              color: chakraColors[session.postEntry.emotionLevel - 1]?.color || '#000000'
                            }}
                          >
                            {chakraColors[session.postEntry.emotionLevel - 1]?.name || 'No Awareness'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {session.preEntry && session.postEntry ? 'Complete' : 'Partial'}
                    </div>
                  </div>
                </div>
                
                {/* Comments Display */}
                {(session.preEntry?.comment || session.postEntry?.comment) && (
                  <div className="space-y-2 border-t pt-3">
                    {session.preEntry?.comment && (
                      <div className="text-xs text-gray-600 dark:text-[var(--text-medium-contrast)] bg-gray-50 dark:bg-[var(--muted)] p-2 rounded">
                        <span className="font-medium">Before: </span>
                        <span className="italic">"{session.preEntry.comment}"</span>
                      </div>
                    )}
                    {session.postEntry?.comment && (
                      <div className="text-xs text-gray-600 dark:text-[var(--text-medium-contrast)] bg-gray-50 dark:bg-[var(--muted)] p-2 rounded">
                        <span className="font-medium">After: </span>
                        <span className="italic">"{session.postEntry.comment}"</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {searchFilteredData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No sessions match your search criteria.' : 'No mood tracking data found for the selected time period.'}
              </div>
            )}
            </div>
          ) : (
            // Calendar View
            <div className="space-y-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCurrentMonth}
                    disabled={calendarDate.getMonth() === new Date().getMonth() && calendarDate.getFullYear() === new Date().getFullYear()}
                  >
                    Current Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                    disabled={calendarDate.getMonth() >= new Date().getMonth() && calendarDate.getFullYear() >= new Date().getFullYear()}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="text-lg font-semibold">
                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {getCalendarDays().map((date, index) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const session = searchFilteredData.find(s => s.sessionDate === dateStr);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
                  
                  return (
                    <div
                      key={index}
                      className={`aspect-square p-1 border rounded cursor-pointer transition-colors relative ${
                        isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-neutral-200 dark:border-[var(--border)]'
                      } ${
                        session ? 'bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900' : 'hover:bg-neutral-50 dark:hover:bg-[var(--muted)]'
                      } ${
                        !isCurrentMonth ? 'opacity-40' : ''
                      }`}
                      onClick={() => session && handleSessionClick(session)}
                    >
                      {/* Date number in top-left corner */}
                      <div className="absolute top-1 left-1 text-xs font-medium">{date.getDate()}</div>
                      
                      {/* Session content centered */}
                      {session && (
                        <div className="flex flex-col items-center justify-center h-full pt-3">
                          <div className="text-[10px] font-medium text-center mb-1">
                            {formatTime(session.timeSpent)}
                          </div>
                          <div className="flex items-center space-x-1">
                            {session.preEntry && (
                              <div className="w-2 h-2 rounded-full" 
                                   style={{ backgroundColor: chakraColors[session.preEntry.emotionLevel - 1]?.color || '#000000' }} />
                            )}
                            {session.preEntry && session.postEntry && (
                              <div className="text-[8px] text-muted-foreground">→</div>
                            )}
                            {session.postEntry && (
                              <div className="w-2 h-2 rounded-full" 
                                   style={{ backgroundColor: chakraColors[session.postEntry.emotionLevel - 1]?.color || '#000000' }} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {searchFilteredData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No sessions match your search criteria.' : 'No mood tracking data found for the selected time period.'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Detail Modal */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleCloseSessionDetail}>
          <Card className="w-full max-w-md bg-white dark:bg-[var(--background)] border-neutral-200 dark:border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {formatDate(selectedSessionDetail.sessionDate)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseSessionDetail}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Session Duration:</span>
                <span className="text-sm">{formatTime(selectedSessionDetail.timeSpent)}</span>
              </div>
              
              <div className="space-y-3">
                {selectedSessionDetail.preEntry && (
                  <div>
                    <div className="text-sm font-medium mb-2">Before Meditation:</div>
                    <Badge 
                      variant="outline" 
                      style={{ 
                        borderColor: chakraColors[selectedSessionDetail.preEntry.emotionLevel - 1]?.color || '#000000',
                        color: chakraColors[selectedSessionDetail.preEntry.emotionLevel - 1]?.color || '#000000'
                      }}
                      className="mb-2"
                    >
                      {chakraColors[selectedSessionDetail.preEntry.emotionLevel - 1]?.name || 'No Awareness'}
                    </Badge>
                    {selectedSessionDetail.preEntry.comment && (
                      <div className="text-xs text-gray-600 dark:text-[var(--text-medium-contrast)] bg-gray-50 dark:bg-[var(--muted)] p-2 rounded italic">
                        "{selectedSessionDetail.preEntry.comment}"
                      </div>
                    )}
                  </div>
                )}
                
                {selectedSessionDetail.postEntry && (
                  <div>
                    <div className="text-sm font-medium mb-2">After Meditation:</div>
                    <Badge 
                      variant="outline" 
                      style={{ 
                        borderColor: chakraColors[selectedSessionDetail.postEntry.emotionLevel - 1]?.color || '#000000',
                        color: chakraColors[selectedSessionDetail.postEntry.emotionLevel - 1]?.color || '#000000'
                      }}
                      className="mb-2"
                    >
                      {chakraColors[selectedSessionDetail.postEntry.emotionLevel - 1]?.name || 'No Awareness'}
                    </Badge>
                    {selectedSessionDetail.postEntry.comment && (
                      <div className="text-xs text-gray-600 dark:text-[var(--text-medium-contrast)] bg-gray-50 dark:bg-[var(--muted)] p-2 rounded italic">
                        "{selectedSessionDetail.postEntry.comment}"
                      </div>
                    )}
                  </div>
                )}
                

              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Journey Overlay */}
      {showJourneyOverlay && searchFilteredData.length > 0 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleCloseJourneyOverlay}>
          <Card className="w-full max-w-4xl bg-white dark:bg-[var(--background)] border-neutral-200 dark:border-[var(--border)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    disabled={currentSessionIndex >= searchFilteredData.length - 1}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseJourneyOverlay}
                  >
                    <X className="h-4 w-4" />
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
                {searchFilteredData[currentSessionIndex] && (
                  <div className="flex items-center space-x-4 text-sm">
                    <Badge variant="outline">
                      {formatDate(searchFilteredData[currentSessionIndex].sessionDate)}
                    </Badge>
                    <span className="text-muted-foreground">
                      Session {currentSessionIndex + 1} of {searchFilteredData.length}
                    </span>

                  </div>
                )}
              </div>
              
              <EnergyFlowAnimation
                sessionData={searchFilteredData}
                isPlaying={isPlaying}
                currentSessionIndex={currentSessionIndex}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}