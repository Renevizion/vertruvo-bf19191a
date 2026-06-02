import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Phone, MessageSquare, Voicemail, Sparkles, ArrowRight } from "lucide-react";
import { useSandboxQuota } from "@/hooks/useSandboxQuota";

interface Props {
  /** Hide if user has BYO number or tier doesn't qualify. */
  hideWhenInactive?: boolean;
  compact?: boolean;
}

/**
 * Shows remaining free-trial calls/SMS/voicemails on the platform Twilio number
 * for Pro+ workspaces that haven't connected their own Twilio yet.
 */
export function SandboxQuotaBanner({ hideWhenInactive = true, compact = false }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useSandboxQuota();

  if (isLoading || !data) return null;
  if (hideWhenInactive && !data.isSandboxActive) return null;
  if (data.hasOwnNumber) return null;

  // Tier doesn't qualify
  if (!data.isSandboxActive && data.caps.call === 0) {
    return (
      <Card className="p-4 border-dashed bg-muted/30">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Voice & SMS available on Pro</p>
            <p className="text-xs text-muted-foreground">
              Try 10 free calls, 10 SMS and 10 voicemail drops on our number — no Twilio setup required.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/settings?tab=billing")}>Upgrade</Button>
        </div>
      </Card>
    );
  }

  const items: Array<{ key: "call" | "sms" | "voicemail"; label: string; icon: any }> = [
    { key: "call", label: "Calls", icon: Phone },
    { key: "sms", label: "SMS", icon: MessageSquare },
    { key: "voicemail", label: "Voicemails", icon: Voicemail },
  ];

  return (
    <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">Free trial — Thermi's number</p>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                Test voice & SMS instantly. Connect your own Twilio in Settings to remove limits.
              </p>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/settings?tab=integrations")}>
          Connect Twilio <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        {items.map(({ key, label, icon: Icon }) => {
          const used = data.used[key];
          const cap = data.caps[key];
          const remaining = Math.max(0, cap - used);
          const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Icon className="h-3 w-3" /> {label}
                </span>
                <span className="font-medium">{remaining} / {cap} left</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
