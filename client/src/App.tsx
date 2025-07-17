import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { RouteGuard } from "@/components/RouteGuard";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";

import AuthPage from "@/pages/auth";
import MeditationPage from "@/pages/meditation";
import AdminPage from "@/pages/admin";
import SettingsPage from "@/pages/settings";
import MoodAnalyticsPage from "@/pages/mood-analytics";
import NotFound from "@/pages/not-found";

function AppContent() {
  const [user, loading] = useAuthState(auth);
  const [onlineCount, setOnlineCount] = useState(0);
  const [location] = useLocation();

  const { data: onlineData } = useQuery<{count: number}>({
    queryKey: ["/api/meditation/online-count", new Date().toISOString().split('T')[0]],
    refetchInterval: 30000,
    enabled: !!user,
  });

  useEffect(() => {
    if (onlineData) {
      setOnlineCount(onlineData.count);
    }
  }, [onlineData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-background">
        {location !== "/auth" && <Navigation onlineCount={onlineCount} />}
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/meditation" component={MeditationPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/mood-analytics" component={MoodAnalyticsPage} />
          <Route path="/" component={MeditationPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </RouteGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
