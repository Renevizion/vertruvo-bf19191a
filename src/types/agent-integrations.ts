// Integration configuration types for AI agents

export type IntegrationType = 
  | 'api_key'           // OpenAI, Mistral, etc - single API key
  | 'api_key_pair'      // Twilio - account SID + auth token
  | 'search_api'        // Serp API - API key
  | 'maps_api'          // Google Maps - API key
  | 'mcp'               // MCP server connection
  | 'custom_endpoint'   // Custom API - URL + optional auth
  | 'webhook';          // Webhook endpoint

export type AgentType = 'voice' | 'conversation' | 'workflow';

export interface IntegrationField {
  name: string;           // Field identifier: "api_key", "account_sid", "url", etc
  label: string;          // Display label for UI
  type: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];     // For select type
  description?: string;   // Helper text
}

export interface IntegrationConfig {
  id: string;             // Unique ID for this integration instance
  type: IntegrationType;
  name: string;           // Display name: "OpenAI", "Twilio", "Custom API", etc
  provider?: string;      // Optional: "openai", "mistral", "twilio", etc
  fields: IntegrationField[];
  platform_provided?: boolean; // If true, admin provides API keys, users don't configure
}

// Predefined integration templates
export const INTEGRATION_TEMPLATES: Record<string, Omit<IntegrationConfig, 'id'>> = {
  openai: {
    type: 'api_key',
    name: 'OpenAI',
    provider: 'openai',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        description: 'Your OpenAI API key from platform.openai.com'
      }
    ]
  },
  mistral: {
    type: 'api_key',
    name: 'Mistral AI',
    provider: 'mistral',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter Mistral API key',
        description: 'Your Mistral API key'
      }
    ]
  },
  twilio: {
    type: 'api_key_pair',
    name: 'Twilio',
    provider: 'twilio',
    fields: [
      {
        name: 'account_sid',
        label: 'Account SID',
        type: 'text',
        required: true,
        placeholder: 'AC...',
        description: 'Your Twilio Account SID'
      },
      {
        name: 'auth_token',
        label: 'Auth Token',
        type: 'password',
        required: true,
        placeholder: 'Enter auth token',
        description: 'Your Twilio Auth Token'
      }
    ]
  },
  serp: {
    type: 'search_api',
    name: 'Serp API',
    provider: 'serp',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter Serp API key',
        description: 'Your Serp API key for web search'
      }
    ]
  },
  google_maps: {
    type: 'maps_api',
    name: 'Google Maps',
    provider: 'google_maps',
    fields: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter Google Maps API key',
        description: 'Your Google Maps API key'
      }
    ]
  },
  mcp: {
    type: 'mcp',
    name: 'MCP Server',
    provider: 'mcp',
    fields: [
      {
        name: 'server_url',
        label: 'Server URL',
        type: 'url',
        required: true,
        placeholder: 'https://...',
        description: 'MCP server endpoint URL'
      },
      {
        name: 'auth_token',
        label: 'Auth Token',
        type: 'password',
        required: false,
        placeholder: 'Optional auth token',
        description: 'Authentication token if required'
      }
    ]
  },
  custom: {
    type: 'custom_endpoint',
    name: 'Custom API',
    provider: 'custom',
    fields: [
      {
        name: 'endpoint_url',
        label: 'Endpoint URL',
        type: 'url',
        required: true,
        placeholder: 'https://api.yourdomain.com',
        description: 'Your custom API endpoint'
      },
      {
        name: 'auth_method',
        label: 'Auth Method',
        type: 'select',
        required: true,
        options: ['none', 'api_key', 'bearer_token', 'basic_auth'],
        description: 'Authentication method'
      },
      {
        name: 'auth_value',
        label: 'Auth Credential',
        type: 'password',
        required: false,
        placeholder: 'Enter credential if needed',
        description: 'API key, token, or credentials'
      }
    ]
  }
};
