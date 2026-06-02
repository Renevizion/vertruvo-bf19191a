import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  Instagram, 
  Send, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  MessageSquare,
  Upload,
  X,
  Pencil,
  Images,
  Clock,
  Trash2,
  Crop,
  Undo2,
  Plus,
  Hash,
  TrendingUp,
  ListPlus,
  Grid3X3,
  Bell
} from "lucide-react";
import { ImageCropDialog } from "@/components/social/ImageCropDialog";
import { InstagramCommentManager } from "@/components/social/InstagramCommentManager";
import { GridPreview } from "@/components/social/GridPreview";
import { BrandKitSettings } from "@/components/social/BrandKitSettings";
import { ContentTemplates } from "@/components/social/ContentTemplates";
import { ContentRotationPlanner } from "@/components/social/ContentRotationPlanner";
import { SocialTodayStrip } from "@/components/social/SocialTodayStrip";
import { SocialCoachPanel } from "@/components/social/SocialCoachPanel";
import { PostingCoachSettings } from "@/components/social/PostingCoachSettings";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

interface SocialAccount {
  id: string;
  platform: string;
  username: string | null;
  created_at: string;
  expires_at: string | null;
}

interface ScheduledPost {
  id: string;
  platform: string;
  caption: string;
  images: string[];
  scheduled_at: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default function SocialMedia() {
  const [searchParams] = useSearchParams();
  const [caption, setCaption] = useState("");
  const [debouncedCaption, setDebouncedCaption] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [images, setImages] = useState<string[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPosting, setIsPosting] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);
  const [originalImages, setOriginalImages] = useState<Record<number, string>>({});
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coachSettingsOpen, setCoachSettingsOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Batch queue
  interface QueuedPost {
    id: string;
    caption: string;
    images: string[];
    scheduledDate?: Date;
    scheduledTime: string;
  }
  const [postQueue, setPostQueue] = useState<QueuedPost[]>([]);
  const [isBatchPosting, setIsBatchPosting] = useState(false);

