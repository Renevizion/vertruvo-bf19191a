import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useErrorToast } from "@/hooks/useErrorToast";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, X } from "lucide-react";

interface BusinessSettings {
  business_name: string;
  logo_url?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  business_email?: string;
  business_phone?: string;
  legal_business_name?: string;
  business_category?: string;
  website?: string;
  default_landing_page?: string;
}

export function BusinessProfileForm() {
  const { toast } = useToast();
  const { showError } = useErrorToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm<BusinessSettings>();

  useEffect(() => {
    loadBusinessSettings();
  }, []);

  const loadBusinessSettings = async () => {
    try {
      // Get user's workspace_id first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[BusinessProfile] No user found');
        return;
      }

      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (workspaceError || !workspace) {
        console.error('[BusinessProfile] Workspace error:', workspaceError);
        return;
      }

      console.log('[BusinessProfile] Loading settings for workspace:', workspace.id);

      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      if (error) {
        console.error('[BusinessProfile] Load error:', error);
        if (error.code !== 'PGRST116') { // Not a "no rows" error
          showError({
            title: "Failed to load business settings",
            description: error.message,
            error,
          });
        }
        return;
      }

      if (data) {
        console.log('[BusinessProfile] Loaded data:', data);
        Object.keys(data).forEach((key) => {
          setValue(key as keyof BusinessSettings, data[key]);
        });
        setLogoUrl(data.logo_url);
      } else {
        console.log('[BusinessProfile] No business settings found for workspace');
      }
    } catch (error) {
      console.error('[BusinessProfile] Unexpected error:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // RLS requires the top-level folder to be a workspace_id the user belongs to.
      const { data: membership, error: memErr } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (memErr) throw memErr;
      const workspaceId = membership?.workspace_id;
      if (!workspaceId) throw new Error("No workspace found for your account.");

      const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${workspaceId}/business-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      setValue('logo_url', publicUrl);

      toast({
        title: "Logo uploaded",
        description: "Your business logo has been uploaded successfully",
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      
      let errorMessage = "Failed to upload logo. ";
      if (error && typeof error === 'object' && 'message' in error) {
        const msg = (error as any).message;
        if (msg.includes('row-level security') || msg.includes('violates')) {
          errorMessage = "Storage upload blocked. The storage bucket needs RLS policies configured.";
        } else {
          errorMessage += msg;
        }
      }
      
      showError({
        title: "Upload failed",
        description: errorMessage,
        error: error instanceof Error ? error : new Error(String(error)),
        errorContext: {
          action: "logo_upload",
          fileName: file.name,
          fileSize: file.size,
        },
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
    setValue('logo_url', undefined);
  };

  const onSubmit = async (data: BusinessSettings) => {
    setIsLoading(true);
    try {
      // Get user's workspace_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!workspace) throw new Error("No workspace found");

      const { data: existing } = await supabase
        .from("business_settings")
        .select("id")
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      const updateData = { ...data, logo_url: logoUrl, workspace_id: workspace.id };

      if (existing) {
        await supabase
          .from("business_settings")
          .update(updateData)
          .eq("id", existing.id);
      } else {
        await supabase.from("business_settings").insert(updateData);
      }

      toast({
        title: "Success",
        description: "Business profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update business profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">General Information</h3>
        
        <div className="grid gap-4">
          <div>
            <Label>Business Logo</Label>
            <Card className="mt-2">
              <CardContent className="p-4">
                {logoUrl ? (
                  <div className="flex items-center gap-4">
                    <img 
                      src={logoUrl} 
                      alt="Business logo" 
                      className="h-20 w-20 object-contain rounded border"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">Current logo</p>
                      <div className="flex gap-2">
                        <Label htmlFor="logo-upload" className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>Change Logo</span>
                          </Button>
                        </Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={removeLogo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded hover:border-primary transition-colors">
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">Upload Business Logo</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                        </>
                      )}
                    </div>
                  </Label>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input {...register("business_name")} placeholder="Enter business name" />
            </div>
            <div>
              <Label htmlFor="legal_business_name">Legal Business Name</Label>
              <Input {...register("legal_business_name")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_email">Business Email</Label>
              <Input type="email" {...register("business_email")} />
            </div>
            <div>
              <Label htmlFor="business_phone">Business Phone</Label>
              <Input {...register("business_phone")} />
            </div>
          </div>

          <div>
            <Label htmlFor="business_category">Business Category</Label>
            <Input {...register("business_category")} />
          </div>

          <div>
            <Label htmlFor="website">Business Website</Label>
            <Input {...register("website")} placeholder="https://example.com" />
          </div>

          <div>
            <Label htmlFor="default_landing_page">Default Landing Page</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Choose which page to show when you log in</p>
            <Select onValueChange={(value) => setValue("default_landing_page", value)} defaultValue="dashboard">
              <SelectTrigger>
                <SelectValue placeholder="Select landing page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="leads">Opportunities</SelectItem>
                <SelectItem value="booking-sheet">Booking Sheet</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="inbox">Inbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Location & Contact Information</h3>
        
        <div>
          <Label htmlFor="street_address">Street Address</Label>
          <Input {...register("street_address")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input {...register("city")} />
          </div>
          <div>
            <Label htmlFor="state_province">State / Prov / Region</Label>
            <Input {...register("state_province")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <Input {...register("country")} />
          </div>
          <div>
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input {...register("postal_code")} />
          </div>
        </div>

        <div>
          <Label htmlFor="timezone">Time Zone</Label>
          <Select onValueChange={(value) => setValue("timezone", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}