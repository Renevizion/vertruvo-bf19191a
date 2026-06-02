import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users, Award, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function ReferralProgram() {
  const [copied, setCopied] = useState(false);

  const { data: referralData, isLoading } = useQuery({
    queryKey: ['referral-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get or create referral code
      const { data: existing } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);

      // Generate a referral code from user ID
      const code = user.id.slice(0, 8).toUpperCase();

      // Count successful referrals
      const { count } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'completed');

      const { count: pendingCount } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'pending');

      return {
        code,
        completedReferrals: count || 0,
        pendingReferrals: pendingCount || 0,
        referralLink: `https://thermi.com/auth?ref=${code}`,
      };
    },
  });

  const handleCopy = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rewards = [
    { threshold: 1, reward: "$60 account credit", icon: "🎁" },
    { threshold: 3, reward: "$200 account credit", icon: "🏆" },
    { threshold: 5, reward: "$400 account credit", icon: "💎" },
    { threshold: 10, reward: "15% off your next annual renewal", icon: "🚀" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Referral Program</h2>
        <p className="text-muted-foreground">Share Thermi with another business owner. When they subscribe to a paid plan, account credit lands on your next invoice.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <Share2 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{referralData?.completedReferrals ?? 0}</p>
            <p className="text-sm text-muted-foreground">Successful Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold">{referralData?.pendingReferrals ?? 0}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-3xl font-bold">
              {rewards.filter(r => (referralData?.completedReferrals ?? 0) >= r.threshold).length}
            </p>
            <p className="text-sm text-muted-foreground">Rewards Earned</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with your network. When someone signs up and subscribes, you both get rewarded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralData?.referralLink || 'Loading...'}
              className="font-mono text-sm"
            />
            <Button onClick={handleCopy} variant="outline" className="flex-shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rewards Tiers</CardTitle>
          <CardDescription>Earn bigger rewards as you refer more users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rewards.map((reward) => {
              const earned = (referralData?.completedReferrals ?? 0) >= reward.threshold;
              return (
                <div
                  key={reward.threshold}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    earned ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{reward.icon}</span>
                    <div>
                      <p className="font-medium">{reward.reward}</p>
                      <p className="text-sm text-muted-foreground">
                        {reward.threshold} referral{reward.threshold !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant={earned ? "default" : "secondary"}>
                    {earned ? "Earned" : `${reward.threshold - (referralData?.completedReferrals ?? 0)} more`}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