  const isTokenExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    const t = new Date(expiresAt).getTime();
    return Number.isFinite(t) ? t <= Date.now() : false;
  };

  const instagramAccounts = connectedAccounts.filter(a => a.platform === 'instagram');
  const tiktokAccounts = connectedAccounts.filter(a => a.platform === 'tiktok');

  const validInstagramAccounts = instagramAccounts.filter(a => !isTokenExpired(a.expires_at));
  const validTiktokAccounts = tiktokAccounts.filter(a => !isTokenExpired(a.expires_at));

  const hasAnyValidAccount = validInstagramAccounts.length > 0 || validTiktokAccounts.length > 0;

  // Auto-select first valid account if none selected or selected was removed
  useEffect(() => {
    const selectedExists = connectedAccounts.some(a => a.id === selectedAccountId);
    if ((!selectedAccountId || !selectedExists) && connectedAccounts.length > 0) {
      const firstValid = connectedAccounts.find(a => !isTokenExpired(a.expires_at));
      if (firstValid) setSelectedAccountId(firstValid.id);
    }
  }, [connectedAccounts, selectedAccountId]);

  const selectedAccount = connectedAccounts.find(a => a.id === selectedAccountId);
  const isSelectedAccountValid = selectedAccount && !isTokenExpired(selectedAccount.expires_at);

  useEffect(() => {
    checkConnections();
    loadScheduledPosts();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).maybeSingle();
      if (ws) setWorkspaceId(ws.id);
    })();

    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    const suggestionId = searchParams.get('suggestion');

    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`);
      window.history.replaceState({}, '', '/social-media');
    }

    if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, '', '/social-media');
    }

    if (suggestionId) {
      (async () => {
        const { data } = await supabase.from('social_post_suggestions').select('*').eq('id', suggestionId).maybeSingle();
        if (data) {
          setCaption(data.caption || '');
          setImages(data.images || []);
          toast.success('Draft loaded — review and post');
        }
      })();
    }
  }, [searchParams]);

  const checkConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accounts, error } = await supabase
        .from('social_media_accounts')
        .select('id, platform, username, created_at, expires_at')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnectedAccounts(accounts || []);
    } catch (error) {
      console.error('Error checking connections:', error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setScheduledPosts(data || []);
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  const handleConnectInstagram = async () => {
    setIsConnecting('instagram');
    try {
      const { data, error } = await supabase.functions.invoke('instagram-oauth', {});
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.oauthUrl) {
        const w = 520, h = 640, l = window.screenX + (window.outerWidth - 520) / 2, t = window.screenY + (window.outerHeight - 640) / 2;
        window.open(data.oauthUrl, 'instagram_oauth', `width=${w},height=${h},left=${l},top=${t},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
      }
    } catch (error: any) {
      console.error('Error connecting Instagram:', error);
      toast.error(error.message || 'Failed to start Instagram connection');
      setIsConnecting(null);
    }
  };

  const handleConnectTikTok = async () => {
    setIsConnecting('tiktok');
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-oauth', {});
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.oauthUrl) {
        const w = 520, h = 640, l = window.screenX + (window.outerWidth - 520) / 2, t = window.screenY + (window.outerHeight - 640) / 2;
        window.open(data.oauthUrl, 'tiktok_oauth', `width=${w},height=${h},left=${l},top=${t},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
      }
    } catch (error: any) {
      console.error('Error connecting TikTok:', error);
      toast.error(error.message || 'Failed to start TikTok connection');
      setIsConnecting(null);
    }
  };

  const handleDisconnectAccount = async (accountId: string, platform: string) => {
    try {
      const { error } = await supabase
        .from('social_media_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      
      toast.success(`Account disconnected`);
      if (selectedAccountId === accountId) setSelectedAccountId("");
      checkConnections();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxImages = 10;
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed for carousel`);
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload image files only');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (selectedImageIndex === index) {
      setSelectedImageIndex(null);
    }
  };

  const openCropDialog = (index: number) => {
    setCropImageIndex(index);
    setCropDialogOpen(true);
  };

  const handleCropComplete = (croppedImageDataUrl: string) => {
    if (cropImageIndex === null) return;
    
    setOriginalImages(prev => {
      if (prev[cropImageIndex] !== undefined) return prev;
      return { ...prev, [cropImageIndex]: images[cropImageIndex] };
    });
    
    setImages(prev => {
      const newImages = [...prev];
      newImages[cropImageIndex] = croppedImageDataUrl;
      return newImages;
    });
    setCropImageIndex(null);
  };

  const undoCrop = (index: number) => {
    const original = originalImages[index];
    if (!original) return;
    
    setImages(prev => {
      const newImages = [...prev];
      newImages[index] = original;
      return newImages;
    });
    
    setOriginalImages(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter an image description");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-image', {
        body: { prompt: imagePrompt }
      });

      if (error) throw error;
      
      if (data.imageUrl) {
        setImages(prev => [...prev, data.imageUrl]);
        toast.success("Image generated successfully!");
        setImagePrompt("");
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = async () => {
    if (selectedImageIndex === null) {
      toast.error("Please select an image to edit");
      return;
    }

    if (!editPrompt.trim()) {
      toast.error("Please describe the edit you want to make");
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-social-image', {
        body: { 
          imageUrl: images[selectedImageIndex],
          editPrompt: editPrompt 
        }
      });

      if (error) throw error;
      
      if (data.imageUrl) {
        setImages(prev => {
          const newImages = [...prev];
          newImages[selectedImageIndex] = data.imageUrl;
          return newImages;
        });
        toast.success("Image edited successfully!");
        setEditPrompt("");
        setSelectedImageIndex(null);
      }
    } catch (error: any) {
      console.error('Error editing image:', error);
      toast.error(error.message || "Failed to edit image");
    } finally {
      setIsEditing(false);
    }
  };

  const handlePost = async () => {
    if (!selectedAccount) {
      toast.error("Please select an account to post to");
      return;
    }

    if (!caption.trim()) {
      toast.error("Please enter a caption");
      return;
    }

    const platform = selectedAccount.platform as 'instagram' | 'tiktok';

    if (platform === 'instagram' && images.length === 0) {
      toast.error("Instagram requires at least one image");
      return;
    }

    let scheduledDateTime: string | undefined;
    if (scheduledDate) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const combined = new Date(scheduledDate);
      combined.setHours(hours, minutes, 0, 0);
      
      if (combined <= new Date()) {
        toast.error("Scheduled time must be in the future");
        return;
      }
      
      scheduledDateTime = combined.toISOString();
    }

    setIsPosting(platform);
    try {
      const { data, error } = await supabase.functions.invoke('post-social-media', {
        body: {
          platform,
          caption,
          images,
          scheduledDate: scheduledDateTime,
          accountId: selectedAccount.id
        }
      });

      if (error) throw new Error(error.message || "Failed to post");
      if (data?.error) throw new Error(data.error);

      if (data?.scheduled) {
        toast.success(data.message || "Post scheduled successfully!");
        loadScheduledPosts();
      } else {
        toast.success(`Posted to ${selectedAccount.username ? '@' + selectedAccount.username : platform} successfully!`);
      }
      
      setCaption("");
      setImages([]);
      setScheduledDate(undefined);
      setScheduledTime("12:00");
    } catch (error: any) {
      console.error('Error posting:', error);
      toast.error(error.message || "Failed to post to social media");
    } finally {
      setIsPosting(null);
    }
  };

  const handleDeleteScheduledPost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      toast.success("Scheduled post deleted");
      loadScheduledPosts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
    }
  };

  const allValidAccounts = connectedAccounts.filter(a => !isTokenExpired(a.expires_at));

  // Batch queue handlers
  const addToQueue = () => {
    if (!caption.trim()) {
      toast.error("Please enter a caption before adding to queue");
      return;
    }
    const queueItem: QueuedPost = {
      id: crypto.randomUUID(),
      caption,
      images: [...images],
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      scheduledTime,
    };
    setPostQueue(prev => [...prev, queueItem]);
    setCaption("");
    setImages([]);
    setScheduledDate(undefined);
    setScheduledTime("12:00");
    toast.success("Post added to queue");
  };

  const removeFromQueue = (id: string) => {
    setPostQueue(prev => prev.filter(p => p.id !== id));
  };

  const handlePostQueue = async () => {
    if (!selectedAccount || postQueue.length === 0) return;
    setIsBatchPosting(true);
    const platform = selectedAccount.platform as 'instagram' | 'tiktok';
    let successCount = 0;
    let failCount = 0;

    for (const post of postQueue) {
      try {
        let scheduledDateTime: string | undefined;
        if (post.scheduledDate) {
          const [hours, minutes] = post.scheduledTime.split(':').map(Number);
          const combined = new Date(post.scheduledDate);
          combined.setHours(hours, minutes, 0, 0);
          scheduledDateTime = combined.toISOString();
        }

        const { data, error } = await supabase.functions.invoke('post-social-media', {
          body: {
            platform,
            caption: post.caption,
            images: post.images,
            scheduledDate: scheduledDateTime,
            accountId: selectedAccount.id
          }
        });

        if (error || data?.error) throw new Error(data?.error || error?.message);
        successCount++;
      } catch (e: any) {
        console.error('Batch post error:', e);
        failCount++;
      }
    }

    setPostQueue([]);
    loadScheduledPosts();
    setIsBatchPosting(false);
    
    if (failCount === 0) {
      toast.success(`All ${successCount} posts processed successfully!`);
    } else {
      toast.error(`${successCount} succeeded, ${failCount} failed`);
    }
  };

  // Debounce caption for hashtag suggestions - only update after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCaption(caption);
    }, 500);
    return () => clearTimeout(timer);
  }, [caption]);

  // Hashtag suggestions based on caption content
  const getHashtagSuggestions = (text: string): string[] => {
    const lower = text.toLowerCase();
    const suggestions: string[] = [];
    
    const hashtagMap: Record<string, string[]> = {
      business: ['#business', '#entrepreneur', '#smallbusiness', '#startup'],
      marketing: ['#marketing', '#digitalmarketing', '#socialmedia', '#branding'],
      sale: ['#sale', '#discount', '#deals', '#shopnow'],
      food: ['#foodie', '#instafood', '#yummy', '#foodphotography'],
      fitness: ['#fitness', '#gym', '#workout', '#health'],
      beauty: ['#beauty', '#skincare', '#makeup', '#selfcare'],
      real: ['#realestate', '#property', '#home', '#realtor'],
      travel: ['#travel', '#wanderlust', '#vacation', '#explore'],
      photo: ['#photography', '#photooftheday', '#instagood', '#picoftheday'],
    };

    for (const [keyword, tags] of Object.entries(hashtagMap)) {
      if (lower.includes(keyword)) {
        suggestions.push(...tags);
      }
    }
    
    if (suggestions.length === 0) {
      return ['#instagood', '#photooftheday', '#love', '#trending'];
    }
    return [...new Set(suggestions)].slice(0, 8);
  };

  const getBestTimeHint = (): string => {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return "Weekends: 10am–1pm tends to get higher engagement";
    return "Weekdays: 11am–1pm and 7pm–9pm are peak engagement windows";
  };

  const lastPostedAt = scheduledPosts.find(p => p.status === 'posted')?.created_at ?? null;
  const pendingScheduled = scheduledPosts.filter(p => p.status === 'pending').length;

  const handleEditSuggestion = (s: { caption: string; images: string[] }) => {
    setCaption(s.caption || '');
    setImages(s.images || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Draft loaded — edit and post when ready');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Social Studio"
        description="Your posting coach watches cadence, drafts ideas, and nudges you when it's time to post."
        actions={
          <Button variant="outline" size="sm" onClick={() => setCoachSettingsOpen(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Coach settings
          </Button>
        }
      />

      <SocialTodayStrip pendingScheduled={pendingScheduled} lastPostedAt={lastPostedAt} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">


      <Tabs defaultValue="create" className="w-full">
        <TabsList>
          <TabsTrigger value="create">Create Post</TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Scheduled
            {scheduledPosts.filter(p => p.status === 'pending').length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                {scheduledPosts.filter(p => p.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="curation" className="flex items-center gap-1.5">
            <Grid3X3 className="h-3.5 w-3.5" />
            Curation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {!isCheckingConnection && !hasAnyValidAccount && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No social media accounts connected. Go to the <strong>Accounts</strong> tab to connect Instagram or TikTok.
              </AlertDescription>
            </Alert>
          )}

          {/* Account Selector */}
          {allValidAccounts.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Post to:</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {allValidAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          {account.platform === 'instagram' ? (
                            <Instagram className="w-4 h-4 text-pink-500" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span>
                            {account.username ? `@${account.username}` : account.platform}
                          </span>
                          <span className="text-muted-foreground text-xs capitalize">({account.platform})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Image Section */}
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Images className="h-5 w-5" />
                  Images
                  {images.length > 1 && (
                    <span className="text-xs bg-muted px-2 py-1 rounded">Carousel ({images.length})</span>
                  )}
                </h3>

                {/* Upload Section */}
                <div className="space-y-4">
                  <div>
                    <Label>Upload Images</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload up to 10 images for a carousel post
                    </p>
                  </div>

                  {/* AI Generate Section */}
                  <div className="border-t pt-4">
                    <Label>Or Generate with AI</Label>
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="A professional business meeting in modern office..."
                      rows={3}
                      className="mt-2"
                    />
                    <Button 
                      onClick={handleGenerateImage} 
                      disabled={isGenerating}
                      className="w-full mt-2"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {isGenerating ? "Generating..." : "Generate Image"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="space-y-4">
                  <Label>Your Images ({images.length})</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, index) => (
                      <div 
                        key={index} 
                        className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          selectedImageIndex === index ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                        }`}
                        onClick={() => setSelectedImageIndex(selectedImageIndex === index ? null : index)}
                      >
                        <img 
                          src={img} 
                          alt={`Image ${index + 1}`} 
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {originalImages[index] && (
                            <button
                              onClick={(e) => { e.stopPropagation(); undoCrop(index); }}
                              className="p-1 bg-secondary text-secondary-foreground rounded-full"
                              title="Undo crop"
                            >
                              <Undo2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); openCropDialog(index); }}
                            className="p-1 bg-primary text-primary-foreground rounded-full"
                            title="Crop for Instagram"
                          >
                            <Crop className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="p-1 bg-destructive text-destructive-foreground rounded-full"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 flex gap-1">
                          <span className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                            {index + 1}
                          </span>
                          {originalImages[index] && (
                            <span className="bg-primary/80 text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                              Cropped
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Edit Selected Image */}
                  {selectedImageIndex !== null && (
                    <div className="border-t pt-4 space-y-2">
                      <Label className="flex items-center gap-2">
                        <Pencil className="w-4 h-4" />
                        Edit Image {selectedImageIndex + 1}
                      </Label>
                      <Textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Add a sunset in the background, remove the logo, make it brighter..."
                        rows={2}
                      />
                      <Button 
                        onClick={handleEditImage}
                        disabled={isEditing}
                        size="sm"
                        className="w-full"
                      >
                        {isEditing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Pencil className="w-4 h-4 mr-2" />
                        )}
                        {isEditing ? "Editing..." : "Apply Edit"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Post Details Section */}
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Post Details</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Caption</Label>
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write your caption here..."
                      rows={6}
                    />
                    {caption.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{caption.length}/2,200 characters</p>
                    )}
                  </div>

                  {/* Hashtag Suggestions */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Hash className="w-3.5 h-3.5" />
                      Suggested Hashtags
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {getHashtagSuggestions(debouncedCaption).map(tag => (
                        <button
                          key={tag}
                          onClick={() => setCaption(prev => prev + ' ' + tag)}
                          className="text-xs px-2 py-1 rounded-full border border-border bg-muted hover:bg-accent transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {debouncedCaption.trim().length < 2 
                        ? "Tap any hashtag to add it. Type a caption for topic-specific suggestions." 
                        : "Tap to add to your caption"}
                    </p>
                  </div>

                  {/* Best Time to Post */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{getBestTimeHint()}</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Schedule Post (Optional)</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    {scheduledDate && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setScheduledDate(undefined); setScheduledTime("12:00"); }}
                      >
                        <X className="w-3 h-3 mr-1" /> Clear schedule
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button 
                      onClick={handlePost}
                      disabled={!isSelectedAccountValid || isCheckingConnection || isPosting !== null}
                      className="w-full"
                    >
                      {isPosting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : selectedAccount?.platform === 'instagram' ? (
                        <Instagram className="w-4 h-4 mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {scheduledDate ? 'Schedule' : 'Post'} 
                      {selectedAccount?.username ? ` to @${selectedAccount.username}` : selectedAccount ? ` to ${selectedAccount.platform}` : ''}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={addToQueue}
                      disabled={!caption.trim()}
                      className="w-full"
                    >
                      <ListPlus className="w-4 h-4 mr-2" />
                      Add to Batch Queue
                      {postQueue.length > 0 && (
                        <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                          {postQueue.length}
                        </span>
                      )}
                    </Button>
                    {!isCheckingConnection && !hasAnyValidAccount && (
                      <p className="text-xs text-muted-foreground">
                        Connect accounts in Accounts tab to enable posting
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Batch Queue - Always Visible */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <ListPlus className="w-4 h-4" />
                    Batch Queue ({postQueue.length})
                  </Label>
                  {postQueue.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handlePostQueue}
                      disabled={!isSelectedAccountValid || isBatchPosting}
                    >
                      {isBatchPosting ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {isBatchPosting ? 'Posting...' : 'Post All'}
                    </Button>
                  )}
                </div>
                {postQueue.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    <ListPlus className="w-5 h-5 mx-auto mb-1.5 opacity-50" />
                    Add posts above to batch-send them all at once
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {postQueue.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 p-2 rounded border border-border bg-muted/30 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{item.caption}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.images.length} image{item.images.length !== 1 ? 's' : ''}
                            {item.scheduledDate ? ` • ${format(item.scheduledDate, "PPP")} ${item.scheduledTime}` : ' • Post now'}
                          </p>
                        </div>
                        <button onClick={() => removeFromQueue(item.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          {isLoadingScheduled ? (
            <Card className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading scheduled posts...</p>
            </Card>
          ) : scheduledPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Scheduled Posts</h3>
              <p className="text-muted-foreground">Your scheduled posts will appear here</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {scheduledPosts.map((post) => (
                <Card key={post.id} className="p-4">
                  <div className="flex gap-4">
                    {post.images.length > 0 && (
                      <div className="flex-shrink-0">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                          <img 
                            src={post.images[0]} 
                            alt="Post preview" 
                            className="w-full h-full object-cover"
                          />
                          {post.images.length > 1 && (
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                              +{post.images.length - 1}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.platform === 'instagram' ? (
                          <Instagram className="w-4 h-4 text-pink-500" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span className="font-medium capitalize">{post.platform}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          post.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          post.status === 'posted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          post.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {post.caption}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(post.scheduled_at), "PPp")}
                        </div>
                        {post.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteScheduledPost(post.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      {post.error_message && (
                        <p className="text-xs text-destructive mt-1">{post.error_message}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {/* Account filter for comments */}
          {validInstagramAccounts.length > 0 ? (
            <>
              {validInstagramAccounts.length > 1 && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium whitespace-nowrap">Viewing comments for:</Label>
                    <Select 
                      value={selectedAccountId} 
                      onValueChange={setSelectedAccountId}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {validInstagramAccounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              <Instagram className="w-4 h-4 text-pink-500" />
                              {account.username ? `@${account.username}` : 'Instagram'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              )}
              <InstagramCommentManager />
            </>
          ) : instagramAccounts.length > 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Reconnect Instagram</h3>
              <p className="text-muted-foreground">
                Your Instagram connection expired. Reconnect it in the Accounts tab to manage comments.
              </p>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Connect Instagram</h3>
              <p className="text-muted-foreground">
                Connect your Instagram account in the Accounts tab to manage comments.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          {/* Connected Accounts List */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Connected Accounts</h3>
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={handleConnectInstagram}
                disabled={isConnecting === 'instagram'}
              >
                {isConnecting === 'instagram' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Instagram
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={handleConnectTikTok}
                disabled={isConnecting === 'tiktok'}
              >
                {isConnecting === 'tiktok' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add TikTok
              </Button>
            </div>
          </div>

          {connectedAccounts.length === 0 ? (
            <Card className="p-12 text-center">
              <Instagram className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Accounts Connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your social media accounts to start posting
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={handleConnectInstagram} disabled={isConnecting === 'instagram'}>
                  {isConnecting === 'instagram' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Instagram className="w-4 h-4 mr-2" />}
                  Connect Instagram
                </Button>
                <Button variant="outline" onClick={handleConnectTikTok} disabled={isConnecting === 'tiktok'}>
                  {isConnecting === 'tiktok' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Connect TikTok
                </Button>
              </div>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-left max-w-md mx-auto">
                <p className="font-medium mb-2">Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Instagram Business or Creator account</li>
                  <li>Connected to a Facebook Page</li>
                  <li>Admin access to the Facebook Page</li>
                </ul>
              </div>
            </Card>
          ) : (
            <div className="grid gap-3">
              {connectedAccounts.map(account => {
                const expired = isTokenExpired(account.expires_at);
                return (
                  <Card key={account.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          account.platform === 'instagram' 
                            ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500' 
                            : 'bg-black'
                        }`}>
                          {account.platform === 'instagram' ? (
                            <Instagram className="w-5 h-5 text-white" />
                          ) : (
                            <Send className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {account.username ? `@${account.username}` : account.platform}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{account.platform}</span>
                          </div>
                          {expired ? (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertCircle className="w-3 h-3" />
                              Needs reconnect
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Connected
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expired && (
                          <Button
                            size="sm"
                            onClick={account.platform === 'instagram' ? handleConnectInstagram : handleConnectTikTok}
                            disabled={isConnecting !== null}
                          >
                            Reconnect
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectAccount(account.id, account.platform)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="curation" className="space-y-4 mt-4">
          <ContentTemplates onPostGenerated={(imageUrl, caption, contentType) => {
            setImages(prev => [...prev, imageUrl]);
            if (caption) setCaption(prev => prev ? prev + "\n\n" + caption : caption);
            // Auto-add to batch queue
            const queueItem = {
              id: crypto.randomUUID(),
              caption: caption || "",
              images: [imageUrl],
              scheduledDate: undefined,
              scheduledTime: "12:00",
            };
            setPostQueue(prev => [...prev, queueItem]);
          }} />
          <div className="grid gap-4 md:grid-cols-2">
            <GridPreview accounts={connectedAccounts.filter(a => !isTokenExpired(a.expires_at)).map(a => ({
              id: a.id,
              username: a.username,
              platform: a.platform,
            }))} />
            <div className="space-y-4">
              <BrandKitSettings />
              <ContentRotationPlanner />
            </div>
          </div>
        </TabsContent>
      </Tabs>
        </div>

        <aside className="lg:col-span-1 min-w-0">
          <div className="lg:sticky lg:top-4">
            <SocialCoachPanel
              onEdit={handleEditSuggestion}
              onOpenSettings={() => setCoachSettingsOpen(true)}
            />
          </div>
        </aside>
      </div>

      <PostingCoachSettings open={coachSettingsOpen} onOpenChange={setCoachSettingsOpen} workspaceId={workspaceId} />

      {cropImageIndex !== null && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={images[cropImageIndex]}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
