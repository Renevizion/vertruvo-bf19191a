export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          lead_id: string | null
          title: string | null
          type: string
          workspace_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          title?: string | null
          type: string
          workspace_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          title?: string | null
          type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_blueprints: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          default_integrations: Json | null
          description: string | null
          greeting: string | null
          id: string
          instructions: string
          is_featured: boolean
          is_published: boolean
          name: string
          published_at: string | null
          suggested_tools: Json | null
          type: string
          updated_at: string
          version: number
          voice: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_integrations?: Json | null
          description?: string | null
          greeting?: string | null
          id?: string
          instructions: string
          is_featured?: boolean
          is_published?: boolean
          name: string
          published_at?: string | null
          suggested_tools?: Json | null
          type?: string
          updated_at?: string
          version?: number
          voice?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_integrations?: Json | null
          description?: string | null
          greeting?: string | null
          id?: string
          instructions?: string
          is_featured?: boolean
          is_published?: boolean
          name?: string
          published_at?: string | null
          suggested_tools?: Json | null
          type?: string
          updated_at?: string
          version?: number
          voice?: string | null
        }
        Relationships: []
      }
      agent_handoffs: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          agent_id: string | null
          call_log_id: string | null
          channel: string
          contact_id: string | null
          context: Json
          conversation_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          priority: string
          reason: string
          recap: Json
          resolved_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id?: string | null
          call_log_id?: string | null
          channel?: string
          contact_id?: string | null
          context?: Json
          conversation_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          priority?: string
          reason: string
          recap?: Json
          resolved_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id?: string | null
          call_log_id?: string | null
          channel?: string
          contact_id?: string | null
          context?: Json
          conversation_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          priority?: string
          reason?: string
          recap?: Json
          resolved_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_handoffs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_handoffs_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_handoffs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_handoffs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_handoffs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "agent_handoffs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_handoffs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_handoffs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_insights: {
        Row: {
          confidence_score: number | null
          content: Json
          context_id: string | null
          context_type: string
          created_at: string | null
          description: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          insight_type: string
          is_read: boolean | null
          metric_unit: string | null
          metric_value: number | null
          model_used: string | null
          recommendations: Json | null
          title: string | null
          trend: string | null
          trend_percentage: number | null
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          content: Json
          context_id?: string | null
          context_type: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type: string
          is_read?: boolean | null
          metric_unit?: string | null
          metric_value?: number | null
          model_used?: string | null
          recommendations?: Json | null
          title?: string | null
          trend?: string | null
          trend_percentage?: number | null
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          content?: Json
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type?: string
          is_read?: boolean | null
          metric_unit?: string | null
          metric_value?: number | null
          model_used?: string | null
          recommendations?: Json | null
          title?: string | null
          trend?: string | null
          trend_percentage?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_insights_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          access_count: number | null
          agent_id: string | null
          content: string
          context: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          importance_score: number | null
          last_accessed_at: string | null
          memory_type: string
          workspace_id: string | null
        }
        Insert: {
          access_count?: number | null
          agent_id?: string | null
          content: string
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type: string
          workspace_id?: string | null
        }
        Update: {
          access_count?: number | null
          agent_id?: string | null
          content?: string
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_orchestrations: {
        Row: {
          context: Json
          created_at: string
          error: string | null
          goal: string
          handoff: Json | null
          id: string
          judgement: Json | null
          plan: Json | null
          result: Json | null
          status: string
          step_count: number
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          error?: string | null
          goal: string
          handoff?: Json | null
          id?: string
          judgement?: Json | null
          plan?: Json | null
          result?: Json | null
          status?: string
          step_count?: number
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          error?: string | null
          goal?: string
          handoff?: Json | null
          id?: string
          judgement?: Json | null
          plan?: Json | null
          result?: Json | null
          status?: string
          step_count?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_orchestrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          agent_features_enabled: boolean | null
          agent_tier: string | null
          ai_provider: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          agent_features_enabled?: boolean | null
          agent_tier?: string | null
          ai_provider?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          agent_features_enabled?: boolean | null
          agent_tier?: string | null
          ai_provider?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      agent_tools: {
        Row: {
          created_at: string | null
          description: string
          display_name: string
          executor_config: Json | null
          executor_type: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          parameters_schema: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          display_name: string
          executor_config?: Json | null
          executor_type?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          parameters_schema?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          display_name?: string
          executor_config?: Json | null
          executor_type?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          parameters_schema?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_usage: {
        Row: {
          agent_id: string
          cost_usd: number | null
          created_at: string | null
          id: string
          integration_type: string
          period_end: string
          period_start: string
          template_id: string | null
          tokens_used: number | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string
        }
        Insert: {
          agent_id: string
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          integration_type: string
          period_end: string
          period_start: string
          template_id?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id: string
        }
        Update: {
          agent_id?: string
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          integration_type?: string
          period_end?: string
          period_start?: string
          template_id?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          blueprint_id: string | null
          blueprint_version: number | null
          created_at: string | null
          description: string | null
          elevenlabs_agent_id: string | null
          greeting: string | null
          id: string
          inbound_enabled: boolean
          instructions: string | null
          integration_configs: Json | null
          knowledge_base_id: string | null
          name: string
          phone_number: string | null
          status: string
          template_id: string | null
          type: string
          updated_at: string | null
          voice: string | null
          workspace_id: string | null
        }
        Insert: {
          blueprint_id?: string | null
          blueprint_version?: number | null
          created_at?: string | null
          description?: string | null
          elevenlabs_agent_id?: string | null
          greeting?: string | null
          id?: string
          inbound_enabled?: boolean
          instructions?: string | null
          integration_configs?: Json | null
          knowledge_base_id?: string | null
          name: string
          phone_number?: string | null
          status?: string
          template_id?: string | null
          type: string
          updated_at?: string | null
          voice?: string | null
          workspace_id?: string | null
        }
        Update: {
          blueprint_id?: string | null
          blueprint_version?: number | null
          created_at?: string | null
          description?: string | null
          elevenlabs_agent_id?: string | null
          greeting?: string | null
          id?: string
          inbound_enabled?: boolean
          instructions?: string | null
          integration_configs?: Json | null
          knowledge_base_id?: string | null
          name?: string
          phone_number?: string | null
          status?: string
          template_id?: string | null
          type?: string
          updated_at?: string | null
          voice?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "agent_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_evaluations: {
        Row: {
          agent_id: string | null
          contact_id: string | null
          conversation_source: string
          created_at: string
          flags: string[]
          full_transcript: Json | null
          id: string
          judge_reasoning: string | null
          judged_model: string
          rubric_breakdown: Json
          score: number
          source_ref_id: string | null
          transcript_excerpt: string
          workspace_id: string
        }
        Insert: {
          agent_id?: string | null
          contact_id?: string | null
          conversation_source: string
          created_at?: string
          flags?: string[]
          full_transcript?: Json | null
          id?: string
          judge_reasoning?: string | null
          judged_model?: string
          rubric_breakdown?: Json
          score: number
          source_ref_id?: string | null
          transcript_excerpt: string
          workspace_id: string
        }
        Update: {
          agent_id?: string | null
          contact_id?: string | null
          conversation_source?: string
          created_at?: string
          flags?: string[]
          full_transcript?: Json | null
          id?: string
          judge_reasoning?: string | null
          judged_model?: string
          rubric_breakdown?: Json
          score?: number
          source_ref_id?: string | null
          transcript_excerpt?: string
          workspace_id?: string
        }
        Relationships: []
      }
      ai_judge_rubrics: {
        Row: {
          alert_score_threshold: number
          auto_pause_on_critical: boolean
          banned_topics: string[]
          brand_voice_description: string
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          alert_score_threshold?: number
          auto_pause_on_critical?: boolean
          banned_topics?: string[]
          brand_voice_description?: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          alert_score_threshold?: number
          auto_pause_on_critical?: boolean
          banned_topics?: string[]
          brand_voice_description?: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      ai_safety_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          agent_id: string | null
          alert_type: string
          created_at: string
          detail: string | null
          evaluation_id: string | null
          id: string
          severity: string
          title: string
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id?: string | null
          alert_type: string
          created_at?: string
          detail?: string | null
          evaluation_id?: string | null
          id?: string
          severity: string
          title: string
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id?: string | null
          alert_type?: string
          created_at?: string
          detail?: string | null
          evaluation_id?: string | null
          id?: string
          severity?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_safety_alerts_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversation_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_colors: {
        Row: {
          color: string
          created_at: string | null
          id: string
          item_id: string | null
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_colors_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_colors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          assigned_staff_id: string | null
          attendee_count: number | null
          attendees: Json | null
          closed_at: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          end_time: string
          id: string
          item_id: string | null
          lead_id: string | null
          max_attendees: number | null
          notes: string | null
          resource_id: string | null
          sale_id: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          attendee_count?: number | null
          attendees?: Json | null
          closed_at?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time: string
          id?: string
          item_id?: string | null
          lead_id?: string | null
          max_attendees?: number | null
          notes?: string | null
          resource_id?: string | null
          sale_id?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          attendee_count?: number | null
          attendees?: Json | null
          closed_at?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          id?: string
          item_id?: string | null
          lead_id?: string | null
          max_attendees?: number | null
          notes?: string | null
          resource_id?: string | null
          sale_id?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          accent_color: string | null
          created_at: string | null
          font_body: string | null
          font_heading: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          business_category: string | null
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          cancellation_policy_hours: number
          city: string | null
          country: string | null
          created_at: string | null
          default_landing_page: string | null
          elevenlabs_agent_id: string | null
          enabled_modules: Json | null
          id: string
          legal_business_name: string | null
          logo_url: string | null
          portal_enabled: boolean
          postal_code: string | null
          state_province: string | null
          street_address: string | null
          timezone: string | null
          updated_at: string | null
          voice_language: string | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          business_category?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          cancellation_policy_hours?: number
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_landing_page?: string | null
          elevenlabs_agent_id?: string | null
          enabled_modules?: Json | null
          id?: string
          legal_business_name?: string | null
          logo_url?: string | null
          portal_enabled?: boolean
          postal_code?: string | null
          state_province?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          voice_language?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          business_category?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          cancellation_policy_hours?: number
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_landing_page?: string | null
          elevenlabs_agent_id?: string | null
          enabled_modules?: Json | null
          id?: string
          legal_business_name?: string | null
          logo_url?: string | null
          portal_enabled?: boolean
          postal_code?: string | null
          state_province?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string | null
          voice_language?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_type_configs: {
        Row: {
          business_type: string
          created_at: string | null
          default_pipeline_stages: Json | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          onboarding_tips: Json | null
          recommended_workflows: string[] | null
        }
        Insert: {
          business_type: string
          created_at?: string | null
          default_pipeline_stages?: Json | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          onboarding_tips?: Json | null
          recommended_workflows?: string[] | null
        }
        Update: {
          business_type?: string
          created_at?: string | null
          default_pipeline_stages?: Json | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          onboarding_tips?: Json | null
          recommended_workflows?: string[] | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          agent_id: string | null
          broadcast_id: string | null
          broadcast_recipient_id: string | null
          call_sid: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          duration: number | null
          id: string
          keypress_log: Json | null
          lead_id: string | null
          objective_id: string | null
          objective_met: boolean | null
          objective_reasoning: string | null
          objective_text: string | null
          phone_number: string
          recording_url: string | null
          speech_responses: Json | null
          status: string
          summary: string | null
          template_id: string | null
          transcript: string | null
          voicemail_drop_id: string | null
          workspace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          broadcast_id?: string | null
          broadcast_recipient_id?: string | null
          call_sid?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          keypress_log?: Json | null
          lead_id?: string | null
          objective_id?: string | null
          objective_met?: boolean | null
          objective_reasoning?: string | null
          objective_text?: string | null
          phone_number: string
          recording_url?: string | null
          speech_responses?: Json | null
          status?: string
          summary?: string | null
          template_id?: string | null
          transcript?: string | null
          voicemail_drop_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          broadcast_id?: string | null
          broadcast_recipient_id?: string | null
          call_sid?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          keypress_log?: Json | null
          lead_id?: string | null
          objective_id?: string | null
          objective_met?: boolean | null
          objective_reasoning?: string | null
          objective_text?: string | null
          phone_number?: string
          recording_url?: string | null
          speech_responses?: Json | null
          status?: string
          summary?: string | null
          template_id?: string | null
          transcript?: string | null
          voicemail_drop_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "voice_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_broadcast_recipient_id_fkey"
            columns: ["broadcast_recipient_id"]
            isOneToOne: false
            referencedRelation: "voice_broadcast_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "call_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "call_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_voicemail_drop_id_fkey"
            columns: ["voicemail_drop_id"]
            isOneToOne: false
            referencedRelation: "voicemail_drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      call_objectives: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expected_keypresses: Json | null
          id: string
          is_default: boolean
          name: string
          success_criteria: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_keypresses?: Json | null
          id?: string
          is_default?: boolean
          name: string
          success_criteria: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_keypresses?: Json | null
          id?: string
          is_default?: boolean
          name?: string
          success_criteria?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_objectives_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      call_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          template: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_analysis: {
        Row: {
          churned_count: number
          cohort_month: string
          created_at: string | null
          id: string
          retained_count: number
          revenue: number | null
          workspace_count: number
        }
        Insert: {
          churned_count?: number
          cohort_month: string
          created_at?: string | null
          id?: string
          retained_count?: number
          revenue?: number | null
          workspace_count?: number
        }
        Update: {
          churned_count?: number
          cohort_month?: string
          created_at?: string | null
          id?: string
          retained_count?: number
          revenue?: number | null
          workspace_count?: number
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          content_type: string
          created_at: string | null
          description: string | null
          details: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          description?: string | null
          details?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          content: string
          created_at: string | null
          engagement_score: number | null
          id: string
          media_url: string | null
          platform: string | null
          posted_at: string | null
          title: string
          type: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          media_url?: string | null
          platform?: string | null
          posted_at?: string | null
          title: string
          type: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          media_url?: string | null
          platform?: string | null
          posted_at?: string | null
          title?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          contact_id: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          metadata: Json | null
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string | null
          custom_field_id: string | null
          id: string
          record_id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          custom_field_id?: string | null
          id?: string
          record_id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          custom_field_id?: string | null
          id?: string
          record_id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          object_type: string
          options: Json | null
          position: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_label: string
          field_name: string
          field_type: string
          id?: string
          is_required?: boolean | null
          object_type: string
          options?: Json | null
          position?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          object_type?: string
          options?: Json | null
          position?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_leads: {
        Row: {
          company: string | null
          created_at: string
          deleted_at: string
          deleted_by: string | null
          email: string | null
          expires_at: string
          id: string
          name: string
          notes: string | null
          original_lead_id: string
          phone: string | null
          source: string | null
          stage_id: string | null
          value: number | null
          workspace_id: string | null
        }
        Insert: {
          company?: string | null
          created_at: string
          deleted_at?: string
          deleted_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          name: string
          notes?: string | null
          original_lead_id: string
          phone?: string | null
          source?: string | null
          stage_id?: string | null
          value?: number | null
          workspace_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          name?: string
          notes?: string | null
          original_lead_id?: string
          phone?: string | null
          source?: string | null
          stage_id?: string | null
          value?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deleted_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_ignores: {
        Row: {
          created_at: string
          created_by: string | null
          fingerprint: string
          id: string
          record_ids: string[]
          table_name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fingerprint: string
          id?: string
          record_ids: string[]
          table_name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fingerprint?: string
          id?: string
          record_ids?: string[]
          table_name?: string
          workspace_id?: string
        }
        Relationships: []
      }
      email_campaign_metrics: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          total_bounced: number
          total_clicked: number
          total_delivered: number
          total_opened: number
          total_sent: number
          total_unsubscribed: number
          unique_clicks: number
          unique_opens: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          total_bounced?: number
          total_clicked?: number
          total_delivered?: number
          total_opened?: number
          total_sent?: number
          total_unsubscribed?: number
          unique_clicks?: number
          unique_opens?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          total_bounced?: number
          total_clicked?: number
          total_delivered?: number
          total_opened?: number
          total_sent?: number
          total_unsubscribed?: number
          unique_clicks?: number
          unique_opens?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          content: string | null
          created_at: string
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          target_list_ids: string[] | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_list_ids?: string[] | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_list_ids?: string[] | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_list_subscribers: {
        Row: {
          contact_id: string | null
          email: string
          id: string
          lead_id: string | null
          list_id: string | null
          metadata: Json | null
          name: string | null
          source: string | null
          status: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          contact_id?: string | null
          email: string
          id?: string
          lead_id?: string | null
          list_id?: string | null
          metadata?: Json | null
          name?: string | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          contact_id?: string | null
          email?: string
          id?: string
          lead_id?: string | null
          list_id?: string | null
          metadata?: Json | null
          name?: string | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_list_subscribers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_list_subscribers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "email_list_subscribers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_list_subscribers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_list_subscribers_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      error_events: {
        Row: {
          context: Json
          created_at: string
          id: string
          message: string
          severity: string
          source: string | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          message: string
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          message?: string
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          properties: Json | null
          session_id: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_adoption: {
        Row: {
          created_at: string | null
          feature_name: string
          first_used_at: string | null
          id: string
          last_used_at: string | null
          usage_count: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          feature_name: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          feature_name?: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_adoption_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string | null
          id: string
          message: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_ab_tests: {
        Row: {
          created_at: string | null
          form_id: string | null
          id: string
          is_active: boolean | null
          traffic_percentage: number | null
          variant_config: Json
          variant_name: string
        }
        Insert: {
          created_at?: string | null
          form_id?: string | null
          id?: string
          is_active?: boolean | null
          traffic_percentage?: number | null
          variant_config: Json
          variant_name: string
        }
        Update: {
          created_at?: string | null
          form_id?: string | null
          id?: string
          is_active?: boolean | null
          traffic_percentage?: number | null
          variant_config?: Json
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_ab_tests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_analytics_summary: {
        Row: {
          avg_time_to_submit: number | null
          conversion_rate: number | null
          created_at: string | null
          form_id: string | null
          id: string
          period_end: string
          period_start: string
          submissions: number | null
          variant_id: string | null
          views: number | null
        }
        Insert: {
          avg_time_to_submit?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          form_id?: string | null
          id?: string
          period_end: string
          period_start: string
          submissions?: number | null
          variant_id?: string | null
          views?: number | null
        }
        Update: {
          avg_time_to_submit?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          form_id?: string | null
          id?: string
          period_end?: string
          period_start?: string
          submissions?: number | null
          variant_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_analytics_summary_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_analytics_summary_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "form_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      form_metrics: {
        Row: {
          browser: string | null
          converted: boolean | null
          device_type: string | null
          fields_changed: Json | null
          form_id: string
          id: string
          ip_address: string | null
          referrer: string | null
          session_id: string | null
          submitted_at: string
          time_to_submit: number | null
          user_agent: string | null
          variant_id: string | null
        }
        Insert: {
          browser?: string | null
          converted?: boolean | null
          device_type?: string | null
          fields_changed?: Json | null
          form_id: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          session_id?: string | null
          submitted_at?: string
          time_to_submit?: number | null
          user_agent?: string | null
          variant_id?: string | null
        }
        Update: {
          browser?: string | null
          converted?: boolean | null
          device_type?: string | null
          fields_changed?: Json | null
          form_id?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          session_id?: string | null
          submitted_at?: string
          time_to_submit?: number | null
          user_agent?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_metrics_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          lead_id: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          form_id: string
          id?: string
          lead_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          auto_response_config: Json | null
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean | null
          name: string
          pipeline_id: string | null
          stage_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_response_config?: Json | null
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name: string
          pipeline_id?: string | null
          stage_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_response_config?: Json | null
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          pipeline_id?: string | null
          stage_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      google_sheet_integrations: {
        Row: {
          column_mappings: Json | null
          created_at: string
          google_access_token: string | null
          google_refresh_token: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          sheet_id: string | null
          sheet_tab: string | null
          sync_frequency: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          column_mappings?: Json | null
          created_at?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          sheet_id?: string | null
          sheet_tab?: string | null
          sync_frequency?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          column_mappings?: Json | null
          created_at?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          sheet_id?: string | null
          sheet_tab?: string | null
          sync_frequency?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      health_scores: {
        Row: {
          calculated_at: string | null
          created_at: string | null
          factors: Json | null
          id: string
          score: number
          workspace_id: string
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          score: number
          workspace_id: string
        }
        Update: {
          calculated_at?: string | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          score?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_emails: {
        Row: {
          body_html: string | null
          body_text: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string | null
          from_email: string
          from_name: string | null
          id: string
          lead_id: string | null
          original_message_id: string | null
          processed_at: string | null
          reply_token: string | null
          resend_email_id: string | null
          status: string | null
          subject: string | null
          to_email: string
          workspace_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          lead_id?: string | null
          original_message_id?: string | null
          processed_at?: string | null
          reply_token?: string | null
          resend_email_id?: string | null
          status?: string | null
          subject?: string | null
          to_email: string
          workspace_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          lead_id?: string | null
          original_message_id?: string | null
          processed_at?: string | null
          reply_token?: string | null
          resend_email_id?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_emails_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "inbound_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_analytics_snapshots: {
        Row: {
          created_at: string | null
          email_contacts: number | null
          followers_count: number | null
          follows_count: number | null
          id: string
          impressions: number | null
          media_count: number | null
          profile_views: number | null
          reach: number | null
          snapshot_date: string
          website_clicks: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_contacts?: number | null
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          impressions?: number | null
          media_count?: number | null
          profile_views?: number | null
          reach?: number | null
          snapshot_date: string
          website_clicks?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_contacts?: number | null
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          impressions?: number | null
          media_count?: number | null
          profile_views?: number | null
          reach?: number | null
          snapshot_date?: string
          website_clicks?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_analytics_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_comments: {
        Row: {
          comment_id: string
          comment_timestamp: string
          content: string | null
          created_at: string | null
          from_id: string | null
          from_username: string | null
          hidden: boolean | null
          id: string
          media_id: string
          parent_comment_id: string | null
          replied: boolean | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          comment_id: string
          comment_timestamp: string
          content?: string | null
          created_at?: string | null
          from_id?: string | null
          from_username?: string | null
          hidden?: boolean | null
          id?: string
          media_id: string
          parent_comment_id?: string | null
          replied?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          comment_id?: string
          comment_timestamp?: string
          content?: string | null
          created_at?: string | null
          from_id?: string | null
          from_username?: string | null
          hidden?: boolean | null
          id?: string
          media_id?: string
          parent_comment_id?: string | null
          replied?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_messages: {
        Row: {
          content: string | null
          created_at: string | null
          direction: string
          id: string
          instagram_conversation_id: string
          instagram_message_id: string | null
          message_timestamp: string
          read_at: string | null
          sender_id: string
          sender_username: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          direction: string
          id?: string
          instagram_conversation_id: string
          instagram_message_id?: string | null
          message_timestamp: string
          read_at?: string | null
          sender_id: string
          sender_username?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          instagram_conversation_id?: string
          instagram_message_id?: string | null
          message_timestamp?: string
          read_at?: string | null
          sender_id?: string
          sender_username?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_products: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number | null
          product_id: string
          synced_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price?: number | null
          product_id: string
          synced_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number | null
          product_id?: string
          synced_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          category_number: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          category_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          category_number?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          item_type: string
          payment_timing: string
          price: number
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          item_type?: string
          payment_timing?: string
          price?: number
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          item_type?: string
          payment_timing?: string
          price?: number
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          knowledge_base_id: string | null
          metadata: Json | null
          title: string | null
          type: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          knowledge_base_id?: string | null
          metadata?: Json | null
          title?: string | null
          type: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          knowledge_base_id?: string | null
          metadata?: Json | null
          title?: string | null
          type?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_rules: {
        Row: {
          condition_config: Json
          condition_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          score_delta: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          condition_config?: Json
          condition_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          score_delta?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          condition_config?: Json
          condition_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          score_delta?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          attribution_id: string | null
          attribution_source: string | null
          card_brand: string | null
          card_last_four: string | null
          company: string | null
          contact_type: string
          created_at: string | null
          customer_user_id: string | null
          email: string | null
          enrichment_data: Json | null
          id: string
          last_contacted_at: string | null
          last_scored_at: string | null
          name: string
          notes: string | null
          phone: string | null
          pipeline_id: string | null
          score: number | null
          score_factors: Json | null
          source: string | null
          stage_id: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          updated_at: string | null
          value: number | null
          workspace_id: string | null
        }
        Insert: {
          attribution_id?: string | null
          attribution_source?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          company?: string | null
          contact_type?: string
          created_at?: string | null
          customer_user_id?: string | null
          email?: string | null
          enrichment_data?: Json | null
          id?: string
          last_contacted_at?: string | null
          last_scored_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          score?: number | null
          score_factors?: Json | null
          source?: string | null
          stage_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
          value?: number | null
          workspace_id?: string | null
        }
        Update: {
          attribution_id?: string | null
          attribution_source?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          company?: string | null
          contact_type?: string
          created_at?: string | null
          customer_user_id?: string | null
          email?: string | null
          enrichment_data?: Json | null
          id?: string
          last_contacted_at?: string | null
          last_scored_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          score?: number | null
          score_factors?: Json | null
          source?: string | null
          stage_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
          value?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      license_acceptances: {
        Row: {
          accepted_at: string
          email: string | null
          id: string
          ip_address: string | null
          license_version: string
          user_agent: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          accepted_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          license_version?: string
          user_agent?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          accepted_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          license_version?: string
          user_agent?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      lifecycle_stages: {
        Row: {
          created_at: string | null
          entered_at: string | null
          exited_at: string | null
          id: string
          stage: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          stage: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          stage?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_generated: boolean | null
          channel: string
          content: string
          conversation_id: string | null
          created_at: string | null
          direction: string
          id: string
          metadata: Json | null
          read_at: string | null
          reply_token: string | null
          resend_email_id: string | null
          sent_at: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          channel: string
          content: string
          conversation_id?: string | null
          created_at?: string | null
          direction: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          reply_token?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          channel?: string
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          reply_token?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved_at: string | null
          celebrated: boolean | null
          created_at: string | null
          id: string
          metadata: Json | null
          milestone_type: string
          workspace_id: string
        }
        Insert: {
          achieved_at?: string | null
          celebrated?: boolean | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          milestone_type: string
          workspace_id: string
        }
        Update: {
          achieved_at?: string | null
          celebrated?: boolean | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          milestone_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          data: Json | null
          id: string
          step_name: string
          step_order: number
          workspace_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          step_name: string
          step_order: number
          workspace_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          step_name?: string
          step_order?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_settings: {
        Row: {
          allow_different_contact_opportunity_names: boolean | null
          auto_create_contact_follower: boolean | null
          auto_create_opportunity_follower: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          allow_different_contact_opportunity_names?: boolean | null
          auto_create_contact_follower?: boolean | null
          auto_create_opportunity_follower?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          allow_different_contact_opportunity_names?: boolean | null
          auto_create_contact_follower?: boolean | null
          auto_create_opportunity_follower?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      outreach_campaign_leads: {
        Row: {
          booked_at: string | null
          booking_id: string | null
          calls_made: number | null
          campaign_id: string
          created_at: string
          current_step: number
          emails_sent: number | null
          id: string
          last_channel: string | null
          last_outcome: string | null
          lead_id: string
          next_run_at: string
          responded_at: string | null
          sms_sent: number | null
          status: string
          updated_at: string
          voicemails_dropped: number | null
          workspace_id: string
        }
        Insert: {
          booked_at?: string | null
          booking_id?: string | null
          calls_made?: number | null
          campaign_id: string
          created_at?: string
          current_step?: number
          emails_sent?: number | null
          id?: string
          last_channel?: string | null
          last_outcome?: string | null
          lead_id: string
          next_run_at?: string
          responded_at?: string | null
          sms_sent?: number | null
          status?: string
          updated_at?: string
          voicemails_dropped?: number | null
          workspace_id: string
        }
        Update: {
          booked_at?: string | null
          booking_id?: string | null
          calls_made?: number | null
          campaign_id?: string
          created_at?: string
          current_step?: number
          emails_sent?: number | null
          id?: string
          last_channel?: string | null
          last_outcome?: string | null
          lead_id?: string
          next_run_at?: string
          responded_at?: string | null
          sms_sent?: number | null
          status?: string
          updated_at?: string
          voicemails_dropped?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaign_leads_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaign_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "outreach_campaign_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaign_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaign_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          booked_count: number | null
          booking_mode: string
          completed_at: string | null
          completed_count: number | null
          created_at: string
          created_by: string | null
          estimated_cost_usd: number | null
          filter_config: Json
          id: string
          max_calls: number
          name: string
          objective: string
          responded_count: number | null
          sequence: Json
          started_at: string | null
          status: string
          total_leads: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          booked_count?: number | null
          booking_mode?: string
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string
          created_by?: string | null
          estimated_cost_usd?: number | null
          filter_config?: Json
          id?: string
          max_calls?: number
          name: string
          objective: string
          responded_count?: number | null
          sequence?: Json
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          booked_count?: number | null
          booking_mode?: string
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string
          created_by?: string | null
          estimated_cost_usd?: number | null
          filter_config?: Json
          id?: string
          max_calls?: number
          name?: string
          objective?: string
          responded_count?: number | null
          sequence?: Json
          started_at?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_step_logs: {
        Row: {
          campaign_id: string
          campaign_lead_id: string
          channel: string
          cost_usd: number | null
          created_at: string
          error: string | null
          external_id: string | null
          id: string
          lead_id: string
          metadata: Json | null
          status: string
          step_index: number
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          campaign_lead_id: string
          channel: string
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          status: string
          step_index: number
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          campaign_lead_id?: string
          channel?: string
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          status?: string
          step_index?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_step_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_step_logs_campaign_lead_id_fkey"
            columns: ["campaign_lead_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaign_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_step_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "outreach_step_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_step_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_step_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_tool_suggestions: {
        Row: {
          agent_id: string | null
          created_at: string | null
          description: string
          display_name: string
          id: string
          name: string
          reason: string | null
          status: string | null
          suggested_executor_type: string | null
          suggested_parameters: Json | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          description: string
          display_name: string
          id?: string
          name: string
          reason?: string | null
          status?: string | null
          suggested_executor_type?: string | null
          suggested_parameters?: Json | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          description?: string
          display_name?: string
          id?: string
          name?: string
          reason?: string | null
          status?: string | null
          suggested_executor_type?: string | null
          suggested_parameters?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_tool_suggestions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          granted: boolean | null
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          created_at?: string | null
          granted?: boolean | null
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          created_at?: string | null
          granted?: boolean | null
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          pipeline_id: string | null
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          pipeline_id?: string | null
          position: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          pipeline_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean | null
          limit_type: string | null
          limit_value: number | null
          plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean | null
          limit_type?: string | null
          limit_value?: number | null
          plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean | null
          limit_type?: string | null
          limit_value?: number | null
          plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          name: string
          price_monthly: number
          price_yearly: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_api_configs: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string | null
          default_landing_page: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_business_type: string | null
          onboarding_call_scheduled: boolean | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_data: Json | null
          onboarding_goals: string[] | null
          onboarding_monthly_leads: number | null
          onboarding_step: number | null
          onboarding_team_size: string | null
          phone: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string | null
          default_landing_page?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          onboarding_business_type?: string | null
          onboarding_call_scheduled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_data?: Json | null
          onboarding_goals?: string[] | null
          onboarding_monthly_leads?: number | null
          onboarding_step?: number | null
          onboarding_team_size?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string | null
          default_landing_page?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_business_type?: string | null
          onboarding_call_scheduled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_data?: Json | null
          onboarding_goals?: string[] | null
          onboarding_monthly_leads?: number | null
          onboarding_step?: number | null
          onboarding_team_size?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      program_rosters: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          item_id: string
          lead_id: string | null
          notes: string | null
          period_label: string
          source_booking_id: string | null
          status: Database["public"]["Enums"]["roster_status"]
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          item_id: string
          lead_id?: string | null
          notes?: string | null
          period_label?: string
          source_booking_id?: string | null
          status?: Database["public"]["Enums"]["roster_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          item_id?: string
          lead_id?: string | null
          notes?: string | null
          period_label?: string
          source_booking_id?: string | null
          status?: Database["public"]["Enums"]["roster_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_rosters_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_rosters_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "program_rosters_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_rosters_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_rosters_source_booking_id_fkey"
            columns: ["source_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_rosters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to_all_items: boolean | null
          created_at: string
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          item_ids: string[] | null
          max_uses: number | null
          name: string
          promo_code: string | null
          starts_at: string | null
          terms: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          applies_to_all_items?: boolean | null
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          item_ids?: string[] | null
          max_uses?: number | null
          name: string
          promo_code?: string | null
          starts_at?: string | null
          terms?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          applies_to_all_items?: boolean | null
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          item_ids?: string[] | null
          max_uses?: number | null
          name?: string
          promo_code?: string | null
          starts_at?: string | null
          terms?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_type: string | null
          reward_value: Json | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_type?: string | null
          reward_value?: Json | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_type?: string | null
          reward_value?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_campaigns: {
        Row: {
          completed_at: string | null
          confirmed_count: number | null
          created_at: string
          days_before_end: number
          declined_count: number | null
          email_enabled: boolean | null
          id: string
          item_id: string | null
          message_template: string | null
          name: string
          no_response_count: number | null
          pending_count: number | null
          revenue_at_risk: number | null
          revenue_secured: number | null
          sms_enabled: boolean | null
          source_booking_filter: Json | null
          started_at: string | null
          status: string
          total_contacts: number | null
          updated_at: string
          voice_enabled: boolean | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          confirmed_count?: number | null
          created_at?: string
          days_before_end?: number
          declined_count?: number | null
          email_enabled?: boolean | null
          id?: string
          item_id?: string | null
          message_template?: string | null
          name: string
          no_response_count?: number | null
          pending_count?: number | null
          revenue_at_risk?: number | null
          revenue_secured?: number | null
          sms_enabled?: boolean | null
          source_booking_filter?: Json | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
          updated_at?: string
          voice_enabled?: boolean | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          confirmed_count?: number | null
          created_at?: string
          days_before_end?: number
          declined_count?: number | null
          email_enabled?: boolean | null
          id?: string
          item_id?: string | null
          message_template?: string | null
          name?: string
          no_response_count?: number | null
          pending_count?: number | null
          revenue_at_risk?: number | null
          revenue_secured?: number | null
          sms_enabled?: boolean | null
          source_booking_filter?: Json | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
          updated_at?: string
          voice_enabled?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_campaigns_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_contacts: {
        Row: {
          attempts: number | null
          booking_id: string | null
          campaign_id: string
          card_charged: boolean | null
          charge_amount: number | null
          contact_name: string
          created_at: string
          current_schedule: string | null
          email: string | null
          id: string
          last_contacted_at: string | null
          lead_id: string | null
          new_booking_id: string | null
          next_session_item_id: string | null
          outreach_method: string | null
          outreach_status: string
          phone: string | null
          program_name: string | null
          response_notes: string | null
          student_notes: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempts?: number | null
          booking_id?: string | null
          campaign_id: string
          card_charged?: boolean | null
          charge_amount?: number | null
          contact_name: string
          created_at?: string
          current_schedule?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_id?: string | null
          new_booking_id?: string | null
          next_session_item_id?: string | null
          outreach_method?: string | null
          outreach_status?: string
          phone?: string | null
          program_name?: string | null
          response_notes?: string | null
          student_notes?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempts?: number | null
          booking_id?: string | null
          campaign_id?: string
          card_charged?: boolean | null
          charge_amount?: number | null
          contact_name?: string
          created_at?: string
          current_schedule?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_id?: string | null
          new_booking_id?: string | null
          next_session_item_id?: string | null
          outreach_method?: string | null
          outreach_status?: string
          phone?: string | null
          program_name?: string | null
          response_notes?: string | null
          student_notes?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_contacts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "renewal_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "renewal_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_contacts_new_booking_id_fkey"
            columns: ["new_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_contacts_next_session_item_id_fkey"
            columns: ["next_session_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          position: number | null
          resource_type: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number | null
          resource_type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number | null
          resource_type?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          item_id: string | null
          item_title: string
          quantity: number
          sale_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          item_id?: string | null
          item_title: string
          quantity?: number
          sale_id: string
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          item_id?: string | null
          item_title?: string
          quantity?: number
          sale_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          id: string
          lead_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          caption: string
          created_at: string
          error_message: string | null
          id: string
          images: string[]
          platform: string
          post_result: Json | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          caption: string
          created_at?: string
          error_message?: string | null
          id?: string
          images?: string[]
          platform: string
          post_result?: Json | null
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          caption?: string
          created_at?: string
          error_message?: string | null
          id?: string
          images?: string[]
          platform?: string
          post_result?: Json | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          condition: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          rule_name: string
          score_delta: number
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          condition: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name: string
          score_delta: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          condition?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name?: string
          score_delta?: number
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shell_instances: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          capability_keys: string[]
          created_at: string
          created_by: string | null
          footer_note: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_published: boolean
          kind: string
          layout: Json
          logo_url: string | null
          name: string
          slug: string
          support_email: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          capability_keys?: string[]
          created_at?: string
          created_by?: string | null
          footer_note?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean
          kind: string
          layout?: Json
          logo_url?: string | null
          name: string
          slug: string
          support_email?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          capability_keys?: string[]
          created_at?: string
          created_by?: string | null
          footer_note?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          layout?: Json
          logo_url?: string | null
          name?: string
          slug?: string
          support_email?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shell_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shell_telemetry: {
        Row: {
          capability_key: string | null
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          shell: string
          status: string
          user_id: string | null
          viewer_role: string | null
          workspace_id: string | null
        }
        Insert: {
          capability_key?: string | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          shell: string
          status?: string
          user_id?: string | null
          viewer_role?: string | null
          workspace_id?: string | null
        }
        Update: {
          capability_key?: string | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          shell?: string
          status?: string
          user_id?: string | null
          viewer_role?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      social_cadence_settings: {
        Row: {
          channels: Json
          created_at: string
          last_nudge_at: string | null
          notify_email: string | null
          notify_phone: string | null
          quiet_hours_end: string
          quiet_hours_start: string
          target_posts_per_week: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          last_nudge_at?: string | null
          notify_email?: string | null
          notify_phone?: string | null
          quiet_hours_end?: string
          quiet_hours_start?: string
          target_posts_per_week?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          last_nudge_at?: string | null
          notify_email?: string | null
          notify_phone?: string | null
          quiet_hours_end?: string
          quiet_hours_start?: string
          target_posts_per_week?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_cadence_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_accounts: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          platform: string
          refresh_token: string | null
          updated_at: string
          user_id: string
          user_id_platform: string | null
          username: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          platform: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
          user_id_platform?: string | null
          username?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          platform?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
          user_id_platform?: string | null
          username?: string | null
        }
        Relationships: []
      }
      social_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          suggestion_id: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          suggestion_id?: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          suggestion_id?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_notifications_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "social_post_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_suggestions: {
        Row: {
          account_id: string | null
          approval_token: string | null
          caption: string
          created_at: string
          error_message: string | null
          id: string
          images: string[]
          platform: string
          posted_post_id: string | null
          reason: Database["public"]["Enums"]["social_suggestion_reason"]
          status: Database["public"]["Enums"]["social_suggestion_status"]
          suggested_for: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          approval_token?: string | null
          caption?: string
          created_at?: string
          error_message?: string | null
          id?: string
          images?: string[]
          platform?: string
          posted_post_id?: string | null
          reason?: Database["public"]["Enums"]["social_suggestion_reason"]
          status?: Database["public"]["Enums"]["social_suggestion_status"]
          suggested_for?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          approval_token?: string | null
          caption?: string
          created_at?: string
          error_message?: string | null
          id?: string
          images?: string[]
          platform?: string
          posted_post_id?: string | null
          reason?: Database["public"]["Enums"]["social_suggestion_reason"]
          status?: Database["public"]["Enums"]["social_suggestion_status"]
          suggested_for?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_overrides: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_by: string | null
          granted_tier: string
          id: string
          is_active: boolean | null
          reason: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          granted_tier: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          granted_tier?: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          recorded_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_phone_numbers: {
        Row: {
          capabilities: Json | null
          created_at: string | null
          friendly_name: string | null
          id: string
          inbound_webhook_configured: boolean
          is_active: boolean | null
          phone_number: string
          twilio_sid: string | null
          workspace_id: string | null
        }
        Insert: {
          capabilities?: Json | null
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          inbound_webhook_configured?: boolean
          is_active?: boolean | null
          phone_number: string
          twilio_sid?: string | null
          workspace_id?: string | null
        }
        Update: {
          capabilities?: Json | null
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          inbound_webhook_configured?: boolean
          is_active?: boolean | null
          phone_number?: string
          twilio_sid?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twilio_phone_numbers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_sandbox_usage: {
        Row: {
          calls_used: number
          created_at: string
          sms_used: number
          updated_at: string
          voicemails_used: number
          workspace_id: string
        }
        Insert: {
          calls_used?: number
          created_at?: string
          sms_used?: number
          updated_at?: string
          voicemails_used?: number
          workspace_id: string
        }
        Update: {
          calls_used?: number
          created_at?: string
          sms_used?: number
          updated_at?: string
          voicemails_used?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twilio_sandbox_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string | null
          id: string
          metric_type: string
          period_end: string
          period_start: string
          quantity: number
          subscription_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_type: string
          period_end: string
          period_start: string
          quantity?: number
          subscription_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_type?: string
          period_end?: string
          period_start?: string
          quantity?: number
          subscription_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_broadcast_recipients: {
        Row: {
          broadcast_id: string | null
          call_sid: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          lead_id: string | null
          phone_number: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          broadcast_id?: string | null
          call_sid?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          phone_number: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          broadcast_id?: string | null
          call_sid?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          phone_number?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "voice_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_broadcast_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "voice_broadcast_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_broadcast_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_broadcasts: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_count: number | null
          gather_keypresses: boolean
          gather_speech: boolean
          id: string
          message_text: string
          name: string
          objective_id: string | null
          objective_text: string | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          target_filter: Json | null
          total_recipients: number | null
          updated_at: string
          voice_id: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          gather_keypresses?: boolean
          gather_speech?: boolean
          id?: string
          message_text: string
          name: string
          objective_id?: string | null
          objective_text?: string | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_filter?: Json | null
          total_recipients?: number | null
          updated_at?: string
          voice_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          gather_keypresses?: boolean
          gather_speech?: boolean
          id?: string
          message_text?: string
          name?: string
          objective_id?: string | null
          objective_text?: string | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_filter?: Json | null
          total_recipients?: number | null
          updated_at?: string
          voice_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_broadcasts_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "call_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_broadcasts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_conversation_logs: {
        Row: {
          actions_taken: Json | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          language: string | null
          session_id: string | null
          started_at: string
          summary: string | null
          transcript: Json | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          actions_taken?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          language?: string | null
          session_id?: string | null
          started_at?: string
          summary?: string | null
          transcript?: Json | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          actions_taken?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          language?: string | null
          session_id?: string | null
          started_at?: string
          summary?: string | null
          transcript?: Json | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_conversation_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      voicemail_drops: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          is_active: boolean | null
          name: string
          objective_id: string | null
          objective_text: string | null
          tts_text: string | null
          updated_at: string
          voice_id: string | null
          workspace_id: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          objective_id?: string | null
          objective_text?: string | null
          tts_text?: string | null
          updated_at?: string
          voice_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          objective_id?: string | null
          objective_text?: string | null
          tts_text?: string | null
          updated_at?: string
          voice_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voicemail_drops_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "call_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voicemail_drops_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          created_at: string | null
          events: string[]
          headers: Json | null
          id: string
          integration_id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          last_tested_at: string | null
          name: string
          retry_config: Json | null
          secret: string | null
          test_result: Json | null
          updated_at: string | null
          url: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          headers?: Json | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          last_tested_at?: string | null
          name: string
          retry_config?: Json | null
          secret?: string | null
          test_result?: Json | null
          updated_at?: string | null
          url: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          events?: string[]
          headers?: Json | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          last_tested_at?: string | null
          name?: string
          retry_config?: Json | null
          secret?: string | null
          test_result?: Json | null
          updated_at?: string | null
          url?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "webhook_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_integrations: {
        Row: {
          config_schema: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          logo_url: string | null
          name: string
          provider: string
          workspace_id: string | null
        }
        Insert: {
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          logo_url?: string | null
          name: string
          provider: string
          workspace_id?: string | null
        }
        Update: {
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          logo_url?: string | null
          name?: string
          provider?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      whisper_sessions: {
        Row: {
          action_items: Json
          channel: string
          contact_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          key_points: Json
          lead_id: string | null
          metadata: Json
          mode: string
          sentiment: string | null
          started_at: string
          status: string
          summary: string | null
          title: string | null
          transcript: string | null
          transcript_hidden: boolean
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_items?: Json
          channel?: string
          contact_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          key_points?: Json
          lead_id?: string | null
          metadata?: Json
          mode?: string
          sentiment?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          title?: string | null
          transcript?: string | null
          transcript_hidden?: boolean
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action_items?: Json
          channel?: string
          contact_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          key_points?: Json
          lead_id?: string | null
          metadata?: Json
          mode?: string
          sentiment?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          title?: string | null
          transcript?: string | null
          transcript_hidden?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisper_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_payment_methods"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "whisper_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisper_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_analytics: {
        Row: {
          avg_duration_ms: number
          created_at: string
          error_count: number
          execution_count: number
          id: string
          last_run_at: string | null
          period_end: string
          period_start: string
          success_count: number
          workflow_id: string
        }
        Insert: {
          avg_duration_ms?: number
          created_at?: string
          error_count?: number
          execution_count?: number
          id?: string
          last_run_at?: string | null
          period_end: string
          period_start: string
          success_count?: number
          workflow_id: string
        }
        Update: {
          avg_duration_ms?: number
          created_at?: string
          error_count?: number
          execution_count?: number
          id?: string
          last_run_at?: string | null
          period_end?: string
          period_start?: string
          success_count?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_analytics_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_recommendations: {
        Row: {
          applied_at: string | null
          created_at: string | null
          description: string | null
          expected_improvement: string | null
          id: string
          is_applied: boolean | null
          recommendation_type: string
          title: string
          workflow_id: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_improvement?: string | null
          id?: string
          is_applied?: boolean | null
          recommendation_type: string
          title: string
          workflow_id?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_improvement?: string | null
          id?: string
          is_applied?: boolean | null
          recommendation_type?: string
          title?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_recommendations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          execution_log: Json | null
          id: string
          started_at: string | null
          status: string
          trigger_data: Json | null
          workflow_id: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          edges: Json
          id: string
          industry_tags: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_premium: boolean | null
          name: string
          nodes: Json
          thumbnail_url: string | null
          trigger_type: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges: Json
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          name: string
          nodes: Json
          thumbnail_url?: string | null
          trigger_type: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          name?: string
          nodes?: Json
          thumbnail_url?: string | null
          trigger_type?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          edges: Json
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          nodes: Json
          trigger_type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          nodes?: Json
          trigger_type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          nodes?: Json
          trigger_type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_feature_usage: {
        Row: {
          created_at: string | null
          feature_key: string
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          updated_at: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature_key: string
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature_key?: string
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_feature_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          data_points: Json | null
          description: string | null
          generated_at: string | null
          id: string
          insight_type: string
          is_read: boolean | null
          metric_unit: string | null
          metric_value: number | null
          recommendations: Json | null
          title: string
          trend: string | null
          trend_percentage: number | null
          valid_until: string | null
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          data_points?: Json | null
          description?: string | null
          generated_at?: string | null
          id?: string
          insight_type: string
          is_read?: boolean | null
          metric_unit?: string | null
          metric_value?: number | null
          recommendations?: Json | null
          title: string
          trend?: string | null
          trend_percentage?: number | null
          valid_until?: string | null
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          data_points?: Json | null
          description?: string | null
          generated_at?: string | null
          id?: string
          insight_type?: string
          is_read?: boolean | null
          metric_unit?: string | null
          metric_value?: number | null
          recommendations?: Json | null
          title?: string
          trend?: string | null
          trend_percentage?: number | null
          valid_until?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_insights_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_template_usage: {
        Row: {
          id: string
          template_id: string | null
          used_at: string | null
          workflow_id: string | null
          workspace_id: string | null
        }
        Insert: {
          id?: string
          template_id?: string | null
          used_at?: string | null
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          id?: string
          template_id?: string | null
          used_at?: string | null
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_template_usage_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_template_usage_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_template_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          platform_fee_percent: number | null
          slug: string | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarded: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          platform_fee_percent?: number | null
          slug?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          platform_fee_percent?: number | null
          slug?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      google_sheet_integrations_safe: {
        Row: {
          column_mappings: Json | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_connected: boolean | null
          last_synced_at: string | null
          sheet_id: string | null
          sheet_tab: string | null
          sync_frequency: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          column_mappings?: Json | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_connected?: never
          last_synced_at?: string | null
          sheet_id?: string | null
          sheet_tab?: string | null
          sync_frequency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          column_mappings?: Json | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_connected?: never
          last_synced_at?: string | null
          sheet_id?: string | null
          sheet_tab?: string | null
          sync_frequency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lead_payment_methods: {
        Row: {
          card_brand: string | null
          card_last_four: string | null
          lead_id: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          workspace_id: string | null
        }
        Insert: {
          card_brand?: string | null
          card_last_four?: string | null
          lead_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          card_brand?: string | null
          card_last_four?: string | null
          lead_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_safe: {
        Row: {
          attribution_id: string | null
          attribution_source: string | null
          card_brand_visible: string | null
          card_last_four_visible: string | null
          company: string | null
          contact_type: string | null
          created_at: string | null
          customer_user_id: string | null
          email: string | null
          enrichment_data: Json | null
          has_payment_method: boolean | null
          id: string | null
          last_contacted_at: string | null
          last_scored_at: string | null
          name: string | null
          notes: string | null
          phone: string | null
          pipeline_id: string | null
          score: number | null
          score_factors: Json | null
          source: string | null
          stage_id: string | null
          updated_at: string | null
          value: number | null
          workspace_id: string | null
        }
        Insert: {
          attribution_id?: string | null
          attribution_source?: string | null
          card_brand_visible?: never
          card_last_four_visible?: never
          company?: string | null
          contact_type?: string | null
          created_at?: string | null
          customer_user_id?: string | null
          email?: string | null
          enrichment_data?: Json | null
          has_payment_method?: never
          id?: string | null
          last_contacted_at?: string | null
          last_scored_at?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          score?: number | null
          score_factors?: Json | null
          source?: string | null
          stage_id?: string | null
          updated_at?: string | null
          value?: number | null
          workspace_id?: string | null
        }
        Update: {
          attribution_id?: string | null
          attribution_source?: string | null
          card_brand_visible?: never
          card_last_four_visible?: never
          company?: string | null
          contact_type?: string | null
          created_at?: string | null
          customer_user_id?: string | null
          email?: string | null
          enrichment_data?: Json | null
          has_payment_method?: never
          id?: string | null
          last_contacted_at?: string | null
          last_scored_at?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          score?: number | null
          score_factors?: Json | null
          source?: string | null
          stage_id?: string | null
          updated_at?: string | null
          value?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_use_feature: {
        Args: {
          p_feature_key: string
          p_increment_usage?: boolean
          p_workspace_id: string
        }
        Returns: boolean
      }
      check_plan_limit: {
        Args: {
          _current_usage: number
          _metric_type: string
          _workspace_id: string
        }
        Returns: boolean
      }
      cleanup_expired_deleted_leads: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_contact_timeline: {
        Args: { _contact_id: string; _limit?: number }
        Returns: {
          kind: string
          occurred_at: string
          payload: Json
          ref_id: string
          ref_table: string
          source: string
          summary: string
          title: string
        }[]
      }
      get_preview_shell_instance: { Args: { _slug: string }; Returns: Json }
      get_public_booking_data: { Args: { _slug: string }; Returns: Json }
      get_public_booking_slots: {
        Args: { _date: string; _workspace_id: string }
        Returns: Json
      }
      get_public_shell_instance: { Args: { _slug: string }; Returns: Json }
      get_user_workspaces: {
        Args: { _user_id: string }
        Returns: {
          workspace_id: string
        }[]
      }
      get_workspace_webhooks: {
        Args: { _workspace_id: string }
        Returns: {
          created_at: string
          events: string[]
          headers: Json
          id: string
          integration_id: string
          is_active: boolean
          is_verified: boolean
          last_tested_at: string
          name: string
          retry_config: Json
          test_result: Json
          updated_at: string
          url: string
          workspace_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_sandbox_usage: {
        Args: { _cap: number; _kind: string; _workspace_id: string }
        Returns: Json
      }
      is_admin_or_owner: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _changes?: Json
          _entity: string
          _entity_id: string
          _metadata?: Json
          _workspace_id: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      sync_program_roster_from_bookings: {
        Args: {
          _from?: string
          _item_id: string
          _period_label: string
          _to?: string
          _workspace_id: string
        }
        Returns: number
      }
      track_feature_usage: {
        Args: { _feature_name: string; _workspace_id: string }
        Returns: undefined
      }
      track_workflow_execution: {
        Args: {
          p_duration_ms: number
          p_error?: string
          p_status: string
          p_workflow_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "agent" | "user" | "customer"
      item_type: "product" | "service" | "fee" | "class" | "other"
      payment_method:
        | "cash"
        | "check"
        | "card"
        | "card_on_file"
        | "charge_to_account"
        | "coupon"
        | "other"
      roster_status:
        | "pending"
        | "renewing"
        | "moving"
        | "not_renewing"
        | "waitlist"
      sale_status: "pending" | "paid" | "refunded" | "cancelled"
      social_suggestion_reason:
        | "cadence_gap"
        | "upcoming"
        | "silence"
        | "manual"
      social_suggestion_status:
        | "pending"
        | "approved"
        | "edited"
        | "dismissed"
        | "posted"
        | "expired"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "agent", "user", "customer"],
      item_type: ["product", "service", "fee", "class", "other"],
      payment_method: [
        "cash",
        "check",
        "card",
        "card_on_file",
        "charge_to_account",
        "coupon",
        "other",
      ],
      roster_status: [
        "pending",
        "renewing",
        "moving",
        "not_renewing",
        "waitlist",
      ],
      sale_status: ["pending", "paid", "refunded", "cancelled"],
      social_suggestion_reason: [
        "cadence_gap",
        "upcoming",
        "silence",
        "manual",
      ],
      social_suggestion_status: [
        "pending",
        "approved",
        "edited",
        "dismissed",
        "posted",
        "expired",
        "failed",
      ],
    },
  },
} as const
