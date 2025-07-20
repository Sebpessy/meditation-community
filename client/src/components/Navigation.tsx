import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { apiRequest } from "@/lib/queryClient";
import logoImg from "@/assets/logo.png";
import { MoodTrackerIcon } from "./MoodTrackerIcon";

function getCSTDate(): string {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  return cstTime.toISOString().split('T')[0];
}

interface NavigationProps {
  onlineCount: number;
}

export function Navigation({ onlineCount }: NavigationProps) {
  const [location] = useLocation();
  const [user] = useAuthState(auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backendUser, setBackendUser] = useState<{ name: string; email: string; isAdmin: boolean; isGardenAngel: boolean; profilePicture?: string } | null>(null);

  // Fetch backend user info
  useEffect(() => {
    const fetchUser = async () => {
      if (user?.uid) {
        try {
          const response = await apiRequest("GET", `/api/auth/user/${user.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setBackendUser({ name: userData.name, email: userData.email, isAdmin: userData.isAdmin, isGardenAngel: userData.isGardenAngel, profilePicture: userData.profilePicture });
          } else if (response.status === 403) {
            // User is banned or IP is blocked
            const errorData = await response.json();
            console.log("User access denied:", errorData);
            // Force logout and redirect to auth
            await signOut(auth);
            alert(`Access denied: ${errorData.reason}`);
            window.location.href = '/auth';
          } else if (response.status === 404) {
            // User doesn't exist in backend, register them
            const registerResponse = await apiRequest("POST", "/api/auth/register", {
              email: user.email,
              name: user.displayName || user.email?.split('@')[0] || "User",
              firebaseUid: user.uid
            });
            if (registerResponse.ok) {
              const userData = await registerResponse.json();
              setBackendUser({ name: userData.name, email: userData.email, isAdmin: userData.isAdmin, isGardenAngel: userData.isGardenAngel, profilePicture: userData.profilePicture });
            }
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
        }
      } else {
        setBackendUser(null);
      }
    };

    fetchUser();
  }, [user]);

  // Check if user needs to complete profile setup
  const isFirstTimeUser = backendUser && (!backendUser.profilePicture || backendUser.profilePicture.trim() === "");

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setBackendUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="bg-white dark:bg-[var(--nav-background)] shadow-sm border-b border-neutral-200 dark:border-[var(--nav-border)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-24">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src={logoImg} 
              alt="Evolving Hearts Logo" 
              className="w-12 h-12 md:w-20 md:h-20 object-contain"
            />
            <h1 className="text-lg md:text-xl font-semibold text-neutral-800 dark:text-[var(--text-high-contrast)]">Evolving Hearts</h1>
            <div className="ml-4">
              <MoodTrackerIcon sessionDate={getCSTDate()} />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {!isFirstTimeUser && (
              <Link href="/meditation">
                <span className={`font-medium transition-colors cursor-pointer ${
                  isActive("/meditation") 
                    ? "text-primary border-b-2 border-primary pb-1" 
                    : "text-neutral-600 dark:text-[var(--text-medium-contrast)] hover:text-neutral-800 dark:hover:text-[var(--text-high-contrast)]"
                }`}>
                  Meditation
                </span>
              </Link>
            )}

            {user && !isFirstTimeUser && (
              <Link href="/mood-analytics">
                <span className={`font-medium transition-colors cursor-pointer ${
                  isActive("/mood-analytics") 
                    ? "text-primary border-b-2 border-primary pb-1" 
                    : "text-neutral-600 dark:text-[var(--text-medium-contrast)] hover:text-neutral-800 dark:hover:text-[var(--text-high-contrast)]"
                }`}>
                  Mood Tracker
                </span>
              </Link>
            )}

            {user && backendUser?.isAdmin && !isFirstTimeUser && (
              <Link href="/admin">
                <span className={`font-medium transition-colors cursor-pointer ${
                  isActive("/admin") 
                    ? "text-primary border-b-2 border-primary pb-1" 
                    : "text-neutral-600 dark:text-[var(--text-medium-contrast)] hover:text-neutral-800 dark:hover:text-[var(--text-high-contrast)]"
                }`}>
                  Admin
                </span>
              </Link>
            )}

            {user && backendUser?.isGardenAngel && !isFirstTimeUser && (
              <Link href="/garden-angel">
                <span className={`font-medium transition-colors cursor-pointer ${
                  isActive("/garden-angel") 
                    ? "text-primary border-b-2 border-primary pb-1" 
                    : "text-neutral-600 dark:text-[var(--text-medium-contrast)] hover:text-neutral-800 dark:hover:text-[var(--text-high-contrast)]"
                }`}>
                  Gardien Angel
                </span>
              </Link>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Online Count */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-neutral-600 dark:text-white">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">{onlineCount} online</span>
            </div>

            {/* User Menu or Auth Button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={backendUser?.profilePicture || ""} alt="Profile" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {backendUser?.name?.charAt(0)?.toUpperCase() || user.displayName?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)]">
                      {backendUser?.name || user.displayName || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button size="sm">Sign In</Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200 dark:border-[var(--nav-border)]">
            <div className="space-y-2">
              {!isFirstTimeUser && (
                <Link href="/meditation">
                  <span 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)] hover:text-neutral-900 dark:hover:text-[var(--text-high-contrast)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] rounded-md cursor-pointer"
                  >
                    Meditation
                  </span>
                </Link>
              )}

              {user && !isFirstTimeUser && (
                <Link href="/mood-analytics">
                  <span 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)] hover:text-neutral-900 dark:hover:text-[var(--text-high-contrast)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] rounded-md cursor-pointer"
                  >
                    Mood Tracker
                  </span>
                </Link>
              )}

              {user && backendUser?.isAdmin && !isFirstTimeUser && (
                <Link href="/admin">
                  <span 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)] hover:text-neutral-900 dark:hover:text-[var(--text-high-contrast)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] rounded-md cursor-pointer"
                  >
                    Admin
                  </span>
                </Link>
              )}

              {user && backendUser?.isGardenAngel && !isFirstTimeUser && (
                <Link href="/garden-angel">
                  <span 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)] hover:text-neutral-900 dark:hover:text-[var(--text-high-contrast)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] rounded-md cursor-pointer"
                  >
                    Gardien Angel
                  </span>
                </Link>
              )}

              {user && (
                <Link href="/settings">
                  <span 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-neutral-700 dark:text-[var(--text-medium-contrast)] hover:text-neutral-900 dark:hover:text-[var(--text-high-contrast)] hover:bg-neutral-50 dark:hover:bg-[var(--muted)] rounded-md cursor-pointer"
                  >
                    Settings
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
