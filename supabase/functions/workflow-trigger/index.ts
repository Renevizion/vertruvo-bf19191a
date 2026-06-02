import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { queueWorkflowExecution } from "../_shared/execution-queue.ts";
import { enforceRateLimit, RATE_LIMITS, getWorkspaceRateLimitKey } from "../_shared/rate-limiting.ts";
import { isFeatureEnabled } from "../_shared/feature-flags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Allow both user JWT auth and service-role auth (for internal triggers like form-submit)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Check if this is a service-role call (internal trigger from other edge functions)
    const isServiceRole = token === supabaseServiceKey;
    let callerUserId: string | null = null;
    
    if (!isServiceRole) {
      // Verify as user JWT
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      callerUserId = user.id;
    }

    const { triggerType, data } = await req.json();

    console.log("Trigger received:", triggerType, data);

    // Get workspace_id from data to scope query
    const workspaceId = data?.workspace_id;

    // Cross-workspace protection: regular users may only trigger workflows
    // in workspaces they belong to.
    if (!isServiceRole && callerUserId && workspaceId) {
      const { data: isMember } = await supabase.rpc("is_workspace_member", {
        _workspace_id: workspaceId,
        _user_id: callerUserId,
      });
      const { data: isOwner } = await supabase.rpc("is_workspace_owner", {
        _workspace_id: workspaceId,
        _user_id: callerUserId,
      });
      if (!isMember && !isOwner) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (!isServiceRole && !workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active workflows with matching trigger, scoped to workspace
    let query = supabase
      .from("workflows")
      .select("*")
      .eq("is_active", true);
    
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: workflows, error } = await query;

    if (error) throw error;

    const matchingWorkflows = workflows.filter((w: any) => {
      const nodes = w.nodes || [];
      const triggerNode = nodes.find((n: any) => n.type === "trigger");
      
      if (!triggerNode) return false;
      
      // Match trigger types
      const nodeTriggerType = triggerNode.data?.triggerType || "";
      
      switch (triggerType) {
        case "lead_created":
          return nodeTriggerType === "lead_created" || 
                 triggerNode.data?.label === "New Lead Created";
        case "form_submitted":
          return nodeTriggerType === "form_submitted" || 
                 triggerNode.data?.label === "Form Submitted";
        case "call_completed":
          return nodeTriggerType === "call_completed" || 
                 triggerNode.data?.label === "Call Completed";
        case "lead_updated":
          return nodeTriggerType === "lead_updated" || 
                 triggerNode.data?.label === "Lead Status Changed";
        case "task_created":
          return nodeTriggerType === "task_created" || 
                 triggerNode.data?.label === "Task Created";
        case "contact_created":
          return nodeTriggerType === "contact_created" || 
                 triggerNode.data?.label === "Contact Created";
        default:
          return false;
      }
    });

    console.log(`Found ${matchingWorkflows.length} matching workflows`);

    // Rate limiting
    if (matchingWorkflows.length > 0) {
      const workspaceId = matchingWorkflows[0].workspace_id;
      enforceRateLimit(
        getWorkspaceRateLimitKey(workspaceId, 'trigger'),
        RATE_LIMITS.WORKFLOW_TRIGGER
      );
    }

    // Check if async execution is enabled
    const useAsyncExecution = matchingWorkflows.length > 0 && 
      isFeatureEnabled('async_execution', { workspaceId: matchingWorkflows[0].workspace_id });

    if (useAsyncExecution) {
      // Queue workflows for async execution
      const jobIds = await Promise.all(
        matchingWorkflows.map((workflow: any) =>
          queueWorkflowExecution(
            workflow.id,
            { workspace_id: workflow.workspace_id, ...data },
            0 // default priority
          )
        )
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          triggered: matchingWorkflows.length,
          workflows: matchingWorkflows.map((w: any) => w.id),
          jobIds,
          async: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Execute synchronously (legacy mode)
      const executionPromises = matchingWorkflows.map((workflow: any) => {
        return supabase.functions.invoke('workflow-executor', {
          body: {
            workflowId: workflow.id,
            triggerData: {
              workspace_id: workflow.workspace_id,
              ...data,
            }
          }
        });
      });

      await Promise.all(executionPromises);

      return new Response(
        JSON.stringify({ 
          success: true, 
          triggered: matchingWorkflows.length,
          workflows: matchingWorkflows.map((w: any) => w.id),
          async: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Trigger error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
