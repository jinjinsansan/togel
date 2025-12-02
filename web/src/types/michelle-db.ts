export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MichelleDatabase = {
  public: {
    Tables: {
      michelle_sessions: {
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
      michelle_messages: {
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
      michelle_knowledge: {
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
    };
    Views: Record<string, never>;
    Functions: {
      match_michelle_knowledge: {
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
    Enums: {
      michelle_session_category: "love" | "life" | "relationship";
      michelle_message_role: "user" | "assistant" | "system";
    };
  };
};
