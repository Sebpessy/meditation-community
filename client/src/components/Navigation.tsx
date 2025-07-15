import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { apiRequest } from "@/lib/queryClient";

interface NavigationProps {
  onlineCount: number;
}

export function Navigation({ onlineCount }: NavigationProps) {
  const [location] = useLocation();
  const [user] = useAuthState(auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backendUser, setBackendUser] = useState<{ name: string; email: string } | null>(null);

  // Fetch backend user info
  useEffect(() => {
    const fetchUser = async () => {
      if (user?.uid) {
        try {
          const response = await apiRequest("GET", `/api/auth/user/${user.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setBackendUser({ name: userData.name, email: userData.email });
          } else if (response.status === 404) {
            // User doesn't exist in backend, register them
            const registerResponse = await apiRequest("POST", "/api/auth/register", {
              email: user.email,
              name: user.displayName || user.email?.split('@')[0] || "User",
              firebaseUid: user.uid
            });
            if (registerResponse.ok) {
              const userData = await registerResponse.json();
              setBackendUser({ name: userData.name, email: userData.email });
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
    <nav className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-neutral-800">Evolving Hearts</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/meditation">
              <span className={`font-medium transition-colors cursor-pointer ${
                isActive("/meditation") 
                  ? "text-primary border-b-2 border-primary pb-1" 
                  : "text-neutral-600 hover:text-neutral-800"
              }`}>
                Meditation
              </span>
            </Link>
            <Link href="/community">
              <span className={`font-medium transition-colors cursor-pointer ${
                isActive("/community") 
                  ? "text-primary border-b-2 border-primary pb-1" 
                  : "text-neutral-600 hover:text-neutral-800"
              }`}>
                Community
              </span>
            </Link>
            {user && (
              <Link href="/admin">
                <span className={`font-medium transition-colors cursor-pointer ${
                  isActive("/admin") 
                    ? "text-primary border-b-2 border-primary pb-1" 
                    : "text-neutral-600 hover:text-neutral-800"
                }`}>
                  Admin
                </span>
              </Link>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Online Count */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-neutral-600">
              <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <span>{onlineCount} online</span>
            </div>

            {/* User Menu or Auth Button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-neutral-700">
                      {backendUser?.name || user.displayName || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
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
          <div className="md:hidden py-4 border-t border-neutral-200">
            <div className="space-y-2">
              <Link href="/meditation">
                <span className="block px-3 py-2 text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-md cursor-pointer">
                  Meditation
                </span>
              </Link>
              <Link href="/community">
                <span className="block px-3 py-2 text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-md cursor-pointer">
                  Community
                </span>
              </Link>
              {user && (
                <Link href="/admin">
                  <span className="block px-3 py-2 text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-md cursor-pointer">
                    Admin
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
