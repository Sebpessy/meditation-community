import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loading } from "@/components/ui/loading";
import { Camera, Save, User, Crop as CropIcon, Shuffle } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { updateUserSchema } from "@shared/schema";
import { z } from "zod";
import { ProfilePicture } from "@shared/schema";

type UpdateUserData = z.infer<typeof updateUserSchema>;

export default function SettingsPage() {
  const [user] = useAuthState(auth);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profilePicture: ""
  });

  // First-time user setup state
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [selectedPictureId, setSelectedPictureId] = useState<number | null>(null);
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);

  // Image cropping state - force round crop
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
    aspect: 1 // Force square/round crop
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Fetch current user data
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["/api/auth/user", user?.uid],
    enabled: !!user?.uid,
  });

  // Fetch available profile pictures
  const { data: profilePictures } = useQuery<ProfilePicture[]>({
    queryKey: ["/api/profile-pictures"],
    enabled: true,
  });

  // Update form data when user data is loaded
  useEffect(() => {
    if (currentUser) {
      const hasProfilePicture = currentUser.profilePicture && currentUser.profilePicture.trim() !== "";
      
      // Check if this is a first-time user (no profile picture)
      if (!hasProfilePicture) {
        setIsFirstTimeUser(true);
        // Select a random default picture if available
        if (profilePictures && profilePictures.length > 0) {
          const randomPicture = profilePictures[Math.floor(Math.random() * profilePictures.length)];
          setSelectedPictureId(randomPicture.id);
          setFormData({
            name: currentUser.name || "",
            email: currentUser.email || "",
            profilePicture: randomPicture.url
          });
        }
      } else {
        setIsFirstTimeUser(false);
        setFormData({
          name: currentUser.name || "",
          email: currentUser.email || "",
          profilePicture: currentUser.profilePicture || ""
        });
      }
    }
  }, [currentUser, profilePictures]);

  // Function to handle avatar selection
  const handleAvatarSelection = (picture: ProfilePicture) => {
    setSelectedPictureId(picture.id);
    setFormData(prev => ({ ...prev, profilePicture: picture.url }));
  };

  // Function to generate new random avatar
  const generateRandomAvatar = () => {
    if (profilePictures && profilePictures.length > 0) {
      const randomPicture = profilePictures[Math.floor(Math.random() * profilePictures.length)];
      handleAvatarSelection(randomPicture);
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: async (userData: UpdateUserData) => {
      return apiRequest("PUT", `/api/user/profile`, {
        ...userData,
        firebaseUid: user?.uid
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsFirstTimeUser(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle profile picture upload
  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert to base64 for simple storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImageToCrop(base64);
        setIsCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(crop.width / 2, crop.height / 2, crop.width / 2, 0, 2 * Math.PI);
    ctx.clip();

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        }
      }, 'image/jpeg', 0.8);
    });
  };

  const handleCropComplete = async () => {
    if (completedCrop && imgRef.current) {
      try {
        const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop);
        setFormData(prev => ({
          ...prev,
          profilePicture: croppedImageUrl
        }));
        setIsCropDialogOpen(false);
        setImageToCrop(null);
      } catch (error) {
        console.error('Error cropping image:', error);
        toast({
          title: "Error",
          description: "Failed to crop image. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = updateUserSchema.parse(formData);
      updateUserMutation.mutate(validatedData);
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800">
          {isFirstTimeUser ? "Welcome! Complete Your Profile" : "Settings"}
        </h1>
        <p className="text-neutral-600 mt-2">
          {isFirstTimeUser 
            ? "Please choose a profile picture to continue. You can upload your own or select from our collection."
            : "Manage your account settings and preferences"
          }
        </p>
      </div>

      {isFirstTimeUser && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-blue-700">
              <User className="w-5 h-5" />
              <p className="text-sm">
                You must select a profile picture before accessing the app. Choose one from our collection or upload your own.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="space-y-4">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={formData.profilePicture} alt="Profile" />
                  <AvatarFallback className="text-lg">
                    {formData.name.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAvatarSelection(true)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Choose Avatar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateRandomAvatar}
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Random
                  </Button>
                  <p className="text-xs text-neutral-500">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                required
              />
              <p className="text-xs text-neutral-500">
                This will be used for notifications and account recovery
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                className="flex items-center gap-2"
              >
                {updateUserMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isFirstTimeUser ? "Complete Setup" : "Save Changes"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Additional Settings Cards */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Account Status</p>
                <p className="text-sm text-neutral-600">Your account is active</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Member Since</p>
                <p className="text-sm text-neutral-600">
                  {currentUser?.createdAt 
                    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : "N/A"
                  }
                </p>
              </div>
            </div>

            {currentUser?.isAdmin && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Role</p>
                  <p className="text-sm text-neutral-600">Administrator</p>
                </div>
                <div className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                  Admin
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Cropping Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="w-5 h-5" />
              Crop Profile Picture
            </DialogTitle>
          </DialogHeader>
          {imageToCrop && (
            <div className="space-y-4">
              <div className="relative">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={imageToCrop}
                    alt="Crop"
                    className="max-w-full max-h-96 object-contain"
                  />
                </ReactCrop>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCropDialogOpen(false);
                    setImageToCrop(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCropComplete}>
                  <CropIcon className="w-4 h-4 mr-2" />
                  Apply Crop
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Avatar Selection Dialog */}
      <Dialog open={showAvatarSelection} onOpenChange={setShowAvatarSelection}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Choose Your Avatar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 max-h-96 overflow-y-auto p-2">
              {profilePictures?.map((picture) => (
                <button
                  key={picture.id}
                  type="button"
                  onClick={() => {
                    handleAvatarSelection(picture);
                    setShowAvatarSelection(false);
                  }}
                  className={`relative group overflow-hidden rounded-full border-2 transition-all hover:scale-110 ${
                    selectedPictureId === picture.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={picture.url}
                    alt={picture.name}
                    className="w-16 h-16 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={generateRandomAvatar}
                className="flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Random Pick
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAvatarSelection(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}