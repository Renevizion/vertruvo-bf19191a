// ============================================
// FIX #4: ERROR RECOVERY IN WORKFLOWS
// ============================================

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number; // exponential backoff
  retryableErrors?: string[]; // specific errors to retry
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'RATE_LIMIT_EXCEEDED',
  ],
};

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: Error;
  attempts: number;
  duration: number;
}

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = 'operation'
): Promise<ExecutionResult> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`[${context}] Attempt ${attempt}/${retryConfig.maxRetries}`);
      
      const result = await fn();
      const duration = Date.now() - startTime;
      
      console.log(`[${context}] Success after ${attempt} attempt(s) in ${duration}ms`);
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        duration,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`[${context}] Attempt ${attempt} failed:`, lastError.message);
      
      // Check if error is retryable
      const isRetryable = retryConfig.retryableErrors?.some(
        errType => lastError?.message.includes(errType)
      ) ?? true;
      
      // If last attempt or non-retryable error, give up
      if (attempt === retryConfig.maxRetries || !isRetryable) {
        const duration = Date.now() - startTime;
        console.error(`[${context}] Failed after ${attempt} attempt(s)`);
        
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          duration,
        };
      }
      
      // Calculate delay with exponential backoff
      const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
      console.log(`[${context}] Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but TypeScript wants it
  const duration = Date.now() - startTime;
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: retryConfig.maxRetries,
    duration,
  };
}

// Error boundary wrapper for node execution
export async function executeNodeWithErrorBoundary<T>(
  nodeId: string,
  nodeName: string,
  fn: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>
): Promise<ExecutionResult> {
  try {
    return await executeWithRetry(fn, retryConfig, `Node: ${nodeName} (${nodeId})`);
  } catch (error) {
    // This shouldn't happen as executeWithRetry catches everything
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: 1,
      duration: 0,
    };
  }
}

// Graceful degradation helper
export async function executeWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  context: string = 'operation'
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    console.warn(`[${context}] Primary execution failed, using fallback:`, error);
    return await fallback();
  }
}
