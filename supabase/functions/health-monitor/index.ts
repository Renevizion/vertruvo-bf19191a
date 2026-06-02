import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch alert rules
    const { data: configData } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'health_alerts')
      .single();

    const alertRules = configData?.value?.rules || [];
    const triggeredAlerts: any[] = [];

    // Check each alert rule
    for (const rule of alertRules) {
      if (!rule.is_active) continue;

      let currentValue = 0;

      // Fetch current metric value based on rule type
      switch (rule.metric) {
        case 'error_rate': {
          const { data: logs } = await supabase
            .from('audit_logs')
            .select('id', { count: 'exact' })
            .gte('timestamp', new Date(Date.now() - 3600000).toISOString())
            .ilike('action', '%error%');
          currentValue = logs?.length || 0;
          break;
        }
        case 'workflow_failures': {
          const { data: runs } = await supabase
            .from('workflow_runs')
            .select('id', { count: 'exact' })
            .eq('status', 'error')
            .gte('started_at', new Date(Date.now() - 3600000).toISOString());
          currentValue = runs?.length || 0;
          break;
        }
        case 'webhook_failures': {
          const { data: logs } = await supabase
            .from('webhook_logs')
            .select('id', { count: 'exact' })
            .gte('created_at', new Date(Date.now() - 3600000).toISOString())
            .or('response_status.gte.400,response_status.is.null');
          currentValue = logs?.length || 0;
          break;
        }
        case 'active_users': {
          const { data: events } = await supabase
            .from('events')
            .select('user_id')
            .gte('created_at', new Date(Date.now() - 3600000).toISOString());
          currentValue = new Set(events?.map(e => e.user_id)).size;
          break;
        }
      }

      // Check if threshold is breached
      let shouldAlert = false;
      switch (rule.operator) {
        case '>':
          shouldAlert = currentValue > rule.threshold;
          break;
        case '<':
          shouldAlert = currentValue < rule.threshold;
          break;
        case '>=':
          shouldAlert = currentValue >= rule.threshold;
          break;
        case '==':
          shouldAlert = currentValue === rule.threshold;
          break;
      }

      if (shouldAlert) {
        triggeredAlerts.push({ rule, currentValue });
        
        // Send notification
        await sendNotification(rule, currentValue);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: alertRules.length, 
        triggered: triggeredAlerts.length,
        alerts: triggeredAlerts 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Health monitor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNotification(rule: any, currentValue: number) {
  const message = `🚨 Alert: ${rule.name}\n\nMetric: ${rule.metric}\nCurrent Value: ${currentValue}\nThreshold: ${rule.operator} ${rule.threshold}\n\nAction required to investigate this issue.`;

  switch (rule.notification_channel) {
    case 'email':
      // In production, integrate with email service like Resend or SendGrid
      console.log(`[EMAIL] To: ${rule.notification_target}\n${message}`);
      break;
    
    case 'slack':
      try {
        await fetch(rule.notification_target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message })
        });
      } catch (error) {
        console.error('Slack notification failed:', error);
      }
      break;
    
    case 'webhook':
      try {
        await fetch(rule.notification_target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: rule.name,
            metric: rule.metric,
            currentValue,
            threshold: rule.threshold,
            operator: rule.operator,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Webhook notification failed:', error);
      }
      break;
  }
}
