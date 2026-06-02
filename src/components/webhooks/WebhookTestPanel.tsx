import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useWebhookExecution } from '@/hooks/useWebhookExecution';
import { Send, CheckCircle, XCircle } from 'lucide-react';

interface WebhookTestPanelProps {
  webhookId: string;
  webhookUrl: string;
}

export function WebhookTestPanel({ webhookId, webhookUrl }: WebhookTestPanelProps) {
  const [testPayload, setTestPayload] = useState(JSON.stringify({
    event: 'test',
    data: { message: 'Test webhook payload' },
    timestamp: new Date().toISOString()
  }, null, 2));
  
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const { executeWebhook, isExecuting } = useWebhookExecution();

  const handleTest = () => {
    try {
      const payload = JSON.parse(testPayload);
      executeWebhook({ webhookId, payload }, {
        onSuccess: (data) => {
          setLastResult({
            success: data.success,
            message: data.success ? `Delivered on attempt ${data.attempt}` : 'Delivery failed'
          });
        },
        onError: () => {
          setLastResult({ success: false, message: 'Execution error' });
        }
      });
    } catch (e) {
      setLastResult({ success: false, message: 'Invalid JSON payload' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Test Webhook
        </CardTitle>
        <CardDescription>
          Send a test payload to <code className="text-xs bg-muted px-1 rounded">{webhookUrl}</code> to verify it's working
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Test Payload (JSON)</label>
          <Textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            className="font-mono text-xs mt-2"
            rows={8}
          />
        </div>
        
        <Button onClick={handleTest} disabled={isExecuting} className="w-full">
          {isExecuting ? 'Sending...' : 'Send Test Webhook'}
        </Button>
        
        {lastResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            lastResult.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
          }`}>
            {lastResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{lastResult.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}