import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid3X3, Image as ImageIcon, Clock, GripVertical, Instagram } from "lucide-react";

interface ScheduledPost {
  id: string;
  caption: string;
  images: string[];
  scheduled_at: string;
  status: string;
  platform: string;
}

interface GridPreviewProps {
  accounts?: { id: string; username: string | null; platform: string }[];
}

export function GridPreview({ accounts = [] }: GridPreviewProps) {
  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const { data: posts = [] } = useQuery({
    queryKey: ["grid-preview-posts", filterAccountId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("id, caption, images, scheduled_at, status, platform")
        .eq("user_id", user.id)
        .in("status", ["pending", "scheduled"])
        .order("scheduled_at", { ascending: true })
        .limit(12);
      
      if (error) throw error;
      return (data || []) as ScheduledPost[];
    },
  });

  // Apply custom ordering if user has reordered
  const displayPosts = orderedIds.length > 0
    ? orderedIds.map(id => posts.find(p => p.id === id)).filter(Boolean) as ScheduledPost[]
    : posts;

  // Fill grid to 9 slots
  const gridSlots: (ScheduledPost | null)[] = [...displayPosts.slice(0, 9)];
  while (gridSlots.length < 9) gridSlots.push(null);

  const handleDragStart = (index: number) => setDragIndex(index);
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const currentOrder = orderedIds.length > 0 
      ? [...orderedIds] 
      : displayPosts.map(p => p.id);
    
    // Pad with empty slots
    while (currentOrder.length < 9) currentOrder.push(`empty-${currentOrder.length}`);
    
    const [moved] = currentOrder.splice(dragIndex, 1);
    currentOrder.splice(index, 0, moved);
    setOrderedIds(currentOrder.filter(id => !id.startsWith("empty-")));
    setDragIndex(null);
  };

  const instagramAccounts = accounts.filter(a => a.platform === 'instagram');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Grid Preview
          </CardTitle>
          {instagramAccounts.length > 1 && (
            <Select value={filterAccountId} onValueChange={setFilterAccountId}>
              <SelectTrigger className="w-40 h-7 text-xs">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {instagramAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.username ? `@${acc.username}` : 'Instagram'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag to reorder — see how your next posts will look on your feed
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden border border-border">
          {gridSlots.map((post, i) => (
            <div
              key={post?.id || `empty-${i}`}
              className={`aspect-square relative bg-muted/50 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                dragIndex === i ? 'opacity-50 scale-95' : ''
              }`}
              draggable={!!post}
              onDragStart={() => post && handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
            >
              {post ? (
                <>
                  {post.images?.[0] ? (
                    <img
                      src={post.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center p-2">
                      <p className="text-[10px] text-muted-foreground text-center line-clamp-4 leading-tight">
                        {post.caption?.slice(0, 60)}
                      </p>
                    </div>
                  )}
                  <div className="absolute top-0.5 left-0.5">
                    <GripVertical className="h-3 w-3 text-white/70 drop-shadow" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1">
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-background/80">
                      <Clock className="h-2 w-2 mr-0.5" />
                      {new Date(post.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Badge>
                  </div>
                  {post.images && post.images.length > 1 && (
                    <div className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded">
                      +{post.images.length - 1}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground/30">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {posts.length} upcoming post{posts.length !== 1 ? "s" : ""} · {Math.max(0, 9 - posts.length)} empty slot{9 - posts.length !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
