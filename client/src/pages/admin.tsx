import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Plus, Edit, Trash2, Calendar, Users, Search, BarChart3, Activity, Clock, Target } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MeditationTemplate, Schedule } from "@shared/schema";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MeditationTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    templateId: "",
    scheduledTime: "",
    isActive: true
  });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

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
      isActive: true
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

  const handleScheduleInputChange = (field: string, value: string | boolean) => {
    setScheduleForm(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const scheduleData = {
      ...scheduleForm,
      templateId: parseInt(scheduleForm.templateId),
    };

    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data: scheduleData });
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      date: schedule.date,
      templateId: schedule.templateId?.toString() || "",
      scheduledTime: schedule.scheduledTime,
      isActive: schedule.isActive || true
    });
    setIsScheduleModalOpen(true);
  };

  const handleDeleteSchedule = (id: number) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const filteredTemplates = templates?.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.instructor.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 mb-2">Admin Dashboard</h1>
        <p className="text-neutral-600">Manage meditation templates and schedules</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Total Templates</p>
                    <p className="text-2xl font-bold text-neutral-800">{templates?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Active Schedules</p>
                    <p className="text-2xl font-bold text-neutral-800">
                      {schedules?.filter(s => s.isActive).length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Avg Duration</p>
                    <p className="text-2xl font-bold text-neutral-800">
                      {templates?.length ? Math.round(
                        templates.reduce((sum, t) => sum + t.duration, 0) / templates.length
                      ) : 0} min
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Status</p>
                    <p className="text-2xl font-bold text-green-600">Active</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Activity className="w-6 h-6 text-orange-600" />
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
                        <span className="text-sm font-medium text-neutral-600">{level}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-neutral-600 w-8">{count}</span>
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
                      <p className="text-sm font-medium text-neutral-800">Database connected</p>
                      <p className="text-xs text-neutral-500">System is operational</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800">Templates loaded</p>
                      <p className="text-xs text-neutral-500">{templates?.length || 0} templates available</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800">Schedules active</p>
                      <p className="text-xs text-neutral-500">{schedules?.filter(s => s.isActive).length || 0} active schedules</p>
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
            <h2 className="text-xl font-semibold text-neutral-800">Meditation Templates</h2>
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
                        <span className="text-neutral-500">No thumbnail</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary">
                        {template.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-neutral-800 mb-2">{template.title}</h3>
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{template.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-neutral-500">{template.duration} min</span>
                        <span className="text-neutral-500">{template.instructor}</span>
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
            <h2 className="text-xl font-semibold text-neutral-800">Schedule Management</h2>
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
                <CardTitle>Upcoming Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedules?.length === 0 ? (
                    <p className="text-center text-neutral-500 py-8">No schedules found</p>
                  ) : (
                    schedules?.map((schedule) => {
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
                    )})
                  )}
                </div>
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
                <Input placeholder="Search users..." className="pl-10" />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-2">User Management</h3>
                <p className="text-neutral-600">User management features coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
