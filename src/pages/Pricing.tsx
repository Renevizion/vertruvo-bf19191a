import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Badge } from "@/components/ui/badge";

// Stripe Product & Price IDs
const PRICING_TIERS = {
  starter: {
    productId: "prod_TWJsiTC1NjHYNA",
    monthlyPriceId: "price_1SZHF99Rb4IZsqBDwjN98vzj",
    yearlyPriceId: "price_1TDs3C9Rb4IZsqBDwDYV4Tgr",
    monthlyPrice: 60,
    yearlyPrice: 576,
  },
  professional: {
    productId: "prod_TWJtzGu8NtKoOR",
    monthlyPriceId: "price_1SZHFN9Rb4IZsqBDaeV4d15Q",
    yearlyPriceId: "price_1TDs4C9Rb4IZsqBDffJoYBpa",
    monthlyPrice: 140,
    yearlyPrice: 1344,
  },
  enterprise: {
    productId: "prod_TWJuL45k95WeVZ",
    monthlyPriceId: "price_1SZHGN9Rb4IZsqBDmT5yNY8j",
    yearlyPriceId: "price_1TDs529Rb4IZsqBDaYTOo6nJ",
    monthlyPrice: 320,
    yearlyPrice: 3072,
  },
};

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: subscription } = useSubscriptionTier();
  const currentTier = subscription?.tier || 'free';

  // Handle cancel feedback from Stripe
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast.info("Checkout canceled. No charges were made.");
    }
  }, [searchParams]);

  const handleSubscribe = async (tierKey: string, priceId: string) => {
    setLoadingTier(tierKey);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.info("Please sign up or log in to start your free trial");
        navigate(`/auth?tier=${tierKey}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const tiers = [
    {
      key: "starter",
      name: "Starter",
      features: [
        { text: "Up to 500 leads", included: true },
        { text: "2 team members", included: true },
        { text: "Basic AI features", included: true },
        { text: "Email campaigns", included: true },
        { text: "Standard support", included: true },
        { text: "1 pipeline", included: true },
        { text: "Basic analytics", included: true },
        { text: "AI Voice Calling (Twilio)", included: false },
        { text: "Lead scoring & A/B testing", included: false },
      ],
      cta: "Start Free Trial",
    },
    {
      key: "professional",
      name: "Professional",
      features: [
        { text: "Up to 2,500 leads", included: true },
        { text: "11 team members", included: true },
        { text: "Advanced AI features", included: true },
        { text: "Unlimited pipelines", included: true },
        { text: "Priority support", included: true },
        { text: "Custom fields & workflows", included: true },
        { text: "Advanced analytics", included: true },
        { text: "Lead scoring & A/B testing", included: true },
        { text: "AI Voice Calling (Twilio)", included: false },
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      key: "enterprise",
      name: "Enterprise",
      features: [
        { text: "Unlimited leads", included: true },
        { text: "Unlimited team members", included: true },
        { text: "Premium AI features", included: true },
        { text: "AI Voice Calling (Twilio)", included: true },
        { text: "Unlimited everything", included: true },
        { text: "Priority support", included: true },
        { text: "Custom integrations", included: true },
        { text: "Advanced workflow automation", included: true },
        { text: "Voicemail drops & broadcasting", included: true },
      ],
      cta: "Start Free Trial",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Thermi Pricing - AI CRM Plans Starting at $60/month | 14-Day Free Trial</title>
        <meta name="description" content="Thermi pricing — the AI operating system for HVAC businesses. Voice agents, CRM, booking, payments & campaigns from $60/mo. Save 20% annually." />
        <link rel="canonical" href="https://thermi.com/pricing" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <h1 className="text-2xl font-bold">Thermi</h1>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
              <Button onClick={() => navigate("/auth")}>Get Started</Button>
            </div>
          </div>
        </header>

        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your business. All plans include a <strong>14-day free trial</strong>.
            </p>

            {/* Annual/Monthly Toggle */}
            <div className="flex items-center justify-center gap-3">
              <Label htmlFor="billing-toggle" className={!isAnnual ? "font-semibold" : "text-muted-foreground"}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label htmlFor="billing-toggle" className={isAnnual ? "font-semibold" : "text-muted-foreground"}>
                Annual
              </Label>
              {isAnnual && (
                <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full">
                  Save 20%
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {tiers.map((tier) => {
              const pricing = PRICING_TIERS[tier.key as keyof typeof PRICING_TIERS];
              const displayPrice = isAnnual
                ? Math.round(pricing.yearlyPrice / 12)
                : pricing.monthlyPrice;
              const priceId = isAnnual ? pricing.yearlyPriceId : pricing.monthlyPriceId;

              return (
                <Card
                  key={tier.key}
                  className={`p-8 relative flex flex-col ${
                    tier.popular ? "border-primary shadow-lg scale-105" : ""
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {currentTier === tier.key && (
                    <div className="absolute -top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground">Your Plan</Badge>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold">${displayPrice}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground">
                        <span className="line-through">${pricing.monthlyPrice}/mo</span>
                        {" "}billed annually (${pricing.yearlyPrice}/yr)
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${!feature.included ? 'text-muted-foreground/50' : ''}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="lg"
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(tier.key, priceId)}
                    disabled={loadingTier === tier.key || currentTier === tier.key}
                  >
                    {loadingTier === tier.key ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : currentTier === tier.key ? (
                      "Current Plan"
                    ) : (
                      tier.cta
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <p className="text-sm text-muted-foreground">
              All plans include 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Compare All Features</h3>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground min-w-[180px]">Feature</th>
                    <th className="text-center py-3 px-4 font-semibold text-foreground">Starter</th>
                    <th className="text-center py-3 px-4 font-semibold text-primary">Professional</th>
                    <th className="text-center py-3 px-4 font-semibold text-foreground">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Leads", starter: "500", pro: "2,500", enterprise: "Unlimited" },
                    { feature: "Team Members", starter: "2", pro: "11", enterprise: "Unlimited" },
                    { feature: "Pipelines", starter: "1", pro: "Unlimited", enterprise: "Unlimited" },
                    { feature: "Email Campaigns", starter: "✓", pro: "✓", enterprise: "✓" },
                    { feature: "Contact Database", starter: "✓", pro: "✓", enterprise: "✓" },
                    { feature: "Task Management", starter: "✓", pro: "✓", enterprise: "✓" },
                    { feature: "Form Builder", starter: "✓", pro: "✓", enterprise: "✓" },
                    { feature: "Basic AI Features", starter: "✓", pro: "✓", enterprise: "✓" },
                    { feature: "Custom Fields", starter: "—", pro: "✓", enterprise: "✓" },
                    { feature: "Workflow Automation", starter: "1 workflow", pro: "10 workflows", enterprise: "Unlimited" },
                    { feature: "Lead Scoring", starter: "—", pro: "✓", enterprise: "✓" },
                    { feature: "A/B Testing (Forms)", starter: "—", pro: "—", enterprise: "✓" },
                    { feature: "Advanced Analytics", starter: "—", pro: "✓", enterprise: "✓" },
                    { feature: "AI Insights", starter: "—", pro: "5/week", enterprise: "Unlimited" },
                    { feature: "Agent Memory", starter: "—", pro: "500 entries", enterprise: "Unlimited" },
                    { feature: "Webhook Integrations", starter: "—", pro: "—", enterprise: "✓" },
                    { feature: "AI Voice Calling", starter: "—", pro: "—", enterprise: "✓" },
                    { feature: "Voicemail Drops", starter: "—", pro: "—", enterprise: "✓" },
                    { feature: "Voice Broadcasting", starter: "—", pro: "—", enterprise: "✓" },
                    { feature: "Multi-Channel Inbox", starter: "—", pro: "—", enterprise: "✓" },
                    { feature: "Priority Support", starter: "—", pro: "✓", enterprise: "✓" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 text-foreground font-medium">{row.feature}</td>
                      <td className="py-2.5 px-4 text-center text-muted-foreground">{row.starter}</td>
                      <td className="py-2.5 px-4 text-center font-medium text-foreground bg-primary/5">{row.pro}</td>
                      <td className="py-2.5 px-4 text-center text-muted-foreground">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">What's included in every plan</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                "Lead Management", "Contact Database", "Email Campaigns",
                "Task Management", "Pipeline Tracking", "Mobile Responsive",
                "Data Export", "SSL Security", "Regular Updates",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">How does the 14-day free trial work?</h4>
                <p className="text-muted-foreground">Start with full access to your chosen plan for 14 days. A payment method is required to start, but you won't be charged until the trial ends. Cancel anytime during the trial at no cost.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Can I switch between monthly and annual?</h4>
                <p className="text-muted-foreground">Yes! You can switch billing cycles at any time through your subscription management page. Annual billing saves you 20%.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Can I change plans later?</h4>
                <p className="text-muted-foreground">Yes, you can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate any differences.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What happens if my payment fails?</h4>
                <p className="text-muted-foreground">We'll notify you immediately and give you a 7-day grace period to update your payment method. Your data stays safe — you won't lose anything.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What's AI Voice Calling?</h4>
                <p className="text-muted-foreground">Enterprise plans include AI-powered voice calling via Twilio integration, allowing your AI agents to make and receive calls on your behalf.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">How do I cancel?</h4>
                <p className="text-muted-foreground">You can cancel anytime from your account settings. Your subscription will remain active until the end of the current billing period — no penalties, no hidden fees.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t bg-background">
          <div className="container mx-auto px-4 py-12">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h4 className="font-semibold mb-4">Thermi</h4>
                <p className="text-sm text-muted-foreground">AI-powered CRM for modern teams</p>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Product</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="/" className="hover:text-foreground">Features</a></li>
                  <li><a href="/pricing" className="hover:text-foreground">Pricing</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Company</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="/contact" className="hover:text-foreground">Contact</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Legal</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="/privacy" className="hover:text-foreground">Privacy Policy</a></li>
                  <li><a href="/terms" className="hover:text-foreground">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Thermi. Located in Connecticut 06850. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Pricing;
