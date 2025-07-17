import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Upload, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProfilePicture } from "@shared/schema";

export function ProfilePictureManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingPicture, setEditingPicture] = useState<ProfilePicture | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    imageData: "",
    isActive: true
  });

  // Fetch all profile pictures
  const { data: pictures, isLoading } = useQuery<ProfilePicture[]>({
    queryKey: ["/api/admin/profile-pictures"]
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/profile-pictures", data);
      if (!response.ok) {
        throw new Error("Failed to create profile picture");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile-pictures"] });
      setIsUploadModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Profile picture uploaded successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/admin/profile-pictures/${id}`, data);
      if (!response.ok) {
        throw new Error("Failed to update profile picture");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile-pictures"] });
      setEditingPicture(null);
      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/profile-pictures/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete profile picture");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile-pictures"] });
      toast({
        title: "Success",
        description: "Profile picture deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setUploadForm({
      name: "",
      imageData: "",
      isActive: true
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm({
          ...uploadForm,
          imageData: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name || !uploadForm.imageData) {
      toast({
        title: "Error",
        description: "Please provide a name and select an image",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(uploadForm);
  };

  const handleToggleActive = (picture: ProfilePicture) => {
    updateMutation.mutate({
      id: picture.id,
      data: { isActive: !picture.isActive }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this profile picture?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Profile Pictures ({pictures?.length || 0})</CardTitle>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New Picture
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pictures?.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
              <p className="text-neutral-600 mb-4">No profile pictures uploaded yet</p>
              <Button onClick={() => setIsUploadModalOpen(true)}>
                Upload First Picture
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {pictures?.map((picture) => (
                <div key={picture.id} className="relative group">
                  <div className="aspect-square rounded-full overflow-hidden border-2 border-neutral-200">
                    <img
                      src={picture.imageData}
                      alt={picture.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:text-white"
                        onClick={() => handleToggleActive(picture)}
                      >
                        {picture.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:text-white"
                        onClick={() => handleDelete(picture.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium truncate">{picture.name}</p>
                    <Badge 
                      variant={picture.isActive ? "default" : "secondary"}
                      className="text-xs mt-1"
                    >
                      {picture.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Picture Name</Label>
              <Input
                id="name"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="e.g., Sunset Avatar"
                required
              />
            </div>

            <div>
              <Label htmlFor="image">Image File</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>

            {uploadForm.imageData && (
              <div className="mt-4">
                <Label>Preview (Circular Crop)</Label>
                <div className="mt-2 flex justify-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-neutral-200">
                    <img
                      src={uploadForm.imageData}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-sm text-neutral-600 text-center mt-2">
                  This is how the image will appear to users
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Upload
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}