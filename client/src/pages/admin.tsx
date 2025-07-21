import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Plus, Edit, Trash2, Calendar, Users, Search, BarChart3, Activity, Clock, Target, Copy, Upload, FileText, ChevronLeft, ChevronRight, TrendingUp, Trophy } from "lucide-react";
import { ProfilePictureManager } from "@/components/ProfilePictureManager";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MeditationTemplate, Schedule, User } from "@shared/schema";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [backendUser, setBackendUser] = useState<{ isAdmin: boolean } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setLocation("/auth");
        return;
      }

      try {
        const response = await apiRequest("GET", `/api/auth/user/${user.uid}`);
        if (response.ok) {
          const userData = await response.json();
          setBackendUser(userData);
          if (!userData.isAdmin) {
            setLocation("/meditation");
            toast({
              title: "Access Denied",
              description: "You don't have permission to access the admin panel.",
              variant: "destructive"
            });
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check admin status:", error);
        setLocation("/auth");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAdminStatus();
  }, [user, setLocation, toast]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MeditationTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    templateId: "",
    scheduledTime: "",
    isActive: true,
    repeatWeeks: 0,
    repeatCount: 1
  });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  
  // Handle URL parameters for selected user
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('selectedUser');
    const hash = window.location.hash;
    
    if (userIdParam && hash === '#users') {
      setActiveTab('users');
      setSelectedUserId(parseInt(userIdParam));
    }
  }, []);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleSortBy, setScheduleSortBy] = useState<"date" | "template">("date");
  const [scheduleViewMode, setScheduleViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<"week" | "month" | "year">("month");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] = useState(false);
  const [banningUser, setBanningUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");

  const [templateForm, setTemplateForm] = useState({
    title: "",
    description: "",
    duration: "",
    difficulty: "Beginner",
    videoUrl: "",
    thumbnailUrl: "",
    instructor: "",
    instructorTitle: "",
    sessionSteps: [
      { number: 1, title: "", description: "" },
      { number: 2, title: "", description: "" },
      { number: 3, title: "", description: "" }
    ]
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<MeditationTemplate[]>({
    queryKey: ["/api/admin/templates"],
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/admin/schedules"],
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!backendUser?.isAdmin,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    totalUsers: number;
    totalMinutes: number;
    dailyAverage: number;
    monthlyTotal: number;
    yearlyTotal: number;
    topUsers: Array<{
      id: number;
      name: string;
      email: string;
      totalTimeSpent: number;
    }>;
  }>({
    queryKey: ["/api/admin/analytics"],
    enabled: !!backendUser?.isAdmin,
  });



  const createTemplateMutation = useMutation({
    mutationFn: (templateData: any) => apiRequest("POST", "/api/admin/templates", templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsCreateModalOpen(false);
      resetForm();
      toast({
        title: "Template created",
        description: "The meditation template has been created successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PUT", `/api/admin/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setEditingTemplate(null);
      resetForm();
      toast({
        title: "Template updated",
        description: "The meditation template has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      toast({
        title: "Template deleted",
        description: "The meditation template has been deleted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/templates/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      toast({
        title: "Template duplicated",
        description: "The meditation template has been duplicated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const importTemplatesMutation = useMutation({
    mutationFn: (templates: any[]) => apiRequest("POST", "/api/admin/templates/import", { templates }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsImportModalOpen(false);
      setCsvData("");
      setImportPreview([]);
      toast({
        title: "Templates imported",
        description: `Successfully imported ${(response as any).imported} templates.`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import templates. Please try again.",
        variant: "destructive"
      });
    }
  });

  const createScheduleMutation = useMutation({
    mutationFn: (scheduleData: any) => apiRequest("POST", "/api/admin/schedules", scheduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedules"] });
      setIsScheduleModalOpen(false);
      resetScheduleForm();
      toast({
        title: "Schedule created",
        description: "The meditation schedule has been created successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PUT", `/api/admin/schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedules"] });
      setEditingSchedule(null);
      setIsScheduleModalOpen(false);
      resetScheduleForm();
      toast({
        title: "Schedule updated",
        description: "The meditation schedule has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedules"] });
      toast({
        title: "Schedule deleted",
        description: "The meditation schedule has been deleted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive"
      });
    }
  });

  // User Management Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PUT", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      setIsUserModalOpen(false);
      toast({
        title: "User updated",
        description: "The user has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive"
      });
    }
  });

  const banUserMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => 
      apiRequest("POST", `/api/admin/users/${id}/ban`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User banned",
        description: "The user has been banned successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to ban user. Please try again.",
        variant: "destructive"
      });
    }
  });

  const unbanUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/users/${id}/unban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User unbanned",
        description: "The user has been unbanned successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unban user. Please try again.",
        variant: "destructive"
      });
    }
  });

  const toggleGardenAngelMutation = useMutation({
    mutationFn: ({ id, isGardenAngel }: { id: number; isGardenAngel: boolean }) => 
      isGardenAngel 
        ? apiRequest("DELETE", `/api/admin/users/${id}/garden-angel`)
        : apiRequest("POST", `/api/admin/users/${id}/garden-angel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role updated",
        description: "The user's role has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) {
    return null;
  }

  const resetForm = () => {
    setTemplateForm({
      title: "",
      description: "",
      duration: "",
      difficulty: "Beginner",
      videoUrl: "",
      thumbnailUrl: "",
      instructor: "",
      instructorTitle: "",
      sessionSteps: [
        { number: 1, title: "", description: "" },
        { number: 2, title: "", description: "" },
        { number: 3, title: "", description: "" }
      ]
    });
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      date: "",
      templateId: "",
      scheduledTime: "",
      isActive: true,
      repeatWeeks: 0,
      repeatCount: 1
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setTemplateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleStepChange = (index: number, field: string, value: string) => {
    setTemplateForm(prev => ({
      ...prev,
      sessionSteps: prev.sessionSteps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const templateData = {
      ...templateForm,
      duration: parseInt(templateForm.duration),
      sessionSteps: templateForm.sessionSteps.filter(step => step.title.trim() !== "")
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateData });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  const handleEdit = (template: MeditationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      title: template.title,
      description: template.description,
      duration: template.duration.toString(),
      difficulty: template.difficulty,
      videoUrl: template.videoUrl,
      thumbnailUrl: template.thumbnailUrl || "",
      instructor: template.instructor,
      instructorTitle: template.instructorTitle,
      sessionSteps: template.sessionSteps.length > 0 ? template.sessionSteps : [
        { number: 1, title: "", description: "" },
        { number: 2, title: "", description: "" },
        { number: 3, title: "", description: "" }
      ]
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleDuplicate = (id: number) => {
    duplicateTemplateMutation.mutate(id);
  };

  // CSV parsing and processing functions
  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      // Create both header-based and index-based access
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
        row[index] = values[index] || ''; // Also store by index
      });
      
      return row;
    });
    return rows;
  };

  const processCsvData = () => {
    if (!csvData.trim()) return;
    
    try {
      const parsedData = parseCSV(csvData);
      console.log('Parsed CSV data:', parsedData);
      
      const processedTemplates = parsedData.map((row, index) => {
        // Map CSV columns to template format - Template Title is column G, Description is column B
        const duration = parseFloat(row['duration']) || 0;
        
        console.log(`Row ${index}:`, {
          columnB: row[1],
          columnG: row[6],
          duration: row['duration'],
          instructor: row['Instructor']
        });
        
        return {
          title: row[6] || `Imported Template ${index + 1}`, // Column G (index 6)
          description: row[1] || 'Imported meditation template', // Column B (index 1)
          duration: duration,
          difficulty: 'Beginner', // Default difficulty
          videoUrl: row['video Url'] || '',
          thumbnailUrl: row['Thumbnail URL (optional)'] || '',
          instructor: row['Instructor'] || 'Unknown',
          instructorTitle: row['Instructor Title'] || 'Meditation Instructor',
          sessionSteps: [
            { number: 1, title: 'Preparation', description: 'Get comfortable and prepare for meditation' },
            { number: 2, title: 'Practice', description: 'Follow the guided meditation' },
            { number: 3, title: 'Integration', description: 'Reflect and integrate the experience' }
          ]
        };
      });
      
      console.log('Processed templates:', processedTemplates);
      setImportPreview(processedTemplates);
    } catch (error) {
      console.error('CSV parsing error:', error);
      toast({
        title: "Error",
        description: "Failed to parse CSV data. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const handleImport = () => {
    if (importPreview.length === 0) return;
    setIsProcessingImport(true);
    importTemplatesMutation.mutate(importPreview);
  };

  const handleScheduleInputChange = (field: string, value: string | boolean) => {
    setScheduleForm(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const scheduleData = {
      ...scheduleForm,
      templateId: parseInt(scheduleForm.templateId),
      repeatWeeks: parseInt(scheduleForm.repeatWeeks.toString()),
      repeatCount: parseInt(scheduleForm.repeatCount.toString())
    };

    // Handle repeat functionality for both create and edit
    if (scheduleData.repeatWeeks > 0 && scheduleData.repeatCount > 1) {
      const schedules: any[] = [];
      const startDate = new Date(scheduleData.date);
      
      for (let i = 0; i < scheduleData.repeatCount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (i * scheduleData.repeatWeeks * 7));
        
        schedules.push({
          ...scheduleData,
          date: currentDate.toISOString().split('T')[0]
        });
      }
      
      // Create multiple schedules
      const createSchedules = () => {
        Promise.all(schedules.map(schedule => 
          apiRequest("POST", "/api/admin/schedules", schedule)
        )).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/schedules"] });
          setIsScheduleModalOpen(false);
          resetScheduleForm();
          toast({
            title: "Schedules created",
            description: `Successfully created ${schedules.length} repeated schedules.`
          });
        }).catch(() => {
          toast({
            title: "Error",
            description: "Failed to create repeated schedules. Please try again.",
            variant: "destructive"
          });
        });
      };
      
      // If editing, delete the existing schedule first
      if (editingSchedule) {
        apiRequest("DELETE", `/api/admin/schedules/${editingSchedule.id}`)
          .then(() => {
            createSchedules();
          })
          .catch(() => {
            toast({
              title: "Error",
              description: "Failed to delete existing schedule. Please try again.",
              variant: "destructive"
            });
          });
      } else {
        createSchedules();
      }
    } else {
      // Single schedule creation or update
      if (editingSchedule) {
        updateScheduleMutation.mutate({ id: editingSchedule.id, data: scheduleData });
      } else {
        createScheduleMutation.mutate(scheduleData);
      }
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      date: schedule.date,
      templateId: schedule.templateId?.toString() || "",
      scheduledTime: schedule.scheduledTime,
      isActive: schedule.isActive || true,
      repeatWeeks: schedule.repeatWeeks || 0,
      repeatCount: schedule.repeatCount || 1
    });
    setIsScheduleModalOpen(true);
  };

  const handleDeleteSchedule = (id: number) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  // User Management Handlers
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleUpdateUser = (id: number, userData: any) => {
    updateUserMutation.mutate({ id, data: userData });
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const toggleUserAdminStatus = (user: User) => {
    handleUpdateUser(user.id, { isAdmin: !user.isAdmin });
  };

  const filteredTemplates = templates?.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.instructor.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const sortedSchedules = schedules?.sort((a, b) => {
    if (scheduleSortBy === "date") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (scheduleSortBy === "template") {
      const templateA = templates?.find(t => t.id === a.templateId);
      const templateB = templates?.find(t => t.id === b.templateId);
      const titleA = templateA?.title || "";
      const titleB = templateB?.title || "";
      return titleA.localeCompare(titleB);
    }
    return 0;
  }) || [];

  // Calendar view helper functions
  const [calendarDate, setCalendarDate] = useState(new Date());

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
    
    while (current <= lastDay || current.getDay() !== 0) {
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
    return sortedSchedules.filter(schedule => schedule.date === dateStr);
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

  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  ) || [];

  const handleBanUser = (user: User) => {
    setBanningUser(user);
    setBanReason("");
  };

  const confirmBanUser = () => {
    if (banningUser && banReason.trim()) {
      banUserMutation.mutate({ id: banningUser.id, reason: banReason });
      setBanningUser(null);
      setBanReason("");
    }
  };

  const handleUnbanUser = (user: User) => {
    if (confirm(`Are you sure you want to unban ${user.name}?`)) {
      unbanUserMutation.mutate(user.id);
    }
  };

  const handleToggleGardenAngel = (user: User) => {
    const action = user.isGardenAngel ? "remove Gardian Angel status from" : "make Gardian Angel";
    if (confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      toggleGardenAngelMutation.mutate({ id: user.id, isGardenAngel: !!user.isGardenAngel });
    }
  };



  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // User is not authenticated or not admin - redirect handled in useEffect
  if (!user || !backendUser?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)] mb-2">Admin Dashboard</h1>
        <p className="text-neutral-600 dark:text-[var(--text-medium-contrast)]">Manage meditation templates and schedules</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="space-y-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="profile-pictures">Profile Pictures</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">Total Templates</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">{templates?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">Active Schedules</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">
                      {schedules?.filter(s => s.isActive).length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">Avg Duration</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">
                      {templates?.length ? Math.round(
                        templates.reduce((sum, t) => sum + t.duration, 0) / templates.length
                      ) : 0} min
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">Total Users</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">{users?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Template Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["Beginner", "Intermediate", "Advanced"].map((level) => {
                    const count = templates?.filter(t => t.difficulty === level).length || 0;
                    const percentage = templates?.length ? (count / templates.length) * 100 : 0;
                    return (
                      <div key={level} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">{level}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-neutral-600 dark:text-[var(--text-medium-contrast)] w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800 dark:text-[var(--text-high-contrast)]">Database connected</p>
                      <p className="text-xs text-neutral-500 dark:text-[var(--text-low-contrast)]">System is operational</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800 dark:text-[var(--text-high-contrast)]">Templates loaded</p>
                      <p className="text-xs text-neutral-500 dark:text-[var(--text-low-contrast)]">{templates?.length || 0} templates available</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800 dark:text-[var(--text-high-contrast)]">Schedules active</p>
                      <p className="text-xs text-neutral-500 dark:text-[var(--text-low-contrast)]">{schedules?.filter(s => s.isActive).length || 0} active schedules</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-[var(--text-high-contrast)]">Meditation Templates</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingTemplate(null); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? "Edit Template" : "Create New Template"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTemplate ? "Update the meditation template details below." : "Fill in the details to create a new meditation template."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Template Title</Label>
                        <Input
                          id="title"
                          value={templateForm.title}
                          onChange={(e) => handleInputChange("title", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="instructor">Instructor</Label>
                        <Input
                          id="instructor"
                          value={templateForm.instructor}
                          onChange={(e) => handleInputChange("instructor", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={templateForm.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={3}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={templateForm.duration}
                          onChange={(e) => handleInputChange("duration", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="difficulty">Difficulty</Label>
                        <Select value={templateForm.difficulty} onValueChange={(value) => handleInputChange("difficulty", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="instructorTitle">Instructor Title</Label>
                        <Input
                          id="instructorTitle"
                          value={templateForm.instructorTitle}
                          onChange={(e) => handleInputChange("instructorTitle", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="videoUrl">Video URL</Label>
                      <Input
                        id="videoUrl"
                        type="url"
                        value={templateForm.videoUrl}
                        onChange={(e) => handleInputChange("videoUrl", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
                      <Input
                        id="thumbnailUrl"
                        type="url"
                        value={templateForm.thumbnailUrl}
                        onChange={(e) => handleInputChange("thumbnailUrl", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Session Steps</Label>
                      <div className="space-y-3 mt-2">
                        {templateForm.sessionSteps.map((step, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-lg">
                            <div>
                              <Label className="text-sm">Step {step.number} Title</Label>
                              <Input
                                value={step.title}
                                onChange={(e) => handleStepChange(index, "title", e.target.value)}
                                placeholder="Step title"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Step {step.number} Description</Label>
                              <Input
                                value={step.description}
                                onChange={(e) => handleStepChange(index, "description", e.target.value)}
                                placeholder="Step description"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                        {editingTemplate ? "Update Template" : "Create Template"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              {/* Import CSV Modal */}
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import Templates from CSV</DialogTitle>
                    <DialogDescription>
                      Import multiple meditation templates from a CSV file. Follow the format instructions below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">CSV Format Instructions</h3>
                      <p className="text-sm text-blue-700 mb-2">
                        Your CSV should have columns in the following positions:
                      </p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Column B</strong> - Description of the meditation template</li>
                        <li>• <strong>Column G</strong> - Template Title (name of the meditation)</li>
                        <li>• <strong>Instructor</strong> - The instructor name (named column)</li>
                        <li>• <strong>Instructor Title</strong> - The instructor's title (named column)</li>
                        <li>• <strong>duration</strong> - Duration in minutes (named column)</li>
                        <li>• <strong>video Url</strong> - URL to the meditation video (named column)</li>
                        <li>• <strong>Thumbnail URL (optional)</strong> - URL to the thumbnail image (named column)</li>
                      </ul>
                    </div>
                    
                    <div>
                      <Label htmlFor="csv-data">Paste CSV Data</Label>
                      <Textarea
                        id="csv-data"
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        placeholder="Paste your CSV data here..."
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        onClick={processCsvData}
                        disabled={!csvData.trim()}
                        variant="outline"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Preview Templates
                      </Button>
                      <div className="flex space-x-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsImportModalOpen(false);
                            setCsvData("");
                            setImportPreview([]);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleImport}
                          disabled={importPreview.length === 0 || importTemplatesMutation.isPending}
                        >
                          {importTemplatesMutation.isPending ? "Importing..." : `Import ${importPreview.length} Templates`}
                        </Button>
                      </div>
                    </div>
                    
                    {importPreview.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="font-medium mb-3">Preview ({importPreview.length} templates)</h3>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {importPreview.map((template, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="font-medium">{template.title}</div>
                              <div className="text-sm text-gray-600">
                                {template.instructor} • {template.duration} min • {template.difficulty}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {template.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-neutral-200 animate-pulse" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-neutral-200 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-neutral-200 rounded animate-pulse mb-3" />
                    <div className="flex justify-between">
                      <div className="h-3 bg-neutral-200 rounded animate-pulse w-16" />
                      <div className="flex space-x-2">
                        <div className="h-6 w-6 bg-neutral-200 rounded animate-pulse" />
                        <div className="h-6 w-6 bg-neutral-200 rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                    {template.thumbnailUrl ? (
                      <img 
                        src={template.thumbnailUrl} 
                        alt={template.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-neutral-500 dark:text-neutral-400">No thumbnail</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary">
                        {template.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-neutral-800 dark:text-white mb-2">{template.title}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3 line-clamp-2">{template.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-neutral-500 dark:text-neutral-400">{template.duration} min</span>
                        <span className="text-neutral-500 dark:text-neutral-400">{template.instructor}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicate(template.id)}
                          className="text-blue-500 hover:text-blue-600"
                          title="Duplicate template"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(template.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-[var(--text-high-contrast)]">Schedule Management</h2>
            <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetScheduleForm(); setEditingSchedule(null); }}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? "Edit Schedule" : "Create New Schedule"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSchedule ? "Update the schedule details below." : "Schedule a meditation template for a specific date and time."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="schedule-date">Date</Label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={scheduleForm.date}
                        onChange={(e) => handleScheduleInputChange("date", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="schedule-time">Time</Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduleForm.scheduledTime}
                        onChange={(e) => handleScheduleInputChange("scheduledTime", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="schedule-template">Template</Label>
                    <Select value={scheduleForm.templateId} onValueChange={(value) => handleScheduleInputChange("templateId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.title} - {template.duration} min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="schedule-active"
                      checked={scheduleForm.isActive}
                      onChange={(e) => handleScheduleInputChange("isActive", e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="schedule-active">Active</Label>
                  </div>

                  {/* Repeat Options */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Repeat Options</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="repeat-weeks">Repeat Every (weeks)</Label>
                        <Select 
                          value={scheduleForm.repeatWeeks.toString()} 
                          onValueChange={(value) => handleScheduleInputChange("repeatWeeks", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No repeat" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No repeat</SelectItem>
                            <SelectItem value="1">1 week</SelectItem>
                            <SelectItem value="2">2 weeks</SelectItem>
                            <SelectItem value="3">3 weeks</SelectItem>
                            <SelectItem value="4">4 weeks</SelectItem>
                            <SelectItem value="5">5 weeks</SelectItem>
                            <SelectItem value="6">6 weeks</SelectItem>
                            <SelectItem value="7">7 weeks</SelectItem>
                            <SelectItem value="8">8 weeks</SelectItem>
                            <SelectItem value="9">9 weeks</SelectItem>
                            <SelectItem value="10">10 weeks</SelectItem>
                            <SelectItem value="11">11 weeks</SelectItem>
                            <SelectItem value="12">12 weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="repeat-count">Number of Repetitions</Label>
                        <Select 
                          value={scheduleForm.repeatCount.toString()} 
                          onValueChange={(value) => handleScheduleInputChange("repeatCount", value)}
                          disabled={scheduleForm.repeatWeeks === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="1 time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 time</SelectItem>
                            <SelectItem value="2">2 times</SelectItem>
                            <SelectItem value="3">3 times</SelectItem>
                            <SelectItem value="4">4 times</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {scheduleForm.repeatWeeks > 0 && scheduleForm.repeatCount > 1 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          This will create {scheduleForm.repeatCount} schedules, starting from the selected date and repeating every {scheduleForm.repeatWeeks} week{scheduleForm.repeatWeeks === 1 ? '' : 's'}.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}>
                      {editingSchedule ? "Update Schedule" : "Create Schedule"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {schedulesLoading ? (
            <Loading />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Schedules</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-medium">View:</Label>
                      <div className="flex border rounded-lg">
                        <Button
                          size="sm"
                          variant={scheduleViewMode === "list" ? "default" : "ghost"}
                          onClick={() => setScheduleViewMode("list")}
                          className="rounded-r-none"
                        >
                          List
                        </Button>
                        <Button
                          size="sm"
                          variant={scheduleViewMode === "calendar" ? "default" : "ghost"}
                          onClick={() => setScheduleViewMode("calendar")}
                          className="rounded-l-none"
                        >
                          Calendar
                        </Button>
                      </div>
                    </div>
                    
                    {scheduleViewMode === "list" && (
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium">Sort by:</Label>
                        <Select value={scheduleSortBy} onValueChange={(value: "date" | "template") => setScheduleSortBy(value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {scheduleViewMode === "calendar" && (
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium">View:</Label>
                        <Select value={calendarView} onValueChange={(value: "week" | "month" | "year") => setCalendarView(value)}>
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
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {scheduleViewMode === "list" ? (
                  <div className="space-y-4">
                    {sortedSchedules?.length === 0 ? (
                      <p className="text-center text-neutral-500 py-8">No schedules found</p>
                    ) : (
                      sortedSchedules?.map((schedule) => {
                        const template = templates?.find(t => t.id === schedule.templateId);
                        return (
                          <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{schedule.date}</p>
                              <p className="text-sm text-neutral-600">Time: {schedule.scheduledTime}</p>
                              <p className="text-sm text-neutral-600">
                                Template: {template ? `${template.title} (${template.duration} min)` : 'Unknown Template'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={schedule.isActive ? "default" : "secondary"}>
                                {schedule.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Button size="sm" variant="ghost" onClick={() => handleEditSchedule(schedule)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteSchedule(schedule.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={() => navigateCalendar('prev')}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <h3 className="text-lg font-medium">
                        {calendarView === 'week' && 
                          `Week of ${calendarDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                        }
                        {calendarView === 'month' && 
                          calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        }
                        {calendarView === 'year' && 
                          calendarDate.getFullYear()
                        }
                      </h3>
                      <Button variant="outline" size="sm" onClick={() => navigateCalendar('next')}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Calendar Grid */}
                    {calendarView === 'week' && (
                      <div className="grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-sm font-medium py-2 border-b dark:border-[var(--border)] text-neutral-800 dark:text-[var(--text-high-contrast)]">
                            {day}
                          </div>
                        ))}
                        {getWeekDays(calendarDate).map(day => {
                          const daySchedules = getSchedulesForDate(day);
                          return (
                            <div key={day.toISOString()} className="min-h-24 p-2 border dark:border-[var(--border)] rounded-lg bg-white dark:bg-[var(--card)]">
                              <div className="text-sm font-medium mb-1 text-neutral-900 dark:text-[var(--text-high-contrast)]">{day.getDate()}</div>
                              {daySchedules.map(schedule => {
                                const template = templates?.find(t => t.id === schedule.templateId);
                                return (
                                  <div key={schedule.id} className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 rounded mb-1 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" 
                                       onClick={() => handleEditSchedule(schedule)}>
                                    {schedule.scheduledTime} - {template?.title || 'Unknown'}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {calendarView === 'month' && (
                      <div className="grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-sm font-medium py-2 border-b dark:border-[var(--border)] text-neutral-800 dark:text-[var(--text-high-contrast)]">
                            {day}
                          </div>
                        ))}
                        {getMonthDays(calendarDate).map(day => {
                          const daySchedules = getSchedulesForDate(day);
                          const isCurrentMonth = day.getMonth() === calendarDate.getMonth();
                          return (
                            <div key={day.toISOString()} className={`min-h-20 p-2 border dark:border-[var(--border)] rounded-lg ${!isCurrentMonth ? 'bg-gray-50 dark:bg-[var(--muted)] text-gray-400 dark:text-[var(--text-low-contrast)]' : 'bg-white dark:bg-[var(--card)]'}`}>
                              <div className="text-sm font-medium mb-1 text-neutral-900 dark:text-[var(--text-high-contrast)]">{day.getDate()}</div>
                              {daySchedules.map(schedule => {
                                const template = templates?.find(t => t.id === schedule.templateId);
                                return (
                                  <div key={schedule.id} className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 rounded mb-1 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" 
                                       onClick={() => handleEditSchedule(schedule)}>
                                    {template?.title || 'Unknown'}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {calendarView === 'year' && (
                      <div className="grid grid-cols-3 gap-4">
                        {getYearMonths(calendarDate).map(month => {
                          const monthSchedules = sortedSchedules.filter(schedule => {
                            const scheduleDate = new Date(schedule.date);
                            return scheduleDate.getMonth() === month.getMonth() && 
                                   scheduleDate.getFullYear() === month.getFullYear();
                          });
                          return (
                            <div key={month.toISOString()} className="border dark:border-[var(--border)] rounded-lg p-4 bg-white dark:bg-[var(--card)]">
                              <h4 className="font-medium mb-2 text-neutral-900 dark:text-[var(--text-high-contrast)]">{month.toLocaleDateString('en-US', { month: 'long' })}</h4>
                              <div className="space-y-1">
                                {monthSchedules.slice(0, 3).map(schedule => {
                                  const template = templates?.find(t => t.id === schedule.templateId);
                                  return (
                                    <div key={schedule.id} className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" 
                                         onClick={() => handleEditSchedule(schedule)}>
                                      {new Date(schedule.date).getDate()} - {template?.title || 'Unknown'}
                                    </div>
                                  );
                                })}
                                {monthSchedules.length > 3 && (
                                  <div className="text-xs text-gray-500 dark:text-[var(--text-low-contrast)]">+{monthSchedules.length - 3} more</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-800">User Management</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-10" 
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loading />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 dark:text-[var(--text-high-contrast)] mb-2">No Users Found</h3>
                  <p className="text-neutral-600 dark:text-[var(--text-medium-contrast)]">No users match your search criteria.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <Card className="hidden md:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b dark:border-[var(--border)]">
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">User</th>
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">Email</th>
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">Role</th>
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">Status</th>
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">Joined</th>
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">Last Login</th>
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">Time Spent</th>
                          <th className="text-left p-4 font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className={`border-b dark:border-[var(--border)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] transition-colors ${selectedUserId === user.id ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-[var(--border)] flex items-center justify-center bg-gray-50 dark:bg-[var(--muted)]">
                                  {user.profilePicture ? (
                                    <img
                                      src={user.profilePicture}
                                      alt={user.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-primary font-medium">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-800 dark:text-[var(--text-high-contrast)]">{user.name}</p>
                                  <p className="text-sm text-neutral-600 dark:text-[var(--text-medium-contrast)]">ID: {user.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-neutral-800 dark:text-[var(--text-high-contrast)]">{user.email}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                {user.isAdmin ? (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                                    Admin
                                  </Badge>
                                ) : user.isGardenAngel ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                    Garden Angel
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="dark:bg-[var(--muted)] dark:text-[var(--text-medium-contrast)]">
                                    User
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                {user.isBanned ? (
                                  <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                                    Banned
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                    Active
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-neutral-600 dark:text-[var(--text-medium-contrast)]">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="text-neutral-600 dark:text-[var(--text-medium-contrast)] text-sm">
                                {(user as any).lastLogin ? new Date((user as any).lastLogin).toLocaleDateString() : 
                                  <span className="text-neutral-400 dark:text-[var(--text-low-contrast)]">Never</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-neutral-600 dark:text-[var(--text-medium-contrast)] text-sm">
                                {((user as any).totalTimeSpent || 0) > 0 ? 
                                  `${(user as any).totalTimeSpent} min` : 
                                  <span className="text-neutral-400 dark:text-[var(--text-low-contrast)]">0 min</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1 flex-wrap">
                                {!user.isBanned ? (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleBanUser(user)}
                                    disabled={banUserMutation.isPending}
                                    className="text-xs"
                                  >
                                    Ban
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleUnbanUser(user)}
                                    disabled={unbanUserMutation.isPending}
                                    className="text-xs"
                                  >
                                    Unban
                                  </Button>
                                )}
                                
                                {!user.isAdmin && (
                                  <Button 
                                    size="sm" 
                                    variant={user.isGardenAngel ? "ghost" : "secondary"}
                                    onClick={() => handleToggleGardenAngel(user)}
                                    disabled={toggleGardenAngelMutation.isPending}
                                    className="text-xs"
                                  >
                                    {user.isGardenAngel ? "Remove GA" : "Make GA"}
                                  </Button>
                                )}
                                
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toggleUserAdminStatus(user)}
                                  disabled={updateUserMutation.isPending}
                                  className="text-xs"
                                >
                                  {user.isAdmin ? "Remove Admin" : "Make Admin"}
                                </Button>
                                
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-medium text-lg">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-neutral-800 dark:text-[var(--text-high-contrast)] truncate">{user.name}</h3>
                          <div className="flex space-x-1">
                            {user.isAdmin ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 text-xs">
                                Admin
                              </Badge>
                            ) : user.isGardenAngel ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-xs">
                                GA
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="dark:bg-[var(--muted)] dark:text-[var(--text-medium-contrast)] text-xs">
                                User
                              </Badge>
                            )}
                            {user.isBanned ? (
                              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-xs">
                                Banned
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-[var(--text-medium-contrast)] truncate mb-1">{user.email}</p>
                        <p className="text-xs text-neutral-500 dark:text-[var(--text-low-contrast)]">
                          ID: {user.id} • Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                          <div>
                            <span className="font-medium">Last Login:</span> Not Available
                          </div>
                          <div>
                            <span className="font-medium">Time:</span> Not Available
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {!user.isBanned ? (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleBanUser(user)}
                              disabled={banUserMutation.isPending}
                              className="text-xs"
                            >
                              Ban
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUnbanUser(user)}
                              disabled={unbanUserMutation.isPending}
                              className="text-xs"
                            >
                              Unban
                            </Button>
                          )}
                          
                          {!user.isAdmin && (
                            <Button 
                              size="sm" 
                              variant={user.isGardenAngel ? "ghost" : "secondary"}
                              onClick={() => handleToggleGardenAngel(user)}
                              disabled={toggleGardenAngelMutation.isPending}
                              className="text-xs"
                            >
                              {user.isGardenAngel ? "Remove GA" : "Make GA"}
                            </Button>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => toggleUserAdminStatus(user)}
                            disabled={updateUserMutation.isPending}
                            className="text-xs"
                          >
                            {user.isAdmin ? "Remove Admin" : "Make Admin"}
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deleteUserMutation.isPending}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* User Edit Modal */}
          <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="userName">Name</Label>
                    <Input
                      id="userName"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="userEmail">Email</Label>
                    <Input
                      id="userEmail"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={!!editingUser.isAdmin}
                      onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                    />
                    <Label htmlFor="isAdmin">Administrator</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsUserModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => handleUpdateUser(editingUser.id, editingUser)}
                      disabled={updateUserMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Ban User Modal */}
          <Dialog open={banningUser !== null} onOpenChange={() => setBanningUser(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ban User</DialogTitle>
              </DialogHeader>
              {banningUser && (
                <div className="space-y-4">
                  <p className="text-neutral-600 dark:text-[var(--text-medium-contrast)]">
                    You are about to ban <strong>{banningUser.name}</strong> ({banningUser.email}).
                    This will immediately log them out and prevent them from accessing the platform.
                  </p>
                  <div>
                    <Label htmlFor="banReason">Reason for ban</Label>
                    <textarea
                      id="banReason"
                      className="w-full mt-1 p-2 border border-gray-300 dark:border-[var(--border)] rounded-md bg-white dark:bg-[var(--muted)] text-neutral-800 dark:text-[var(--text-high-contrast)] resize-none"
                      rows={3}
                      placeholder="Enter the reason for banning this user..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setBanningUser(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={confirmBanUser}
                      disabled={banUserMutation.isPending || !banReason.trim()}
                    >
                      {banUserMutation.isPending ? "Banning..." : "Ban User"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-2xl font-semibold mb-6">Analytics Dashboard</h2>
          
          {analyticsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : analytics ? (
            <>
              {/* Overview Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">Total Users</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">{analytics.totalUsers || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">Total Minutes</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">{analytics.totalMinutes || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">Daily Average</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">{analytics.dailyAverage || 0} min</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-[var(--text-medium-contrast)]">This Month</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">{analytics.monthlyTotal || 0} min</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 Users by Time Spent */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    Top 10 Users by Meditation Time
                  </CardTitle>
                  <CardDescription>
                    Users with the most meditation minutes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topUsers?.map((user: any, index: number) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-800 dark:text-[var(--text-high-contrast)]">{user.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-neutral-800 dark:text-[var(--text-high-contrast)]">{user.totalTimeSpent} min</p>
                          <p className="text-sm text-neutral-600 dark:text-[var(--text-medium-contrast)]">
                            {Math.round(user.totalTimeSpent / 60 * 100) / 100} hrs
                          </p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-center text-neutral-600 dark:text-[var(--text-medium-contrast)] py-8">
                        No meditation data available yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-600 dark:text-[var(--text-medium-contrast)]">Unable to load analytics data</p>
            </div>
          )}
        </TabsContent>

        {/* Profile Pictures Tab */}
        <TabsContent value="profile-pictures" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Profile Picture Management</h2>
            <Button onClick={() => setIsProfilePictureModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New Picture
            </Button>
          </div>
          
          <ProfilePictureManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
