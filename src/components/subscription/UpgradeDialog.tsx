import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const UPGRADE_TIERS = {
  starter: {
    name: "Starter",
    monthlyPrice: "$60/mo",
    yearlyPrice: "$48/mo",
    monthlyPriceId: "price_1SZHF99Rb4IZsqBDwjN98vzj",
    yearlyPriceId: "price_1TDs3C9Rb4IZsqBDwDYV4Tgr",
  },
  professional: {
    name: "Professional",
    monthlyPrice: "$140/mo",
    yearlyPrice: "$112/mo",
    monthlyPriceId: "price_1SZHFN9Rb4IZsqBDaeV4d15Q",
    yearlyPriceId: "price_1TDs4C9Rb4IZsqBDffJoYBpa",
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: "$320/mo",
    yearlyPrice: "$256/mo",
    monthlyPriceId: "price_1SZHGN9Rb4IZsqBDmT5yNY8j",
    yearlyPriceId: "price_1TDs529Rb4IZsqBDaYTOo6nJ",
  },
};

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: string;
  feature?: string;
  limitHit?: string;
}

export function UpgradeDialog({ open, onOpenChange, currentTier, feature, limitHit }: UpgradeDialogProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(true); // Default to annual for better conversion

  const availableTiers = Object.entries(UPGRADE_TIERS).filter(([key]) => {
    const order = ['free', 'starter', 'professional', 'enterprise'];
    return order.indexOf(key) > order.indexOf(currentTier);
  });

  const handleUpgrade = async (tierKey: string, priceId: string) => {
    setLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            {limitHit
              ? limitHit
              : feature
                ? `The ${feature} feature requires a higher plan.`
                : "Unlock more features by upgrading your plan."}
          </DialogDescription>

        </DialogHeader>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 py-2">
          <Label className={!isAnnual ? "font-semibold" : "text-muted-foreground"}>Monthly</Label>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label className={isAnnual ? "font-semibold" : "text-muted-foreground"}>Annual</Label>
          {isAnnual && (
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          )}
        </div>

        <div className="space-y-3">
          {availableTiers.map(([key, tier]) => {
            const priceId = isAnnual ? tier.yearlyPriceId : tier.monthlyPriceId;
            const displayPrice = isAnnual ? tier.yearlyPrice : tier.monthlyPrice;

            return (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-semibold">{tier.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {displayPrice}
                    {isAnnual && <span className="text-xs ml-1">(billed annually)</span>}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleUpgrade(key, priceId)}
                  disabled={loading === key}
                >
                  {loading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
