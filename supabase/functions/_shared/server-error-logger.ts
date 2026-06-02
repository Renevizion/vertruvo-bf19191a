import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Logs edge function errors to audit_logs for admin monitoring.
 * Fire-and-forget — never throws, never blocks the response.
 */
export async function logEdgeFunctionError(
  functionName: string,
  error: Error | string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    await supabase.from("audit_logs").insert({
      action: "edge_function_error",
      entity: functionName,
      entity_id: null,
      metadata: {
        error_message: errorMessage.substring(0, 5000),
        error_stack: errorStack?.substring(0, 10000),
        context,
        reported_at: new Date().toISOString(),
        source: "server",
      },
    });

    console.error(`[${functionName}] Error logged to audit_logs: ${errorMessage.substring(0, 200)}`);
  } catch (logError) {
    // Never let logging itself break the function
    console.error(`[server-error-logger] Failed to log error:`, logError);
  }
}
