import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormPreview } from "./FormPreview";

interface FormEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    id: string;
    name: string;
    description: string | null;
    fields: any[];
  };
}

export function FormEmbedDialog({ open, onOpenChange, form }: FormEmbedDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const embedCode = `<!-- Embed this code on your website -->
<div id="crm-form-${form.id}"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script>
(async function() {
  const formId = '${form.id}';
  const SUPABASE_URL = '${import.meta.env.VITE_SUPABASE_URL}';
  const SUPABASE_ANON_KEY = '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}';

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  async function selectVariant() {
    try {
      const res = await fetch(\`\${SUPABASE_URL}/rest/v1/form_ab_tests?form_id=eq.\${formId}&is_active=eq.true&select=*\`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` }
      });
      const variants = await res.json();
      if (!variants || variants.length === 0) return null;
      const random = Math.random() * 100;
      let cumulative = 0;
      for (const variant of variants) {
        cumulative += variant.traffic_percentage || 0;
        if (random < cumulative) return variant;
      }
      return variants[0];
    } catch (e) { return null; }
  }

  const variant = await selectVariant();
  const sessionId = \`session_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  const startTime = Date.now();

  const formRes = await fetch(\`\${SUPABASE_URL}/rest/v1/forms?id=eq.\${formId}&is_active=eq.true&select=*\`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` }
  });
  const forms = await formRes.json();
  const baseForm = forms[0];

  const config = variant?.variant_config || {};
  const displayDescription = config.description || baseForm.description || '';
  const displayFields = config.fields || baseForm.fields || [];
  const submitButtonText = config.submitButtonText || 'Submit';

  const formHTML = \`
    <form id="form-\${formId}" style="max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
      <h3 style="margin-bottom: 16px; font-size: 20px; font-weight: 600;">\${esc(baseForm.name)}</h3>
      \${displayDescription ? \`<p style="margin-bottom: 16px; color: #6b7280;">\${esc(displayDescription)}</p>\` : ''}
      \${displayFields.map(field => \`
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">
            \${esc(field.label)}\${field.required ? ' *' : ''}
          </label>
          \${field.type === 'textarea' ?
            \`<textarea name="\${esc(field.name)}" \${field.required ? 'required' : ''} placeholder="\${esc(field.placeholder || '')}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;" rows="4"></textarea>\` :
            \`<input type="\${esc(field.type)}" name="\${esc(field.name)}" \${field.required ? 'required' : ''} placeholder="\${esc(field.placeholder || '')}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;" />\`
          }
        </div>
      \`).join('')}
      <button type="submit" style="width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer;">
        \${esc(submitButtonText)}
      </button>
      <div id="form-message-\${formId}" style="margin-top: 16px; display: none;"></div>
    </form>
  \`;

  document.getElementById('crm-form-' + formId).innerHTML = formHTML;

  document.getElementById('form-' + formId).addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const messageDiv = document.getElementById('form-message-' + formId);
    const timeToSubmit = Math.round((Date.now() - startTime) / 1000);
    try {
      const response = await fetch(\`\${SUPABASE_URL}/functions/v1/form-submit\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\` },
        body: JSON.stringify({ formId, data, variantId: variant?.id || null, sessionId, timeToSubmit, referrer: document.referrer || null })
      });
      const result = await response.json();
      if (result.success) {
        messageDiv.style.display = 'block';
        messageDiv.style.color = '#16a34a';
        messageDiv.textContent = 'Thank you! Your submission has been received.';
        e.target.reset();
      } else { throw new Error(result.error); }
    } catch (error) {
      messageDiv.style.display = 'block';
      messageDiv.style.color = '#dc2626';
      messageDiv.textContent = 'Sorry, there was an error. Please try again.';
    }
  });
})();
</script>`;

  const reactCode = `import { useState } from 'react';

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      const response = await fetch('${import.meta.env.VITE_SUPABASE_URL}/functions/v1/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: '${form.id}', data })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('Thank you! Your submission has been received.');
        e.target.reset();
      } else { setMessage('Error: ' + result.error); }
    } catch (error) {
      setMessage('Sorry, there was an error. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <h3 className="text-xl font-semibold">${form.name}</h3>
      ${form.fields.map(field => `
      <div>
        <label className="block text-sm font-medium mb-1">
          ${field.label}${field.required ? ' *' : ''}
        </label>
        ${field.type === 'textarea' ?
          `<textarea name="${field.name}" ${field.required ? 'required' : ''} className="w-full" rows="4" />` :
          `<input type="${field.type}" name="${field.name}" ${field.required ? 'required' : ''} className="w-full" />`
        }
      </div>`).join('')}
      <button type="submit" disabled={loading} className="w-full">
        {loading ? 'Submitting...' : 'Submit'}
      </button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">
            <span className="h-1 w-1 rounded-full bg-primary" />
            Embed
          </div>
          <SheetTitle className="text-display text-2xl leading-tight">{form.name}</SheetTitle>
          <SheetDescription className="text-xs">
            Drop this snippet anywhere on your site. A/B variants and analytics flow back automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full sm:w-auto"
          >
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? "Hide" : "Show"} live preview
          </Button>

          {showPreview && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <FormPreview form={form} />
            </div>
          )}

          <Tabs defaultValue="html">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="react">React</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="space-y-3">
              <div className="relative rounded-lg border bg-muted/40">
                <pre className="p-4 pr-12 overflow-x-auto text-[11px] leading-relaxed max-h-[55vh]">
                  <code>{embedCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 h-8"
                  onClick={() => copyToClipboard(embedCode)}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste anywhere on your site. Active A/B variants route automatically and conversion is tracked per session.
              </p>
            </TabsContent>

            <TabsContent value="react" className="space-y-3">
              <div className="relative rounded-lg border bg-muted/40">
                <pre className="p-4 pr-12 overflow-x-auto text-[11px] leading-relaxed max-h-[55vh]">
                  <code>{reactCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 h-8"
                  onClick={() => copyToClipboard(reactCode)}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Drop into a Next.js, Vite, or any React project.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
