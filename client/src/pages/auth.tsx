import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "react-firebase-hooks/auth";
import logoImg from "@/assets/logo.png";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [user] = useAuthState(auth);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    remember: false
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const registerUserInBackend = async (user: any) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email: user.email,
        name: user.displayName || formData.name || user.email?.split('@')[0] || "User",
        firebaseUid: user.uid
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend registration error:", errorData);
      } else {
        console.log("User registered successfully in backend");
      }
    } catch (error) {
      console.error("Failed to register user in backend:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out successfully",
        description: "You can now sign in with a different account"
      });
    } catch (error) {
      console.error("Sign out error:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await registerUserInBackend(userCredential.user);
        toast({
          title: "Account created successfully",
          description: "Welcome to Serene Space!"
        });
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast({
          title: "Welcome back",
          description: "You've been signed in successfully"
        });
      }
      setLocation("/meditation");
    } catch (error: any) {
      console.error("Authentication error:", error);
      if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (error.code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (error.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else {
        setError(error.message || "An error occurred during authentication");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection prompt
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const userCredential = await signInWithPopup(auth, provider);
      await registerUserInBackend(userCredential.user);
      
      toast({
        title: "Welcome to Evolving Hearts",
        description: "You've been signed in with Google"
      });
      setLocation("/meditation");
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.code === "auth/invalid-credential") {
        setError("Firebase authentication is not properly configured. Please check your Firebase project settings.");
      } else if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else {
        setError(error.message || "Failed to sign in with Google");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address first");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, formData.email);
      setResetEmailSent(true);
      toast({
        title: "Password reset email sent",
        description: "Check your email for password reset instructions"
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address");
      } else {
        setError("Failed to send password reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-40 h-40 mx-auto mb-4 flex items-center justify-center">
            <img 
              src={logoImg} 
              alt="Evolving Hearts Logo" 
              className="w-40 h-40 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-neutral-800">
            Welcome to Evolving Hearts
          </CardTitle>
          <p className="text-neutral-600">Join our meditation community</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Already Signed In Notice */}
          {user && (
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  You're signed in as <strong>{user.displayName || user.email}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="ml-2"
                >
                  Sign Out
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Auth Toggle */}
          <div className="bg-neutral-100 p-1 rounded-lg flex">
            <Button
              variant={!isSignUp ? "default" : "ghost"}
              onClick={() => setIsSignUp(false)}
              className="flex-1 text-sm"
            >
              Sign In
            </Button>
            <Button
              variant={isSignUp ? "default" : "ghost"}
              onClick={() => setIsSignUp(true)}
              className="flex-1 text-sm"
            >
              Sign Up
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onFocus={() => setError("")}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {isSignUp && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.remember}
                  onCheckedChange={(checked) => handleInputChange("remember", checked)}
                />
                <Label htmlFor="remember" className="text-sm">
                  Remember me
                </Label>
              </div>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          {/* Social Auth */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
