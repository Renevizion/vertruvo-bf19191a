// ============================================
// FIX #5: SCOPE CACHING
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: number | null = null;
  
  constructor() {
    // Start cleanup interval (every 60 seconds)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
export const scopeCache = new InMemoryCache();

// Cache key generators
export function getCacheKey(type: string, id: string, workspaceId: string): string {
  return `${type}:${workspaceId}:${id}`;
}

// Cached data fetchers
export async function getCachedLead(
  leadId: string,
  workspaceId: string,
  supabase: any
): Promise<any | null> {
  const cacheKey = getCacheKey('lead', leadId, workspaceId);
  
  // Try cache first
  const cached = scopeCache.get(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] Lead ${leadId}`);
    return cached;
  }
  
  console.log(`[Cache MISS] Lead ${leadId}`);
  
  // Fetch from database
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  
  if (!error && data) {
    scopeCache.set(cacheKey, data, 300); // 5 minutes TTL
    return data;
  }
  
  return null;
}

export async function getCachedUser(
  userId: string,
  supabase: any
): Promise<any | null> {
  const cacheKey = getCacheKey('user', userId, 'global');
  
  const cached = scopeCache.get(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] User ${userId}`);
    return cached;
  }
  
  console.log(`[Cache MISS] User ${userId}`);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (!error && data) {
    scopeCache.set(cacheKey, data, 600); // 10 minutes TTL
    return data;
  }
  
  return null;
}

// Invalidate cache for specific entities
export function invalidateLeadCache(leadId: string, workspaceId: string): void {
  const cacheKey = getCacheKey('lead', leadId, workspaceId);
  scopeCache.delete(cacheKey);
  console.log(`[Cache INVALIDATE] Lead ${leadId}`);
}

export function invalidateWorkspaceCache(workspaceId: string): void {
  // Clear all workspace-related caches
  const stats = scopeCache.getStats();
  stats.keys.forEach(key => {
    if (key.includes(workspaceId)) {
      scopeCache.delete(key);
    }
  });
  console.log(`[Cache INVALIDATE] Workspace ${workspaceId}`);
}
