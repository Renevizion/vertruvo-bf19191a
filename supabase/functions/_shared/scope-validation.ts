// ============================================
// FIX #1: SCOPE VALIDATION LAYER (Zod Schemas)
// ============================================

// Zod-like validation without external dependencies
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Base scope schema
export interface BaseScope {
  _version: string;
  _timestamp: string;
  _enrichment_level: 'base' | 'enhanced' | 'full';
  workspace_id: string;
  trigger_type: string;
  locale?: string;
  feature_flags?: Record<string, boolean>;
}

// Lead scope
export interface LeadScope extends BaseScope {
  lead?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    value?: number;
    source?: string;
    stage_id?: string;
    company?: string;
    notes?: string;
  };
}

// Form scope
export interface FormScope extends BaseScope {
  form?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    [key: string]: any;
  };
}

// Contact scope
export interface ContactScope extends BaseScope {
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

// Unified workflow scope
export type WorkflowScope = BaseScope & Partial<LeadScope> & Partial<FormScope> & Partial<ContactScope> & {
  task?: {
    id: string;
    title: string;
    description?: string;
  };
  call?: {
    id: string;
    phone_number: string;
    duration?: number;
    status: string;
  };
  user?: {
    id: string;
    name?: string;
    email?: string;
    timezone?: string;
  };
  workspace?: {
    id: string;
    name: string;
    owner_id: string;
  };
  ai_insights?: Array<{
    type: string;
    content: any;
    model?: string;
    created_at: string;
  }>;
  // Allow for dynamic properties from enrichment
  [key: string]: any;
};

// Validation functions
export function validateBaseScope(data: any): ValidationResult<BaseScope> {
  const errors: string[] = [];
  
  if (!data._version || typeof data._version !== 'string') {
    errors.push('_version is required and must be a string');
  }
  
  if (!data.workspace_id || typeof data.workspace_id !== 'string') {
    errors.push('workspace_id is required and must be a string');
  }
  
  if (!data.trigger_type || typeof data.trigger_type !== 'string') {
    errors.push('trigger_type is required and must be a string');
  }
  
  if (data.locale && typeof data.locale !== 'string') {
    errors.push('locale must be a string');
  }
  
  if (data.feature_flags && typeof data.feature_flags !== 'object') {
    errors.push('feature_flags must be an object');
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, data: data as BaseScope };
}

export function validateWorkflowScope(data: any): ValidationResult<WorkflowScope> {
  const baseValidation = validateBaseScope(data);
  
  if (!baseValidation.success) {
    return baseValidation;
  }
  
  // Skip entity validation - workflows can run without complete entity data
  // Validation will happen at action execution time if needed
  return { success: true, data: data as WorkflowScope };
}

// ============================================
// FIX #2: SCOPE VERSIONING
// ============================================

export const CURRENT_SCOPE_VERSION = '1.0.0';

export function createVersionedScope(data: Partial<WorkflowScope>): WorkflowScope {
  return {
    _version: CURRENT_SCOPE_VERSION,
    _timestamp: new Date().toISOString(),
    _enrichment_level: 'base',
    workspace_id: data.workspace_id || '',
    trigger_type: data.trigger_type || 'unknown',
    locale: data.locale || 'en-US',
    feature_flags: data.feature_flags || {},
    ...data,
  };
}

// Migration system for scope evolution
export function migrateScope(scope: any): WorkflowScope {
  const version = scope._version || '0.0.0';
  
  // Migration from 0.0.0 to 1.0.0
  if (version === '0.0.0' || !scope._version) {
    return createVersionedScope({
      ...scope,
      _version: '1.0.0',
      _timestamp: scope._timestamp || new Date().toISOString(),
      _enrichment_level: 'base',
      locale: scope.locale || 'en-US',
      feature_flags: scope.feature_flags || {},
    });
  }
  
  // Future migrations would go here
  // if (version === '1.0.0') { ... migrate to 2.0.0 ... }
  
  return scope as WorkflowScope;
}

// ============================================
// FIX #3: SCOPE SANITIZATION FOR LOGGING
// ============================================

const SENSITIVE_FIELDS = [
  'password', 'token', 'api_key', 'secret', 'ssn', 
  'credit_card', 'cvv', 'pin', 'access_token', 'refresh_token'
];

export function sanitizeScope(scope: WorkflowScope): WorkflowScope {
  const sanitized = JSON.parse(JSON.stringify(scope));
  
  // Recursively sanitize sensitive fields
  function sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive field names
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    
    return obj;
  }
  
  return sanitizeObject(sanitized);
}

// Safe logging helper
export function logScope(scope: WorkflowScope, context: string) {
  console.log(`[${context}]`, sanitizeScope(scope));
}
