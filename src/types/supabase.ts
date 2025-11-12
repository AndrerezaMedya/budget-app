export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      account_daily_summaries: {
        Row: {
          account_id: string;
          closing_balance_minor: number;
          date: string;
          net_change_minor: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          closing_balance_minor?: number;
          date: string;
          net_change_minor?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_id?: string;
          closing_balance_minor?: number;
          date?: string;
          net_change_minor?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_daily_summaries_account_id_fkey";
            columns: ["account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          archived_at: string | null;
          created_at: string;
          currency: string;
          id: string;
          name: string;
          opening_balance_minor: number;
          order_index: number;
          type: Database["public"]["Enums"]["account_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          name: string;
          opening_balance_minor?: number;
          order_index?: number;
          type?: Database["public"]["Enums"]["account_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          name?: string;
          opening_balance_minor?: number;
          order_index?: number;
          type?: Database["public"]["Enums"]["account_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          amount_minor: number;
          category_id: string;
          created_at: string;
          id: string;
          period: string;
          rollover: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          category_id: string;
          created_at?: string;
          id?: string;
          period: string;
          rollover?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          category_id?: string;
          created_at?: string;
          id?: string;
          period?: string;
          rollover?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          color: string | null;
          created_at: string;
          icon: string | null;
          id: string;
          name: string;
          order_index: number;
          parent_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          name: string;
          order_index?: number;
          parent_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          name?: string;
          order_index?: number;
          parent_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      category_monthly_summaries: {
        Row: {
          available_minor: number;
          budget_minor: number;
          category_id: string;
          expense_minor: number;
          income_minor: number;
          period: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          available_minor?: number;
          budget_minor?: number;
          category_id: string;
          expense_minor?: number;
          income_minor?: number;
          period: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          available_minor?: number;
          budget_minor?: number;
          category_id?: string;
          expense_minor?: number;
          income_minor?: number;
          period?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_monthly_summaries_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      payees: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      receipt_ingestion_jobs: {
        Row: {
          attempt_count: number;
          completed_at: string | null;
          created_at: string;
          error_code: string | null;
          error_message: string | null;
          id: string;
          image_hash: string | null;
          progress_detail: Json | null;
          progress_message: string | null;
          progress_stage: string;
          progress_value: number | null;
          source_filename: string | null;
          status: Database["public"]["Enums"]["receipt_job_status"];
          storage_path: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          image_hash?: string | null;
          progress_detail?: Json | null;
          progress_message?: string | null;
          progress_stage?: string;
          progress_value?: number | null;
          source_filename?: string | null;
          status?: Database["public"]["Enums"]["receipt_job_status"];
          storage_path?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          image_hash?: string | null;
          progress_detail?: Json | null;
          progress_message?: string | null;
          progress_stage?: string;
          progress_value?: number | null;
          source_filename?: string | null;
          status?: Database["public"]["Enums"]["receipt_job_status"];
          storage_path?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      receipt_line_items: {
        Row: {
          description: string;
          category: string | null;
          id: string;
          line_total_minor: number;
          quantity: string;
          receipt_id: string;
          unit_price_minor: number | null;
        };
        Insert: {
          description: string;
          category?: string | null;
          id?: string;
          line_total_minor: number;
          quantity?: string;
          receipt_id: string;
          unit_price_minor?: number | null;
        };
        Update: {
          description?: string;
          category?: string | null;
          id?: string;
          line_total_minor?: number;
          quantity?: string;
          receipt_id?: string;
          unit_price_minor?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "receipt_line_items_receipt_id_fkey";
            columns: ["receipt_id"];
            referencedRelation: "receipts";
            referencedColumns: ["id"];
          },
        ];
      };
      receipts: {
        Row: {
          confidence: string | null;
          created_at: string;
          currency: string;
          discount_minor: number | null;
          id: string;
          image_hash: string;
          job_id: string | null;
          merchant_address: string | null;
          merchant_name: string;
          model_response: Json;
          notes: string | null;
          ocr_text: string | null;
          payment_method: string | null;
          purchase_at: string | null;
          storage_path: string;
          subtotal_minor: number | null;
          tax_minor: number | null;
          total_minor: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confidence?: string | null;
          created_at?: string;
          currency?: string;
          discount_minor?: number | null;
          id?: string;
          image_hash: string;
          job_id?: string | null;
          merchant_address?: string | null;
          merchant_name: string;
          model_response: Json;
          notes?: string | null;
          ocr_text?: string | null;
          payment_method?: string | null;
          purchase_at?: string | null;
          storage_path: string;
          subtotal_minor?: number | null;
          tax_minor?: number | null;
          total_minor: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confidence?: string | null;
          created_at?: string;
          currency?: string;
          discount_minor?: number | null;
          id?: string;
          image_hash?: string;
          job_id?: string | null;
          merchant_address?: string | null;
          merchant_name?: string;
          model_response?: Json;
          notes?: string | null;
          ocr_text?: string | null;
          payment_method?: string | null;
          purchase_at?: string | null;
          storage_path?: string;
          subtotal_minor?: number | null;
          tax_minor?: number | null;
          total_minor?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "receipt_ingestion_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          default_currency: string;
          full_name: string | null;
          id: string;
          locale: string;
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_currency?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_currency?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      transaction_tags: {
        Row: {
          tag_id: string;
          transaction_id: string;
        };
        Insert: {
          tag_id: string;
          transaction_id: string;
        };
        Update: {
          tag_id?: string;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey";
            columns: ["tag_id"];
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey";
            columns: ["transaction_id"];
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string;
          amount_minor: number;
          booked_at: string;
          category_id: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          notes: string | null;
          occurred_at: string;
          payee_id: string | null;
          transfer_direction: Database["public"]["Enums"]["transfer_direction"] | null;
          transfer_group_id: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount_minor: number;
          booked_at?: string;
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          notes?: string | null;
          occurred_at: string;
          payee_id?: string | null;
          transfer_direction?: Database["public"]["Enums"]["transfer_direction"] | null;
          transfer_group_id?: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_id?: string;
          amount_minor?: number;
          booked_at?: string;
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          notes?: string | null;
          occurred_at?: string;
          payee_id?: string | null;
          transfer_direction?: Database["public"]["Enums"]["transfer_direction"] | null;
          transfer_group_id?: string | null;
          type?: Database["public"]["Enums"]["transaction_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_payee_id_fkey";
            columns: ["payee_id"];
            referencedRelation: "payees";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_workspace_seed: {
        Args: { p_user_id: string };
        Returns: void;
      };
    };
    Enums: {
      account_type:
        | "bank"
        | "cash"
        | "wallet"
        | "credit"
        | "investment"
        | "savings"
        | "other";
      receipt_job_status: "pending" | "processing" | "succeeded" | "failed";
      transaction_type: "income" | "expense" | "transfer";
      transfer_direction: "in" | "out";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
