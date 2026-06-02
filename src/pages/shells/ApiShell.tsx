import { ShellChrome } from "@/shells/ShellChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CAPABILITIES } from "@/capabilities/registry";

export default function ApiShell() {
  const navigate = useNavigate();
  return (
    <ShellChrome
      shell="api"
      title="Thermi API"
      subtitle="Programmatic access · workspace API keys"
      accent="bg-gradient-to-br from-slate-700 to-slate-900"
      onPickCapability={(k) => {
        const cap = CAPABILITIES[k];
        if (cap?.saasPath) navigate(cap.saasPath);
        else toast.info(`${cap?.label ?? k} — see API docs`);
      }}
    >
      <section aria-label="API overview" className="space-y-3">
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">REST · Realtime · Webhooks</h2>
            <p className="text-sm text-muted-foreground">Every capability with a backing edge function is callable. Auth via workspace API key, same RLS as the SaaS shell.</p>
            <Button asChild><Link to="/api-docs">Read the docs</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-xs font-mono overflow-x-auto">
            <pre>{`curl https://api.thermi.com/v1/leads \\
  -H "Authorization: Bearer kvo_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Sarah K.","email":"sarah@example.com"}'`}</pre>
          </CardContent>
        </Card>
      </section>
    </ShellChrome>
  );
}
