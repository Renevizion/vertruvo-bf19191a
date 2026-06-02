import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Import all the new utilities
import {
  WorkflowScope,
  validateBaseScope,
  createVersionedScope,
  migrateScope,
  sanitizeScope,
  logScope,
  CURRENT_SCOPE_VERSION,
} from "../_shared/scope-validation.ts";

import {
  executeWithRetry,
  executeNodeWithErrorBoundary,
  ExecutionResult,
  DEFAULT_RETRY_CONFIG,
} from "../_shared/error-recovery.ts";

import {
  scopeCache,
  getCachedLead,
  invalidateLeadCache,
} from "../_shared/caching.ts";

import {
  enforceRateLimit,
  RATE_LIMITS,
  getWorkflowRateLimitKey,
  RateLimitError,
} from "../_shared/rate-limiting.ts";

import {
  enrichScope,
  EnrichmentLevel,
} from "../_shared/scope-enrichment.ts";

import {
  auditLogger,
  logWorkflowExecution,
  logScopeChange,
  detectChanges,
} from "../_shared/audit-logging.ts";

import {
  telemetry,
  createInstrumentedScope,
} from "../_shared/telemetry.ts";

import {
  getFeatureFlags,
  isFeatureEnabled,
} from "../_shared/feature-flags.ts";

