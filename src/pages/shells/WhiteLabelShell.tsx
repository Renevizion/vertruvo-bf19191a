import { Link } from "react-router-dom";
import { ShellChrome } from "@/shells/ShellChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Globe, Layers } from "lucide-react";

/**
 * /shell/wl — internal explainer route.
 * Real white-label surfaces live at /k/:slug, configured via /admin/shells/manage.
 */
export default function WhiteLabelShell() {
  return (
    <ShellChrome
      shell="wl"
      title="White-Label Studio"
      subtitle="Same engine. Their paint. One source of truth."
      accent="bg-gradient-to-br from-rose-500 to-rose-700"
    >
      <section aria-label="White-label overview" className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">How white-label works here</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>Every reseller surface is a <strong>shell instance</strong> at <code>/k/:slug</code>.</li>
              <li>Set their <strong>brand name</strong> and <strong>logo</strong> — "Thermi" is replaced everywhere in that shell.</li>
              <li>Pick only the capabilities they need. Reorder tiles. Publish.</li>
              <li>You keep <strong>one</strong> codebase. Animations, fixes, new capabilities flow to every reseller automatically.</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link to="/admin/shells/manage">Open Shell Studio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/shells">Shell telemetry</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3">
          <Info icon={<Palette className="h-4 w-4" />} title="Their brand" desc="Brand name, logo, accent color, footer note, support email — applied to the live shell." />
          <Info icon={<Layers className="h-4 w-4" />} title="Their capabilities" desc="Pick from the universal registry. Drag to reorder. Hide what they don't need." />
          <Info icon={<Globe className="h-4 w-4" />} title="Their URL" desc="Ships at /k/their-slug. Drop on a domain or hand off the link. No signup needed." />
        </div>
      </section>
    </ShellChrome>
  );
}

function Info({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="p-1.5 rounded bg-primary/10 text-primary">{icon}</span>
          {title}
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
