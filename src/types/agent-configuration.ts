// Enhanced agent configuration types for comprehensive agent building

export type DataScope = 
  | 'workflows'
  | 'leads'
  | 'contacts'
  | 'tasks'
  | 'activities'
  | 'forms'
  | 'pipelines'
  | 'opportunities'
  | 'messages'
  | 'emails'
  | 'all';

export type BehaviorMode = 
  | 'assistant' // Helpful, conversational
  | 'executor' // Action-focused, minimal talk
  | 'analyzer' // Data analysis and insights
  | 'validator' // Checks and validates data
  | 'custom'; // User-defined behavior

export interface DataAccessConfig {
  scopes: DataScope[];
  read_only: boolean;
  filter_by_workspace: boolean;
  max_records?: number;
}

export interface InputSchema {
  type: 'text' | 'json' | 'form_data' | 'file';
  required_fields?: string[];
  validation_rules?: Record<string, any>;
  example?: string;
}

export interface OutputSchema {
  type: 'text' | 'json' | 'structured' | 'action';
  format?: string;
  include_metadata?: boolean;
  example?: string;
}

export interface BehaviorConfig {
  mode: BehaviorMode;
  personality?: string;
  response_style?: 'concise' | 'detailed' | 'technical' | 'friendly';
  max_response_tokens?: number;
  temperature?: number;
  custom_rules?: string[];
}

export interface ToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  parameters?: Record<string, any>;
}

export interface EnhancedAgentConfig {
  // Core agent info
  name: string;
  type: 'voice' | 'conversation' | 'workflow';
  description: string;
  category: string;
  
  // Instructions & greeting
  greeting: string;
  instructions: string;
  
  // Data access & scopes
  data_access: DataAccessConfig;
  
  // Input/output configuration
  input_schema: InputSchema;
  output_schema: OutputSchema;
  
  // Behavior configuration
  behavior: BehaviorConfig;
  
  // Available tools (search, email, database, etc.)
  tools: ToolConfig[];
  
  // Integration requirements (from existing system)
  integrations?: any[];
  
  // Context and memory
  use_memory?: boolean;
  memory_retention_days?: number;
  
  // Pre-configured for specific workflows
  workflow_presets?: {
    trigger_on?: string[];
    auto_actions?: string[];
    data_transformations?: Record<string, any>;
  };
}

// Preset configurations for common agent types
export const AGENT_PRESETS: Record<string, Partial<EnhancedAgentConfig>> = {
  lead_qualifier: {
    name: "Lead Qualifier",
    description: "Analyzes leads and scores them based on criteria",
    category: "lead_management",
    data_access: {
      scopes: ['leads', 'contacts', 'activities'],
      read_only: false,
      filter_by_workspace: true,
      max_records: 100
    },
    behavior: {
      mode: 'analyzer',
      response_style: 'technical',
      max_response_tokens: 500
    },
    tools: [
      { name: 'score_lead', description: 'Calculate lead score', enabled: true },
      { name: 'update_lead', description: 'Update lead status', enabled: true }
    ]
  },
  
  workflow_executor: {
    name: "Workflow Executor",
    description: "Executes workflow actions based on triggers",
    category: "automation",
    data_access: {
      scopes: ['workflows', 'leads', 'tasks'],
      read_only: false,
      filter_by_workspace: true
    },
    behavior: {
      mode: 'executor',
      response_style: 'concise',
      max_response_tokens: 200
    },
    tools: [
      { name: 'execute_workflow', description: 'Run workflow steps', enabled: true },
      { name: 'create_task', description: 'Create follow-up task', enabled: true },
      { name: 'send_email', description: 'Send automated email', enabled: true }
    ]
  },
  
  customer_support: {
    name: "Customer Support Agent",
    description: "Handles customer inquiries and support tickets",
    category: "support",
    data_access: {
      scopes: ['contacts', 'messages', 'activities'],
      read_only: false,
      filter_by_workspace: true
    },
    behavior: {
      mode: 'assistant',
      personality: 'Friendly, patient, and solution-oriented',
      response_style: 'friendly',
      max_response_tokens: 800
    },
    tools: [
      { name: 'search_knowledge', description: 'Search knowledge base', enabled: true },
      { name: 'create_ticket', description: 'Create support ticket', enabled: true },
      { name: 'send_message', description: 'Reply to customer', enabled: true }
    ],
    use_memory: true,
    memory_retention_days: 30
  },
  
  data_analyst: {
    name: "Data Analyst",
    description: "Analyzes workspace data and generates insights",
    category: "general",
    data_access: {
      scopes: ['all'],
      read_only: true,
      filter_by_workspace: true,
      max_records: 1000
    },
    behavior: {
      mode: 'analyzer',
      response_style: 'detailed',
      max_response_tokens: 1200
    },
    tools: [
      { name: 'query_database', description: 'Run data queries', enabled: true },
      { name: 'generate_chart', description: 'Create visualizations', enabled: true },
      { name: 'export_report', description: 'Export analysis', enabled: true }
    ]
  }
};
