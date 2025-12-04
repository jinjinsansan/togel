import type { Json, MichelleDatabase } from "@/types/michelle-db";

export type MichelleAttractionDatabase = {
  public: {
    Tables: {
      michelle_attraction_sessions: {
        Row: {
          id: string;
          auth_user_id: string;
          category: MichelleDatabase["public"]["Enums"]["michelle_session_category"];
          title: string | null;
          openai_thread_id: string | null;
          total_tokens: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          category: MichelleDatabase["public"]["Enums"]["michelle_session_category"];
          title?: string | null;
          openai_thread_id?: string | null;
          total_tokens?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          category?: MichelleDatabase["public"]["Enums"]["michelle_session_category"];
          title?: string | null;
          openai_thread_id?: string | null;
          total_tokens?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      michelle_attraction_messages: {
        Row: {
          id: string;
          session_id: string;
          role: MichelleDatabase["public"]["Enums"]["michelle_message_role"];
          content: string;
          tokens_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: MichelleDatabase["public"]["Enums"]["michelle_message_role"];
          content: string;
          tokens_used?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: MichelleDatabase["public"]["Enums"]["michelle_message_role"];
          content?: string;
          tokens_used?: number;
          created_at?: string;
        };
      };
      michelle_attraction_knowledge: {
        Row: {
          id: string;
          content: string;
          embedding: number[] | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          embedding?: number[] | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          embedding?: number[] | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      michelle_attraction_progress: {
        Row: {
          id: string;
          auth_user_id: string;
          session_id: string;
          current_level: number;
          current_section: number;
          progress_status: "OK" | "IP" | "RV";
          progress_code: string | null;
          last_check_at: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          emotional_state: "stable" | "concern" | "critical";
          emotional_score: number;
          psychology_recommendation: "none" | "suggested" | "acknowledged" | "dismissed" | "resolved";
          psychology_recommendation_reason: string | null;
          psychology_prompted_at: string | null;
          psychology_opt_out_until: string | null;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          session_id: string;
          current_level?: number;
          current_section?: number;
          progress_status?: "OK" | "IP" | "RV";
          progress_code?: string | null;
          last_check_at?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          emotional_state?: "stable" | "concern" | "critical";
          emotional_score?: number;
          psychology_recommendation?: "none" | "suggested" | "acknowledged" | "dismissed" | "resolved";
          psychology_recommendation_reason?: string | null;
          psychology_prompted_at?: string | null;
          psychology_opt_out_until?: string | null;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          session_id?: string;
          current_level?: number;
          current_section?: number;
          progress_status?: "OK" | "IP" | "RV";
          progress_code?: string | null;
          last_check_at?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          emotional_state?: "stable" | "concern" | "critical";
          emotional_score?: number;
          psychology_recommendation?: "none" | "suggested" | "acknowledged" | "dismissed" | "resolved";
          psychology_recommendation_reason?: string | null;
          psychology_prompted_at?: string | null;
          psychology_opt_out_until?: string | null;
        };
      };
      michelle_attraction_progress_notes: {
        Row: {
          id: string;
          progress_id: string;
          note_type: "comprehension" | "emotion" | "action" | "success" | "other";
          related_level: number | null;
          related_section: number | null;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          progress_id: string;
          note_type: "comprehension" | "emotion" | "action" | "success" | "other";
          related_level?: number | null;
          related_section?: number | null;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          progress_id?: string;
          note_type?: "comprehension" | "emotion" | "action" | "success" | "other";
          related_level?: number | null;
          related_section?: number | null;
          content?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_michelle_attraction_knowledge: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json | null;
          similarity: number;
        }[];
      };
    };
    Enums: MichelleDatabase["public"]["Enums"];
    CompositeTypes: Record<string, never>;
  };
};