import {
  detectUserLocale,
  t,
  localizeTemplate,
  SupportedLocale,
} from "../_shared/i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Node {
  id: string;
  type: string;
  data: {
    label: string;
    config?: any;
    triggerType?: string;
    actionType?: string;
    conditionType?: string;
  };
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth gate: require either service-role token (internal invocation from
    // workflow-trigger) or an authenticated user who is a member of the
    // workflow's workspace.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseKey;
    let callerUserId: string | null = null;
    if (!isServiceRole) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerUserId = userData.user.id;
    }

    const { workflowId, triggerData: rawTriggerData } = await req.json();

    if (!isServiceRole && callerUserId) {
      const { data: wf } = await supabase
        .from("workflows")
        .select("workspace_id")
        .eq("id", workflowId)
        .single();
      if (!wf) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isMember } = await supabase.rpc("is_workspace_member", {
        _workspace_id: wf.workspace_id,
        _user_id: callerUserId,
      });
      const { data: isOwner } = await supabase.rpc("is_workspace_owner", {
        _workspace_id: wf.workspace_id,
        _user_id: callerUserId,
      });
      if (!isMember && !isOwner) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Sanitize triggerData: only allow known safe fields to prevent scope pollution
    const allowedTriggerFields = [
      'workspace_id', 'lead_id', 'contact_id', 'form_id', 'user_id',
      'lead', 'contact', 'form', 'email', 'phone', 'name',
      'source', 'stage_id', 'pipeline_id', 'value',
    ];
    const triggerData: Record<string, unknown> = {};
    if (rawTriggerData && typeof rawTriggerData === 'object' && !Array.isArray(rawTriggerData)) {
      for (const key of allowedTriggerFields) {
        if (key in rawTriggerData) {
          const val = rawTriggerData[key];
          // Allow strings (max 2000 chars), numbers, booleans, and plain objects
          if (typeof val === 'string') {
            triggerData[key] = val.slice(0, 2000);
          } else if (typeof val === 'number' || typeof val === 'boolean') {
            triggerData[key] = val;
          } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            // Shallow sanitize nested objects (lead, contact, form)
            const sanitized: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
              if (typeof v === 'string') sanitized[k] = (v as string).slice(0, 2000);
              else if (typeof v === 'number' || typeof v === 'boolean' || v === null) sanitized[k] = v;
            }
            triggerData[key] = sanitized;
          }
        }
      }
    }

    // Track workflow execution start
    const executionStartTime = Date.now();
    
    // FIX #6: Rate limiting
    try {
      enforceRateLimit(
        getWorkflowRateLimitKey(workflowId),
        RATE_LIMITS.WORKFLOW_EXECUTION
      );
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(
          JSON.stringify({ 
            error: error.message,
            resetAt: error.resetAt,
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((error.resetAt - Date.now()) / 1000)),
            } 
          }
        );
      }
      throw error;
    }

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError) throw workflowError;

    // FIX #1 & #2: Validate and version scope
    let scope = createVersionedScope({
      workspace_id: triggerData.workspace_id || workflow.workspace_id,
      trigger_type: workflow.trigger_type,
      ...triggerData,
    });

    // Migrate scope if needed (for backward compatibility)
    scope = migrateScope(scope);

    // IMPORTANT: We use validateBaseScope (not validateWorkflowScope) because:
    // - Different triggers provide different data (form has form.*, manual trigger might not have lead.*)
    // - Different actions need different data (email needs email, task needs title)
    // - Runtime validation at action execution is more accurate and flexible
    // This approach is CORRECT for production - validate required base fields (workspace_id, trigger_type)
    // upfront, then validate action-specific requirements when executing each action node.
    const validation = validateBaseScope(scope);
    if (!validation.success) {
      console.error("[Validation] Scope validation failed:", validation.errors);
      throw new Error(`Invalid scope: ${validation.errors?.join(', ')}`);
    }

    // FIX #9: Feature flags
    const locale = detectUserLocale(req.headers.get('accept-language') || undefined);
    scope.locale = locale;
    scope.feature_flags = getFeatureFlags({
      workspaceId: scope.workspace_id,
    });

    // FIX #3: Safe logging (sanitized)
    logScope(scope, "Initial Scope");

    // FIX #10: Progressive enrichment
    const enrichmentLevel: EnrichmentLevel = isFeatureEnabled('scope_enrichment', {
      workspaceId: scope.workspace_id
    }) ? 'enhanced' : 'base';

    scope = await enrichScope(scope, {
      level: enrichmentLevel,
      includeUser: true,
      includeWorkspace: true,
      includeRelated: true,
    }, supabase);

    // Create workflow run
    const { data: run, error: runError } = await supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        trigger_data: sanitizeScope(scope), // FIX #3: Sanitize before storing
        status: "running",
      })
      .select()
      .single();

    if (runError) throw runError;

    // FIX #11: Audit log
    await logWorkflowExecution(
      workflowId,
      run.id,
      'workflow_started',
      scope.workspace_id,
      { 
        trigger_type: scope.trigger_type,
        enrichment_level: scope._enrichment_level,
      }
    );

    const executionLog: any[] = [];
    
    try {
      console.log(`[Workflow ${run.id}] Starting execution with scope v${scope._version}`);
      
      const nodes = workflow.nodes as Node[];
      const edges = workflow.edges as Edge[];
      
      // Find trigger node
      const triggerNode = nodes.find((n: Node) => n.type === "trigger");
      if (!triggerNode) throw new Error("No trigger node found");
      
      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: triggerNode.id,
        type: "trigger",
        status: "success",
        message: t('workflow.created', locale),
      });
      
      // FIX #8: Instrumented scope for telemetry
      const instrumentedScope = createInstrumentedScope(scope, workflowId, 'root');
      
      // Execute nodes starting from trigger
      await executeNode(
        triggerNode.id,
        nodes,
        edges,
        instrumentedScope,
        supabase,
        executionLog,
        workflowId,
        run.id
      );
      
      // Update run as completed
      await supabase
        .from("workflow_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          execution_log: executionLog,
        })
        .eq("id", run.id);
      
      // Track workflow execution metrics
      const executionDuration = Date.now() - executionStartTime;
      await supabase.rpc('track_workflow_execution', {
        p_workflow_id: workflowId,
        p_status: 'success',
        p_duration_ms: executionDuration,
      });

      // FIX #11: Audit log
      await logWorkflowExecution(
        workflowId,
        run.id,
        'workflow_completed',
        scope.workspace_id,
        {
          duration: executionLog.length,
          nodes_executed: executionLog.filter(l => l.type !== 'trigger').length,
        }
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          runId: run.id, 
          log: executionLog,
          telemetry: telemetry.getStats(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (execError) {
      console.error("[Workflow] Execution error:", execError);
      
      executionLog.push({
        timestamp: new Date().toISOString(),
        type: "error",
        status: "failed",
        message: execError instanceof Error ? execError.message : "Unknown error",
      });
      
      const executionDuration = Date.now() - executionStartTime;
      await supabase.rpc('track_workflow_execution', {
        p_workflow_id: workflowId,
        p_status: 'error',
        p_duration_ms: executionDuration,
        p_error: execError instanceof Error ? execError.message : 'Unknown error',
      });
      
      await supabase
        .from("workflow_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: execError instanceof Error ? execError.message : "Unknown error",
          execution_log: executionLog,
        })
        .eq("id", run.id);

      // FIX #11: Audit log
      await logWorkflowExecution(
        workflowId,
        run.id,
        'workflow_failed',
        scope.workspace_id,
        {
          error: execError instanceof Error ? execError.message : "Unknown error",
        }
      );

      // Send workflow-error notification to workspace owner
      try {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', scope.workspace_id)
          .single();
        if (ws?.owner_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', ws.owner_id)
            .single();
          if (ownerProfile?.email) {
            await supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'workflow-error',
                recipientEmail: ownerProfile.email,
                idempotencyKey: `workflow-error-${run.id}`,
                templateData: {
                  workflowName: workflow.name || 'Unnamed Workflow',
                  errorMessage: execError instanceof Error ? execError.message : 'Unknown error',
                  runId: run.id,
                },
              },
            });
          }
        }
      } catch (emailErr) {
        console.error('[Workflow] Failed to send error notification email:', emailErr);
      }
      
      throw execError;
    }
  } catch (error) {
    console.error("[Workflow] Error:", error);
    // Log to audit_logs for admin monitoring
    try {
      const { logEdgeFunctionError } = await import("../_shared/server-error-logger.ts");
      await logEdgeFunctionError("workflow-executor", error instanceof Error ? error : new Error(String(error)));
    } catch (_) { /* never block response */ }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  context: any,
  supabase: any,
  executionLog: any[],
  workflowId: string,
  runId: string
) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return;
  
  console.log(`[Node ${nodeId}] Executing: ${node.data.label} (${node.type})`);
  
  // FIX #4: Error boundary with retry
  const result = await executeNodeWithErrorBoundary(
    nodeId,
    node.data.label,
    async () => {
      if (node.type === "action") {
        return await executeAction(node, context, supabase, executionLog, workflowId, runId);
      } else if (node.type === "condition") {
        return await executeCondition(node, context, executionLog, workflowId, nodeId);
      }
      return { success: true };
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    }
  );

  // Log execution result
  if (!result.success) {
    executionLog.push({
      timestamp: new Date().toISOString(),
      nodeId: node.id,
      type: node.type,
      status: "failed",
      message: result.error?.message || "Node execution failed",
      attempts: result.attempts,
      duration: result.duration,
    });
    
    // Don't throw - continue with next nodes (graceful degradation)
    console.warn(`[Node ${nodeId}] Failed after ${result.attempts} attempts, continuing workflow`);
  }
  
  // Handle condition branching
  if (node.type === "condition" && result.data !== undefined) {
    const conditionResult = result.data as boolean;
    
    // Find edges based on condition result
    const nextEdges = edges.filter(
      (e) => e.source === nodeId && e.sourceHandle === (conditionResult ? "true" : "false")
    );
    
    for (const edge of nextEdges) {
      await executeNode(edge.target, nodes, edges, context, supabase, executionLog, workflowId, runId);
    }
    return;
  }
  
  // Find next nodes
  const nextEdges = edges.filter((e) => e.source === nodeId);
  for (const edge of nextEdges) {
    await executeNode(edge.target, nodes, edges, context, supabase, executionLog, workflowId, runId);
  }
}

