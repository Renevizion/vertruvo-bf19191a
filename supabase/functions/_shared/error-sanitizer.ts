/**
 * Sanitize error messages before returning to clients.
 * Logs the full error server-side, returns a generic message to the client.
 */

// Map known internal error patterns to safe client-facing messages
const ERROR_MAP: Record<string, string> = {
  'Agent not found': 'The requested resource was not found',
  'No LLM integration': 'AI service is not configured',
  'OpenAI error': 'AI service temporarily unavailable',
  'rate limit': 'Service is temporarily rate-limited. Please try again shortly',
  'ECONNREFUSED': 'External service is temporarily unavailable',
  'fetch failed': 'External service is temporarily unavailable',
  'timeout': 'Request timed out. Please try again',
  'invalid api key': 'Service configuration error. Contact support',
  'insufficient_quota': 'Service quota exceeded. Contact support',
  'context_length_exceeded': 'Input is too long. Please shorten your message',
};

/**
 * Returns a sanitized error message safe for client responses.
 * Always logs the full error server-side.
 */
export function sanitizeError(error: unknown, context?: string): string {
  const fullMessage = error instanceof Error ? error.message : String(error);
  
  // Always log full error server-side
  if (context) {
    console.error(`[${context}] Error:`, fullMessage);
  }

  // Check against known patterns
  const lowerMessage = fullMessage.toLowerCase();
  for (const [pattern, safeMessage] of Object.entries(ERROR_MAP)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return safeMessage;
    }
  }

  // Default generic message — never leak internals
  return 'An unexpected error occurred. Please try again or contact support.';
}

/**
 * Create a JSON error response with sanitized message and CORS headers.
 */
export function errorResponse(
  corsHeaders: Record<string, string>,
  error: unknown,
  context?: string,
  status: number = 500
): Response {
  const message = sanitizeError(error, context);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
