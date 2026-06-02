import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function StripeConnectSetup() {
  const queryClient = useQueryClient();

  // Get workspace ID
  const { data: workspaceId } = useQuery({
    queryKey: ["my-workspace-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      return data?.workspace_id ?? null;
    },
  });

  // Check onboarding status
  const { data: connectStatus, isLoading } = useQuery({
    queryKey: ["stripe-connect-status", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 10000, // poll while onboarding
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { action: "check_status", workspace_id: workspaceId },
      });
      if (error) throw error;
      return data as {
        onboarded: boolean;
        account_id: string | null;
        charges_enabled?: boolean;
        payouts_enabled?: boolean;
      };
    },
  });

  // Start onboarding
  const onboard = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { workspace_id: workspaceId },
      });
      if (error) {
        // Supabase wraps non-2xx into a FunctionsHttpError; try to surface our payload.
        const ctx: any = (error as any).context;
        const body = ctx?.body ?? ctx;
        const friendly = body?.error || (error as Error).message;
        throw new Error(friendly);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: Error) => toast.error(e.message, { duration: 8000 }),
  });

  // Open Stripe Express Dashboard
  const openDashboard = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-dashboard", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank"); // External Stripe dashboard is OK in new tab
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isOnboarded = connectStatus?.onboarded;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processing
              </CardTitle>
              <CardDescription>
                Connect your Stripe account to receive payments from your customers
              </CardDescription>
            </div>
            {isOnboarded ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : connectStatus?.account_id ? (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Setup Incomplete
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOnboarded ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your Stripe account is connected and ready to accept payments. When customers are charged, 
                the money goes directly to your bank account.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => openDashboard.mutate()}
                  disabled={openDashboard.isPending}
                >
                  {openDashboard.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  View Stripe Dashboard
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                To accept payments from your customers, you need to connect a Stripe account. 
                This takes about 5 minutes and requires your business details and bank account information.
              </p>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h4 className="text-sm font-medium">What you'll need:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Business name and address</li>
                  <li>• Bank account or debit card for payouts</li>
                  <li>• Tax ID (EIN or SSN for US businesses)</li>
                </ul>
              </div>
              <Button
                onClick={() => onboard.mutate()}
                disabled={onboard.isPending}
              >
                {onboard.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {connectStatus?.account_id ? "Continue Setup" : "Connect Stripe Account"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