async function executeAction(
  node: Node, 
  context: any, 
  supabase: any, 
  executionLog: any[],
  workflowId: string,
  runId: string
): Promise<any> {
  const config = node.data.config || {};
  const actionType = node.data.actionType || node.data.label;
  
  switch (actionType) {
    case "Create Lead":
    case "create_lead": {
      const leadData = {
        name: replaceVariables(config.leadName || "New Lead", context),
        email: replaceVariables(config.email, context),
        phone: replaceVariables(config.phone, context),
        workspace_id: context.workspace_id,
      };
      
      const { data, error } = await supabase.from("leads").insert(leadData).select();
      if (error) throw error;
      
      // FIX #5: Invalidate cache
      invalidateLeadCache(data[0].id, context.workspace_id);
      
      // FIX #11: Audit log
      await logScopeChange(
        workflowId,
        runId,
        node.id,
        'lead',
        data[0].id,
        [{ field: 'created', oldValue: null, newValue: leadData }],
        context.workspace_id
      );
      
      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        type: "action",
        status: "success",
        message: t('lead.created', context.locale || 'en-US'),
        data: data[0],
      });
      break;
    }
    
    case "Create Task":
    case "create_task": {
      const taskData = {
        title: replaceVariables(config.title || "New Task", context),
        description: replaceVariables(config.description, context),
        workspace_id: context.workspace_id,
        status: "pending",
      };
      
      const { data, error } = await supabase.from("tasks").insert(taskData).select();
      if (error) throw error;
      
      // FIX #11: Audit log
      await logScopeChange(
        workflowId,
        runId,
        node.id,
        'task',
        data[0].id,
        [{ field: 'created', oldValue: null, newValue: taskData }],
        context.workspace_id
      );
      
      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        type: "action",
        status: "success",
        message: t('task.assigned', context.locale || 'en-US'),
      });
      break;
    }
    
    case "Update Lead Status":
    case "update_lead":
    case "move_lead_stage": {
      if (context.lead_id || context.lead?.id) {
        const leadId = context.lead_id || context.lead?.id;
        
        // Get old value for audit
        const oldLead = await getCachedLead(leadId, context.workspace_id, supabase);
        
        const { error } = await supabase
          .from("leads")
          .update({ stage_id: config.stageId || config.status })
          .eq("id", leadId);
        
        if (error) throw error;
        
        // FIX #5: Invalidate cache
        invalidateLeadCache(leadId, context.workspace_id);
        
        // FIX #11: Audit log
        if (oldLead) {
          await logScopeChange(
            workflowId,
            runId,
            node.id,
            'lead',
            leadId,
            detectChanges(oldLead, { ...oldLead, stage_id: config.stageId || config.status }),
            context.workspace_id
          );
        }
        
        executionLog.push({
          timestamp: new Date().toISOString(),
          nodeId: node.id,
          type: "action",
          status: "success",
          message: `Updated lead status`,
        });
      }
      break;
    }
    
    case "Send Notification":
    case "send_notification": {
      // Create a task as notification
      const notificationTask = {
        title: localizeTemplate(
          config.title || node.data.label,
          context.locale || 'en-US',
          context
        ),
        description: localizeTemplate(
          config.message || "Workflow notification",
          context.locale || 'en-US',
          context
        ),
        workspace_id: context.workspace_id,
        status: "pending",
      };
      
      await supabase.from("tasks").insert(notificationTask);
      
      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        type: "action",
        status: "success",
        message: t('notification.sent', context.locale || 'en-US'),
      });
      break;
    }
    
    case "Send Email":
    case "Send Welcome Email":
    case "send_email":
    case "send_welcome_email": {
      // Validate required config
      if (!config.toEmail || !config.subject || !config.message) {
        throw new Error("Email action requires toEmail, subject, and message configuration");
      }

      const toEmail = replaceVariables(config.toEmail, context);
      const subject = replaceVariables(config.subject, context);
      const message = replaceVariables(config.message, context);

      // Call send-workflow-email edge function
      const { error: emailError } = await supabase.functions.invoke('send-workflow-email', {
        body: {
          workspaceId: context.workspace_id,
          to: toEmail,
          subject: subject,
          body: message,
          fromEmail: config.fromEmail ? replaceVariables(config.fromEmail, context) : undefined,
          fromName: config.fromName ? replaceVariables(config.fromName, context) : undefined,
        },
      });

      if (emailError) throw emailError;

      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        type: "action",
        status: "success",
        message: `Email sent to ${toEmail}`,
      });
      break;
    }
    
    case "Assign to New Lead Pipeline":
    case "Assign to Pipeline":
    case "assign_to_pipeline": {
      // Validate lead exists in context
      const leadId = context.lead_id || context.lead?.id;
      if (!leadId) {
        throw new Error("Assign to Pipeline action requires a lead in the workflow context");
      }

      // Validate pipeline config
      if (!config.pipelineId) {
        throw new Error("Pipeline assignment requires pipelineId configuration");
      }

      const { error } = await supabase
        .from("leads")
        .update({ 
          pipeline_id: config.pipelineId,
          stage_id: config.stageId || null,
        })
        .eq("id", leadId);

      if (error) throw error;

      // Invalidate cache
      invalidateLeadCache(leadId, context.workspace_id);

      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        type: "action",
        status: "success",
        message: `Lead assigned to pipeline ${config.pipelineId}`,
      });
      break;
    }
    
    case "Create Follow-up Task":
    case "create_followup_task": {
      // This is an alias for Create Task with better naming
      const taskData = {
        title: replaceVariables(config.title || "Follow-up Task", context),
        description: replaceVariables(config.description || "", context),
        workspace_id: context.workspace_id,
        status: "pending",
        due_date: config.dueDate ? new Date(config.dueDate).toISOString() : null,
        assigned_to: config.assigneeId ? replaceVariables(config.assigneeId, context) : null,
        lead_id: context.lead_id || context.lead?.id || null,
      };

      const { data, error } = await supabase.from("tasks").insert(taskData).select();
      if (error) throw error;

      // Audit log
      await logScopeChange(
        workflowId,
        runId,
        node.id,
        'task',
        data[0].id,
        [{ field: 'created', oldValue: null, newValue: taskData }],
        context.workspace_id
      );

      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        type: "action",
        status: "success",
        message: `Follow-up task created: ${taskData.title}`,
      });
      break;
    }
    
    default:
      executionLog.push({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        type: "action",
        status: "skipped",
        message: `Action type '${actionType}' not yet implemented`,
      });
  }
}

