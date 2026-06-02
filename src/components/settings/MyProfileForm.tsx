import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Loader2, Upload, X } from "lucide-react";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  timezone?: string;
}

export function MyProfileForm() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const { register, handleSubmit, setValue, watch } = useForm<ProfileData>();
  const firstName = watch("first_name") || "";
  const lastName = watch("last_name") || "";

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setValue("first_name", profile.first_name || "");
        setValue("last_name", profile.last_name || "");
        setValue("email", profile.email || user.email || "");
        setValue("phone", profile.phone || "");
        setValue("timezone", profile.timezone || "");
        setAvatarUrl(profile.avatar_url || "");
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Wrong file type", description: "Pick a PNG or JPG image.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Too large", description: "Image must be under 2MB.", variant: "destructive" });
      return;
    }

    // Validate dimensions ≥320×320
    const dimsOk = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width >= 320 && img.height >= 320);
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
    if (!dimsOk) {
      toast({ title: "Image too small", description: "Use at least 320 × 320 px.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // RLS on storage.objects requires the top-level folder to be a workspace_id
      // the user belongs to. Resolve it before uploading.
      const { data: membership, error: memErr } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (memErr) throw memErr;
      const workspaceId = membership?.workspace_id;
      if (!workspaceId) throw new Error("No workspace found for your account.");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${workspaceId}/avatars/${user.id}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      setAvatarUrl("");
      toast({ title: "Profile picture removed" });
    } catch (err: any) {
      toast({ title: "Couldn't remove", description: err.message, variant: "destructive" });
    }
  };

  const onSubmit = async (data: ProfileData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...data })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Profile updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
          <AvatarFallback className="text-lg">
            {initials || <User className="h-12 w-12" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {avatarUrl ? "Replace picture" : "Upload picture"}
            </Button>
            {avatarUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} disabled={uploading}>
                <X className="h-3.5 w-3.5 mr-1.5" />Remove
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            PNG, JPG up to 2MB. At least 320 × 320 px
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input {...register("first_name")} />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input {...register("last_name")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input type="email" {...register("email")} disabled />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input {...register("phone")} />
        </div>
      </div>

      <div>
        <Label>Password</Label>
        <ChangePasswordDialog />
      </div>

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Input {...register("timezone")} placeholder="America/New_York" />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
