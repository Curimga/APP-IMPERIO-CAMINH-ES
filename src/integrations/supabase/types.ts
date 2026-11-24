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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          completion_tokens: number
          cost_brl: number
          cost_usd: number
          created_at: string
          id: string
          model: string
          prompt_tokens: number
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          cost_brl?: number
          cost_usd?: number
          created_at?: string
          id?: string
          model: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          cost_brl?: number
          cost_usd?: number
          created_at?: string
          id?: string
          model?: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          diff: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          diff?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          diff?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          active: boolean
          agency: string | null
          bank: string | null
          color: string | null
          created_at: string
          current_balance: number
          id: string
          initial_balance: number
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          active?: boolean
          agency?: string | null
          bank?: string | null
          color?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          active?: boolean
          agency?: string | null
          bank?: string | null
          color?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          attachment_url: string | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          financial_event_kind: string
          id: string
          notes: string | null
          occurred_at: string
          related_general_expense_id: string | null
          related_payable_id: string | null
          related_receivable_id: string | null
          related_service_id: string | null
          related_split_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["bank_tx_type"]
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          financial_event_kind?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type: Database["public"]["Enums"]["bank_tx_type"]
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          financial_event_kind?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_financial_event_kind_fk"
            columns: ["financial_event_kind"]
            isOneToOne: false
            referencedRelation: "financial_event_kinds"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "bank_transactions_related_split_id_fkey"
            columns: ["related_split_id"]
            isOneToOne: false
            referencedRelation: "receivable_bank_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_transfer_account_id_fkey"
            columns: ["transfer_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          amount: number | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["deal_priority"]
          recurrence: string | null
          recurrence_ends_at: string | null
          recurrence_occurrences: number | null
          recurrence_until: string | null
          related_company_vehicle_id: string | null
          related_deal_id: string | null
          related_payable_id: string | null
          related_service_id: string | null
          related_truck_id: string | null
          reminder_minutes: number | null
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          amount?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          recurrence?: string | null
          recurrence_ends_at?: string | null
          recurrence_occurrences?: number | null
          recurrence_until?: string | null
          related_company_vehicle_id?: string | null
          related_deal_id?: string | null
          related_payable_id?: string | null
          related_service_id?: string | null
          related_truck_id?: string | null
          reminder_minutes?: number | null
          starts_at: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          amount?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          recurrence?: string | null
          recurrence_ends_at?: string | null
          recurrence_occurrences?: number | null
          recurrence_until?: string | null
          related_company_vehicle_id?: string | null
          related_deal_id?: string | null
          related_payable_id?: string | null
          related_service_id?: string | null
          related_truck_id?: string | null
          reminder_minutes?: number | null
          starts_at?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_company_vehicle_id_fkey"
            columns: ["related_company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_truck_id_fkey"
            columns: ["related_truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_truck_id_fkey"
            columns: ["related_truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          deal_id: string | null
          employee_id: string | null
          id: string
          notes: string | null
          occurred_at: string | null
          paid_at: string | null
          percent: number | null
          status: Database["public"]["Enums"]["payable_status"]
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deal_id?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          paid_at?: string | null
          percent?: number | null
          status?: Database["public"]["Enums"]["payable_status"]
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deal_id?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          paid_at?: string | null
          percent?: number | null
          status?: Database["public"]["Enums"]["payable_status"]
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      company_vehicle_documents: {
        Row: {
          company_vehicle_id: string
          content_type: string | null
          created_at: string
          file_path: string
          file_url: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          company_vehicle_id: string
          content_type?: string | null
          created_at?: string
          file_path: string
          file_url?: string | null
          id?: string
          kind?: string
          name: string
          notes?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          company_vehicle_id?: string
          content_type?: string | null
          created_at?: string
          file_path?: string
          file_url?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_vehicle_documents_company_vehicle_id_fkey"
            columns: ["company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_vehicle_maintenances: {
        Row: {
          amount: number
          company_vehicle_id: string
          created_at: string
          created_by: string | null
          description: string
          general_expense_id: string | null
          id: string
          mileage: number | null
          next_maintenance_at: string | null
          notes: string | null
          occurred_at: string
          supplier: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_vehicle_id: string
          created_at?: string
          created_by?: string | null
          description: string
          general_expense_id?: string | null
          id?: string
          mileage?: number | null
          next_maintenance_at?: string | null
          notes?: string | null
          occurred_at?: string
          supplier?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_vehicle_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          general_expense_id?: string | null
          id?: string
          mileage?: number | null
          next_maintenance_at?: string | null
          notes?: string | null
          occurred_at?: string
          supplier?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_vehicle_maintenances_company_vehicle_id_fkey"
            columns: ["company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vehicle_maintenances_general_expense_id_fkey"
            columns: ["general_expense_id"]
            isOneToOne: false
            referencedRelation: "general_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_vehicle_photos: {
        Row: {
          company_vehicle_id: string
          created_at: string
          created_by: string | null
          file_path: string
          file_url: string | null
          id: string
          is_primary: boolean
        }
        Insert: {
          company_vehicle_id: string
          created_at?: string
          created_by?: string | null
          file_path: string
          file_url?: string | null
          id?: string
          is_primary?: boolean
        }
        Update: {
          company_vehicle_id?: string
          created_at?: string
          created_by?: string | null
          file_path?: string
          file_url?: string | null
          id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "company_vehicle_photos_company_vehicle_id_fkey"
            columns: ["company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_vehicle_status_history: {
        Row: {
          changed_by: string | null
          company_vehicle_id: string
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          company_vehicle_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          company_vehicle_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_vehicle_status_history_company_vehicle_id_fkey"
            columns: ["company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_vehicles: {
        Row: {
          acquisition_date: string | null
          acquisition_value: number
          brand: string
          buyer_name: string | null
          chassis: string | null
          color: string | null
          created_at: string
          created_by: string | null
          fuel: string | null
          id: string
          main_photo_url: string | null
          manufacture_year: number | null
          mileage: number
          model: string
          model_year: number | null
          notes: string | null
          owner: string | null
          plate: string
          renavam: string | null
          responsible_name: string | null
          sale_notes: string | null
          sale_value: number | null
          sold_at: string | null
          status: string
          updated_at: string
          usage_purpose: string | null
          version: string | null
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_value?: number
          brand: string
          buyer_name?: string | null
          chassis?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          fuel?: string | null
          id?: string
          main_photo_url?: string | null
          manufacture_year?: number | null
          mileage?: number
          model: string
          model_year?: number | null
          notes?: string | null
          owner?: string | null
          plate: string
          renavam?: string | null
          responsible_name?: string | null
          sale_notes?: string | null
          sale_value?: number | null
          sold_at?: string | null
          status?: string
          updated_at?: string
          usage_purpose?: string | null
          version?: string | null
        }
        Update: {
          acquisition_date?: string | null
          acquisition_value?: number
          brand?: string
          buyer_name?: string | null
          chassis?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          fuel?: string | null
          id?: string
          main_photo_url?: string | null
          manufacture_year?: number | null
          mileage?: number
          model?: string
          model_year?: number | null
          notes?: string | null
          owner?: string | null
          plate?: string
          renavam?: string | null
          responsible_name?: string | null
          sale_notes?: string | null
          sale_value?: number | null
          sold_at?: string | null
          status?: string
          updated_at?: string
          usage_purpose?: string | null
          version?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived: boolean
          created_at: string
          customer_id: string | null
          id: string
          last_message_at: string
          last_message_preview: string | null
          name: string | null
          phone: string
          remote_jid: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          name?: string | null
          phone: string
          remote_jid?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          name?: string | null
          phone?: string
          remote_jid?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["customer_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
        }
        Relationships: []
      }
      deal_events: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          kind: string
          message: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          kind: string
          message?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          kind?: string
          message?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          occurred_at: string | null
          owner_id: string | null
          position: number
          priority: Database["public"]["Enums"]["deal_priority"]
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          truck_id: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          owner_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["deal_priority"]
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          truck_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          owner_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["deal_priority"]
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          truck_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          customer_id: string | null
          deal_id: string | null
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          mime_type: string | null
          notes: string | null
          size_bytes: number | null
          storage_path: string | null
          title: string
          truck_id: string | null
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          title: string
          truck_id?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          title?: string
          truck_id?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      email_jobs: {
        Row: {
          attempts: number | null
          contract_id: string | null
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          idempotency_key: string | null
          max_attempts: number | null
          payload: Json
          processed_at: string | null
          provider: string | null
          provider_message_id: string | null
          queued_at: string | null
          recipient_email: string
          sale_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_job_status"] | null
          subject: string
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          max_attempts?: number | null
          payload: Json
          processed_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          queued_at?: string | null
          recipient_email: string
          sale_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_job_status"] | null
          subject: string
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          max_attempts?: number | null
          payload?: Json
          processed_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          queued_at?: string | null
          recipient_email?: string
          sale_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_job_status"] | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_jobs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sale_formalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_jobs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_jobs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          auto_send_contracts: boolean | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          password_hash: string
          pop_password_hash: string | null
          pop_port: number | null
          pop_security: string | null
          pop_server: string | null
          pop_user: string | null
          sender_name: string
          smtp_port: number
          smtp_security: string | null
          smtp_server: string
          smtp_user: string | null
          updated_at: string | null
        }
        Insert: {
          auto_send_contracts?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          password_hash: string
          pop_password_hash?: string | null
          pop_port?: number | null
          pop_security?: string | null
          pop_server?: string | null
          pop_user?: string | null
          sender_name?: string
          smtp_port?: number
          smtp_security?: string | null
          smtp_server?: string
          smtp_user?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_send_contracts?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          password_hash?: string
          pop_password_hash?: string | null
          pop_port?: number | null
          pop_security?: string | null
          pop_server?: string | null
          pop_user?: string | null
          sender_name?: string
          smtp_port?: number
          smtp_security?: string | null
          smtp_server?: string
          smtp_user?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_settings_v2: {
        Row: {
          auto_send_contracts: boolean | null
          created_at: string
          dns_records: Json | null
          domain: string
          id: string
          is_active: boolean | null
          provider: string
          sender_email: string
          sender_name: string
          updated_at: string
        }
        Insert: {
          auto_send_contracts?: boolean | null
          created_at?: string
          dns_records?: Json | null
          domain: string
          id?: string
          is_active?: boolean | null
          provider?: string
          sender_email: string
          sender_name?: string
          updated_at?: string
        }
        Update: {
          auto_send_contracts?: boolean | null
          created_at?: string
          dns_records?: Json | null
          domain?: string
          id?: string
          is_active?: boolean | null
          provider?: string
          sender_email?: string
          sender_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          commission_amount: number | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string
          hired_at: string | null
          id: string
          notes: string | null
          phone: string | null
          position_id: string | null
          salary: number | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name: string
          hired_at?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_amount?: number | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string
          hired_at?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approval_access: {
        Row: {
          can_approve: boolean
          can_approve_own: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          can_approve?: boolean
          can_approve_own?: boolean
          created_at?: string
          user_id: string
        }
        Update: {
          can_approve?: boolean
          can_approve_own?: boolean
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_approval_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          note: string | null
          request_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          request_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_approval_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "expense_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approval_requests: {
        Row: {
          amount: number
          bank: string | null
          bank_account_id: string | null
          category: string | null
          company_vehicle_id: string | null
          correction_note: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          employee_id: string | null
          final_category: string | null
          id: string
          inventory_item_id: string | null
          notes: string | null
          occurred_at: string | null
          origin: string
          original_due_date: string | null
          payload: Json | null
          payment_method: string | null
          proposed_category: string | null
          proposed_status: string | null
          registration_type: string | null
          resulting_id: string | null
          resulting_table: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_id: string | null
          shared: boolean
          status: string
          stock_movement_id: string | null
          submitted_at: string
          supplier: string | null
          supplier_id: string | null
          target_type: string
          truck_id: string | null
          updated_at: string
          urgent: boolean
          warranty_id: string | null
        }
        Insert: {
          amount?: number
          bank?: string | null
          bank_account_id?: string | null
          category?: string | null
          company_vehicle_id?: string | null
          correction_note?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          employee_id?: string | null
          final_category?: string | null
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          occurred_at?: string | null
          origin: string
          original_due_date?: string | null
          payload?: Json | null
          payment_method?: string | null
          proposed_category?: string | null
          proposed_status?: string | null
          registration_type?: string | null
          resulting_id?: string | null
          resulting_table?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          shared?: boolean
          status?: string
          stock_movement_id?: string | null
          submitted_at?: string
          supplier?: string | null
          supplier_id?: string | null
          target_type: string
          truck_id?: string | null
          updated_at?: string
          urgent?: boolean
          warranty_id?: string | null
        }
        Update: {
          amount?: number
          bank?: string | null
          bank_account_id?: string | null
          category?: string | null
          company_vehicle_id?: string | null
          correction_note?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          employee_id?: string | null
          final_category?: string | null
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          occurred_at?: string | null
          origin?: string
          original_due_date?: string | null
          payload?: Json | null
          payment_method?: string | null
          proposed_category?: string | null
          proposed_status?: string | null
          registration_type?: string | null
          resulting_id?: string | null
          resulting_table?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          shared?: boolean
          status?: string
          stock_movement_id?: string | null
          submitted_at?: string
          supplier?: string | null
          supplier_id?: string | null
          target_type?: string
          truck_id?: string | null
          updated_at?: string
          urgent?: boolean
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_approval_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_approval_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_approval_requests_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_approval_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_approval_requests_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_approval_requests_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string
          record_id: string | null
          record_table: string | null
          request_id: string | null
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          record_id?: string | null
          record_table?: string | null
          request_id?: string | null
          size_bytes: number
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          record_id?: string | null
          record_table?: string | null
          request_id?: string | null
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "expense_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      financial_event_kinds: {
        Row: {
          affects_cash: boolean
          affects_stock: boolean
          capitalized_in_truck: boolean
          code: string
          description: string | null
          include_in_profit: boolean
          label: string
        }
        Insert: {
          affects_cash: boolean
          affects_stock: boolean
          capitalized_in_truck?: boolean
          code: string
          description?: string | null
          include_in_profit: boolean
          label: string
        }
        Update: {
          affects_cash?: boolean
          affects_stock?: boolean
          capitalized_in_truck?: boolean
          code?: string
          description?: string | null
          include_in_profit?: boolean
          label?: string
        }
        Relationships: []
      }
      general_expense_closings: {
        Row: {
          c4_amount: number
          closed_at: string
          closed_by: string | null
          closed_by_name: string | null
          created_at: string
          expense_count: number
          id: string
          imperio_amount: number
          month: string
          notes: string | null
          total_amount: number
        }
        Insert: {
          c4_amount?: number
          closed_at?: string
          closed_by?: string | null
          closed_by_name?: string | null
          created_at?: string
          expense_count?: number
          id?: string
          imperio_amount?: number
          month: string
          notes?: string | null
          total_amount?: number
        }
        Update: {
          c4_amount?: number
          closed_at?: string
          closed_by?: string | null
          closed_by_name?: string | null
          created_at?: string
          expense_count?: number
          id?: string
          imperio_amount?: number
          month?: string
          notes?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      general_expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          bank_account: string | null
          bank_account_id: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          barcode: string | null
          c4_amount: number
          c4_percent: number | null
          category: string
          closed_at: string | null
          closed_by: string | null
          closing_id: string | null
          closing_month: string | null
          company_vehicle_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          employee_id: string | null
          financial_event_kind: string
          id: string
          imperio_amount: number
          imperio_percent: number | null
          include_in_profit: boolean | null
          inventory_item_id: string | null
          is_urgent: boolean | null
          notes: string | null
          occurred_at: string
          occurrence_number: number | null
          original_due_date: string | null
          payment_method: string | null
          pix_key: string | null
          pix_key_type: string | null
          purchase_installment_id: string | null
          recurrence_id: string | null
          service_id: string | null
          shared: boolean
          status: string | null
          stock_movement_id: string | null
          stock_purchase_id: string | null
          supplier: string | null
          truck_id: string | null
          updated_at: string
          warranty_id: string | null
        }
        Insert: {
          amount?: number
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number
          c4_percent?: number | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_id?: string | null
          closing_month?: string | null
          company_vehicle_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          employee_id?: string | null
          financial_event_kind?: string
          id?: string
          imperio_amount?: number
          imperio_percent?: number | null
          include_in_profit?: boolean | null
          inventory_item_id?: string | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string
          occurrence_number?: number | null
          original_due_date?: string | null
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          recurrence_id?: string | null
          service_id?: string | null
          shared?: boolean
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string
          warranty_id?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number
          c4_percent?: number | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_id?: string | null
          closing_month?: string | null
          company_vehicle_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          employee_id?: string | null
          financial_event_kind?: string
          id?: string
          imperio_amount?: number
          imperio_percent?: number | null
          include_in_profit?: boolean | null
          inventory_item_id?: string | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string
          occurrence_number?: number | null
          original_due_date?: string | null
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          recurrence_id?: string | null
          service_id?: string | null
          shared?: boolean
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "general_expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_company_vehicle_id_fkey"
            columns: ["company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_financial_event_kind_fk"
            columns: ["financial_event_kind"]
            isOneToOne: false
            referencedRelation: "financial_event_kinds"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "general_expenses_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_audit_estoque_reconciliacao"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "general_expenses_purchase_installment_id_fkey"
            columns: ["purchase_installment_id"]
            isOneToOne: false
            referencedRelation: "truck_purchase_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_stock_purchase_id_fkey"
            columns: ["stock_purchase_id"]
            isOneToOne: false
            referencedRelation: "stock_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_expenses_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "truck_warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          employee_id: string | null
          ends_at: string
          id: string
          notes: string | null
          period: Database["public"]["Enums"]["goal_period"]
          starts_at: string
          target_value: number
          title: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          employee_id?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          period?: Database["public"]["Enums"]["goal_period"]
          starts_at: string
          target_value: number
          title: string
        }
        Update: {
          created_at?: string
          current_value?: number
          employee_id?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          period?: Database["public"]["Enums"]["goal_period"]
          starts_at?: string
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          general_expense_id: string | null
          id: string
          item_id: string
          notes: string | null
          occurred_at: string
          supplier: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          general_expense_id?: string | null
          id?: string
          item_id: string
          notes?: string | null
          occurred_at?: string
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          general_expense_id?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          occurred_at?: string
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_expenses_general_expense_id_fkey"
            columns: ["general_expense_id"]
            isOneToOne: false
            referencedRelation: "general_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_expenses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_expenses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_expenses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_audit_estoque_reconciliacao"
            referencedColumns: ["item_id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          balance_reconciled_at: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          initial_quantity: number | null
          internal_code: string | null
          min_quantity: number
          name: string
          notes: string | null
          quantity: number
          storage_location: string | null
          supplier_id: string | null
          supplier_name: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          balance_reconciled_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          initial_quantity?: number | null
          internal_code?: string | null
          min_quantity?: number
          name: string
          notes?: string | null
          quantity?: number
          storage_location?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          balance_reconciled_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          initial_quantity?: number | null
          internal_code?: string | null
          min_quantity?: number
          name?: string
          notes?: string | null
          quantity?: number
          storage_location?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          financial_event_kind: string
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          origin: string | null
          quantity: number
          responsible_id: string | null
          stock_purchase_id: string | null
          total_amount: number
          truck_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          financial_event_kind?: string
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          origin?: string | null
          quantity: number
          responsible_id?: string | null
          stock_purchase_id?: string | null
          total_amount?: number
          truck_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          financial_event_kind?: string
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          origin?: string | null
          quantity?: number
          responsible_id?: string | null
          stock_purchase_id?: string | null
          total_amount?: number
          truck_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_financial_event_kind_fk"
            columns: ["financial_event_kind"]
            isOneToOne: false
            referencedRelation: "financial_event_kinds"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_audit_estoque_reconciliacao"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_stock_purchase_id_fkey"
            columns: ["stock_purchase_id"]
            isOneToOne: false
            referencedRelation: "stock_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_truck_usage: {
        Row: {
          created_at: string
          created_by: string | null
          financial_event_kind: string
          id: string
          inventory_item_id: string
          notes: string | null
          occurred_at: string
          quantity: number
          service_id: string | null
          stock_movement_id: string | null
          total_amount: number
          truck_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          financial_event_kind?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          occurred_at?: string
          quantity: number
          service_id?: string | null
          stock_movement_id?: string | null
          total_amount: number
          truck_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          financial_event_kind?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          occurred_at?: string
          quantity?: number
          service_id?: string | null
          stock_movement_id?: string | null
          total_amount?: number
          truck_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_truck_usage_financial_event_kind_fk"
            columns: ["financial_event_kind"]
            isOneToOne: false
            referencedRelation: "financial_event_kinds"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "inventory_truck_usage_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "v_audit_estoque_reconciliacao"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          converted_customer_id: string | null
          created_at: string
          email: string | null
          id: string
          interest: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          converted_customer_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          converted_customer_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          sent_by: string | null
          status: string
          zapi_message_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          sent_by?: string | null
          status?: string
          zapi_message_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          sent_by?: string | null
          status?: string
          zapi_message_id?: string | null
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
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          priority: Database["public"]["Enums"]["notification_priority"]
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read?: boolean
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      payables: {
        Row: {
          amount: number
          attachment_url: string | null
          bank_account: string | null
          bank_account_id: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          barcode: string | null
          c4_amount: number
          c4_percent: number | null
          category_id: string | null
          company_vehicle_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          financial_event_kind: string
          general_expense_id: string | null
          id: string
          imperio_amount: number | null
          imperio_percent: number | null
          is_urgent: boolean | null
          notes: string | null
          occurred_at: string | null
          occurrence_number: number | null
          original_due_date: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pix_key: string | null
          pix_key_type: string | null
          recurrence_id: string | null
          shared: boolean
          status: Database["public"]["Enums"]["payable_status"]
          stock_purchase_id: string | null
          supplier: string | null
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number
          c4_percent?: number | null
          category_id?: string | null
          company_vehicle_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          financial_event_kind?: string
          general_expense_id?: string | null
          id?: string
          imperio_amount?: number | null
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          occurrence_number?: number | null
          original_due_date?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_id?: string | null
          shared?: boolean
          status?: Database["public"]["Enums"]["payable_status"]
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number
          c4_percent?: number | null
          category_id?: string | null
          company_vehicle_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          financial_event_kind?: string
          general_expense_id?: string | null
          id?: string
          imperio_amount?: number | null
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          occurrence_number?: number | null
          original_due_date?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_id?: string | null
          shared?: boolean
          status?: Database["public"]["Enums"]["payable_status"]
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_company_vehicle_id_fkey"
            columns: ["company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_financial_event_kind_fk"
            columns: ["financial_event_kind"]
            isOneToOne: false
            referencedRelation: "financial_event_kinds"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payables_general_expense_id_fkey"
            columns: ["general_expense_id"]
            isOneToOne: false
            referencedRelation: "general_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_stock_purchase_id_fkey"
            columns: ["stock_purchase_id"]
            isOneToOne: false
            referencedRelation: "stock_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          base_salary: number | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      push_deliveries: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          occurrence: number
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          occurrence?: number
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          occurrence?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_preferences: {
        Row: {
          reminders_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          reminders_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          reminders_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_reminder_plans: {
        Row: {
          anchor_at: string
          cancel_reason: string | null
          created_at: string
          id: string
          notification_id: string
          per_day: number
          planned_at: string[]
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_at?: string
          cancel_reason?: string | null
          created_at?: string
          id?: string
          notification_id: string
          per_day?: number
          planned_at?: string[]
          status?: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_at?: string
          cancel_reason?: string | null
          created_at?: string
          id?: string
          notification_id?: string
          per_day?: number
          planned_at?: string[]
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_reminder_plans_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_reminder_plans_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_scheduler_secret: {
        Row: {
          created_at: string
          id: boolean
          secret: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          secret: string
        }
        Update: {
          created_at?: string
          id?: boolean
          secret?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receivable_bank_splits: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          id: string
          receivable_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          id?: string
          receivable_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          id?: string
          receivable_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_bank_splits_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivable_bank_splits_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivable_bank_splits_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          attachment_url: string | null
          bank_account: string | null
          bank_account_id: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          barcode: string | null
          category_id: string | null
          check_issue_date: string | null
          check_status: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          description: string
          due_date: string
          id: string
          installment_number: number | null
          installment_total: number | null
          is_urgent: boolean | null
          notes: string | null
          occurred_at: string | null
          occurrence_number: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pix_key: string | null
          pix_key_type: string | null
          received_at: string | null
          recurrence_id: string | null
          status: Database["public"]["Enums"]["receivable_status"]
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          category_id?: string | null
          check_issue_date?: string | null
          check_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description: string
          due_date: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          occurrence_number?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          received_at?: string | null
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["receivable_status"]
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          category_id?: string | null
          check_issue_date?: string | null
          check_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          occurrence_number?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          received_at?: string | null
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["receivable_status"]
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrences: {
        Row: {
          amount: number
          bank_account: string | null
          bank_account_id: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          barcode: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string
          ends_at: string | null
          id: string
          is_urgent: boolean | null
          kind: string
          notes: string | null
          occurrences_total: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          period: Database["public"]["Enums"]["recurrence_period"]
          pix_key: string | null
          pix_key_type: string | null
          starts_at: string
          status: string
          supplier: string | null
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description: string
          ends_at?: string | null
          id?: string
          is_urgent?: boolean | null
          kind: string
          notes?: string | null
          occurrences_total?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period: Database["public"]["Enums"]["recurrence_period"]
          pix_key?: string | null
          pix_key_type?: string | null
          starts_at: string
          status?: string
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          is_urgent?: boolean | null
          kind?: string
          notes?: string | null
          occurrences_total?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period?: Database["public"]["Enums"]["recurrence_period"]
          pix_key?: string | null
          pix_key_type?: string | null
          starts_at?: string
          status?: string
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrences_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_formalization_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          formalization_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          formalization_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          formalization_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_formalization_events_formalization_id_fkey"
            columns: ["formalization_id"]
            isOneToOne: false
            referencedRelation: "sale_formalizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_formalization_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          formalization_id: string
          id: string
          metadata: Json | null
          recipient_email: string | null
          status: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          formalization_id: string
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          status?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          formalization_id?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_formalization_logs_formalization_id_fkey"
            columns: ["formalization_id"]
            isOneToOne: false
            referencedRelation: "sale_formalizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_formalizations: {
        Row: {
          access_code: string | null
          access_code_expires_at: string | null
          auto_send_enabled: boolean | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          customer_id: string
          document_hash: string | null
          email_status: string | null
          expires_at: string
          id: string
          last_email_error: string | null
          opened_at: string | null
          sale_id: string
          sent_at: string | null
          signing_url: string | null
          status: Database["public"]["Enums"]["formalization_status"]
          token: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          access_code_expires_at?: string | null
          auto_send_enabled?: boolean | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          customer_id: string
          document_hash?: string | null
          email_status?: string | null
          expires_at: string
          id?: string
          last_email_error?: string | null
          opened_at?: string | null
          sale_id: string
          sent_at?: string | null
          signing_url?: string | null
          status?: Database["public"]["Enums"]["formalization_status"]
          token: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          access_code_expires_at?: string | null
          auto_send_enabled?: boolean | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          customer_id?: string
          document_hash?: string | null
          email_status?: string | null
          expires_at?: string
          id?: string
          last_email_error?: string | null
          opened_at?: string | null
          sale_id?: string
          sent_at?: string | null
          signing_url?: string | null
          status?: Database["public"]["Enums"]["formalization_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_formalizations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_formalizations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_formalizations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_signatures: {
        Row: {
          created_at: string
          formalization_id: string
          id: string
          ip_address: string | null
          mfa_attempts: number
          mfa_code: string | null
          mfa_expires_at: string | null
          mfa_verified: boolean
          signature_data: string
          signed_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          formalization_id: string
          id?: string
          ip_address?: string | null
          mfa_attempts?: number
          mfa_code?: string | null
          mfa_expires_at?: string | null
          mfa_verified?: boolean
          signature_data: string
          signed_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          formalization_id?: string
          id?: string
          ip_address?: string | null
          mfa_attempts?: number
          mfa_code?: string | null
          mfa_expires_at?: string | null
          mfa_verified?: boolean
          signature_data?: string
          signed_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_signatures_formalization_id_fkey"
            columns: ["formalization_id"]
            isOneToOne: true
            referencedRelation: "sale_formalizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          attachment_url: string | null
          bank_account_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          down_payment: number | null
          down_payment_bank_account_id: string | null
          down_payment_confirmed_at: string | null
          down_payment_confirmed_by: string | null
          down_payment_status:
            | Database["public"]["Enums"]["down_payment_status"]
            | null
          expected_at: string | null
          id: string
          notes: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["service_status"]
          supplier_id: string | null
          title: string
          total_value: number | null
          truck_id: string | null
          truck_previous_status: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          attachment_url?: string | null
          bank_account_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          down_payment?: number | null
          down_payment_bank_account_id?: string | null
          down_payment_confirmed_at?: string | null
          down_payment_confirmed_by?: string | null
          down_payment_status?:
            | Database["public"]["Enums"]["down_payment_status"]
            | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          supplier_id?: string | null
          title: string
          total_value?: number | null
          truck_id?: string | null
          truck_previous_status?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          attachment_url?: string | null
          bank_account_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          down_payment?: number | null
          down_payment_bank_account_id?: string | null
          down_payment_confirmed_at?: string | null
          down_payment_confirmed_by?: string | null
          down_payment_status?:
            | Database["public"]["Enums"]["down_payment_status"]
            | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          supplier_id?: string | null
          title?: string
          total_value?: number | null
          truck_id?: string | null
          truck_previous_status?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_down_payment_bank_account_id_fkey"
            columns: ["down_payment_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_purchases: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          item_id: string | null
          notes: string | null
          occurred_at: string
          payable_id: string | null
          quantity: number
          status: string
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          item_id?: string | null
          notes?: string | null
          occurred_at?: string
          payable_id?: string | null
          quantity: number
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          occurred_at?: string
          payable_id?: string | null
          quantity?: number
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_audit_estoque_reconciliacao"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_purchases_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchases_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          bank_account: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          category: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          preferred_payment_method:
            | Database["public"]["Enums"]["payment_method"]
            | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      truck_documents: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          truck_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          truck_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          truck_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_documents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_documents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          financial_event_kind: string
          id: string
          include_in_profit: boolean | null
          kind: Database["public"]["Enums"]["expense_kind"]
          notes: string | null
          occurred_at: string
          original_due_date: string | null
          service_id: string | null
          status: string | null
          stock_movement_id: string | null
          stock_purchase_id: string | null
          supplier: string | null
          truck_id: string
          warranty_id: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          financial_event_kind?: string
          id?: string
          include_in_profit?: boolean | null
          kind?: Database["public"]["Enums"]["expense_kind"]
          notes?: string | null
          occurred_at?: string
          original_due_date?: string | null
          service_id?: string | null
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id: string
          warranty_id?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          financial_event_kind?: string
          id?: string
          include_in_profit?: boolean | null
          kind?: Database["public"]["Enums"]["expense_kind"]
          notes?: string | null
          occurred_at?: string
          original_due_date?: string | null
          service_id?: string | null
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_expenses_financial_event_kind_fk"
            columns: ["financial_event_kind"]
            isOneToOne: false
            referencedRelation: "financial_event_kinds"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "truck_expenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_expenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_expenses_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_expenses_stock_purchase_id_fkey"
            columns: ["stock_purchase_id"]
            isOneToOne: false
            referencedRelation: "stock_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_expenses_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_expenses_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_expenses_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "truck_warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_flow_access: {
        Row: {
          access_level: string
          created_at: string
          user_id: string
        }
        Insert: {
          access_level: string
          created_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      truck_flow_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          flow_id: string
          id: string
          reason: string | null
          step_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          flow_id: string
          id?: string
          reason?: string | null
          step_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          flow_id?: string
          id?: string
          reason?: string | null
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_flow_events_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "truck_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_flow_events_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "truck_flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_flow_evidence: {
        Row: {
          created_at: string
          file_name: string
          flow_step_id: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          flow_step_id: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          flow_step_id?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_flow_evidence_flow_step_id_fkey"
            columns: ["flow_step_id"]
            isOneToOne: false
            referencedRelation: "truck_flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_flow_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          display_order: number
          flow_id: string
          id: string
          notes: string | null
          status: string
          step_key: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          display_order: number
          flow_id: string
          id?: string
          notes?: string | null
          status?: string
          step_key: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          display_order?: number
          flow_id?: string
          id?: string
          notes?: string | null
          status?: string
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "truck_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_flows: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          id: string
          started_at: string
          started_by: string
          status: string
          truck_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          started_at?: string
          started_by: string
          status?: string
          truck_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          id?: string
          started_at?: string
          started_by?: string
          status?: string
          truck_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_flows_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: true
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_flows_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: true
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          truck_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          truck_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_notes_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_notes_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_photos: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          position: number
          storage_path: string | null
          truck_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          storage_path?: string | null
          truck_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          storage_path?: string | null
          truck_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_photos_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_photos_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_purchase_installments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string
          id: string
          installment_number: number
          original_due_date: string | null
          paid_amount: number | null
          paid_at: string | null
          status: string
          total_installments: number
          truck_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date: string
          id?: string
          installment_number: number
          original_due_date?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          status?: string
          total_installments: number
          truck_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          original_due_date?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          status?: string
          total_installments?: number
          truck_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_purchase_installments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_purchase_installments_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_purchase_installments_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          service_id: string | null
          to_status: string
          truck_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          service_id?: string | null
          to_status: string
          truck_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          service_id?: string | null
          to_status?: string
          truck_id?: string
        }
        Relationships: []
      }
      truck_warranties: {
        Row: {
          created_at: string
          customer_id: string | null
          deal_id: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: Database["public"]["Enums"]["warranty_status"]
          truck_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["warranty_status"]
          truck_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["warranty_status"]
          truck_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_warranties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_warranties_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_warranties_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: true
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_warranties_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: true
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          ai_description: string | null
          brand: string
          chassis: string | null
          color: string | null
          consigned: boolean
          created_at: string
          created_by: string | null
          description: string | null
          down_payment_bank_account_id: string | null
          down_payment_confirmed_at: string | null
          down_payment_confirmed_by: string | null
          down_payment_status:
            | Database["public"]["Enums"]["down_payment_status"]
            | null
          down_payment_value: number | null
          expected_price: number | null
          expenses_total: number
          fuel: string | null
          id: string
          mileage: number | null
          model: string
          origin: string | null
          plate: string | null
          purchase_date: string | null
          purchase_installments_count: number | null
          purchase_payment_method: string | null
          purchase_price: number | null
          purchase_total_paid: number | null
          purchase_total_pending: number | null
          renavam: string | null
          sale_notes: string | null
          sale_payment_method: string | null
          sale_type: string | null
          site_description: string | null
          sold_at: string | null
          sold_customer_id: string | null
          sold_price: number | null
          status: Database["public"]["Enums"]["truck_status"]
          status_expected_end: string | null
          status_notes: string | null
          status_started_at: string | null
          status_supplier_id: string | null
          supplier: string | null
          transmission: string | null
          updated_at: string
          warranty_end: string | null
          year: number | null
        }
        Insert: {
          ai_description?: string | null
          brand: string
          chassis?: string | null
          color?: string | null
          consigned?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          down_payment_bank_account_id?: string | null
          down_payment_confirmed_at?: string | null
          down_payment_confirmed_by?: string | null
          down_payment_status?:
            | Database["public"]["Enums"]["down_payment_status"]
            | null
          down_payment_value?: number | null
          expected_price?: number | null
          expenses_total?: number
          fuel?: string | null
          id?: string
          mileage?: number | null
          model: string
          origin?: string | null
          plate?: string | null
          purchase_date?: string | null
          purchase_installments_count?: number | null
          purchase_payment_method?: string | null
          purchase_price?: number | null
          purchase_total_paid?: number | null
          purchase_total_pending?: number | null
          renavam?: string | null
          sale_notes?: string | null
          sale_payment_method?: string | null
          sale_type?: string | null
          site_description?: string | null
          sold_at?: string | null
          sold_customer_id?: string | null
          sold_price?: number | null
          status?: Database["public"]["Enums"]["truck_status"]
          status_expected_end?: string | null
          status_notes?: string | null
          status_started_at?: string | null
          status_supplier_id?: string | null
          supplier?: string | null
          transmission?: string | null
          updated_at?: string
          warranty_end?: string | null
          year?: number | null
        }
        Update: {
          ai_description?: string | null
          brand?: string
          chassis?: string | null
          color?: string | null
          consigned?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          down_payment_bank_account_id?: string | null
          down_payment_confirmed_at?: string | null
          down_payment_confirmed_by?: string | null
          down_payment_status?:
            | Database["public"]["Enums"]["down_payment_status"]
            | null
          down_payment_value?: number | null
          expected_price?: number | null
          expenses_total?: number
          fuel?: string | null
          id?: string
          mileage?: number | null
          model?: string
          origin?: string | null
          plate?: string | null
          purchase_date?: string | null
          purchase_installments_count?: number | null
          purchase_payment_method?: string | null
          purchase_price?: number | null
          purchase_total_paid?: number | null
          purchase_total_pending?: number | null
          renavam?: string | null
          sale_notes?: string | null
          sale_payment_method?: string | null
          sale_type?: string | null
          site_description?: string | null
          sold_at?: string | null
          sold_customer_id?: string | null
          sold_price?: number | null
          status?: Database["public"]["Enums"]["truck_status"]
          status_expected_end?: string | null
          status_notes?: string | null
          status_started_at?: string | null
          status_supplier_id?: string | null
          supplier?: string | null
          transmission?: string | null
          updated_at?: string
          warranty_end?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_down_payment_bank_account_id_fkey"
            columns: ["down_payment_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_status_supplier_id_fkey"
            columns: ["status_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_keywords: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          keyword: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
        }
        Relationships: []
      }
      whatsapp_webhook_log: {
        Row: {
          error: string | null
          id: string
          payload: Json
          processed: boolean
          received_at: string
        }
        Insert: {
          error?: string | null
          id?: string
          payload: Json
          processed?: boolean
          received_at?: string
        }
        Update: {
          error?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          received_at?: string
        }
        Relationships: []
      }
      z_archive_te_etapa2_20260921: {
        Row: {
          amount: number | null
          attachment_url: string | null
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string | null
          kind: Database["public"]["Enums"]["expense_kind"] | null
          notes: string | null
          occurred_at: string | null
          service_id: string | null
          status: string | null
          supplier: string | null
          truck_id: string | null
          warranty_id: string | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          kind?: Database["public"]["Enums"]["expense_kind"] | null
          notes?: string | null
          occurred_at?: string | null
          service_id?: string | null
          status?: string | null
          supplier?: string | null
          truck_id?: string | null
          warranty_id?: string | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          kind?: Database["public"]["Enums"]["expense_kind"] | null
          notes?: string | null
          occurred_at?: string | null
          service_id?: string | null
          status?: string | null
          supplier?: string | null
          truck_id?: string | null
          warranty_id?: string | null
        }
        Relationships: []
      }
      z_backup_bt_ge_dups_20261001: {
        Row: {
          amount: number | null
          attachment_url: string | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          financial_event_kind: string | null
          id: string | null
          notes: string | null
          occurred_at: string | null
          related_general_expense_id: string | null
          related_payable_id: string | null
          related_receivable_id: string | null
          related_service_id: string | null
          related_split_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          financial_event_kind?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          financial_event_kind?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Relationships: []
      }
      z_backup_bt_orphan_etapa1_v2_20260921: {
        Row: {
          amount: number | null
          attachment_url: string | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          notes: string | null
          occurred_at: string | null
          related_general_expense_id: string | null
          related_payable_id: string | null
          related_receivable_id: string | null
          related_service_id: string | null
          related_split_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Relationships: []
      }
      z_backup_bt_orphan_final: {
        Row: {
          amount: number | null
          attachment_url: string | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          notes: string | null
          occurred_at: string | null
          related_general_expense_id: string | null
          related_payable_id: string | null
          related_receivable_id: string | null
          related_service_id: string | null
          related_split_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Relationships: []
      }
      z_backup_bt_orphan_general: {
        Row: {
          amount: number | null
          attachment_url: string | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          notes: string | null
          occurred_at: string | null
          related_general_expense_id: string | null
          related_payable_id: string | null
          related_receivable_id: string | null
          related_service_id: string | null
          related_split_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Relationships: []
      }
      z_backup_bt_orphan_service: {
        Row: {
          amount: number | null
          attachment_url: string | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          notes: string | null
          occurred_at: string | null
          related_general_expense_id: string | null
          related_payable_id: string | null
          related_receivable_id: string | null
          related_service_id: string | null
          related_split_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Relationships: []
      }
      z_backup_bt_orphan_truck: {
        Row: {
          amount: number | null
          attachment_url: string | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          notes: string | null
          occurred_at: string | null
          related_general_expense_id: string | null
          related_payable_id: string | null
          related_receivable_id: string | null
          related_service_id: string | null
          related_split_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_payable_id?: string | null
          related_receivable_id?: string | null
          related_service_id?: string | null
          related_split_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Relationships: []
      }
      z_backup_ge_duplicatas_20260930: {
        Row: {
          amount: number | null
          attachment_url: string | null
          bank_account: string | null
          bank_account_id: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          barcode: string | null
          c4_amount: number | null
          c4_percent: number | null
          category: string | null
          closed_at: string | null
          closed_by: string | null
          closing_id: string | null
          closing_month: string | null
          company_vehicle_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          financial_event_kind: string | null
          id: string | null
          imperio_amount: number | null
          imperio_percent: number | null
          is_urgent: boolean | null
          notes: string | null
          occurred_at: string | null
          payment_method: string | null
          pix_key: string | null
          pix_key_type: string | null
          purchase_installment_id: string | null
          service_id: string | null
          shared: boolean | null
          status: string | null
          stock_movement_id: string | null
          stock_purchase_id: string | null
          supplier: string | null
          truck_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number | null
          c4_percent?: number | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_id?: string | null
          closing_month?: string | null
          company_vehicle_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          financial_event_kind?: string | null
          id?: string | null
          imperio_amount?: number | null
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          service_id?: string | null
          shared?: boolean | null
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number | null
          c4_percent?: number | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_id?: string | null
          closing_month?: string | null
          company_vehicle_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          financial_event_kind?: string | null
          id?: string | null
          imperio_amount?: number | null
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          service_id?: string | null
          shared?: boolean | null
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      z_backup_ge_dups_20261001: {
        Row: {
          amount: number | null
          attachment_url: string | null
          bank_account: string | null
          bank_account_id: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          barcode: string | null
          c4_amount: number | null
          c4_percent: number | null
          category: string | null
          closed_at: string | null
          closed_by: string | null
          closing_id: string | null
          closing_month: string | null
          company_vehicle_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          duplicate_reason: string | null
          financial_event_kind: string | null
          id: string | null
          imperio_amount: number | null
          imperio_percent: number | null
          is_urgent: boolean | null
          notes: string | null
          occurred_at: string | null
          payment_method: string | null
          pix_key: string | null
          pix_key_type: string | null
          purchase_installment_id: string | null
          service_id: string | null
          shared: boolean | null
          status: string | null
          stock_movement_id: string | null
          stock_purchase_id: string | null
          supplier: string | null
          survivor_id: string | null
          truck_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number | null
          c4_percent?: number | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_id?: string | null
          closing_month?: string | null
          company_vehicle_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          duplicate_reason?: string | null
          financial_event_kind?: string | null
          id?: string | null
          imperio_amount?: number | null
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          service_id?: string | null
          shared?: boolean | null
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          survivor_id?: string | null
          truck_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          c4_amount?: number | null
          c4_percent?: number | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_id?: string | null
          closing_month?: string | null
          company_vehicle_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          duplicate_reason?: string | null
          financial_event_kind?: string | null
          id?: string | null
          imperio_amount?: number | null
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          service_id?: string | null
          shared?: boolean | null
          status?: string | null
          stock_movement_id?: string | null
          stock_purchase_id?: string | null
          supplier?: string | null
          survivor_id?: string | null
          truck_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      z_orphan_class_v2: {
        Row: {
          amount: number | null
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          ge_alive: boolean | null
          ge_uuid_as_sv_alive: boolean | null
          ge_uuid_as_te_alive: boolean | null
          id: string | null
          occurred_at: string | null
          related_general_expense_id: string | null
          related_service_id: string | null
          related_truck_expense_id: string | null
          source: string | null
          sv_alive: boolean | null
          sv_uuid_as_ge_alive: boolean | null
          sv_uuid_as_te_alive: boolean | null
          te_alive: boolean | null
          te_uuid_as_ge_alive: boolean | null
          te_uuid_as_sv_alive: boolean | null
          type: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Insert: {
          amount?: number | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ge_alive?: boolean | null
          ge_uuid_as_sv_alive?: boolean | null
          ge_uuid_as_te_alive?: boolean | null
          id?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_service_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          sv_alive?: boolean | null
          sv_uuid_as_ge_alive?: boolean | null
          sv_uuid_as_te_alive?: boolean | null
          te_alive?: boolean | null
          te_uuid_as_ge_alive?: boolean | null
          te_uuid_as_sv_alive?: boolean | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Update: {
          amount?: number | null
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ge_alive?: boolean | null
          ge_uuid_as_sv_alive?: boolean | null
          ge_uuid_as_te_alive?: boolean | null
          id?: string | null
          occurred_at?: string | null
          related_general_expense_id?: string | null
          related_service_id?: string | null
          related_truck_expense_id?: string | null
          source?: string | null
          sv_alive?: boolean | null
          sv_uuid_as_ge_alive?: boolean | null
          sv_uuid_as_te_alive?: boolean | null
          te_alive?: boolean | null
          te_uuid_as_ge_alive?: boolean | null
          te_uuid_as_sv_alive?: boolean | null
          type?: Database["public"]["Enums"]["bank_tx_type"] | null
        }
        Relationships: []
      }
    }
    Views: {
      calendar_events_operational: {
        Row: {
          all_day: boolean | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string | null
          location: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["deal_priority"] | null
          recurrence: string | null
          recurrence_ends_at: string | null
          recurrence_occurrences: number | null
          recurrence_until: string | null
          related_company_vehicle_id: string | null
          related_payable_id: string | null
          related_service_id: string | null
          related_truck_id: string | null
          reminder_minutes: number | null
          starts_at: string | null
          title: string | null
          type: Database["public"]["Enums"]["event_type"] | null
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string | null
          location?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"] | null
          recurrence?: string | null
          recurrence_ends_at?: string | null
          recurrence_occurrences?: number | null
          recurrence_until?: string | null
          related_company_vehicle_id?: string | null
          related_payable_id?: string | null
          related_service_id?: string | null
          related_truck_id?: string | null
          reminder_minutes?: number | null
          starts_at?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["event_type"] | null
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string | null
          location?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"] | null
          recurrence?: string | null
          recurrence_ends_at?: string | null
          recurrence_occurrences?: number | null
          recurrence_until?: string | null
          related_company_vehicle_id?: string | null
          related_payable_id?: string | null
          related_service_id?: string | null
          related_truck_id?: string | null
          reminder_minutes?: number | null
          starts_at?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["event_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_company_vehicle_id_fkey"
            columns: ["related_company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_truck_id_fkey"
            columns: ["related_truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_truck_id_fkey"
            columns: ["related_truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidated_truck_expenses: {
        Row: {
          amount: number | null
          bank_account_id: string | null
          category: string | null
          description: string | null
          id: string | null
          imperio_amount: number | null
          occurred_at: string | null
          service_id: string | null
          shared: boolean | null
          source: string | null
          supplier: string | null
          truck_id: string | null
        }
        Relationships: []
      }
      inventory_items_operational: {
        Row: {
          balance_reconciled_at: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          initial_quantity: number | null
          internal_code: string | null
          min_quantity: number | null
          name: string | null
          notes: string | null
          quantity: number | null
          storage_location: string | null
          supplier_id: string | null
          supplier_name: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          balance_reconciled_at?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          initial_quantity?: number | null
          internal_code?: string | null
          min_quantity?: number | null
          name?: string | null
          notes?: string | null
          quantity?: number | null
          storage_location?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          balance_reconciled_at?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          initial_quantity?: number | null
          internal_code?: string | null
          min_quantity?: number | null
          name?: string | null
          notes?: string | null
          quantity?: number | null
          storage_location?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payables_operational: {
        Row: {
          amount: number | null
          bank_account: string | null
          bank_account_id: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_holder_document: string | null
          bank_holder_name: string | null
          bank_name: string | null
          barcode: string | null
          category_id: string | null
          company_vehicle_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          is_urgent: boolean | null
          notes: string | null
          occurrence_number: number | null
          original_due_date: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pix_key: string | null
          pix_key_type: string | null
          recurrence_id: string | null
          status: Database["public"]["Enums"]["payable_status"] | null
          supplier: string | null
          truck_id: string | null
        }
        Insert: {
          amount?: number | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          category_id?: string | null
          company_vehicle_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_urgent?: boolean | null
          notes?: string | null
          occurrence_number?: number | null
          original_due_date?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["payable_status"] | null
          supplier?: string | null
          truck_id?: string | null
        }
        Update: {
          amount?: number | null
          bank_account?: string | null
          bank_account_id?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_holder_document?: string | null
          bank_holder_name?: string | null
          bank_name?: string | null
          barcode?: string | null
          category_id?: string | null
          company_vehicle_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_urgent?: boolean | null
          notes?: string | null
          occurrence_number?: number | null
          original_due_date?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["payable_status"] | null
          supplier?: string | null
          truck_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_company_vehicle_id_fkey"
            columns: ["company_vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables_operational: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["receivable_status"] | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["receivable_status"] | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["receivable_status"] | null
        }
        Relationships: []
      }
      services_operational: {
        Row: {
          attachment_url: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expected_at: string | null
          id: string | null
          notes: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["service_status"] | null
          supplier_id: string | null
          title: string | null
          truck_id: string | null
          truck_previous_status: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_at?: string | null
          id?: string | null
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["service_status"] | null
          supplier_id?: string | null
          title?: string | null
          truck_id?: string | null
          truck_previous_status?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_at?: string | null
          id?: string | null
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["service_status"] | null
          supplier_id?: string | null
          title?: string | null
          truck_id?: string | null
          truck_previous_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks_operational: {
        Row: {
          ai_description: string | null
          brand: string | null
          chassis: string | null
          color: string | null
          consigned: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          fuel: string | null
          id: string | null
          mileage: number | null
          model: string | null
          origin: string | null
          plate: string | null
          purchase_date: string | null
          renavam: string | null
          site_description: string | null
          sold_at: string | null
          sold_customer_id: string | null
          status: Database["public"]["Enums"]["truck_status"] | null
          status_expected_end: string | null
          status_notes: string | null
          status_started_at: string | null
          status_supplier_id: string | null
          supplier: string | null
          transmission: string | null
          truck_photos: Json | null
          updated_at: string | null
          warranty_end: string | null
          year: number | null
        }
        Insert: {
          ai_description?: string | null
          brand?: string | null
          chassis?: string | null
          color?: string | null
          consigned?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fuel?: string | null
          id?: string | null
          mileage?: number | null
          model?: string | null
          origin?: string | null
          plate?: string | null
          purchase_date?: string | null
          renavam?: string | null
          site_description?: string | null
          sold_at?: string | null
          sold_customer_id?: string | null
          status?: Database["public"]["Enums"]["truck_status"] | null
          status_expected_end?: string | null
          status_notes?: string | null
          status_started_at?: string | null
          status_supplier_id?: string | null
          supplier?: string | null
          transmission?: string | null
          truck_photos?: never
          updated_at?: string | null
          warranty_end?: string | null
          year?: number | null
        }
        Update: {
          ai_description?: string | null
          brand?: string | null
          chassis?: string | null
          color?: string | null
          consigned?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fuel?: string | null
          id?: string | null
          mileage?: number | null
          model?: string | null
          origin?: string | null
          plate?: string | null
          purchase_date?: string | null
          renavam?: string | null
          site_description?: string | null
          sold_at?: string | null
          sold_customer_id?: string | null
          status?: Database["public"]["Enums"]["truck_status"] | null
          status_expected_end?: string | null
          status_notes?: string | null
          status_started_at?: string | null
          status_supplier_id?: string | null
          supplier?: string | null
          transmission?: string | null
          truck_photos?: never
          updated_at?: string | null
          warranty_end?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_status_supplier_id_fkey"
            columns: ["status_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_estoque_dryrun: {
        Row: {
          duplicado: number | null
          evento: string | null
          qtd: number | null
          valor_correto: number | null
          valor_hoje: number | null
        }
        Relationships: []
      }
      v_audit_estoque_duplicidade: {
        Row: {
          data: string | null
          descricao: string | null
          documento_id: string | null
          tipo: string | null
          truck: string | null
          valor_correto: number | null
          valor_duplicado: number | null
          valor_lancado: number | null
        }
        Relationships: []
      }
      v_audit_estoque_impacto_mensal: {
        Row: {
          deveria_reduzir: number | null
          mes: string | null
          origem: string | null
          reduziu_lucro_caminhao: number | null
          reduziu_resultado_global: number | null
        }
        Relationships: []
      }
      v_audit_estoque_reconciliacao: {
        Row: {
          category: string | null
          comprado: number | null
          consumido: number | null
          devolvido: number | null
          divergencia: number | null
          initial_quantity: number | null
          item: string | null
          item_id: string | null
          saldo: number | null
          saldo_cadastrado: number | null
          unit: string | null
          unit_price: number | null
          valor_saldo: number | null
        }
        Insert: {
          category?: string | null
          comprado?: never
          consumido?: never
          devolvido?: never
          divergencia?: never
          initial_quantity?: number | null
          item?: string | null
          item_id?: string | null
          saldo?: never
          saldo_cadastrado?: number | null
          unit?: string | null
          unit_price?: number | null
          valor_saldo?: never
        }
        Update: {
          category?: string | null
          comprado?: never
          consumido?: never
          devolvido?: never
          divergencia?: never
          initial_quantity?: number | null
          item?: string | null
          item_id?: string | null
          saldo?: never
          saldo_cadastrado?: number | null
          unit?: string | null
          unit_price?: number | null
          valor_saldo?: never
        }
        Relationships: []
      }
      v_audit_estoque_rodas: {
        Row: {
          detalhe: string | null
          etapa: string | null
          qtd_real: number | null
          valor_estoque: number | null
          valor_real: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_truck_flow_evidence: {
        Args: {
          p_file_name: string
          p_flow_step_id: string
          p_mime_type: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
      }
      adjust_inventory_quantity: {
        Args: { p_delta: number; p_id: string }
        Returns: number
      }
      approve_and_settle_expense_approval: {
        Args: { p_final_category: string; p_request_id: string }
        Returns: string
      }
      approve_expense_approval: {
        Args: { p_final_category: string; p_request_id: string }
        Returns: string
      }
      approve_expense_approval_legacy: {
        Args: { p_final_category: string; p_request_id: string }
        Returns: string
      }
      approve_expense_approval_original: {
        Args: { p_final_category: string; p_request_id: string }
        Returns: string
      }
      complete_service_operational: {
        Args: { p_id: string }
        Returns: undefined
      }
      complete_truck_flow_step: {
        Args: { p_flow_id: string; p_notes?: string; p_step_key: string }
        Returns: undefined
      }
      confirm_down_payment:
        | {
            Args: {
              p_bank_account_id: string
              p_confirmed_by: string
              p_target_id: string
              p_target_type: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_confirmed_by: string
              p_splits: Json
              p_target_id: string
              p_target_type: string
            }
            Returns: undefined
          }
      create_bank_transfer: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_description?: string
          p_from_account_id: string
          p_occurred_at?: string
          p_to_account_id: string
        }
        Returns: undefined
      }
      create_truck_flow: { Args: { p_truck_id: string }; Returns: string }
      delete_calendar_event_operational: {
        Args: { p_id: string }
        Returns: undefined
      }
      delete_expense_approval: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      edit_expense_approval: {
        Args: {
          p_amount: number
          p_bank?: string
          p_bank_account_id?: string
          p_company_vehicle_id?: string
          p_description: string
          p_employee_id?: string
          p_inventory_item_id?: string
          p_notes?: string
          p_occurred_at: string
          p_payment_method?: string
          p_proposed_category: string
          p_proposed_status?: string
          p_request_id: string
          p_shared?: boolean
          p_supplier?: string
          p_truck_id?: string
          p_urgent?: boolean
          p_warranty_id?: string
        }
        Returns: undefined
      }
      ensure_sale_formalization: {
        Args: {
          p_app_base_url: string
          p_contract_type: Database["public"]["Enums"]["contract_type"]
          p_customer_id: string
          p_expires_at: string
          p_sale_id: string
        }
        Returns: {
          access_code: string
          access_code_expires_at: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          sale_id: string
          signing_url: string
          status: Database["public"]["Enums"]["formalization_status"]
          token: string
          updated_at: string
          was_created: boolean
        }[]
      }
      finalize_formalization: {
        Args: {
          p_formalization_id: string
          p_hash: string
          p_ip: string
          p_signature_data: string
          p_ua: string
        }
        Returns: undefined
      }
      fn_can_receive_financial_notification: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      fn_financial_kind_affects_cash: {
        Args: { p_kind: string }
        Returns: boolean
      }
      fn_financial_kind_affects_stock: {
        Args: { p_kind: string }
        Returns: boolean
      }
      fn_financial_kind_include_in_profit: {
        Args: { p_kind: string }
        Returns: boolean
      }
      fn_general_expense_effective_amount: {
        Args: { p_amount: number; p_imperio_amount: number; p_shared: boolean }
        Returns: number
      }
      fn_generate_additional_due_alerts: { Args: never; Returns: number }
      fn_generate_all_due_alerts: { Args: never; Returns: number }
      fn_generate_payable_alerts: { Args: never; Returns: number }
      fn_inventory_item_balance: {
        Args: { p_item_id: string }
        Returns: number
      }
      fn_notify_all_payment_users: {
        Args: { p_link: string; p_message: string; p_title: string }
        Returns: undefined
      }
      fn_truck_expenses_total: { Args: { p_truck_id: string }; Returns: number }
      is_financial_business_day: { Args: { p_date: string }; Returns: boolean }
      previous_financial_business_day: {
        Args: { p_date: string }
        Returns: string
      }
      process_due_recurring_payments: { Args: never; Returns: number }
      queue_due_recurring_payments: { Args: never; Returns: number }
      remove_truck_flow_evidence: {
        Args: { p_evidence_id: string }
        Returns: string
      }
      reopen_truck_flow_step: {
        Args: { p_flow_id: string; p_reason: string; p_step_key: string }
        Returns: undefined
      }
      resubmit_expense_approval: {
        Args: {
          p_amount: number
          p_description: string
          p_proposed_category: string
          p_request_id: string
        }
        Returns: undefined
      }
      return_expense_approval: {
        Args: { p_correction_note: string; p_request_id: string }
        Returns: undefined
      }
      secretaria_create_expense: {
        Args: {
          p_amount: number
          p_bank?: string
          p_bank_account_id?: string
          p_company_vehicle_id?: string
          p_description: string
          p_employee_id?: string
          p_inventory_item_id?: string
          p_notes?: string
          p_occurred_at: string
          p_payment_method?: string
          p_proposed_category: string
          p_proposed_status?: string
          p_shared?: boolean
          p_supplier?: string
          p_truck_id?: string
          p_urgent?: boolean
          p_warranty_id?: string
        }
        Returns: string
      }
      secretaria_create_expense_with_split: {
        Args: {
          p_amount: number
          p_bank?: string
          p_bank_account_id?: string
          p_c4_amount?: number
          p_c4_percent?: number
          p_company_vehicle_id?: string
          p_description: string
          p_employee_id?: string
          p_imperio_amount?: number
          p_imperio_percent?: number
          p_inventory_item_id?: string
          p_notes?: string
          p_occurred_at: string
          p_payment_method?: string
          p_proposed_category: string
          p_proposed_status?: string
          p_shared?: boolean
          p_supplier?: string
          p_truck_id?: string
          p_urgent?: boolean
          p_warranty_id?: string
        }
        Returns: string
      }
      secretaria_delete_expense: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      secretaria_settle_operational_finance: {
        Args: { p_bank_account_id?: string; p_id: string; p_source: string }
        Returns: undefined
      }
      secretaria_submit_payable_approval: {
        Args: {
          p_amount: number
          p_bank_account?: string
          p_bank_account_type?: string
          p_bank_agency?: string
          p_bank_holder_document?: string
          p_bank_holder_name?: string
          p_bank_name?: string
          p_barcode?: string
          p_category_id: string
          p_description: string
          p_due_date: string
          p_is_urgent?: boolean
          p_notes?: string
          p_occurred_at?: string
          p_payment_method?: string
          p_pix_key?: string
          p_pix_key_type?: string
          p_supplier?: string
          p_truck_id?: string
        }
        Returns: string
      }
      secretaria_submit_payable_approval_original: {
        Args: {
          p_amount: number
          p_bank_account?: string
          p_bank_account_type?: string
          p_bank_agency?: string
          p_bank_holder_document?: string
          p_bank_holder_name?: string
          p_bank_name?: string
          p_barcode?: string
          p_category_id: string
          p_description: string
          p_due_date: string
          p_is_urgent?: boolean
          p_notes?: string
          p_occurred_at?: string
          p_payment_method?: string
          p_pix_key?: string
          p_pix_key_type?: string
          p_supplier?: string
          p_truck_id?: string
        }
        Returns: string
      }
      secretaria_update_expense: {
        Args: {
          p_amount: number
          p_bank?: string
          p_bank_account_id?: string
          p_company_vehicle_id?: string
          p_description: string
          p_employee_id?: string
          p_inventory_item_id?: string
          p_notes?: string
          p_occurred_at: string
          p_payment_method?: string
          p_proposed_category: string
          p_proposed_status?: string
          p_request_id: string
          p_shared?: boolean
          p_supplier?: string
          p_truck_id?: string
          p_urgent?: boolean
          p_warranty_id?: string
        }
        Returns: undefined
      }
      secretaria_update_expense_with_split: {
        Args: {
          p_amount: number
          p_bank?: string
          p_bank_account_id?: string
          p_c4_amount?: number
          p_c4_percent?: number
          p_company_vehicle_id?: string
          p_description: string
          p_employee_id?: string
          p_imperio_amount?: number
          p_imperio_percent?: number
          p_inventory_item_id?: string
          p_notes?: string
          p_occurred_at: string
          p_payment_method?: string
          p_proposed_category: string
          p_proposed_status?: string
          p_request_id: string
          p_shared?: boolean
          p_supplier?: string
          p_truck_id?: string
          p_urgent?: boolean
          p_warranty_id?: string
        }
        Returns: undefined
      }
      submit_agenda_finance_approval: {
        Args: {
          p_amount: number
          p_description: string
          p_due_date: string
          p_occurred_at: string
          p_payload?: Json
          p_proposed_status: string
          p_target_type: string
        }
        Returns: string
      }
      submit_company_vehicle_expense_approval: {
        Args: {
          p_amount: number
          p_bank_account_id?: string
          p_category: string
          p_company_vehicle_id: string
          p_create_payable?: boolean
          p_description: string
          p_due_date?: string
          p_notes?: string
          p_occurred_at: string
          p_proposed_status?: string
          p_supplier?: string
        }
        Returns: string
      }
      submit_daily_expense:
        | {
            Args: {
              p_amount: number
              p_bank?: string
              p_description: string
              p_notes?: string
              p_occurred_at?: string
              p_payment_method: string
              p_supplier: string
              p_urgent?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_bank?: string
              p_bank_account_id?: string
              p_category?: string
              p_description: string
              p_employee_id?: string
              p_inventory_item_id?: string
              p_notes?: string
              p_occurred_at?: string
              p_payment_method: string
              p_registration_type?: string
              p_shared?: boolean
              p_supplier: string
              p_supplier_id?: string
              p_truck_id?: string
              p_urgent?: boolean
            }
            Returns: string
          }
      submit_expense_approval: {
        Args: {
          p_amount: number
          p_bank?: string
          p_bank_account_id?: string
          p_company_vehicle_id?: string
          p_description: string
          p_due_date?: string
          p_employee_id?: string
          p_inventory_item_id?: string
          p_notes?: string
          p_occurred_at?: string
          p_origin: string
          p_payment_method?: string
          p_proposed_category: string
          p_proposed_status?: string
          p_service_id?: string
          p_shared?: boolean
          p_stock_movement_id?: string
          p_supplier?: string
          p_target_type: string
          p_truck_id?: string
          p_urgent?: boolean
          p_warranty_id?: string
        }
        Returns: string
      }
      submit_service_approval: {
        Args: {
          p_bank_account_id?: string
          p_category?: string
          p_description?: string
          p_down_payment?: number
          p_expected_at?: string
          p_notes?: string
          p_sent_at?: string
          p_status?: string
          p_supplier_id?: string
          p_title: string
          p_truck_id?: string
          p_value?: number
        }
        Returns: string
      }
      toggle_expense_payment_status: {
        Args: { p_request_id: string }
        Returns: string
      }
      update_calendar_event_operational: {
        Args: { p_id: string; p_patch: Json }
        Returns: undefined
      }
      update_service_operational: {
        Args: { p_id: string; p_patch: Json }
        Returns: undefined
      }
      update_truck_operational: {
        Args: { p_id: string; p_patch: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "secretaria"
      app_truck_expense_kind:
        | "manutencao"
        | "combustivel"
        | "documentacao"
        | "transporte"
        | "impostos"
        | "reforma"
        | "outros"
        | "pecas_caminhao"
        | "lavagem"
        | "pneu"
        | "colaborador"
        | "caminhao"
      audit_action: "insert" | "update" | "delete"
      bank_tx_type: "entrada" | "saida" | "transferencia"
      contract_type: "garantia" | "repasse"
      customer_status:
        | "interessado"
        | "negociando"
        | "ativo"
        | "recorrente"
        | "pos_venda"
        | "garantia"
        | "repasse"
      deal_priority: "baixa" | "media" | "alta"
      deal_stage:
        | "novo_lead"
        | "contato_iniciado"
        | "negociacao"
        | "proposta_enviada"
        | "aguardando_resposta"
        | "aprovado"
        | "vendido"
        | "pos_venda"
      document_kind:
        | "contrato"
        | "nota_fiscal"
        | "comprovante"
        | "documentacao_caminhao"
        | "documentacao_cliente"
        | "outro"
      down_payment_status: "pending" | "confirmed"
      email_job_status:
        | "queued"
        | "processing"
        | "sent"
        | "delivered"
        | "failed"
        | "retrying"
        | "bounced"
        | "spam"
      employee_status: "ativo" | "ferias" | "afastado" | "desligado"
      event_type:
        | "compromisso"
        | "pagamento"
        | "vencimento"
        | "manutencao"
        | "lembrete"
        | "outro"
        | "reuniao"
        | "evento"
        | "tarefa"
      expense_kind:
        | "manutencao"
        | "combustivel"
        | "documentacao"
        | "transporte"
        | "impostos"
        | "reforma"
        | "outros"
        | "pecas_caminhao"
        | "patrocinio"
        | "lavagem"
        | "pneu"
        | "colaborador"
        | "caminhao"
        | "garantia"
      formalization_status: "pending" | "sent" | "opened" | "signed" | "expired"
      goal_period: "mensal" | "trimestral" | "semestral" | "anual"
      lead_source:
        | "site"
        | "indicacao"
        | "redes_sociais"
        | "telefone"
        | "whatsapp"
        | "presencial"
        | "outro"
      lead_status:
        | "novo"
        | "qualificando"
        | "qualificado"
        | "convertido"
        | "perdido"
      notification_priority: "baixa" | "media" | "alta" | "critica"
      notification_type:
        | "financeiro"
        | "agenda"
        | "vendas"
        | "estoque"
        | "manutencao"
        | "clientes"
        | "sistema"
      payable_status: "aberto" | "pago" | "vencido" | "cancelado"
      payment_method:
        | "PIX"
        | "BOLETO"
        | "TRANSFERENCIA"
        | "DINHEIRO"
        | "CARTAO"
        | "OUTRO"
        | "CHEQUE"
      profile_status: "pending" | "active" | "blocked"
      receivable_status: "aberto" | "recebido" | "vencido" | "cancelado"
      recurrence_period: "weekly" | "monthly" | "yearly" | "daily"
      service_status: "pendente" | "em_andamento" | "concluido" | "cancelado"
      truck_status:
        | "disponivel"
        | "reservado"
        | "negociacao"
        | "vendido"
        | "consignado"
        | "manutencao"
        | "patio"
        | "oficina"
        | "despachante"
        | "pintura"
        | "interna"
        | "repasse"
        | "offline"
      warranty_status:
        | "ativa"
        | "encerrada"
        | "em_analise"
        | "aguardando_servico"
        | "em_servico"
        | "aguardando_peca"
        | "concluida"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "financeiro", "secretaria"],
      app_truck_expense_kind: [
        "manutencao",
        "combustivel",
        "documentacao",
        "transporte",
        "impostos",
        "reforma",
        "outros",
        "pecas_caminhao",
        "lavagem",
        "pneu",
        "colaborador",
        "caminhao",
      ],
      audit_action: ["insert", "update", "delete"],
      bank_tx_type: ["entrada", "saida", "transferencia"],
      contract_type: ["garantia", "repasse"],
      customer_status: [
        "interessado",
        "negociando",
        "ativo",
        "recorrente",
        "pos_venda",
        "garantia",
        "repasse",
      ],
      deal_priority: ["baixa", "media", "alta"],
      deal_stage: [
        "novo_lead",
        "contato_iniciado",
        "negociacao",
        "proposta_enviada",
        "aguardando_resposta",
        "aprovado",
        "vendido",
        "pos_venda",
      ],
      document_kind: [
        "contrato",
        "nota_fiscal",
        "comprovante",
        "documentacao_caminhao",
        "documentacao_cliente",
        "outro",
      ],
      down_payment_status: ["pending", "confirmed"],
      email_job_status: [
        "queued",
        "processing",
        "sent",
        "delivered",
        "failed",
        "retrying",
        "bounced",
        "spam",
      ],
      employee_status: ["ativo", "ferias", "afastado", "desligado"],
      event_type: [
        "compromisso",
        "pagamento",
        "vencimento",
        "manutencao",
        "lembrete",
        "outro",
        "reuniao",
        "evento",
        "tarefa",
      ],
      expense_kind: [
        "manutencao",
        "combustivel",
        "documentacao",
        "transporte",
        "impostos",
        "reforma",
        "outros",
        "pecas_caminhao",
        "patrocinio",
        "lavagem",
        "pneu",
        "colaborador",
        "caminhao",
        "garantia",
      ],
      formalization_status: ["pending", "sent", "opened", "signed", "expired"],
      goal_period: ["mensal", "trimestral", "semestral", "anual"],
      lead_source: [
        "site",
        "indicacao",
        "redes_sociais",
        "telefone",
        "whatsapp",
        "presencial",
        "outro",
      ],
      lead_status: [
        "novo",
        "qualificando",
        "qualificado",
        "convertido",
        "perdido",
      ],
      notification_priority: ["baixa", "media", "alta", "critica"],
      notification_type: [
        "financeiro",
        "agenda",
        "vendas",
        "estoque",
        "manutencao",
        "clientes",
        "sistema",
      ],
      payable_status: ["aberto", "pago", "vencido", "cancelado"],
      payment_method: [
        "PIX",
        "BOLETO",
        "TRANSFERENCIA",
        "DINHEIRO",
        "CARTAO",
        "OUTRO",
        "CHEQUE",
      ],
      profile_status: ["pending", "active", "blocked"],
      receivable_status: ["aberto", "recebido", "vencido", "cancelado"],
      recurrence_period: ["weekly", "monthly", "yearly", "daily"],
      service_status: ["pendente", "em_andamento", "concluido", "cancelado"],
      truck_status: [
        "disponivel",
        "reservado",
        "negociacao",
        "vendido",
        "consignado",
        "manutencao",
        "patio",
        "oficina",
        "despachante",
        "pintura",
        "interna",
        "repasse",
        "offline",
      ],
      warranty_status: [
        "ativa",
        "encerrada",
        "em_analise",
        "aguardando_servico",
        "em_servico",
        "aguardando_peca",
        "concluida",
      ],
    },
  },
} as const
