import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Gift, AlertTriangle, Search, TrendingUp, Users, DollarSign, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SubscriptionOverride {
  id: string;
  user_id: string;
  granted_tier: string;
  reason: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  user_email?: string;
}

const ITEMS_PER_PAGE = 5;

export function SubscriptionOverridesManager() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState<string>("starter");
  const [newReason, setNewReason] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [signupSearch, setSignupSearch] = useState("");
  const [signupPage, setSignupPage] = useState(0);

  // Fetch all overrides with user emails
  const { data: overrides, isLoading } = useQuery({
    queryKey: ['subscription-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_overrides')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SubscriptionOverride[];
    }
  });

  // Fetch subscription analytics
  const { data: subscriptionStats } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: async () => {
      // Get all workspaces
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, created_at');
      
      // Get all Stripe subscriptions
      const { data: stripeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*');
      
      // Get all overrides
      const { data: allOverrides } = await supabase
        .from('subscription_overrides')
        .select('*')
        .eq('is_active', true);
      
      const tierCounts = {
        starter: 0,
        professional: 0,
        enterprise: 0,
        free: 0
      };

      // Count Stripe subscriptions by status
      const activeStripe = stripeSubscriptions?.filter(s => s.status === 'active' || s.status === 'trialing') || [];
      
      // Count overrides by tier
      allOverrides?.forEach(o => {
        if (o.granted_tier in tierCounts) {
          tierCounts[o.granted_tier as keyof typeof tierCounts]++;
        }
      });

      // Free = total workspaces - active stripe - active overrides
      const totalWorkspaces = workspaces?.length || 0;
      const totalPaid = activeStripe.length + (allOverrides?.length || 0);
      tierCounts.free = Math.max(0, totalWorkspaces - totalPaid);

      return {
        totalWorkspaces,
        totalPaidSubscribers: activeStripe.length,
        totalOverrides: allOverrides?.length || 0,
        tierCounts,
        stripeSubscriptions: activeStripe,
        monthlyRevenue: 0 // Would need Stripe API for real revenue
      };
    }
  });

  // Fetch recent signups (users without subscription overrides, excluding current admin)
  const { data: recentSignups } = useQuery({
    queryKey: ['recent-signups-without-subscription', overrides],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user?.id;
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const overrideUserIds = overrides?.map(o => o.user_id) || [];
      return profiles?.filter(p => 
        p.id !== currentUserId && 
        !overrideUserIds.includes(p.id)
      ) || [];
    },
    enabled: !isLoading
  });

  // Filter signups by search
  const filteredSignups = recentSignups?.filter(user => {
    if (!signupSearch.trim()) return true;
    const searchLower = signupSearch.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    return fullName.includes(searchLower) || (user.email?.toLowerCase() || '').includes(searchLower);
  }) || [];

  // Paginate
  const totalPages = Math.ceil(filteredSignups.length / ITEMS_PER_PAGE);
  const paginatedSignups = filteredSignups.slice(
    signupPage * ITEMS_PER_PAGE, 
    (signupPage + 1) * ITEMS_PER_PAGE
  );

  // Add new override
  const addOverride = useMutation({
    mutationFn: async ({ email, tier, reason, expiresAt }: { 
      email: string; 
      tier: string; 
      reason: string;
      expiresAt: string | null;
    }) => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        throw new Error(`User with email ${email} not found. They must sign up first.`);
      }

      const { data: session } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('subscription_overrides')
        .upsert({
          user_id: profile.id,
          granted_tier: tier,
          reason,
          expires_at: expiresAt,
          granted_by: session.session?.user?.id,
          is_active: true
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['recent-signups-without-subscription'] });
      toast.success('Subscription access granted');
      setNewEmail('');
      setNewReason('');
      setExpiresInDays('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Toggle override active status
  const toggleOverride = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('subscription_overrides')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-overrides'] });
      toast.success('Override updated');
    }
  });

  // Delete override
  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscription_overrides')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-overrides'] });
      toast.success('Override removed');
    }
  });

  const handleAddOverride = () => {
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    const expiresAt = expiresInDays 
      ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    addOverride.mutate({
      email: newEmail.trim().toLowerCase(),
      tier: newTier,
      reason: newReason.trim() || 'Manual grant',
      expiresAt
    });
  };

  const tierColors: Record<string, string> = {
    starter: 'bg-blue-500/10 text-blue-500',
    professional: 'bg-purple-500/10 text-purple-500',
    enterprise: 'bg-amber-500/10 text-amber-500'
  };

  return (
    <div className="space-y-6">
      {/* Subscription Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Total Workspaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionStats?.totalWorkspaces || 0}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-green-500" />
              Paying Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{subscriptionStats?.totalPaidSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">Active Stripe subscriptions</p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-purple-500" />
              Granted Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{subscriptionStats?.totalOverrides || 0}</div>
            <p className="text-xs text-muted-foreground">Partners/beta testers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Free Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionStats?.tierCounts?.free || 0}</div>
            <p className="text-xs text-muted-foreground">No subscription</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tier Distribution (Granted Access)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge className={tierColors.starter}>Starter</Badge>
              <span className="font-medium">{subscriptionStats?.tierCounts?.starter || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={tierColors.professional}>Professional</Badge>
              <span className="font-medium">{subscriptionStats?.tierCounts?.professional || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={tierColors.enterprise}>Enterprise</Badge>
              <span className="font-medium">{subscriptionStats?.tierCounts?.enterprise || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Warning */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Cost Awareness
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>Enterprise</strong>: AI Voice Calling (Twilio) ~$0.013/min</p>
          <p><strong>Professional</strong>: 500 AI queries/mo ~$5-15/mo</p>
          <p><strong>Starter</strong>: Safest for free access - minimal costs</p>
        </CardContent>
      </Card>

      {/* Recent Signups Awaiting Access */}
      {recentSignups && recentSignups.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Recent Signups
            </CardTitle>
            <CardDescription>
              Users who recently signed up - click to grant access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={signupSearch}
                onChange={(e) => {
                  setSignupSearch(e.target.value);
                  setSignupPage(0);
                }}
                className="pl-9"
              />
            </div>

            {/* Scrollable list */}
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-4">
                {paginatedSignups.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {signupSearch ? 'No matching signups found' : 'No pending signups'}
                  </p>
                ) : (
                  paginatedSignups.map((user: any) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">
                          {user.first_name} {user.last_name}
                        </span>
                        <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          Signed up {format(new Date(user.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0 ml-2"
                        onClick={() => {
                          setNewEmail(user.email);
                          setNewTier('starter');
                          setNewReason('New signup - partner access');
                          setExpiresInDays('30');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          toast.info(`Email filled in - adjust settings and click Grant Access`);
                        }}
                      >
                        <Gift className="h-4 w-4 mr-1" />
                        Grant Access
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  {filteredSignups.length} signups
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSignupPage(p => Math.max(0, p - 1))}
                    disabled={signupPage === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSignupPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={signupPage >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add New Override */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Grant Tier Access
          </CardTitle>
          <CardDescription>
            Give associates, partners, or beta testers access without Stripe payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input
                type="email"
                placeholder="associate@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter ($60 value)</SelectItem>
                  <SelectItem value="professional">Professional ($140 value)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ($320 value)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expires In (days)</Label>
              <Input
                type="number"
                placeholder="30 (blank = never)"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                placeholder="Beta tester, Partner, etc."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleAddOverride} 
            disabled={addOverride.isPending}
            className="w-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {addOverride.isPending ? 'Granting...' : 'Grant Access'}
          </Button>
        </CardContent>
      </Card>

      {/* Active Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Active Overrides</CardTitle>
          <CardDescription>
            Users with admin-granted tier access (bypasses Stripe)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !overrides?.length ? (
            <p className="text-muted-foreground">No overrides granted yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((override) => (
                  <TableRow key={override.id}>
                    <TableCell className="font-mono text-xs">
                      {override.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge className={tierColors[override.granted_tier] || ''}>
                        {override.granted_tier}
                      </Badge>
                    </TableCell>
                    <TableCell>{override.reason || '-'}</TableCell>
                    <TableCell>
                      {override.expires_at 
                        ? format(new Date(override.expires_at), 'MMM d, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={override.is_active}
                        onCheckedChange={(checked) => 
                          toggleOverride.mutate({ id: override.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteOverride.mutate(override.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