async function executeCondition(
  node: Node, 
  context: any, 
  executionLog: any[],
  workflowId: string,
  nodeId: string
): Promise<boolean> {
  const config = node.data.config || {};
  const conditionType = node.data.conditionType || node.data.label;
  
  let result = false;
  let message = "";
  
  switch (conditionType) {
    case "Lead Value > Amount":
    case "lead_value_check": {
      const leadValue = context.lead?.value || 0;
      const threshold = parseFloat(config.value) || 0;
      result = leadValue > threshold;
      message = `Lead value ${leadValue} ${result ? ">" : "<="} ${threshold}`;
      break;
    }
    
    case "Lead Source Is":
    case "lead_source_check": {
      result = context.lead?.source === config.value;
      message = `Lead source ${result ? "matches" : "doesn't match"} ${config.value}`;
      break;
    }
    
    case "Lead Stage Is":
    case "lead_stage_check": {
      result = context.lead?.stage_id === config.value;
      message = `Lead stage ${result ? "matches" : "doesn't match"}`;
      break;
    }
    
    case "Has Email":
    case "field_empty": {
      result = !!(context.lead?.email || context.contact?.email || context.form?.email);
      message = `Email ${result ? "present" : "missing"}`;
      break;
    }
    
    case "Has Phone":
      result = !!(context.lead?.phone || context.contact?.phone || context.form?.phone);
      message = `Phone ${result ? "present" : "missing"}`;
      break;
    
    default:
      result = true;
      message = `Condition '${conditionType}' not implemented - defaulting to true`;
  }
  
  executionLog.push({
    timestamp: new Date().toISOString(),
    nodeId: node.id,
    type: "condition",
    status: "success",
    message,
    result,
  });
  
  return result;
}

function replaceVariables(template: string | undefined, context: any): string {
  if (!template) return "";
  
  let result = template;
  
  // Replace {lead.field}, {form.field}, {contact.field}
  const regex = /{(\w+)\.(\w+)}/g;
  result = result.replace(regex, (match, object, field) => {
    // FIX #8: Track field access
    telemetry.trackFieldAccess(context.workflow_id || 'unknown', 'variable-replacement', `${object}.${field}`, 'read');
    
    return context[object]?.[field] || match;
  });
  
  return result;
}
