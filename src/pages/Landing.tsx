import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight,
  CheckCircle2,
  Bot,
  Target,
  TrendingUp,
  Clock,
  Users,
  Workflow,
  Star,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Phone,
  Mail,
  Calendar,
  Calculator as CalcIcon,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HeroProductMock } from "@/components/landing/HeroProductMock";
import { AgentCallFlow } from "@/components/landing/AgentCallFlow";
import { LogoWall } from "@/components/landing/LogoWall";
import { RatingsStrip } from "@/components/landing/RatingsStrip";
import {
  PipelineFlow,
  GrowthCurve,
  NetworkNodes,
  FunnelShape,
  DottedConnector,
  PipelinePreview,
  MetricsPreview,
  ActivityPreview,
  InsightPreview,
  BadgeRow,
} from "@/components/landing/DecorativeElements";

const Landing = () => {
  const navigate = useNavigate();

  // Calculator state
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcLeads, setCalcLeads] = useState("");
  const [calcDeal, setCalcDeal] = useState("");
  const [calcRate, setCalcRate] = useState("");
  const [calcResponse, setCalcResponse] = useState("hours");
  const [calcTeam, setCalcTeam] = useState("");
  const [calcResults, setCalcResults] = useState<{
    currentRevenue: number;
    projectedRevenue: number;
    revenueGain: number;
    hoursRecovered: number;
    leadsRecaptured: number;
    costPerLead: number;
    roi: number;
  } | null>(null);

  const fmtUSD = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  const runCalc = () => {
    const leads = parseInt(calcLeads) || 0;
    const deal = parseInt(calcDeal) || 0;
    const rate = (parseInt(calcRate) || 0) / 100;
    const team = parseInt(calcTeam) || 1;
    const respMult = calcResponse === "days" ? 0.05 : calcResponse === "hours" ? 0.15 : 0.3;
    const aiRate = 0.4;
    const currentRevenue = leads * deal * rate;
    const lostLeads = leads * (1 - respMult / aiRate);
    const recaptured = Math.round(lostLeads * aiRate * 0.5);
    const projectedRevenue = (leads + recaptured) * deal * (rate * 1.15);
    const revenueGain = projectedRevenue - currentRevenue;
    setCalcResults({
      currentRevenue,
      projectedRevenue,
      revenueGain,
      hoursRecovered: Math.round(team * 12),
      leadsRecaptured: recaptured,
      costPerLead: rate > 0 ? Math.round(deal * rate) : 0,
      roi: Math.round((revenueGain / 140) * 100),
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/home");
      }
    });
  }, [navigate]);

  const benefits = [
    {
      icon: Phone,
      title: "AI Voice Agent",
      description:
        "Your phone rings — Thermi answers. Qualifies the lead, books the appointment, and sends a confirmation. You find out when you check your calendar.",
    },
    {
      icon: Workflow,
      title: "Automated Follow-Up",
      description:
        "Every missed call, every new lead, every completed job — Thermi sends the right message at the right time without you lifting a finger.",
    },
    {
      icon: TrendingUp,
      title: "Pipeline That Runs Itself",
      description:
        "Leads move through your pipeline automatically. No manual updates. No dropped balls. Just a clean view of where every customer stands.",
    },
  ];

  const valuePoints = [
    "Never miss a lead — AI responds instantly and automatic text-backs catch every gap",
    "AI answers your phone and books appointments 24/7 (Enterprise plan)",
    "Replaces your CRM, email tool, and booking system in one platform",
    "Built specifically for HVAC contractors and service teams",
  ];

  const stats = [
    { value: "10x", label: "Faster Response" },
    { value: "40%", label: "More Conversions" },
    { value: "24/7", label: "AI Automation" },
  ];

  const testimonials = [
    {
      name: "Marcus T.",
      role: "Owner, Apex HVAC Services",
      quote:
        "We used to lose half our leads because we couldn't respond fast enough. Thermi's AI agent picks up the phone and books the appointment before I even finish my coffee. Revenue is up 35% in 4 months.",
      rating: 5,
    },
    {
      name: "Sarah K.",
      role: "Operations Manager, Northwind Heating & Cooling",
      quote:
        "The pipeline automation is a game changer. We manage 60+ active service opportunities and every follow-up, every appointment reminder, every estimate update goes out automatically. Our team closes faster with less stress.",
      rating: 5,
    },
    {
      name: "James L.",
      role: "Founder, Summit Mechanical Services",
      quote:
        "We switched from GoHighLevel and haven't looked back. Thermi is cleaner, faster, and the AI insights actually help us prioritize which homeowners need attention first. Our maintenance retention rate jumped 20%.",
      rating: 5,
    },
  ];

  const platformFeatures = [
    { icon: BarChart3, label: "Pipeline Analytics" },
    { icon: Bot, label: "AI Voice Agents" },
    { icon: Workflow, label: "Workflow Automation" },
    { icon: FileText, label: "Form Builder" },
    { icon: Phone, label: "AI Calling" },
    { icon: Mail, label: "Email Campaigns" },
    { icon: Calendar, label: "Booking System" },
    { icon: Target, label: "Lead Scoring" },
  ];

  return (
    <>
      <Helmet>
        <title>Thermi — Where HVAC Teams Stop Losing Leads</title>
        <meta
          name="description"
          content="Thermi is the AI operating system for HVAC businesses. Calls answered. Appointments booked. Follow-ups sent. Automatically. Built for HVAC teams that run on phone calls and repeat service."
        />
        <meta
          name="keywords"
          content="Thermi, HVAC CRM, HVAC AI receptionist, HVAC AI voice agent, missed call text back, inbound call AI, booking automation, lead follow-up automation"
        />
        <link rel="canonical" href="https://thermi.com/" />
        <meta property="og:title" content="Thermi — Where HVAC Teams Stop Losing Leads" />
        <meta
          property="og:description"
          content="Your AI operational coworker. Calls answered. Appointments booked. Follow-ups sent. You just show up."
        />
        <meta property="og:url" content="https://thermi.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="Thermi — Where HVAC Teams Stop Losing Leads" />
        <meta
          name="twitter:description"
          content="Thermi answers your calls, books your appointments, and follows up with every lead — automatically. Built for HVAC businesses."
        />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">Thermi</span>
            </div>
            <nav className="hidden md:flex gap-6 items-center" aria-label="Main navigation">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Reviews
              </a>
              <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#calculator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ROI Calculator
              </a>
              <a href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")}>Start Free Trial</Button>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative container mx-auto px-4 py-20 text-center" aria-labelledby="hero-heading">
            <PipelineFlow className="absolute left-2 top-2 w-[160px] md:left-4 md:top-4 md:w-[280px] opacity-40 md:opacity-60" />
            <NetworkNodes className="absolute right-2 top-2 w-[80px] md:right-4 md:top-4 md:w-[150px] opacity-30 md:opacity-50" />
            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Bot className="w-4 h-4" aria-hidden="true" />
                <span>Built for HVAC teams that run on phone calls and repeat service</span>
              </div>
              <h1 id="hero-heading" className="text-5xl md:text-6xl font-bold tracking-tight">
                Where HVAC teams
                <span className="text-primary"> stop losing leads.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your AI operational coworker. Calls answered. Appointments booked. Follow-ups sent. You just show up.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button size="lg" onClick={() => navigate("/auth")}>
                  Start free — 14-day trial <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth?provider=google")}>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">14-day free trial · cancel anytime · no setup fees</p>

              {/* Stats Row */}
              <div className="flex justify-center gap-12 pt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Hero Product Mock — animated, seeded from the real Thermi UI */}
              <div className="mt-14 max-w-4xl mx-auto">
                <HeroProductMock />
              </div>

              {/* Logo wall — trusted-by */}
              <div className="mt-16">
                <LogoWall />
              </div>

              {/* Ratings strip — third-party review badges */}
              <div className="mt-12">
                <RatingsStrip />
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4">
            <DottedConnector className="w-full max-w-xs md:max-w-xl mx-auto" />
          </div>

          {/* Product Demo Section — what the platform actually looks like */}
          <section className="container mx-auto px-4 py-16" id="features" aria-labelledby="demo-heading">
            <div className="text-center mb-12">
              <h2 id="demo-heading" className="text-3xl font-bold mb-4">
                See What's Inside
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">A real look at the tools you'll use every day.</p>
            </div>

            {/* Feature walkthrough grid */}
            <div className="grid md:grid-cols-4 gap-3 max-w-5xl mx-auto mb-8">
              {platformFeatures.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{feat.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Live UI Previews */}
            <div className="pointer-events-none select-none" aria-hidden="true">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="col-span-2">
                  <PipelinePreview />
                </div>
                <div>
                  <MetricsPreview />
                </div>
                <div>
                  <InsightPreview />
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="relative container mx-auto px-4 py-12" aria-labelledby="benefits-heading">
            <div className="text-center mb-12">
              <h2 id="benefits-heading" className="text-3xl font-bold mb-4">
                Built for the businesses that can't afford to miss a call
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                HVAC techs in crawlspaces. Install crews on rooftops. Service teams between emergency calls. Thermi
                answers the phone when you can't.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card key={index} className="p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-xl font-semibold mb-2">{benefit.title}</h4>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* AI Voice Agent — live call flow showcase */}
          <section className="container mx-auto px-4 py-16" aria-labelledby="agent-flow-heading">
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  AI voice agent · Enterprise plan
                </div>
                <h2 id="agent-flow-heading" className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                  Your phone rings. Your AI agent picks up. The job gets booked.
                </h2>
                <p className="text-muted-foreground text-base md:text-lg mb-6">
                  On the Enterprise plan, Thermi answers calls in realtime — qualifies the lead, schedules the appointment, and logs everything to your CRM. No staff, no missed calls, no "we'll call you back."
                </p>
                <ul className="space-y-3">
                  {[
                    "Answers in under 2 rings, 24/7",
                    "Qualifies with your custom script",
                    "Books straight into your calendar",
                    "Logs the lead and follow-up in your CRM",
                  ].map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm md:text-base">{p}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="mt-8" onClick={() => navigate("/auth")}>
                  Activate your AI agent <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                <AgentCallFlow />
              </div>
            </div>
          </section>

          <section className="relative bg-muted/50 py-12" aria-labelledby="growth-heading">
            <GrowthCurve className="absolute right-4 top-4 w-[140px] md:right-8 md:top-8 md:w-[260px] opacity-30 md:opacity-40" />
            <FunnelShape className="absolute left-4 bottom-4 w-[60px] md:left-8 md:bottom-8 md:w-[120px] opacity-20 md:opacity-30" />
            <div className="container mx-auto px-4 relative z-10">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 id="growth-heading" className="text-3xl font-bold mb-6">
                    The first business to respond wins the job
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    80% of customers hire whoever responds first. Thermi responds in seconds — not hours. Your AI agent
                    answers the call, qualifies the lead, and books the appointment before your competitor even checks
                    their voicemail.
                  </p>
                  <ul className="space-y-4">
                    {valuePoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Button size="lg" className="mt-8" onClick={() => navigate("/auth")}>
                    Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                <div className="rounded-xl overflow-hidden">
                  <InsightPreview />
                </div>
              </div>
            </div>
          </section>

          {/* Social Proof — Testimonials */}
          <section className="container mx-auto px-4 py-12" id="testimonials" aria-labelledby="testimonials-heading">
            <div className="text-center mb-12">
              <h2 id="testimonials-heading" className="text-3xl font-bold mb-4">
                Trusted by Service Businesses
              </h2>
              <p className="text-muted-foreground">Hear from professionals who switched to Thermi</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {testimonials.map((t, i) => (
                <Card key={i} className="p-6 flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <blockquote className="text-sm text-foreground leading-relaxed flex-1">"{t.quote}"</blockquote>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Trust Badges */}
          <section className="bg-muted/30 py-8">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">256-bit SSL Encryption</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">99.9% Uptime</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">14-Day Free Trial</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Built for Teams</span>
                </div>
              </div>
            </div>
          </section>

          {/* GEO: Structured Facts for AI Citation */}
          <section className="bg-muted/30 py-12" aria-labelledby="facts-heading">
            <div className="container mx-auto px-4">
              <h2 id="facts-heading" className="text-2xl font-bold text-center mb-10">
                Thermi at a Glance
              </h2>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="p-5">
                  <h3 className="font-semibold mb-2">What is Thermi?</h3>
                  <p className="text-sm text-muted-foreground">
                    Thermi is an AI-powered CRM platform with built-in AI agents. It automates lead management,
                    appointment booking, follow-ups, and sales workflows for HVAC contractors and multi-location HVAC
                    teams.
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-2">Who is Thermi for?</h3>
                  <p className="text-sm text-muted-foreground">
                    Thermi is designed for residential and commercial HVAC businesses that rely on fast lead response,
                    appointment scheduling, and long-term maintenance client retention.
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-2">How much does Thermi cost?</h3>
                  <p className="text-sm text-muted-foreground">
                    Thermi offers three plans: Starter at $60/month, Professional at $140/month, and Enterprise at
                    $320/month. All plans include a 14-day free trial with no commitment required.
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-2">What are Thermi AI Agents?</h3>
                  <p className="text-sm text-muted-foreground">
                    Thermi AI Agents are autonomous assistants that respond to leads in under 60 seconds, qualify
                    prospects, book appointments, and handle follow-ups 24/7 without human intervention.
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-2">Key Features</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• AI voice and chat agents</li>
                    <li>• Visual pipeline management</li>
                    <li>• Workflow automation builder</li>
                    <li>• Email campaigns and forms</li>
                    <li>• Booking and scheduling system</li>
                    <li>• Real-time analytics dashboard</li>
                  </ul>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold mb-2">Where is Thermi based?</h3>
                  <p className="text-sm text-muted-foreground">
                    Thermi is headquartered in Norwalk, Connecticut (06850), United States. The platform serves
                    businesses across the U.S. and is accessible worldwide via web browser on any device.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* ROI Calculator — premium framing */}
          <section className="container mx-auto px-4 py-12" id="calculator" aria-labelledby="calc-heading">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium mb-3">
                  <CalcIcon className="w-3.5 h-3.5" /> Live ROI model
                </div>
                <h2 id="calc-heading" className="text-3xl sm:text-4xl font-bold mb-3">
                  See what missed calls are costing you
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Plug in your numbers. We'll show you the revenue you're losing today and what Thermi's AI voice agent
                  recovers.
                </p>
              </div>

              <Card className="overflow-hidden border-primary/20 shadow-lg">
                <div className="grid md:grid-cols-2">
                  {/* Inputs */}
                  <div className="p-6 md:p-8 bg-card space-y-4 border-b md:border-b-0 md:border-r">
                    <div className="space-y-1.5">
                      <Label htmlFor="calc-leads" className="text-xs uppercase tracking-wide text-muted-foreground">
                        New leads / month
                      </Label>
                      <Input
                        id="calc-leads"
                        type="number"
                        placeholder="100"
                        value={calcLeads}
                        onChange={(e) => {
                          setCalcLeads(e.target.value);
                          setCalcOpen(true);
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calc-deal" className="text-xs uppercase tracking-wide text-muted-foreground">
                        Average deal value ($)
                      </Label>
                      <Input
                        id="calc-deal"
                        type="number"
                        placeholder="2,500"
                        value={calcDeal}
                        onChange={(e) => {
                          setCalcDeal(e.target.value);
                          setCalcOpen(true);
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calc-rate" className="text-xs uppercase tracking-wide text-muted-foreground">
                        Close rate (%)
                      </Label>
                      <Input
                        id="calc-rate"
                        type="number"
                        placeholder="20"
                        value={calcRate}
                        onChange={(e) => {
                          setCalcRate(e.target.value);
                          setCalcOpen(true);
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Avg lead response time
                      </Label>
                      <Select
                        value={calcResponse}
                        onValueChange={(v) => {
                          setCalcResponse(v);
                          setCalcOpen(true);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Under 5 minutes</SelectItem>
                          <SelectItem value="hours">1–4 hours</SelectItem>
                          <SelectItem value="days">Next business day+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calc-team" className="text-xs uppercase tracking-wide text-muted-foreground">
                        Sales team size
                      </Label>
                      <Input
                        id="calc-team"
                        type="number"
                        placeholder="3"
                        value={calcTeam}
                        onChange={(e) => {
                          setCalcTeam(e.target.value);
                          setCalcOpen(true);
                        }}
                      />
                    </div>
                    <Button className="w-full" size="lg" onClick={runCalc}>
                      Calculate impact <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>

                  {/* Results */}
                  <div className="p-6 md:p-8 bg-gradient-to-br from-primary/5 via-background to-background">
                    {!calcResults ? (
                      <div className="flex flex-col items-center justify-center text-center h-full py-12 space-y-3">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-medium">Your numbers, your projection</p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          Fill in the form to see monthly revenue lift, hours recovered, and ROI based on real industry
                          response-rate data.
                        </p>
                      </div>
                    ) : (
                      <div className="animate-fade-in space-y-4">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Projected monthly revenue gain
                          </p>
                          <p className="text-4xl font-bold text-primary tabular-nums">
                            {fmtUSD(calcResults.revenueGain)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmtUSD(calcResults.currentRevenue)} → {fmtUSD(calcResults.projectedRevenue)} / mo
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Users className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Recaptured
                              </span>
                            </div>
                            <p className="text-xl font-bold tabular-nums">
                              {calcResults.leadsRecaptured}
                              <span className="text-xs font-normal text-muted-foreground">/mo</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Hours back
                              </span>
                            </div>
                            <p className="text-xl font-bold tabular-nums">
                              {calcResults.hoursRecovered}
                              <span className="text-xs font-normal text-muted-foreground">/wk</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-1.5 mb-1">
                              <TrendingUp className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">ROI</span>
                            </div>
                            <p className="text-xl font-bold tabular-nums">{calcResults.roi}%</p>
                          </div>
                          <div className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-1.5 mb-1">
                              <DollarSign className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Cost / lead
                              </span>
                            </div>
                            <p className="text-xl font-bold tabular-nums">{fmtUSD(calcResults.costPerLead)}</p>
                          </div>
                        </div>
                        <Button className="w-full" size="lg" onClick={() => navigate("/auth")}>
                          Start recovering this revenue <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Final CTA — premium, voice-agent-forward */}
          <section className="relative container mx-auto px-4 py-16" aria-labelledby="cta-heading">
            <div className="relative max-w-5xl mx-auto overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-10 md:p-16">
              <div
                className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur border border-border px-3 py-1.5 rounded-full text-xs font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    AI-powered platform — set up in minutes
                  </div>
                  <h2 id="cta-heading" className="text-3xl md:text-5xl font-bold tracking-tight">
                    Stop losing leads while you're on the job.
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                    14 days. Full platform. Automated follow-ups, pipeline management, and AI tools to stop losing leads
                    — all ready before you finish your next coffee.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button size="lg" onClick={() => navigate("/auth")}>
                      Start free — 14-day trial <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
                      See pricing
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground pt-2">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Cancel anytime
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Setup in minutes
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Your data, your numbers
                    </span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <InsightPreview />
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t bg-background" role="contentinfo">
          <div className="container mx-auto px-4 py-12">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-semibold mb-4">Thermi</h3>
                <p className="text-sm text-muted-foreground">
                  Thermi is the AI operating system for HVAC businesses. Calls answered. Appointments booked.
                  Follow-ups sent. Built in Connecticut.
                </p>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Product</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#features" className="hover:text-foreground">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="/pricing" className="hover:text-foreground">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="/api-docs" className="hover:text-foreground">
                      API
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Company</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="/contact" className="hover:text-foreground">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="hover:text-foreground">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Legal</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="/privacy" className="hover:text-foreground">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="hover:text-foreground">
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t mt-8 pt-8 text-center text-xs text-muted-foreground space-y-1">
              <p>© {new Date().getFullYear()} Thermi, a product of Milord Ventures LLC. All rights reserved.</p>
              <p>Located in Connecticut 06850 · Built in the USA.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
