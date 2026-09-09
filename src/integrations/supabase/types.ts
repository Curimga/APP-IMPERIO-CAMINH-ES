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
          bank_account_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          occurred_at: string
          type: Database["public"]["Enums"]["bank_tx_type"]
        }
        Insert: {
          amount: number
          bank_account_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_at?: string
          type?: Database["public"]["Enums"]["bank_tx_type"]
        }
        Update: {
          amount?: number
          bank_account_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_at?: string
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
          occurred_at: string
          paid_at: string | null
          status: string
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deal_id?: string | null
          employee_id?: string | null
          id?: string
          occurred_at?: string
          paid_at?: string | null
          status?: string
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deal_id?: string | null
          employee_id?: string | null
          id?: string
          occurred_at?: string
          paid_at?: string | null
          status?: string
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      deals: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          owner_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string | null
          truck_id: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string | null
          truck_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string | null
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
      employees: {
        Row: {
          commission_amount: number
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          position: string | null
          salary: number
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          salary?: number
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          salary?: number
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      general_expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          c4_amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          imperio_amount: number
          occurred_at: string
          shared: boolean
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          c4_amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          imperio_amount?: number
          occurred_at?: string
          shared?: boolean
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          c4_amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          imperio_amount?: number
          occurred_at?: string
          shared?: boolean
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
          ends_at: string | null
          id: string
          period: Database["public"]["Enums"]["goal_period"]
          starts_at: string | null
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          employee_id?: string | null
          ends_at?: string | null
          id?: string
          period?: Database["public"]["Enums"]["goal_period"]
          starts_at?: string | null
          target_value?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          employee_id?: string | null
          ends_at?: string | null
          id?: string
          period?: Database["public"]["Enums"]["goal_period"]
          starts_at?: string | null
          target_value?: number
          title?: string
          updated_at?: string
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
      leads: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          owner_id: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
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
          bank_account_id: string | null
          barcode: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          is_urgent: boolean
          notes: string | null
          occurred_at: string
          paid_at: string | null
          pix_key: string | null
          pix_key_type: string | null
          recurrence_id: string | null
          status: Database["public"]["Enums"]["payable_status"]
          supplier: string | null
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          is_urgent?: boolean
          notes?: string | null
          occurred_at?: string
          paid_at?: string | null
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
          bank_account_id?: string | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          is_urgent?: boolean
          notes?: string | null
          occurred_at?: string
          paid_at?: string | null
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
            foreignKeyName: "payables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          amount: number
          attachment_url: string | null
          bank_account_id: string | null
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
          is_urgent: boolean
          notes: string | null
          occurred_at: string
          occurrence_number: number | null
          occurrence_total: number | null
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
          amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
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
          is_urgent?: boolean
          notes?: string | null
          occurred_at?: string
          occurrence_number?: number | null
          occurrence_total?: number | null
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
          bank_account_id?: string | null
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
          is_urgent?: boolean
          notes?: string | null
          occurred_at?: string
          occurrence_number?: number | null
          occurrence_total?: number | null
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
            foreignKeyName: "receivables_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          bank_account_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expected_at: string | null
          id: string
          notes: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["service_status"]
          supplier_id: string | null
          title: string
          total_value: number | null
          truck_id: string
          truck_previous_status:
            | Database["public"]["Enums"]["truck_status"]
            | null
          updated_at: string
          value: number | null
        }
        Insert: {
          bank_account_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          supplier_id?: string | null
          title: string
          total_value?: number | null
          truck_id: string
          truck_previous_status?:
            | Database["public"]["Enums"]["truck_status"]
            | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          bank_account_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          supplier_id?: string | null
          title?: string
          total_value?: number | null
          truck_id?: string
          truck_previous_status?:
            | Database["public"]["Enums"]["truck_status"]
            | null
          updated_at?: string
          value?: number | null
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
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      truck_expenses: {
        Row: {
          amount: number
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
            foreignKeyName: "truck_expenses_truck_id_fkey"
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
            foreignKeyName: "truck_purchase_installments_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
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
          updated_by: string | null
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
          updated_by?: string | null
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
          updated_by?: string | null
          warranty_end?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_sold_customer_id_fkey"
            columns: ["sold_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_generate_payable_alerts: { Args: never; Returns: undefined }
      has_role: {
        Args: { requested: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "secretaria"
      audit_action: "insert" | "update" | "delete"
      bank_tx_type: "entrada" | "saida" | "transferencia"
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
      down_payment_status: "pending" | "confirmed"
      employee_status: "ativo" | "ferias" | "afastado" | "desligado"
      event_type:
        | "compromisso"
        | "tarefa"
        | "reuniao"
        | "manutencao"
        | "lembrete"
        | "pagamento"
        | "vencimento"
        | "entrega"
        | "visita"
        | "ligacao"
        | "outro"
      expense_kind:
        | "manutencao"
        | "combustivel"
        | "documentacao"
        | "transporte"
        | "impostos"
        | "reforma"
        | "pecas_caminhao"
        | "outros"
      goal_period: "mensal" | "trimestral" | "anual"
      lead_source:
        | "site"
        | "instagram"
        | "facebook"
        | "whatsapp"
        | "indicacao"
        | "piso"
        | "outro"
      lead_status:
        | "novo"
        | "em_contato"
        | "silencioso"
        | "convertido"
        | "descartado"
      notification_priority: "baixa" | "media" | "alta" | "critica"
      notification_type: "info" | "success" | "warning" | "error"
      payable_status: "pendente" | "pago"
      payment_method:
        | "pix"
        | "ted"
        | "doc"
        | "dinheiro"
        | "cartao"
        | "boleto"
        | "cheque"
        | "sistema"
      profile_status: "pending" | "active" | "blocked"
      receivable_status: "pendente" | "recebido"
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
      audit_action: ["insert", "update", "delete"],
      bank_tx_type: ["entrada", "saida", "transferencia"],
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
      down_payment_status: ["pending", "confirmed"],
      employee_status: ["ativo", "ferias", "afastado", "desligado"],
      event_type: [
        "compromisso",
        "tarefa",
        "reuniao",
        "manutencao",
        "lembrete",
        "pagamento",
        "vencimento",
        "entrega",
        "visita",
        "ligacao",
        "outro",
      ],
      expense_kind: [
        "manutencao",
        "combustivel",
        "documentacao",
        "transporte",
        "impostos",
        "reforma",
        "pecas_caminhao",
        "outros",
      ],
      goal_period: ["mensal", "trimestral", "anual"],
      lead_source: [
        "site",
        "instagram",
        "facebook",
        "whatsapp",
        "indicacao",
        "piso",
        "outro",
      ],
      lead_status: [
        "novo",
        "em_contato",
        "silencioso",
        "convertido",
        "descartado",
      ],
      notification_priority: ["baixa", "media", "alta", "critica"],
      notification_type: ["info", "success", "warning", "error"],
      payable_status: ["pendente", "pago"],
      payment_method: [
        "pix",
        "ted",
        "doc",
        "dinheiro",
        "cartao",
        "boleto",
        "cheque",
        "sistema",
      ],
      profile_status: ["pending", "active", "blocked"],
      receivable_status: ["pendente", "recebido"],
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
    },
  },
} as const
