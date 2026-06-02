// ============================================
// FIX #6: RATE LIMITING ON WORKFLOW TRIGGERS
// ============================================

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // time window in milliseconds
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: number | null = null;
  
  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    // No entry or expired, create new
    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }
    
    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }
    
    // Increment count
    entry.count++;
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }
  
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
  
  reset(key: string): void {
    this.limits.delete(key);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  WORKFLOW_EXECUTION: {
    maxRequests: 100, // 100 executions
    windowMs: 60000, // per minute
  },
  WORKFLOW_TRIGGER: {
    maxRequests: 500, // 500 triggers
    windowMs: 60000, // per minute
  },
  API_CALL: {
    maxRequests: 1000, // 1000 API calls
    windowMs: 60000, // per minute
  },
};

// Rate limit key generators
export function getWorkspaceRateLimitKey(workspaceId: string, type: string): string {
  return `ratelimit:${type}:${workspaceId}`;
}

export function getWorkflowRateLimitKey(workflowId: string): string {
  return `ratelimit:workflow:${workflowId}`;
}

// Rate limit checker
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  return rateLimiter.check(key, config);
}

// Rate limit error
export class RateLimitError extends Error {
  constructor(
    public remaining: number,
    public resetAt: number,
    message: string = 'Rate limit exceeded'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Rate limit middleware
export function enforceRateLimit(
  key: string,
  config: RateLimitConfig
): void {
  const result = checkRateLimit(key, config);
  
  if (!result.allowed) {
    const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new RateLimitError(
      result.remaining,
      result.resetAt,
      `Rate limit exceeded. Try again in ${resetIn} seconds.`
    );
  }
  
  console.log(`[Rate Limit] ${key}: ${result.remaining} remaining`);
}
