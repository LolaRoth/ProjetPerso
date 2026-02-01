/**
 * Types TypeScript pour la base de données Supabase
 * Basé sur le schéma SQL avec games, user_game_sessions, user_game_stats
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string | null;
          config: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          category?: string | null;
          config?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          config?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      user_game_sessions: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          score: number | null;
          result_type: "win" | "lose" | "draw" | "abort" | null;
          degradation_level: number | null;
          loops: number | null;
          time_spent: number | null;
          extra: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_id: string;
          score?: number | null;
          result_type?: "win" | "lose" | "draw" | "abort" | null;
          degradation_level?: number | null;
          loops?: number | null;
          time_spent?: number | null;
          extra?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_id?: string;
          score?: number | null;
          result_type?: "win" | "lose" | "draw" | "abort" | null;
          degradation_level?: number | null;
          loops?: number | null;
          time_spent?: number | null;
          extra?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_game_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_game_sessions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      user_game_stats: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          total_plays: number;
          best_score: number | null;
          average_score: number | null;
          total_time_spent: number;
          last_played_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_id: string;
          total_plays?: number;
          best_score?: number | null;
          average_score?: number | null;
          total_time_spent?: number;
          last_played_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_id?: string;
          total_plays?: number;
          best_score?: number | null;
          average_score?: number | null;
          total_time_spent?: number;
          last_played_at?: string | null;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "user_game_stats_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_game_stats_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_game_session: {
        Args: {
          p_game_id: string;
          p_score: number;
          p_result_type: string;
          p_degradation_level: number;
          p_loops: number;
          p_time_spent: number;
          p_extra?: Json;
        };
        Returns: void;
      };
      record_game_session_json: {
        Args: {
          payload: Json;
        };
        Returns: void;
      };
      get_leaderboard: {
        Args: {
          p_game_id: string;
          p_limit?: number;
        };
        Returns: {
          user_id: string;
          username: string;
          score: number;
          created_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Types utilitaires pour faciliter l'utilisation
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Game = Database["public"]["Tables"]["games"]["Row"];
export type GameInsert = Database["public"]["Tables"]["games"]["Insert"];

export type GameSession =
  Database["public"]["Tables"]["user_game_sessions"]["Row"];
export type GameSessionInsert =
  Database["public"]["Tables"]["user_game_sessions"]["Insert"];

export type GameStats = Database["public"]["Tables"]["user_game_stats"]["Row"];
export type GameStatsInsert =
  Database["public"]["Tables"]["user_game_stats"]["Insert"];

// Type pour les paramètres de record_game_session
export interface RecordGameSessionParams {
  gameId: string;
  score: number;
  resultType: "win" | "lose" | "draw" | "abort";
  degradationLevel?: number;
  loops?: number;
  timeSpent?: number;
  extra?: Json;
}

// Type pour le leaderboard
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  score: number;
  created_at: string;
}

// IDs des jeux disponibles (slugs)
export type GameId =
  | "color-sequence"
  | "click-challenge"
  | "puzzle-blocks"
  | "target-shooting"
  | "typing-game"
  | "secret-button"
  | "memory-game"
  | "reaction-time"
  | "attention-quiz";
