import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format } from "date-fns";

interface Template {
  id: number;
  title: string;
  instructor: string;
  duration: number;
  description: string;
}

interface Schedule {
  id: number;
  date: string;
  templateId: number;
  scheduledTime: string;
  isActive: boolean;
  template?: Template;
}

export default function GardenAngelPage() {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"week" | "month" | "year">("month");

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['/api/admin/schedules'],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ['/api/admin/templates'],
  });

  // Helper functions from admin page
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    // Get 42 days (6 weeks) for consistent grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getYearMonths = (date: Date) => {
    const year = date.getFullYear();
    const months = [];
    
    for (let i = 0; i < 12; i++) {
      months.push(new Date(year, i, 1));
    }
    
    return months;
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(schedule => schedule.date === dateStr);
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    
    if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (calendarView === 'year') {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    
    setCalendarDate(newDate);
  };

  const getMeditationDuration = (schedules: Schedule[]) => {
    if (!schedules.length) return 0;
    
    // Get the template from the schedule
    const template = templates.find(t => t.id === schedules[0].templateId);
    return template?.duration || 0;
  };

  const renderCalendarContent = () => {
    if (calendarView === 'week') {
      const weekDays = getWeekDays(calendarDate);
      return (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const daySchedules = getSchedulesForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const duration = getMeditationDuration(daySchedules);
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 rounded-lg border ${
                  isToday 
                    ? 'border-primary bg-primary/5' 
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[var(--card)]'
                }`}
              >
                <div className="font-medium text-sm text-neutral-700 dark:text-neutral-300 mb-1">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {daySchedules.map((schedule) => {
                  const template = templates.find(t => t.id === schedule.templateId);
                  return (
                    <div 
                      key={schedule.id} 
                      className="mb-1 p-1 rounded bg-primary/10 dark:bg-primary/20"
                    >
                      <div className="text-xs font-medium text-primary dark:text-primary-400 truncate">
                        {template?.title}
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        {duration} min
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    } else if (calendarView === 'month') {
      const monthDays = getMonthDays(calendarDate);
      const currentMonth = calendarDate.getMonth();
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      return (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div 
                key={day} 
                className="text-center text-sm font-medium text-neutral-600 dark:text-neutral-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, index) => {
              const daySchedules = getSchedulesForDate(day);
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isToday = day.toDateString() === new Date().toDateString();
              const duration = getMeditationDuration(daySchedules);
              
              return (
                <div
                  key={index}
                  className={`min-h-[80px] p-2 rounded-lg border relative ${
                    !isCurrentMonth 
                      ? 'opacity-50 border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900' 
                      : isToday 
                        ? 'border-primary bg-primary/5' 
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[var(--card)]'
                  }`}
                >
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 absolute top-1 left-2">
                    {day.getDate()}
                  </div>
                  {daySchedules.length > 0 && (
                    <div className="mt-6">
                      <div className="text-xs text-primary dark:text-primary-400 truncate">
                        {templates.find(t => t.id === daySchedules[0].templateId)?.title}
                      </div>
                      {duration > 0 && (
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 text-center mt-1">
                          {duration} min
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      const yearMonths = getYearMonths(calendarDate);
      
      return (
        <div className="grid grid-cols-4 gap-4">
          {yearMonths.map((month, index) => {
            const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
            let hasSchedules = false;
            
            for (let day = new Date(monthStart); day <= monthEnd; day.setDate(day.getDate() + 1)) {
              if (getSchedulesForDate(new Date(day)).length > 0) {
                hasSchedules = true;
                break;
              }
            }
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border text-center ${
                  hasSchedules 
                    ? 'border-primary bg-primary/5' 
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[var(--card)]'
                }`}
              >
                <div className="font-medium text-neutral-900 dark:text-white">
                  {month.toLocaleDateString('en-US', { month: 'long' })}
                </div>
                {hasSchedules && (
                  <div className="text-xs text-primary dark:text-primary-400 mt-1">
                    Has schedules
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Gardian Angel Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-400">View meditation schedule and moderate sessions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Label className="text-sm text-neutral-600 dark:text-neutral-400">View:</Label>
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700">
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              List
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setViewMode('calendar')}
              className="rounded-l-none"
            >
              Calendar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'calendar' ? (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateCalendar('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {calendarView === 'week' && 
                    `Week of ${calendarDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                  }
                  {calendarView === 'month' && 
                    calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  }
                  {calendarView === 'year' && 
                    calendarDate.getFullYear()
                  }
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateCalendar('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-sm">View:</Label>
                <Select
                  value={calendarView}
                  onValueChange={(value) => setCalendarView(value as "week" | "month" | "year")}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderCalendarContent()}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Meditation Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedules
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((schedule) => {
                const template = templates.find(t => t.id === schedule.templateId);
                return (
                  <div 
                    key={schedule.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[var(--card)]"
                  >
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-4 w-4 text-neutral-500" />
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {template?.title || 'Unknown Template'}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          {new Date(schedule.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })} at {schedule.scheduledTime}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <Clock className="h-4 w-4" />
                      <span>{template?.duration || 0} min</span>
                      <User className="h-4 w-4 ml-4" />
                      <span>{template?.instructor || 'Unknown'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
