import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, TrendingUp, Users, DollarSign, Mail, Clock, Zap } from "lucide-react";

/* ─── Original SVG decorations (untouched) ─── */

const p = (opacity: number) => `hsla(161, 93%, 30%, ${opacity})`;
const bg = () => `hsl(var(--background))`;

const PipelineFlow = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 120" fill="none" className={className} aria-hidden="true">
    <circle cx="40" cy="60" r="12" fill={p(0.15)} stroke={p(0.3)} strokeWidth="2" />
    <circle cx="40" cy="60" r="5" fill={p(0.4)} />
    <path d="M52 60 C90 60 90 30 130 30" stroke={p(0.2)} strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="140" cy="30" r="10" fill={p(0.1)} stroke={p(0.25)} strokeWidth="2" />
    <circle cx="140" cy="30" r="4" fill={p(0.35)} />
    <path d="M52 60 C90 60 90 90 130 90" stroke={p(0.2)} strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="140" cy="90" r="10" fill={p(0.1)} stroke={p(0.25)} strokeWidth="2" />
    <circle cx="140" cy="90" r="4" fill={p(0.35)} />
    <path d="M150 30 C190 30 190 60 230 60" stroke={p(0.2)} strokeWidth="2" />
    <path d="M150 90 C190 90 190 60 230 60" stroke={p(0.2)} strokeWidth="2" />
    <circle cx="240" cy="60" r="14" fill={p(0.15)} stroke={p(0.3)} strokeWidth="2" />
    <circle cx="240" cy="60" r="6" fill={p(0.4)} />
    <path d="M254 60 L320 60" stroke={p(0.2)} strokeWidth="2" strokeDasharray="6 3" />
    <rect x="320" y="45" width="50" height="30" rx="6" fill={p(0.1)} stroke={p(0.25)} strokeWidth="2" />
    <path d="M332 55 L340 63 L355 50" stroke={p(0.4)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const GrowthCurve = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 300 150" fill="none" className={className} aria-hidden="true">
    {[0, 1, 2, 3, 4].map(i => (
      <line key={`h${i}`} x1="30" y1={30 + i * 25} x2="270" y2={30 + i * 25} stroke={p(0.05)} strokeWidth="1" />
    ))}
    {[0, 1, 2, 3, 4].map(i => (
      <line key={`v${i}`} x1={30 + i * 60} y1="30" x2={30 + i * 60} y2="130" stroke={p(0.05)} strokeWidth="1" />
    ))}
    <path d="M30 120 C60 118 90 110 120 95 C150 80 180 55 210 45 C240 35 260 30 270 28" stroke={p(0.25)} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M30 120 C60 118 90 110 120 95 C150 80 180 55 210 45 C240 35 260 30 270 28 L270 130 L30 130 Z" fill={p(0.05)} />
    {[[30, 120], [90, 110], [150, 80], [210, 45], [270, 28]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="4" fill={p(0.3)} stroke={bg()} strokeWidth="2" />
    ))}
  </svg>
);

const NetworkNodes = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" className={className} aria-hidden="true">
    <line x1="100" y1="50" x2="50" y2="110" stroke={p(0.15)} strokeWidth="1.5" />
    <line x1="100" y1="50" x2="150" y2="110" stroke={p(0.15)} strokeWidth="1.5" />
    <line x1="50" y1="110" x2="100" y2="160" stroke={p(0.15)} strokeWidth="1.5" />
    <line x1="150" y1="110" x2="100" y2="160" stroke={p(0.15)} strokeWidth="1.5" />
    <line x1="50" y1="110" x2="150" y2="110" stroke={p(0.1)} strokeWidth="1" strokeDasharray="3 3" />
    <circle cx="100" cy="50" r="16" fill={p(0.1)} stroke={p(0.2)} strokeWidth="1.5" />
    <circle cx="100" cy="50" r="6" fill={p(0.3)} />
    <circle cx="50" cy="110" r="12" fill={p(0.08)} stroke={p(0.15)} strokeWidth="1.5" />
    <circle cx="50" cy="110" r="4" fill={p(0.25)} />
    <circle cx="150" cy="110" r="12" fill={p(0.08)} stroke={p(0.15)} strokeWidth="1.5" />
    <circle cx="150" cy="110" r="4" fill={p(0.25)} />
    <circle cx="100" cy="160" r="14" fill={p(0.1)} stroke={p(0.2)} strokeWidth="1.5" />
    <circle cx="100" cy="160" r="5" fill={p(0.3)} />
  </svg>
);

