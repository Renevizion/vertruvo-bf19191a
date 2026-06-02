import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Mic,
  Bot,
  Zap,
} from "lucide-react";

/**
 * HeroProductMock — A high-fidelity, seeded animated UI of the Thermi OS.
 * Pure CSS + a few timers. No real data. No interactivity. Brand: emerald (#059669).
 * Designed as a replacement for the stock Mac hero image.
 */
export function HeroProductMock() {
  const [revenue, setRevenue] = useState(0);
  const [leads, setLeads] = useState(0);
  const [calls, setCalls] = useState(0);
  const [bookings, setBookings] = useState(0);
  const [typed, setTyped] = useState("");

  const aiMessage =
    "Booked Sarah for Tue 2pm. SMS sent. Pipeline updated.";

  // Counters
  useEffect(() => {
    const targets = { revenue: 48230, leads: 1247, calls: 312, bookings: 89 };
    const start = performance.now();
    const dur = 1800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setRevenue(Math.round(targets.revenue * e));
      setLeads(Math.round(targets.leads * e));
      setCalls(Math.round(targets.calls * e));
      setBookings(Math.round(targets.bookings * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Typewriter loop
  useEffect(() => {
    let i = 0;
    let dir: 1 | -1 = 1;
    const id = setInterval(() => {
      i += dir;
      if (i > aiMessage.length) {
        dir = -1;
        i = aiMessage.length;
        setTimeout(() => {}, 1800);
      } else if (i < 0) {
        dir = 1;
        i = 0;
      }
      setTyped(aiMessage.slice(0, i));
    }, 55);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute -inset-4 sm:-inset-8 -z-10 rounded-[2rem] opacity-60 blur-3xl bg-primary/15"
      />

      {/* Browser chrome */}
      <div className="w-full max-w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-border bg-muted/40">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
          </div>
          <div className="ml-1 sm:ml-3 flex-1 flex justify-center min-w-0">
            <div className="max-w-full truncate text-[10px] sm:text-[11px] text-muted-foreground bg-background/60 border border-border rounded-md px-2 sm:px-3 py-0.5 font-mono">
              app.thermi.com / dashboard
            </div>
          </div>
        </div>

        {/* Body: sidebar + main */}
        <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[140px_minmax(0,1fr)] min-h-[360px] sm:min-h-[420px]">
          {/* Sidebar */}
          <div className="border-r border-border bg-muted/20 p-2 sm:p-3 space-y-1 overflow-hidden">
            <div className="flex items-center gap-2 px-1 sm:px-2 py-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="hidden sm:inline text-xs font-bold tracking-tight">Thermi</span>
            </div>
            {[
              { i: LayoutDashboard, l: "Dashboard", a: true },
              { i: Users, l: "Contacts" },
              { i: Phone, l: "Voice AI" },
              { i: Mail, l: "Campaigns" },
              { i: Calendar, l: "Bookings" },
              { i: Bot, l: "Agents" },
            ].map(({ i: Icon, l, a }) => (
              <div
                key={l}
                className={`flex items-center justify-center sm:justify-start gap-2 px-1 sm:px-2 py-1.5 rounded-md text-[11px] ${
                  a
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline truncate">{l}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="min-w-0 p-2.5 sm:p-4 space-y-2 sm:space-y-3 overflow-hidden">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
              {[
                {
                  l: "Revenue",
                  v: `$${revenue.toLocaleString()}`,
                  d: "+28%",
                  Icon: DollarSign,
                },
                {
                  l: "Leads",
                  v: leads.toLocaleString(),
                  d: "+12%",
                  Icon: Users,
                },
                {
                  l: "Calls",
                  v: calls.toLocaleString(),
                  d: "+41%",
                  Icon: Phone,
                },
                {
                  l: "Bookings",
                  v: bookings.toLocaleString(),
                  d: "+19%",
                  Icon: Calendar,
                },
              ].map(({ l, v, d, Icon }) => (
                <div
                  key={l}
                  className="min-w-0 rounded-lg border border-border bg-background p-2 sm:p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-wide truncate">
                      {l}
                    </span>
                    <Icon className="w-3 h-3 text-primary" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold mt-1 tabular-nums truncate">
                    {v}
                  </div>
                  <div className="text-[9px] text-primary flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {d}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart + Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-2">
              {/* Sparkline chart */}
              <div className="min-w-0 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold truncate">
                    Revenue · 30d
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    Live
                  </span>
                </div>
                <svg viewBox="0 0 300 90" className="w-full h-20">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,70 L30,62 L60,66 L90,50 L120,55 L150,38 L180,42 L210,28 L240,32 L270,18 L300,14 L300,90 L0,90 Z"
                    fill="url(#g1)"
                  />
                  <path
                    d="M0,70 L30,62 L60,66 L90,50 L120,55 L150,38 L180,42 L210,28 L240,32 L270,18 L300,14"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="300"
                    cy="14"
                    r="3.5"
                    fill="hsl(var(--primary))"
                  >
                    <animate
                      attributeName="r"
                      values="3.5;5.5;3.5"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>

                {/* Bars */}
                <div className="mt-2 flex items-end gap-1 h-10">
                  {[40, 60, 35, 75, 55, 80, 65, 90, 70, 95, 80, 100].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-primary/70 origin-bottom animate-[thermiBar_2.2s_ease-out_infinite]"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 90}ms`,
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Pipeline kanban mini */}
              <div className="min-w-0 rounded-lg border border-border bg-background p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold">Pipeline</span>
                  <span className="text-[9px] text-muted-foreground">
                    3 stages
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { t: "New", n: 12, c: "hsl(var(--primary))" },
                    { t: "Qual", n: 8, c: "hsl(var(--warning))" },
                    { t: "Won", n: 5, c: "hsl(var(--success))" },
                  ].map((col, ci) => (
                    <div key={col.t} className="space-y-1">
                      <div className="text-[8px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-muted text-foreground">
                        {col.t} · {col.n}
                      </div>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="rounded border border-border bg-muted/40 p-1 animate-[thermiCardIn_3s_ease-out_infinite]"
                          style={{
                            animationDelay: `${ci * 300 + i * 200}ms`,
                          }}
                        >
                          <div className="h-1 w-3/4 bg-foreground/30 rounded mb-1" />
                          <div className="h-1 w-1/2 bg-primary/60 rounded" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Agent + Voice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="min-w-0 rounded-lg border border-border bg-background p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                    <Bot className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold truncate">
                    AI Agent · Receptionist
                  </span>
                  <span className="ml-auto text-[8px] text-primary flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    live
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[9px] text-muted-foreground bg-muted/40 rounded px-2 py-1 max-w-[85%]">
                    "Hi, can I book a 2pm tomorrow?"
                  </div>
                  <div className="text-[9px] text-primary-foreground bg-primary rounded px-2 py-1 ml-auto max-w-[90%] h-[32px] overflow-hidden break-words leading-3">
                    {typed}
                    <span className="inline-block w-1 h-2 bg-primary-foreground ml-0.5 align-middle animate-pulse" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[8px] text-muted-foreground pt-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                    <span>SMS confirmation sent</span>
                    <CheckCircle2 className="w-2.5 h-2.5 text-primary ml-2" />
                    <span>Stripe deposit captured</span>
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-border bg-background p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                    <Mic className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold truncate">
                    Voice · Inbound
                  </span>
                  <span className="ml-auto text-[8px] font-mono text-muted-foreground">
                    00:47
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-10 mt-1">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full bg-primary/80 animate-[thermiWave_1.1s_ease-in-out_infinite]"
                      style={{
                        animationDelay: `${i * 35}ms`,
                        height: `${20 + Math.abs(Math.sin(i * 0.7)) * 60}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="w-2.5 h-2.5 text-primary" />
                    Transcribing
                  </span>
                  <span className="text-primary font-medium">
                    Intent: Booking
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="hidden md:block absolute left-2 top-24 rotate-[-4deg] rounded-xl border border-border bg-card shadow-xl px-3 py-2 animate-[thermiFloat_5s_ease-in-out_infinite]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <div>
            <div className="text-[10px] font-semibold leading-tight">
              Deal won
            </div>
            <div className="text-[9px] text-muted-foreground">
              Acme · $18,500
            </div>
          </div>
        </div>
      </div>
      <div className="hidden md:block absolute right-2 top-44 rotate-[3deg] rounded-xl border border-border bg-card shadow-xl px-3 py-2 animate-[thermiFloat_6s_ease-in-out_infinite] [animation-delay:1.2s]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <div>
            <div className="text-[10px] font-semibold leading-tight">
              Agent handled call
            </div>
            <div className="text-[9px] text-muted-foreground">
              Booked · No staff needed
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes thermiBar {
          0%, 100% { transform: scaleY(0.6); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes thermiWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes thermiCardIn {
          0% { transform: translateY(6px); opacity: 0; }
          25%, 90% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-6px); opacity: 0; }
        }
        @keyframes thermiFloat {
          0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
          50% { transform: translateY(-8px) rotate(var(--r, 0deg)); }
        }
      `}</style>
    </div>
  );
}

export default HeroProductMock;
