import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";

interface Schedule {
  id: number;
  date: string;
  template: {
    id: number;
    title: string;
    instructor: string;
    duration: number;
  };
}

export default function GardenAngelPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const { data: schedules = [], isLoading, error } = useQuery<Schedule[]>({
    queryKey: ['/api/garden-angel/schedules'],
  });

  console.log('Garden Angel schedules:', schedules, 'Loading:', isLoading, 'Error:', error);

  // Filter schedules for current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthSchedules = schedules.filter((schedule: Schedule) => {
    const scheduleDate = parseISO(schedule.date);
    return scheduleDate >= monthStart && scheduleDate <= monthEnd;
  });

  // Create calendar grid
  const calendarDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd
  });

  const getScheduleForDay = (day: Date) => {
    return monthSchedules.find((schedule: Schedule) => 
      isSameDay(parseISO(schedule.date), day)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Gardien Angel Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-400">View meditation schedule and moderate sessions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>{format(currentDate, 'MMMM yyyy')}</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-neutral-600 dark:text-neutral-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(day => {
                const schedule = getScheduleForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[80px] p-2 border rounded-lg transition-colors relative
                      ${isCurrentMonth ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-900'}
                      ${isToday ? 'ring-2 ring-primary' : 'border-neutral-200 dark:border-neutral-700'}
                      ${schedule ? 'hover:bg-primary/5 dark:hover:bg-primary/10' : ''}
                    `}
                  >
                    <div className={`text-sm ${isToday ? 'font-bold text-primary' : isCurrentMonth ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'}`}>
                      {format(day, 'd')}
                    </div>
                    {schedule && (
                      <div className="mt-1 space-y-1">
                        <div className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-1 truncate">
                          {schedule.template?.title || 'No Title'}
                        </div>
                        <div className="flex items-center text-xs text-neutral-600 dark:text-neutral-400">
                          <User className="w-3 h-3 mr-1" />
                          <span className="truncate">{schedule.template?.instructor || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center text-xs text-neutral-600 dark:text-neutral-400">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{schedule.template?.duration || 0} min</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Schedule List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthSchedules.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No meditation sessions scheduled for this month.
                </div>
              ) : (
                monthSchedules.map((schedule: Schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-white">
                          {schedule.template?.title || 'No Title'}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                          <span>{format(parseISO(schedule.date), 'EEEE, MMMM d, yyyy')}</span>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {schedule.template?.instructor || 'Unknown'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {schedule.template?.duration || 0} minutes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}