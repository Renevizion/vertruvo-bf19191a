import { useEffect, useState } from "react";
import { Phone, Bot, Calendar, CheckCircle2, Database, MessageSquare, User } from "lucide-react";

/**
 * AgentCallFlow — Seeded UI graphic of Thermi's AI voice agent handling
 * a live inbound call. Pulses, waveform, animated transcript, highlighted
 * step flow (Answer → Qualify → Book → Log). No real data, no canvas.
 */
export function AgentCallFlow() {
  const [step, setStep] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  // Cycle through the 4 flow steps
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 2400);
    return () => clearInterval(t);
  }, []);

  // Cycle transcript lines
  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % transcript.length), 2800);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { icon: Phone, label: "Answer" },
    { icon: MessageSquare, label: "Qualify" },
    { icon: Calendar, label: "Book" },
    { icon: Database, label: "Log to CRM" },
  ];

  const transcript = [
    { who: "caller", text: "Hi, I need a quote for a roof inspection." },
    { who: "agent", text: "Of course — what's the property address?" },
    { who: "caller", text: "412 Maple Avenue." },
    { who: "agent", text: "Got it. I have Tuesday 10am or Wednesday 2pm — which works?" },
    { who: "caller", text: "Wednesday 2pm is perfect." },
    { who: "agent", text: "Booked. Confirmation text on its way." },
  ];

  return (
    <div className="relative w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <style>{`
        @keyframes acfPulse { 0%,100% { transform: scale(1); opacity: .8 } 50% { transform: scale(1.08); opacity: 1 } }
        @keyframes acfRing  { 0% { transform: scale(.6); opacity: .6 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes acfWave  { 0%,100% { height: 20% } 50% { height: 95% } }
        @keyframes acfIn    { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
        @keyframes acfDash  { to { stroke-dashoffset: -24 } }
      `}</style>

      {/* Top chrome — call status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium">Live call · 00:42</span>
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">+1 (203) 555-0148 · New caller</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
        {/* Left — Agent face */}
        <div className="relative p-6 sm:p-8 flex flex-col items-center justify-center gap-5 border-b lg:border-b-0 lg:border-r border-border bg-gradient-to-br from-primary/5 via-transparent to-primary/10 min-h-[280px]">
          {/* Avatar w/ pulse rings */}
          <div className="relative">
            <span
              className="absolute inset-0 rounded-full bg-primary/30"
              style={{ animation: "acfRing 2s ease-out infinite" }}
            />
            <span
              className="absolute inset-0 rounded-full bg-primary/20"
              style={{ animation: "acfRing 2s ease-out .6s infinite" }}
            />
            <div
              className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.6)]"
              style={{ animation: "acfPulse 1.8s ease-in-out infinite" }}
            >
              <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-semibold">Thermi Voice Agent</div>
            <div className="text-xs text-muted-foreground mt-0.5">Speaking · Thermi voice</div>
          </div>

          {/* Waveform */}
          <div className="flex items-end gap-1 h-10 w-full max-w-[200px]">
            {Array.from({ length: 22 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-primary/70"
                style={{ animation: `acfWave 1.2s ease-in-out ${i * 60}ms infinite` }}
              />
            ))}
          </div>
        </div>

        {/* Right — transcript + flow */}
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          {/* Transcript */}
          <div className="flex-1 space-y-2 min-h-[180px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Live transcript
            </div>
            {transcript.slice(Math.max(0, lineIdx - 2), lineIdx + 1).map((l, i, arr) => (
              <div
                key={`${lineIdx}-${i}`}
                className={`flex gap-2 ${l.who === "agent" ? "justify-start" : "justify-end"}`}
                style={{ animation: "acfIn .4s ease-out both" }}
              >
                {l.who === "agent" && (
                  <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                    l.who === "agent"
                      ? "bg-primary/10 text-foreground rounded-tl-sm"
                      : "bg-muted text-foreground rounded-tr-sm"
                  } ${i === arr.length - 1 ? "ring-1 ring-primary/30" : "opacity-60"}`}
                >
                  {l.text}
                </div>
                {l.who === "caller" && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Flow steps */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Call flow
            </div>
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const active = i === step;
                const done = i < step;
                return (
                  <div key={s.label} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div
                      className={`flex flex-col items-center gap-1 flex-1 min-w-0 transition-all duration-300 ${
                        active ? "scale-105" : ""
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-6px_hsl(var(--primary)/0.7)]"
                            : done
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span
                        className={`text-[10px] font-medium truncate ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <svg className="h-px w-4 sm:w-6 shrink-0" viewBox="0 0 24 1" preserveAspectRatio="none">
                        <line
                          x1="0"
                          y1="0.5"
                          x2="24"
                          y2="0.5"
                          stroke="hsl(var(--primary))"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          style={{
                            animation: i < step ? "acfDash 1.2s linear infinite" : undefined,
                            opacity: i < step ? 1 : 0.25,
                          }}
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating outcome badge */}
      <div
        className="absolute -bottom-3 right-4 sm:right-6 rounded-xl border border-border bg-card px-3 py-2 shadow-xl flex items-center gap-2 text-xs font-medium"
        style={{ animation: "acfIn .5s ease-out 1.2s both" }}
      >
        <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        Appointment booked · Wed 2:00 PM
      </div>
    </div>
  );
}

export default AgentCallFlow;
