import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Eye,
  TrendingUp,
  Heart,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  Instagram,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export function InstagramAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["instagram-insights"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-insights");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  if (error) {
    const errorMessage = (error as Error).message;
    // Hide silently for "not connected" or token issues — user hasn't set up Instagram
    if (
      errorMessage.includes("not connected") ||
      errorMessage.includes("token") ||
      errorMessage.includes("OAuth") ||
      errorMessage.includes("No Instagram")
    ) {
      return null;
    }
    // For other errors, show a subtle inline notice — not a full destructive alert
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg border border-border bg-muted/30">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Instagram analytics unavailable — {errorMessage}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data?.summary) return null;

  const { summary, account, historicalData, topPosts } = data;

  const chartData = historicalData
    ?.slice()
    .reverse()
    .map((d: any) => ({
      date: format(new Date(d.snapshot_date), "MMM d"),
      followers: d.followers_count,
      reach: d.reach,
      impressions: d.impressions,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
          <Instagram className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Instagram Analytics</h3>
          {account?.username && (
            <p className="text-sm text-muted-foreground">@{account.username}</p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">Followers</span>
          </div>
          <p className="text-2xl font-bold">{summary.followers.toLocaleString()}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm">Posts</span>
          </div>
          <p className="text-2xl font-bold">{summary.posts.toLocaleString()}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Heart className="h-4 w-4" />
            <span className="text-sm">Total Likes</span>
          </div>
          <p className="text-2xl font-bold">{summary.totalLikes.toLocaleString()}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Avg. Engagement</span>
          </div>
          <p className="text-2xl font-bold">{summary.avgEngagement}</p>
        </Card>
      </div>

      {/* Growth Chart */}
      {chartData && chartData.length > 1 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Follower Growth</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="followers"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Top Posts */}
      {topPosts && topPosts.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Top Performing Posts</h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topPosts.slice(0, 6).map((post: any) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                  {post.media_url || post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url || post.media_url}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Instagram className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-1">
                      <Heart className="h-5 w-5" />
                      <span>{post.like_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-5 w-5" />
                      <span>{post.comments_count || 0}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
