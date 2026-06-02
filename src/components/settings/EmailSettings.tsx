import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, Send, ListChecks, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const EmailSettings = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Delivery
          </CardTitle>
          <CardDescription>
            Email is built into Thermi — no SMTP configuration required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Delivery active</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transactional and campaign emails send through Thermi's managed delivery network. Bounces, retries, and dead-letter handling run automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              to="/email-campaigns"
              className="group rounded-lg border p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">Email Campaigns</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Compose, schedule, and review broadcast campaigns.</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary mt-3 font-medium group-hover:gap-2 transition-all">
                Open campaigns<ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            <Link
              to="/email-lists"
              className="group rounded-lg border p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">Email Lists</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Manage subscriber lists independently of your CRM pipeline.</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary mt-3 font-medium group-hover:gap-2 transition-all">
                Manage lists<ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium">Want to send from your own domain?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Custom sender domains (e.g. <code className="text-[10px] bg-muted px-1 py-0.5 rounded">hello@yourcompany.com</code>) are configured per workspace by our team during onboarding on Pro and Enterprise plans. Reach out from{" "}
              <Link to="/support" className="text-primary underline">Support</Link>{" "}
              to get yours set up.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
