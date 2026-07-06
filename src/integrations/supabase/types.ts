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
      episodes: {
        Row: {
          audio_url: string | null
          badge: string | null
          created_at: string
          duration_sec: number
          hook: string
          id: string
          match_id: string
          published_at: string
          script: string
          title: string
          voice_style: string
          segments: Json | null
          magic_sentence: string | null
          forward_line: string | null
          share_clip_url: string | null
          og_image_url: string | null
          locale: string
          model: string | null
          verification: Json | null
          status: string
        }
        Insert: {
          audio_url?: string | null
          badge?: string | null
          created_at?: string
          duration_sec?: number
          hook: string
          id?: string
          match_id: string
          published_at?: string
          script: string
          title: string
          voice_style?: string
          segments?: Json | null
          magic_sentence?: string | null
          forward_line?: string | null
          share_clip_url?: string | null
          og_image_url?: string | null
          locale?: string
          model?: string | null
          verification?: Json | null
          status?: string
        }
        Update: {
          audio_url?: string | null
          badge?: string | null
          created_at?: string
          duration_sec?: number
          hook?: string
          id?: string
          match_id?: string
          published_at?: string
          script?: string
          title?: string
          voice_style?: string
          segments?: Json | null
          magic_sentence?: string | null
          forward_line?: string | null
          share_clip_url?: string | null
          og_image_url?: string | null
          locale?: string
          model?: string | null
          verification?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          user_id?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country: string
          created_at?: string
          id: string
          name: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      listens: {
        Row: {
          completed: boolean
          episode_id: string
          id: string
          listened_at: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          episode_id: string
          id?: string
          listened_at?: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          episode_id?: string
          id?: string
          listened_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listens_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string
          created_at: string
          home_score: number | null
          home_team_id: string
          id: string
          importance_score: number
          kickoff_at: string
          league_id: string
          status: string
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          created_at?: string
          home_score?: number | null
          home_team_id: string
          id: string
          importance_score?: number
          kickoff_at: string
          league_id: string
          status?: string
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          created_at?: string
          home_score?: number | null
          home_team_id?: string
          id?: string
          importance_score?: number
          kickoff_at?: string
          league_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_requests: {
        Row: {
          id: string
          user_id: string
          match_id: string
          status: string
          episode_id: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          status?: string
          episode_id?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string
          status?: string
          episode_id?: string | null
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          user_id: string
          joined_at: string
          source: string | null
          referral_code: string | null
          referred_by: string | null
          invited_at: string | null
          cohort: string | null
        }
        Insert: {
          user_id: string
          joined_at?: string
          source?: string | null
          referral_code?: string | null
          referred_by?: string | null
          invited_at?: string | null
          cohort?: string | null
        }
        Update: {
          user_id?: string
          joined_at?: string
          source?: string | null
          referral_code?: string | null
          referred_by?: string | null
          invited_at?: string | null
          cohort?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_period_end: string | null
          display_name: string | null
          id: string
          locale: string
          plan: string
          price_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          timezone: string | null
          updated_at: string
          voice_style_pref: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          id: string
          locale?: string
          plan?: string
          price_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string
          voice_style_pref?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          id?: string
          locale?: string
          plan?: string
          price_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string
          voice_style_pref?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          added_time: number | null
          assist_player_id: string | null
          created_at: string
          detail: string | null
          id: string
          match_id: string
          minute: number | null
          player_id: string | null
          player_name: string | null
          source: string | null
          team_id: string | null
          type: string
        }
        Insert: {
          added_time?: number | null
          assist_player_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          match_id: string
          minute?: number | null
          player_id?: string | null
          player_name?: string | null
          source?: string | null
          team_id?: string | null
          type: string
        }
        Update: {
          added_time?: number | null
          assist_player_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string | null
          player_name?: string | null
          source?: string | null
          team_id?: string | null
          type?: string
        }
        Relationships: []
      }
      match_stats: {
        Row: {
          away_corners: number | null
          away_possession: number | null
          away_shots: number | null
          away_sot: number | null
          away_xg: number | null
          home_corners: number | null
          home_possession: number | null
          home_shots: number | null
          home_sot: number | null
          home_xg: number | null
          match_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          away_corners?: number | null
          away_possession?: number | null
          away_shots?: number | null
          away_sot?: number | null
          away_xg?: number | null
          home_corners?: number | null
          home_possession?: number | null
          home_shots?: number | null
          home_sot?: number | null
          home_xg?: number | null
          match_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          away_corners?: number | null
          away_possession?: number | null
          away_shots?: number | null
          away_sot?: number | null
          away_xg?: number | null
          home_corners?: number | null
          home_possession?: number | null
          home_shots?: number | null
          home_sot?: number | null
          home_xg?: number | null
          match_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      voice_corpus: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          kind: string
          match_type: string | null
          updated_at: string
          version: number
          weight: number
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          id?: string
          kind: string
          match_type?: string | null
          updated_at?: string
          version?: number
          weight?: number
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          kind?: string
          match_type?: string | null
          updated_at?: string
          version?: number
          weight?: number
        }
        Relationships: []
      }
      synthesis_insights: {
        Row: {
          audio_url: string | null
          card_image_url: string | null
          computed_payload: Json
          created_at: string
          drop_date: string
          id: string
          kind: string
          reviewed_by: string | null
          status: string
          surprise_score: number
          text: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          card_image_url?: string | null
          computed_payload: Json
          created_at?: string
          drop_date: string
          id?: string
          kind: string
          reviewed_by?: string | null
          status?: string
          surprise_score?: number
          text: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          card_image_url?: string | null
          computed_payload?: Json
          created_at?: string
          drop_date?: string
          id?: string
          kind?: string
          reviewed_by?: string | null
          status?: string
          surprise_score?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string
          created_at: string
          crest_url: string | null
          id: string
          league_id: string
          name: string
          short: string
        }
        Insert: {
          color?: string
          created_at?: string
          crest_url?: string | null
          id: string
          league_id: string
          name: string
          short: string
        }
        Update: {
          color?: string
          created_at?: string
          crest_url?: string | null
          id?: string
          league_id?: string
          name?: string
          short?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
