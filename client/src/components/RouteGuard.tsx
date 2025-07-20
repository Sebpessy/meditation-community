import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const [user, loading, error] = useAuthState(auth);
  const [location, setLocation] = useLocation();

  // Fetch user data from backend
  const { data: backendUser, isLoading: userLoading } = useQuery({
    queryKey: ["user", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      
      const response = await apiRequest("GET", `/api/auth/user/${user.uid}`);
      if (!response.ok) {
        if (response.status === 404) {
          // User doesn't exist, register them
          const registerResponse = await apiRequest("POST", "/api/auth/register", {
            email: user.email,
            name: user.displayName || user.email?.split('@')[0] || "User",
            firebaseUid: user.uid
          });
          if (registerResponse.ok) {
            return registerResponse.json();
          }
        }
        return null;
      }
      return response.json();
    },
    enabled: !!user?.uid,
  });

  // Check if user needs to complete profile setup
  const isFirstTimeUser = backendUser && !backendUser.profileCompleted;

  // Redirect first-time users to settings page
  useEffect(() => {
    if (user && !loading && !userLoading && isFirstTimeUser && location !== "/settings") {
      setLocation("/settings");
    }
  }, [user, loading, userLoading, isFirstTimeUser, location, setLocation]);

  // Show loading while auth and user data are loading
  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // Show error if auth failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Authentication error. Please try again.</div>
      </div>
    );
  }

  // If not logged in, show children (auth page will handle this)
  if (!user) {
    return <>{children}</>;
  }

  // If first-time user and not on settings page, show loading (redirect is happening)
  if (isFirstTimeUser && location !== "/settings") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // Allow access to settings page for first-time users
  if (isFirstTimeUser && location === "/settings") {
    return <>{children}</>;
  }

  // Allow access to all pages for users who have completed their profile
  if (!isFirstTimeUser) {
    // Check for role-based access
    if (location === "/admin" && !backendUser?.isAdmin) {
      setLocation("/");
      return <>{children}</>;
    }
    
    if (location === "/garden-angel" && !backendUser?.isGardenAngel && !backendUser?.isAdmin) {
      setLocation("/");
      return <>{children}</>;
    }
    
    return <>{children}</>;
  }

  // Default case - show loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading size="lg" />
    </div>
  );
}