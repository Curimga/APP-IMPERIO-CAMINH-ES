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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          owner_id: string | null
          priority: Database["public"]["Enums"]["deal_priority"]
          recurrence: string | null
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
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          recurrence?: string | null
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
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          recurrence?: string | null
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
        ]
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
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          imperio_amount: number
          imperio_percent: number | null
          is_urgent: boolean | null
          notes: string | null
          occurred_at: string
          payment_method: string | null
          pix_key: string | null
          pix_key_type: string | null
          purchase_installment_id: string | null
          service_id: string | null
          shared: boolean
          status: string | null
          supplier: string | null
          truck_id: string | null
          updated_at: string
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
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          imperio_amount?: number
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          service_id?: string | null
          shared?: boolean
          status?: string | null
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
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_id?: string | null
          closing_month?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          imperio_amount?: number
          imperio_percent?: number | null
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string
          payment_method?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_installment_id?: string | null
          service_id?: string | null
          shared?: boolean
          status?: string | null
          supplier?: string | null
          truck_id?: string | null
          updated_at?: string
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
            foreignKeyName: "general_expenses_purchase_installment_id_fkey"
            columns: ["purchase_installment_id"]
            isOneToOne: false
            referencedRelation: "truck_purchase_installments"
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
            foreignKeyName: "general_expenses_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
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
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
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
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
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
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
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
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          quantity: number
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          total_amount?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_truck_usage: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          occurred_at: string
          quantity: number
          service_id: string | null
          total_amount: number
          truck_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          occurred_at?: string
          quantity: number
          service_id?: string | null
          total_amount: number
          truck_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          occurred_at?: string
          quantity?: number
          service_id?: string | null
          total_amount?: number
          truck_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_truck_usage_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_truck_usage_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
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
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          is_urgent: boolean | null
          notes: string | null
          occurred_at: string | null
          occurrence_number: number | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pix_key: string | null
          pix_key_type: string | null
          recurrence_id: string | null
          status: Database["public"]["Enums"]["payable_status"]
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
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          occurrence_number?: number | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["payable_status"]
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
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          is_urgent?: boolean | null
          notes?: string | null
          occurred_at?: string | null
          occurrence_number?: number | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          recurrence_id?: string | null
          status?: Database["public"]["Enums"]["payable_status"]
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
          status: Database["public"]["Enums"]["formalization_status"]
          token: string
          updated_at: string
        }
        Insert: {
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
          status?: Database["public"]["Enums"]["formalization_status"]
          token: string
          updated_at?: string
        }
        Update: {
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
          signed_at: string
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
          signed_at?: string
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
          signed_at?: string
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
          truck_id: string
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
          truck_id: string
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
          truck_id?: string
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
          id: string
          kind: Database["public"]["Enums"]["expense_kind"]
          notes: string | null
          occurred_at: string
          service_id: string | null
          status: string | null
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
          id?: string
          kind?: Database["public"]["Enums"]["expense_kind"]
          notes?: string | null
          occurred_at?: string
          service_id?: string | null
          status?: string | null
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
          id?: string
          kind?: Database["public"]["Enums"]["expense_kind"]
          notes?: string | null
          occurred_at?: string
          service_id?: string | null
          status?: string | null
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
            foreignKeyName: "truck_expenses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
            foreignKeyName: "truck_expenses_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "truck_warranties"
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
          sale_type: string | null
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
          sale_type?: string | null
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
          sale_type?: string | null
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
    }
    Views: {
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
    }
    Functions: {
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
      fn_general_expense_effective_amount: {
        Args: { p_amount: number; p_imperio_amount: number; p_shared: boolean }
        Returns: number
      }
      fn_generate_payable_alerts: { Args: never; Returns: number }
      fn_truck_expenses_total: { Args: { p_truck_id: string }; Returns: number }
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
      profile_status: "pending" | "active" | "blocked"
      receivable_status: "aberto" | "recebido" | "vencido" | "cancelado"
      recurrence_period: "weekly" | "monthly" | "yearly"
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
      ],
      profile_status: ["pending", "active", "blocked"],
      receivable_status: ["aberto", "recebido", "vencido", "cancelado"],
      recurrence_period: ["weekly", "monthly", "yearly"],
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