const FunnelShape = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 160 200" fill="none" className={className} aria-hidden="true">
    <path d="M10 20 L150 20 L130 60 L30 60 Z" fill={p(0.12)} stroke={p(0.2)} strokeWidth="1.5" />
    <path d="M30 65 L130 65 L115 105 L45 105 Z" fill={p(0.1)} stroke={p(0.18)} strokeWidth="1.5" />
    <path d="M45 110 L115 110 L100 150 L60 150 Z" fill={p(0.08)} stroke={p(0.15)} strokeWidth="1.5" />
    <path d="M60 155 L100 155 L90 185 L70 185 Z" fill={p(0.15)} stroke={p(0.25)} strokeWidth="1.5" />
    <path d="M80 190 L80 198" stroke={p(0.3)} strokeWidth="2" strokeLinecap="round" />
    <path d="M75 195 L80 200 L85 195" stroke={p(0.3)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const DottedConnector = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 600 40" fill="none" className={className} aria-hidden="true">
    <line x1="0" y1="20" x2="600" y2="20" stroke={p(0.1)} strokeWidth="2" strokeDasharray="8 6" />
    {[0, 150, 300, 450, 600].map((cx, i) => (
      <circle key={i} cx={cx} cy="20" r="5" fill={p(0.15)} stroke={p(0.2)} strokeWidth="1.5" />
    ))}
  </svg>
);

/* ─── NEW: Real-component previews (non-interactive) ─── */

const PipelinePreview = ({ className = "" }: { className?: string }) => (
  <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
    <div className="space-y-2.5">
      <div className="flex gap-2.5">
        <div className="flex-1 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">New</p>
          <Card className="p-2.5 border-border/60">
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="bg-primary/10 text-primary text-[7px]">AC</AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium truncate">Acme Corp</span>
            </div>
            <p className="text-[9px] text-primary font-semibold mt-1">$12K</p>
          </Card>
          <Card className="p-2.5 border-border/60">
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="bg-primary/10 text-primary text-[7px]">TS</AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium truncate">TechStart</span>
            </div>
            <p className="text-[9px] text-primary font-semibold mt-1">$8.5K</p>
          </Card>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Won</p>
          <Card className="p-2.5 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-medium truncate">Success Co</span>
            </div>
            <p className="text-[9px] text-primary font-semibold mt-1">$18.5K</p>
          </Card>
        </div>
      </div>
    </div>
  </div>
);

const MetricsPreview = ({ className = "" }: { className?: string }) => (
  <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
    <div className="grid grid-cols-2 gap-2">
      <Card className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-muted-foreground">Leads</span>
          <Users className="w-3 h-3 text-primary" />
        </div>
        <p className="text-sm font-bold">1,234</p>
        <p className="text-[9px] text-primary flex items-center gap-0.5">
          <TrendingUp className="w-2.5 h-2.5" />+12%
        </p>
      </Card>
      <Card className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-muted-foreground">Revenue</span>
          <DollarSign className="w-3 h-3 text-primary" />
        </div>
        <p className="text-sm font-bold">$45.2K</p>
        <p className="text-[9px] text-primary flex items-center gap-0.5">
          <TrendingUp className="w-2.5 h-2.5" />+28%
        </p>
      </Card>
    </div>
  </div>
);

const ActivityPreview = ({ className = "" }: { className?: string }) => (
  <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
    <Card className="p-3 space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground">Recent Activity</p>
      {[
        { icon: CheckCircle2, text: "Deal Closed — $18.5K", time: "2h ago" },
        { icon: Mail, text: "Follow-up sent to Acme", time: "4h ago" },
        { icon: Clock, text: "Demo scheduled", time: "6h ago" },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <item.icon className="w-3 h-3 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-medium truncate">{item.text}</p>
            <p className="text-[7px] text-muted-foreground">{item.time}</p>
          </div>
        </div>
      ))}
    </Card>
  </div>
);

const InsightPreview = ({ className = "" }: { className?: string }) => (
  <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="w-3 h-3 text-primary" />
        </div>
        <p className="text-[10px] font-semibold">AI Insights</p>
      </div>
      <div className="space-y-1.5">
        {["Follow up Acme Corp today", "3 leads need attention", "Conversion rate ↑ 5.2%"].map((tip, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const BadgeRow = ({ className = "" }: { className?: string }) => (
  <div className={`pointer-events-none select-none flex items-center justify-center gap-3 flex-wrap ${className}`} aria-hidden="true">
    <Badge variant="default" className="text-[10px] px-3 py-1">AI Automation</Badge>
    <Badge variant="secondary" className="text-[10px] px-3 py-1">Pipeline</Badge>
    <Badge variant="outline" className="text-[10px] px-3 py-1">Insights</Badge>
    <Badge variant="secondary" className="text-[10px] px-3 py-1">Campaigns</Badge>
    <Badge variant="default" className="text-[10px] px-3 py-1">Voice AI</Badge>
  </div>
);

export {
  // SVG decorations
  PipelineFlow,
  GrowthCurve,
  NetworkNodes,
  FunnelShape,
  DottedConnector,
  // Component previews
  PipelinePreview,
  MetricsPreview,
  ActivityPreview,
  InsightPreview,
  BadgeRow,
};
