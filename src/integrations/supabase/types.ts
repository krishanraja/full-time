export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      analysis_claims: {
        Row: {
          adjustment_evidence_refs: string[];
          alternative_explanation: string | null;
          confidence: number;
          created_at: string;
          evaluation_rule: Json | null;
          evidence_pack_id: string;
          evidence_refs: string[];
          falsifier: string | null;
          id: string;
          match_id: string;
          missing_evidence: string[];
          pundit_id: string | null;
          rejection_reason: string | null;
          status: string;
          thesis: string;
          type: string;
        };
        Insert: {
          adjustment_evidence_refs?: string[];
          alternative_explanation?: string | null;
          confidence: number;
          created_at?: string;
          evaluation_rule?: Json | null;
          evidence_pack_id: string;
          evidence_refs: string[];
          falsifier?: string | null;
          id?: string;
          match_id: string;
          missing_evidence?: string[];
          pundit_id?: string | null;
          rejection_reason?: string | null;
          status?: string;
          thesis: string;
          type: string;
        };
        Update: {
          adjustment_evidence_refs?: string[];
          alternative_explanation?: string | null;
          confidence?: number;
          created_at?: string;
          evaluation_rule?: Json | null;
          evidence_pack_id?: string;
          evidence_refs?: string[];
          falsifier?: string | null;
          id?: string;
          match_id?: string;
          missing_evidence?: string[];
          pundit_id?: string | null;
          rejection_reason?: string | null;
          status?: string;
          thesis?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_claims_evidence_pack_id_fkey";
            columns: ["evidence_pack_id"];
            isOneToOne: false;
            referencedRelation: "evidence_packs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analysis_claims_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      audio_reviews: {
        Row: {
          approved: boolean;
          authority_rating: number | null;
          clipped_words: boolean;
          created_at: string;
          id: string;
          listenability_rating: number | null;
          misplaced_emphasis: boolean;
          monotone: boolean;
          naturalness_rating: number | null;
          notes: string | null;
          overacted_punchlines: boolean;
          persona_guess: string | null;
          pronunciation_errors: string[];
          repeated_phrases: boolean;
          reviewer_id: string | null;
          reviewer_panel: string;
          sample_seconds: number;
          synthesis_artifacts: boolean;
          timing_rating: number | null;
          variant_id: string;
        };
        Insert: {
          approved?: boolean;
          authority_rating?: number | null;
          clipped_words?: boolean;
          created_at?: string;
          id?: string;
          listenability_rating?: number | null;
          misplaced_emphasis?: boolean;
          monotone?: boolean;
          naturalness_rating?: number | null;
          notes?: string | null;
          overacted_punchlines?: boolean;
          persona_guess?: string | null;
          pronunciation_errors?: string[];
          repeated_phrases?: boolean;
          reviewer_id?: string | null;
          reviewer_panel: string;
          sample_seconds: number;
          synthesis_artifacts?: boolean;
          timing_rating?: number | null;
          variant_id: string;
        };
        Update: {
          approved?: boolean;
          authority_rating?: number | null;
          clipped_words?: boolean;
          created_at?: string;
          id?: string;
          listenability_rating?: number | null;
          misplaced_emphasis?: boolean;
          monotone?: boolean;
          naturalness_rating?: number | null;
          notes?: string | null;
          overacted_punchlines?: boolean;
          persona_guess?: string | null;
          pronunciation_errors?: string[];
          repeated_phrases?: boolean;
          reviewer_id?: string | null;
          reviewer_panel?: string;
          sample_seconds?: number;
          synthesis_artifacts?: boolean;
          timing_rating?: number | null;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audio_reviews_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "pundit_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      concept_cards: {
        Row: {
          citations: Json;
          concept: string;
          created_at: string;
          id: string;
          kind: string;
          overlap_score: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_ids: string[];
          status: string;
          title: string;
        };
        Insert: {
          citations: Json;
          concept: string;
          created_at?: string;
          id?: string;
          kind: string;
          overlap_score?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_ids: string[];
          status?: string;
          title: string;
        };
        Update: {
          citations?: Json;
          concept?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          overlap_score?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_ids?: string[];
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      daily_drops: {
        Row: {
          approved_at: string | null;
          canonical_pundit: string;
          coverage_date: string;
          created_at: string;
          generation_cost_usd: number | null;
          harness_version: string;
          id: string;
          promise_checked_at: string | null;
          promise_checks: Json;
          published_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          canonical_pundit?: string;
          coverage_date: string;
          created_at?: string;
          generation_cost_usd?: number | null;
          harness_version: string;
          id?: string;
          promise_checked_at?: string | null;
          promise_checks?: Json;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          canonical_pundit?: string;
          coverage_date?: string;
          created_at?: string;
          generation_cost_usd?: number | null;
          harness_version?: string;
          id?: string;
          promise_checked_at?: string | null;
          promise_checks?: Json;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drops: {
        Row: {
          created_at: string;
          drop_date: string;
          id: string;
          status: string;
          synthesis_insight_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          drop_date: string;
          id?: string;
          status?: string;
          synthesis_insight_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          drop_date?: string;
          id?: string;
          status?: string;
          synthesis_insight_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drops_synthesis_insight_id_fkey";
            columns: ["synthesis_insight_id"];
            isOneToOne: false;
            referencedRelation: "synthesis_insights";
            referencedColumns: ["id"];
          },
        ];
      };
      editorial_runs: {
        Row: {
          coverage_date: string;
          created_at: string;
          failure: string | null;
          finished_at: string | null;
          harness_version: string;
          id: string;
          idempotency_key: string;
          match_id: string | null;
          mode: string;
          promise_checks: Json;
          request_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          coverage_date: string;
          created_at?: string;
          failure?: string | null;
          finished_at?: string | null;
          harness_version: string;
          id?: string;
          idempotency_key: string;
          match_id?: string | null;
          mode: string;
          promise_checks?: Json;
          request_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          coverage_date?: string;
          created_at?: string;
          failure?: string | null;
          finished_at?: string | null;
          harness_version?: string;
          id?: string;
          idempotency_key?: string;
          match_id?: string | null;
          mode?: string;
          promise_checks?: Json;
          request_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "editorial_runs_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      editorial_signals: {
        Row: {
          angle: string;
          confidence: string | null;
          created_at: string;
          domains: string[];
          id: string;
          match_id: string;
          raw: Json | null;
          reviewed_by: string | null;
          status: string;
          subject: string | null;
          subject_kind: string | null;
        };
        Insert: {
          angle: string;
          confidence?: string | null;
          created_at?: string;
          domains?: string[];
          id?: string;
          match_id: string;
          raw?: Json | null;
          reviewed_by?: string | null;
          status?: string;
          subject?: string | null;
          subject_kind?: string | null;
        };
        Update: {
          angle?: string;
          confidence?: string | null;
          created_at?: string;
          domains?: string[];
          id?: string;
          match_id?: string;
          raw?: Json | null;
          reviewed_by?: string | null;
          status?: string;
          subject?: string | null;
          subject_kind?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "editorial_signals_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      episodes: {
        Row: {
          angle_id: string | null;
          audio_bytes: number | null;
          audio_url: string | null;
          badge: string | null;
          created_at: string;
          duration_sec: number;
          forward_line: string | null;
          hook: string;
          id: string;
          locale: string;
          lufs: number | null;
          magic_sentence: string | null;
          match_id: string;
          model: string | null;
          og_image_url: string | null;
          published_at: string;
          script: string;
          segments: Json | null;
          share_clip_url: string | null;
          spoken_script: string | null;
          status: string;
          title: string;
          tts_model: string | null;
          tts_seed: number | null;
          tts_voice_id: string | null;
          verification: Json | null;
          voice_style: string;
        };
        Insert: {
          angle_id?: string | null;
          audio_bytes?: number | null;
          audio_url?: string | null;
          badge?: string | null;
          created_at?: string;
          duration_sec?: number;
          forward_line?: string | null;
          hook: string;
          id?: string;
          locale?: string;
          lufs?: number | null;
          magic_sentence?: string | null;
          match_id: string;
          model?: string | null;
          og_image_url?: string | null;
          published_at?: string;
          script: string;
          segments?: Json | null;
          share_clip_url?: string | null;
          spoken_script?: string | null;
          status?: string;
          title: string;
          tts_model?: string | null;
          tts_seed?: number | null;
          tts_voice_id?: string | null;
          verification?: Json | null;
          voice_style?: string;
        };
        Update: {
          angle_id?: string | null;
          audio_bytes?: number | null;
          audio_url?: string | null;
          badge?: string | null;
          created_at?: string;
          duration_sec?: number;
          forward_line?: string | null;
          hook?: string;
          id?: string;
          locale?: string;
          lufs?: number | null;
          magic_sentence?: string | null;
          match_id?: string;
          model?: string | null;
          og_image_url?: string | null;
          published_at?: string;
          script?: string;
          segments?: Json | null;
          share_clip_url?: string | null;
          spoken_script?: string | null;
          status?: string;
          title?: string;
          tts_model?: string | null;
          tts_seed?: number | null;
          tts_voice_id?: string | null;
          verification?: Json | null;
          voice_style?: string;
        };
        Relationships: [
          {
            foreignKeyName: "episodes_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluation_matches: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          founder_approved: boolean;
          match_id: string;
          partition: string;
          prompt_visible: boolean;
          scenarios: string[];
          source: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          founder_approved?: boolean;
          match_id: string;
          partition: string;
          prompt_visible: boolean;
          scenarios: string[];
          source: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          founder_approved?: boolean;
          match_id?: string;
          partition?: string;
          prompt_visible?: boolean;
          scenarios?: string[];
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluation_matches_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluation_reviews: {
        Row: {
          created_at: string;
          evaluation_run_id: string;
          humour_approved: boolean | null;
          id: string;
          main_claim_understood: boolean | null;
          notes: string | null;
          persona_guess: string | null;
          preferred_over_current: boolean | null;
          preferred_over_generic: boolean | null;
          reviewer_id: string | null;
          reviewer_panel: string;
        };
        Insert: {
          created_at?: string;
          evaluation_run_id: string;
          humour_approved?: boolean | null;
          id?: string;
          main_claim_understood?: boolean | null;
          notes?: string | null;
          persona_guess?: string | null;
          preferred_over_current?: boolean | null;
          preferred_over_generic?: boolean | null;
          reviewer_id?: string | null;
          reviewer_panel: string;
        };
        Update: {
          created_at?: string;
          evaluation_run_id?: string;
          humour_approved?: boolean | null;
          id?: string;
          main_claim_understood?: boolean | null;
          notes?: string | null;
          persona_guess?: string | null;
          preferred_over_current?: boolean | null;
          preferred_over_generic?: boolean | null;
          reviewer_id?: string | null;
          reviewer_panel?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluation_reviews_evaluation_run_id_fkey";
            columns: ["evaluation_run_id"];
            isOneToOne: false;
            referencedRelation: "evaluation_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluation_runs: {
        Row: {
          attempts: number;
          blind_label: string;
          candidate: Json;
          created_at: string;
          hard_gate_pass: boolean;
          harness_version: string;
          id: string;
          match_id: string;
          pundit_id: string;
          qualitative_scores: Json;
          spec_version: number;
          status: string;
        };
        Insert: {
          attempts: number;
          blind_label: string;
          candidate: Json;
          created_at?: string;
          hard_gate_pass: boolean;
          harness_version: string;
          id?: string;
          match_id: string;
          pundit_id: string;
          qualitative_scores: Json;
          spec_version: number;
          status: string;
        };
        Update: {
          attempts?: number;
          blind_label?: string;
          candidate?: Json;
          created_at?: string;
          hard_gate_pass?: boolean;
          harness_version?: string;
          id?: string;
          match_id?: string;
          pundit_id?: string;
          qualitative_scores?: Json;
          spec_version?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "evaluation_matches";
            referencedColumns: ["match_id"];
          },
        ];
      };
      evidence_packs: {
        Row: {
          content_hash: string;
          created_at: string;
          derivations: Json;
          drop_id: string | null;
          facts: Json;
          id: string;
          match_id: string;
          provenance: Json;
          sealed_at: string | null;
          unavailable_evidence: string[];
          version: number;
        };
        Insert: {
          content_hash: string;
          created_at?: string;
          derivations?: Json;
          drop_id?: string | null;
          facts: Json;
          id?: string;
          match_id: string;
          provenance: Json;
          sealed_at?: string | null;
          unavailable_evidence?: string[];
          version?: number;
        };
        Update: {
          content_hash?: string;
          created_at?: string;
          derivations?: Json;
          drop_id?: string | null;
          facts?: Json;
          id?: string;
          match_id?: string;
          provenance?: Json;
          sealed_at?: string | null;
          unavailable_evidence?: string[];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_packs_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "daily_drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_packs_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      forecast_models: {
        Row: {
          active: boolean;
          baseline_brier: number;
          calibration_buckets: Json;
          calibration_error: number;
          created_at: string;
          held_out_from: string;
          held_out_matches: number;
          held_out_to: string;
          id: string;
          improvement: number;
          model_brier: number;
          parameters: Json;
          passed: boolean;
          ratings: Json;
          trained_from: string;
          trained_to: string;
          training_matches: number;
          version: string;
        };
        Insert: {
          active?: boolean;
          baseline_brier: number;
          calibration_buckets: Json;
          calibration_error: number;
          created_at?: string;
          held_out_from: string;
          held_out_matches: number;
          held_out_to: string;
          id?: string;
          improvement: number;
          model_brier: number;
          parameters: Json;
          passed: boolean;
          ratings: Json;
          trained_from: string;
          trained_to: string;
          training_matches: number;
          version: string;
        };
        Update: {
          active?: boolean;
          baseline_brier?: number;
          calibration_buckets?: Json;
          calibration_error?: number;
          created_at?: string;
          held_out_from?: string;
          held_out_matches?: number;
          held_out_to?: string;
          id?: string;
          improvement?: number;
          model_brier?: number;
          parameters?: Json;
          passed?: boolean;
          ratings?: Json;
          trained_from?: string;
          trained_to?: string;
          training_matches?: number;
          version?: string;
        };
        Relationships: [];
      };
      generation_requests: {
        Row: {
          created_at: string;
          episode_id: string | null;
          error: string | null;
          id: string;
          match_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          episode_id?: string | null;
          error?: string | null;
          id?: string;
          match_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          episode_id?: string | null;
          error?: string | null;
          id?: string;
          match_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_requests_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      h2h_cache: {
        Row: {
          fetched_at: string;
          id: string;
          league_id: string;
          meetings: Json;
          season: number;
          team_a_id: string;
          team_b_id: string;
        };
        Insert: {
          fetched_at?: string;
          id?: string;
          league_id: string;
          meetings: Json;
          season: number;
          team_a_id: string;
          team_b_id: string;
        };
        Update: {
          fetched_at?: string;
          id?: string;
          league_id?: string;
          meetings?: Json;
          season?: number;
          team_a_id?: string;
          team_b_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "h2h_cache_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "h2h_cache_team_a_id_fkey";
            columns: ["team_a_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "h2h_cache_team_b_id_fkey";
            columns: ["team_b_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      harness_runs: {
        Row: {
          attempt: number;
          created_at: string;
          evidence_span: string | null;
          failure: string | null;
          hard_gate: boolean;
          harness_name: string;
          harness_version: string;
          id: string;
          model: string;
          passed: boolean;
          requested_repair: string | null;
          result: Json;
          score: number | null;
          variant_id: string;
        };
        Insert: {
          attempt: number;
          created_at?: string;
          evidence_span?: string | null;
          failure?: string | null;
          hard_gate?: boolean;
          harness_name: string;
          harness_version: string;
          id?: string;
          model: string;
          passed: boolean;
          requested_repair?: string | null;
          result: Json;
          score?: number | null;
          variant_id: string;
        };
        Update: {
          attempt?: number;
          created_at?: string;
          evidence_span?: string | null;
          failure?: string | null;
          hard_gate?: boolean;
          harness_name?: string;
          harness_version?: string;
          id?: string;
          model?: string;
          passed?: boolean;
          requested_repair?: string | null;
          result?: Json;
          score?: number | null;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "harness_runs_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "pundit_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      leagues: {
        Row: {
          country: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          country: string;
          created_at?: string;
          id: string;
          name: string;
        };
        Update: {
          country?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      listens: {
        Row: {
          completed: boolean;
          episode_id: string;
          id: string;
          listened_at: string;
          user_id: string | null;
        };
        Insert: {
          completed?: boolean;
          episode_id: string;
          id?: string;
          listened_at?: string;
          user_id?: string | null;
        };
        Update: {
          completed?: boolean;
          episode_id?: string;
          id?: string;
          listened_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listens_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
        ];
      };
      live_commentary: {
        Row: {
          created_at: string;
          event_id: string | null;
          id: string;
          importance: number;
          match_id: string;
          minute: number | null;
          text: string;
        };
        Insert: {
          created_at?: string;
          event_id?: string | null;
          id?: string;
          importance?: number;
          match_id: string;
          minute?: number | null;
          text: string;
        };
        Update: {
          created_at?: string;
          event_id?: string | null;
          id?: string;
          importance?: number;
          match_id?: string;
          minute?: number | null;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_commentary_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "match_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_commentary_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      match_context: {
        Row: {
          away_gk_name: string | null;
          away_gk_subbed: boolean;
          crosscheck_src: string | null;
          feeds_agree: boolean | null;
          home_gk_name: string | null;
          home_gk_subbed: boolean;
          match_id: string;
          matchday: number | null;
          source: string | null;
          updated_at: string;
        };
        Insert: {
          away_gk_name?: string | null;
          away_gk_subbed?: boolean;
          crosscheck_src?: string | null;
          feeds_agree?: boolean | null;
          home_gk_name?: string | null;
          home_gk_subbed?: boolean;
          match_id: string;
          matchday?: number | null;
          source?: string | null;
          updated_at?: string;
        };
        Update: {
          away_gk_name?: string | null;
          away_gk_subbed?: boolean;
          crosscheck_src?: string | null;
          feeds_agree?: boolean | null;
          home_gk_name?: string | null;
          home_gk_subbed?: boolean;
          match_id?: string;
          matchday?: number | null;
          source?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_context_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      match_events: {
        Row: {
          added_time: number | null;
          assist_player_id: string | null;
          created_at: string;
          detail: string | null;
          id: string;
          match_id: string;
          minute: number | null;
          player_id: string | null;
          player_name: string | null;
          source: string | null;
          team_id: string | null;
          type: string;
        };
        Insert: {
          added_time?: number | null;
          assist_player_id?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
          match_id: string;
          minute?: number | null;
          player_id?: string | null;
          player_name?: string | null;
          source?: string | null;
          team_id?: string | null;
          type: string;
        };
        Update: {
          added_time?: number | null;
          assist_player_id?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
          match_id?: string;
          minute?: number | null;
          player_id?: string | null;
          player_name?: string | null;
          source?: string | null;
          team_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_events_assist_player_id_fkey";
            columns: ["assist_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_events_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_events_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      match_stats: {
        Row: {
          away_blocked: number | null;
          away_corners: number | null;
          away_fouls: number | null;
          away_offsides: number | null;
          away_possession: number | null;
          away_saves: number | null;
          away_shots: number | null;
          away_shots_inside_box: number | null;
          away_shots_outside_box: number | null;
          away_sot: number | null;
          away_xg: number | null;
          home_blocked: number | null;
          home_corners: number | null;
          home_fouls: number | null;
          home_offsides: number | null;
          home_possession: number | null;
          home_saves: number | null;
          home_shots: number | null;
          home_shots_inside_box: number | null;
          home_shots_outside_box: number | null;
          home_sot: number | null;
          home_xg: number | null;
          match_id: string;
          source: string | null;
          updated_at: string;
        };
        Insert: {
          away_blocked?: number | null;
          away_corners?: number | null;
          away_fouls?: number | null;
          away_offsides?: number | null;
          away_possession?: number | null;
          away_saves?: number | null;
          away_shots?: number | null;
          away_shots_inside_box?: number | null;
          away_shots_outside_box?: number | null;
          away_sot?: number | null;
          away_xg?: number | null;
          home_blocked?: number | null;
          home_corners?: number | null;
          home_fouls?: number | null;
          home_offsides?: number | null;
          home_possession?: number | null;
          home_saves?: number | null;
          home_shots?: number | null;
          home_shots_inside_box?: number | null;
          home_shots_outside_box?: number | null;
          home_sot?: number | null;
          home_xg?: number | null;
          match_id: string;
          source?: string | null;
          updated_at?: string;
        };
        Update: {
          away_blocked?: number | null;
          away_corners?: number | null;
          away_fouls?: number | null;
          away_offsides?: number | null;
          away_possession?: number | null;
          away_saves?: number | null;
          away_shots?: number | null;
          away_shots_inside_box?: number | null;
          away_shots_outside_box?: number | null;
          away_sot?: number | null;
          away_xg?: number | null;
          home_blocked?: number | null;
          home_corners?: number | null;
          home_fouls?: number | null;
          home_offsides?: number | null;
          home_possession?: number | null;
          home_saves?: number | null;
          home_shots?: number | null;
          home_shots_inside_box?: number | null;
          home_shots_outside_box?: number | null;
          home_sot?: number | null;
          home_xg?: number | null;
          match_id?: string;
          source?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_stats_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          away_score: number | null;
          away_team_id: string;
          created_at: string;
          home_score: number | null;
          home_team_id: string;
          id: string;
          importance_score: number;
          kickoff_at: string;
          league_id: string;
          season: number | null;
          status: string;
        };
        Insert: {
          away_score?: number | null;
          away_team_id: string;
          created_at?: string;
          home_score?: number | null;
          home_team_id: string;
          id: string;
          importance_score?: number;
          kickoff_at: string;
          league_id: string;
          season?: number | null;
          status?: string;
        };
        Update: {
          away_score?: number | null;
          away_team_id?: string;
          created_at?: string;
          home_score?: number | null;
          home_team_id?: string;
          id?: string;
          importance_score?: number;
          kickoff_at?: string;
          league_id?: string;
          season?: number | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey";
            columns: ["away_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_home_team_id_fkey";
            columns: ["home_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          team_id: string | null;
        };
        Insert: {
          created_at?: string;
          id: string;
          name: string;
          team_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      prediction_ledger: {
        Row: {
          adjustment_evidence_refs: string[];
          brier_score: number | null;
          created_at: string;
          drop_id: string | null;
          evaluation_rule: Json;
          evidence_refs: string[];
          expected_turning_point: string;
          falsifier: string;
          id: string;
          indicator: string;
          kickoff_at: string;
          locked_at: string;
          log_loss: number | null;
          match_id: string;
          measurable_advantage: string;
          pundit_id: string;
          pundit_probabilities: Json;
          receipt: string | null;
          settled_at: string | null;
          settlement: Json | null;
          shared_probabilities: Json;
          status: string;
          thesis: string;
        };
        Insert: {
          adjustment_evidence_refs?: string[];
          brier_score?: number | null;
          created_at?: string;
          drop_id?: string | null;
          evaluation_rule: Json;
          evidence_refs: string[];
          expected_turning_point: string;
          falsifier: string;
          id?: string;
          indicator: string;
          kickoff_at: string;
          locked_at: string;
          log_loss?: number | null;
          match_id: string;
          measurable_advantage: string;
          pundit_id: string;
          pundit_probabilities: Json;
          receipt?: string | null;
          settled_at?: string | null;
          settlement?: Json | null;
          shared_probabilities: Json;
          status?: string;
          thesis: string;
        };
        Update: {
          adjustment_evidence_refs?: string[];
          brier_score?: number | null;
          created_at?: string;
          drop_id?: string | null;
          evaluation_rule?: Json;
          evidence_refs?: string[];
          expected_turning_point?: string;
          falsifier?: string;
          id?: string;
          indicator?: string;
          kickoff_at?: string;
          locked_at?: string;
          log_loss?: number | null;
          match_id?: string;
          measurable_advantage?: string;
          pundit_id?: string;
          pundit_probabilities?: Json;
          receipt?: string | null;
          settled_at?: string | null;
          settlement?: Json | null;
          shared_probabilities?: Json;
          status?: string;
          thesis?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prediction_ledger_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "daily_drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prediction_ledger_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          display_name: string | null;
          id: string;
          locale: string;
          plan: string;
          price_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          timezone: string | null;
          updated_at: string;
          voice_style_pref: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          display_name?: string | null;
          id: string;
          locale?: string;
          plan?: string;
          price_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          timezone?: string | null;
          updated_at?: string;
          voice_style_pref?: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          display_name?: string | null;
          id?: string;
          locale?: string;
          plan?: string;
          price_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          timezone?: string | null;
          updated_at?: string;
          voice_style_pref?: string;
        };
        Relationships: [];
      };
      pronunciation_lexicon: {
        Row: {
          created_at: string;
          display_text: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          language: string;
          phonetic_rendering: string;
          provider_dictionary_id: string | null;
          provider_dictionary_version_id: string | null;
          source: string;
          verification_state: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          created_at?: string;
          display_text: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          language?: string;
          phonetic_rendering: string;
          provider_dictionary_id?: string | null;
          provider_dictionary_version_id?: string | null;
          source: string;
          verification_state?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          created_at?: string;
          display_text?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          language?: string;
          phonetic_rendering?: string;
          provider_dictionary_id?: string | null;
          provider_dictionary_version_id?: string | null;
          source?: string;
          verification_state?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [];
      };
      pundit_specs: {
        Row: {
          analytical_weights: Json;
          anti_examples: Json;
          created_at: string;
          doctrine: Json;
          evidence_preferences: Json;
          examples: Json;
          humour_profile: Json;
          language_profile: Json;
          name: string;
          performance_profile: Json;
          prediction_profile: Json;
          pundit_id: string;
          required_thresholds: Json;
          status: string;
          version: number;
          voice_id: string | null;
        };
        Insert: {
          analytical_weights: Json;
          anti_examples?: Json;
          created_at?: string;
          doctrine: Json;
          evidence_preferences: Json;
          examples?: Json;
          humour_profile: Json;
          language_profile: Json;
          name: string;
          performance_profile: Json;
          prediction_profile: Json;
          pundit_id: string;
          required_thresholds: Json;
          status?: string;
          version: number;
          voice_id?: string | null;
        };
        Update: {
          analytical_weights?: Json;
          anti_examples?: Json;
          created_at?: string;
          doctrine?: Json;
          evidence_preferences?: Json;
          examples?: Json;
          humour_profile?: Json;
          language_profile?: Json;
          name?: string;
          performance_profile?: Json;
          prediction_profile?: Json;
          pundit_id?: string;
          required_thresholds?: Json;
          status?: string;
          version?: number;
          voice_id?: string | null;
        };
        Relationships: [];
      };
      pundit_variants: {
        Row: {
          approved_at: string | null;
          audio_bytes: number | null;
          audio_duration_sec: number | null;
          audio_quality: Json | null;
          audio_quality_verified_at: string | null;
          audio_storage_path: string | null;
          audio_url: string | null;
          beat_outline: Json;
          created_at: string;
          description: string;
          display_script: string;
          drop_id: string;
          harness_version: string;
          id: string;
          performance_plan: Json;
          pronunciation_rate: number | null;
          published_at: string | null;
          pundit_id: string;
          script_identity_verified: boolean;
          share_image_url: string | null;
          share_storage_path: string | null;
          spec_version: number;
          spoken_script: string;
          status: string;
          thesis: Json;
          title: string;
          transcript: string | null;
          tts_model: string | null;
          tts_seed: number | null;
          tts_voice_id: string | null;
          updated_at: string;
          voice_candidate_id: string | null;
        };
        Insert: {
          approved_at?: string | null;
          audio_bytes?: number | null;
          audio_duration_sec?: number | null;
          audio_quality?: Json | null;
          audio_quality_verified_at?: string | null;
          audio_storage_path?: string | null;
          audio_url?: string | null;
          beat_outline: Json;
          created_at?: string;
          description: string;
          display_script: string;
          drop_id: string;
          harness_version: string;
          id?: string;
          performance_plan: Json;
          pronunciation_rate?: number | null;
          published_at?: string | null;
          pundit_id: string;
          script_identity_verified?: boolean;
          share_image_url?: string | null;
          share_storage_path?: string | null;
          spec_version: number;
          spoken_script: string;
          status?: string;
          thesis: Json;
          title: string;
          transcript?: string | null;
          tts_model?: string | null;
          tts_seed?: number | null;
          tts_voice_id?: string | null;
          updated_at?: string;
          voice_candidate_id?: string | null;
        };
        Update: {
          approved_at?: string | null;
          audio_bytes?: number | null;
          audio_duration_sec?: number | null;
          audio_quality?: Json | null;
          audio_quality_verified_at?: string | null;
          audio_storage_path?: string | null;
          audio_url?: string | null;
          beat_outline?: Json;
          created_at?: string;
          description?: string;
          display_script?: string;
          drop_id?: string;
          harness_version?: string;
          id?: string;
          performance_plan?: Json;
          pronunciation_rate?: number | null;
          published_at?: string | null;
          pundit_id?: string;
          script_identity_verified?: boolean;
          share_image_url?: string | null;
          share_storage_path?: string | null;
          spec_version?: number;
          spoken_script?: string;
          status?: string;
          thesis?: Json;
          title?: string;
          transcript?: string | null;
          tts_model?: string | null;
          tts_seed?: number | null;
          tts_voice_id?: string | null;
          updated_at?: string;
          voice_candidate_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pundit_variants_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "daily_drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pundit_variants_pundit_id_spec_version_fkey";
            columns: ["pundit_id", "spec_version"];
            isOneToOne: false;
            referencedRelation: "pundit_specs";
            referencedColumns: ["pundit_id", "version"];
          },
          {
            foreignKeyName: "pundit_variants_voice_candidate_fk";
            columns: ["voice_candidate_id"];
            isOneToOne: false;
            referencedRelation: "voice_candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_drop_sent: string | null;
          p256dh: string;
          timezone: string | null;
          user_id: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_drop_sent?: string | null;
          p256dh: string;
          timezone?: string | null;
          user_id?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_drop_sent?: string | null;
          p256dh?: string;
          timezone?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      rehearsal_runs: {
        Row: {
          completed_at: string | null;
          coverage_date: string;
          created_at: string;
          deadline_at: string | null;
          drop_id: string | null;
          editorial_run_id: string;
          expected_variants: number;
          id: string;
          passed: boolean;
          promise_checks: Json;
          successful_variants: number;
        };
        Insert: {
          completed_at?: string | null;
          coverage_date: string;
          created_at?: string;
          deadline_at?: string | null;
          drop_id?: string | null;
          editorial_run_id: string;
          expected_variants?: number;
          id?: string;
          passed?: boolean;
          promise_checks?: Json;
          successful_variants?: number;
        };
        Update: {
          completed_at?: string | null;
          coverage_date?: string;
          created_at?: string;
          deadline_at?: string | null;
          drop_id?: string | null;
          editorial_run_id?: string;
          expected_variants?: number;
          id?: string;
          passed?: boolean;
          promise_checks?: Json;
          successful_variants?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rehearsal_runs_drop_id_fkey";
            columns: ["drop_id"];
            isOneToOne: false;
            referencedRelation: "daily_drops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rehearsal_runs_editorial_run_id_fkey";
            columns: ["editorial_run_id"];
            isOneToOne: true;
            referencedRelation: "editorial_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      release_gate_runs: {
        Row: {
          created_at: string;
          id: string;
          passed: boolean;
          revision: string;
          snapshot: Json;
          snapshot_hash: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          passed: boolean;
          revision: string;
          snapshot: Json;
          snapshot_hash: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          passed?: boolean;
          revision?: string;
          snapshot?: Json;
          snapshot_hash?: string;
        };
        Relationships: [];
      };
      release_signoffs: {
        Row: {
          created_at: string;
          evidence_url: string | null;
          expires_at: string | null;
          gate: string;
          id: string;
          notes: string | null;
          revision: string;
          signed_at: string;
          signer_name: string;
          signer_user_id: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          evidence_url?: string | null;
          expires_at?: string | null;
          gate: string;
          id?: string;
          notes?: string | null;
          revision: string;
          signed_at: string;
          signer_name: string;
          signer_user_id?: string | null;
          status: string;
        };
        Update: {
          created_at?: string;
          evidence_url?: string | null;
          expires_at?: string | null;
          gate?: string;
          id?: string;
          notes?: string | null;
          revision?: string;
          signed_at?: string;
          signer_name?: string;
          signer_user_id?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      release_state: {
        Row: {
          all_six_free: boolean;
          billing_enabled: boolean;
          gate_snapshot: Json;
          gate_snapshot_hash: string | null;
          gates_verified_at: string | null;
          public_launch_enabled: boolean;
          singleton: boolean;
          status: string;
          updated_at: string;
          updated_by: string | null;
          verified_revision: string | null;
        };
        Insert: {
          all_six_free?: boolean;
          billing_enabled?: boolean;
          gate_snapshot?: Json;
          gate_snapshot_hash?: string | null;
          gates_verified_at?: string | null;
          public_launch_enabled?: boolean;
          singleton?: boolean;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          verified_revision?: string | null;
        };
        Update: {
          all_six_free?: boolean;
          billing_enabled?: boolean;
          gate_snapshot?: Json;
          gate_snapshot_hash?: string | null;
          gates_verified_at?: string | null;
          public_launch_enabled?: boolean;
          singleton?: boolean;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          verified_revision?: string | null;
        };
        Relationships: [];
      };
      research_sources: {
        Row: {
          approved_at: string;
          attribution_requirements: string | null;
          channel: string;
          created_at: string;
          creator: string;
          expires_at: string | null;
          id: string;
          permission_basis: string;
          permitted_uses: string[];
          quotation_policy: string;
          reviewed_by: string | null;
          source_urls: string[];
          status: string;
        };
        Insert: {
          approved_at: string;
          attribution_requirements?: string | null;
          channel: string;
          created_at?: string;
          creator: string;
          expires_at?: string | null;
          id?: string;
          permission_basis: string;
          permitted_uses: string[];
          quotation_policy: string;
          reviewed_by?: string | null;
          source_urls: string[];
          status?: string;
        };
        Update: {
          approved_at?: string;
          attribution_requirements?: string | null;
          channel?: string;
          created_at?: string;
          creator?: string;
          expires_at?: string | null;
          id?: string;
          permission_basis?: string;
          permitted_uses?: string[];
          quotation_policy?: string;
          reviewed_by?: string | null;
          source_urls?: string[];
          status?: string;
        };
        Relationships: [];
      };
      standings_snapshots: {
        Row: {
          captured_at: string;
          id: string;
          league_id: string;
          rows: Json;
          season: number;
        };
        Insert: {
          captured_at?: string;
          id?: string;
          league_id: string;
          rows: Json;
          season: number;
        };
        Update: {
          captured_at?: string;
          id?: string;
          league_id?: string;
          rows?: Json;
          season?: number;
        };
        Relationships: [
          {
            foreignKeyName: "standings_snapshots_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      synthesis_insights: {
        Row: {
          audio_url: string | null;
          card_image_url: string | null;
          computed_payload: Json;
          created_at: string;
          drop_date: string;
          id: string;
          kind: string;
          reviewed_by: string | null;
          status: string;
          surprise_score: number;
          text: string;
          updated_at: string;
        };
        Insert: {
          audio_url?: string | null;
          card_image_url?: string | null;
          computed_payload: Json;
          created_at?: string;
          drop_date: string;
          id?: string;
          kind: string;
          reviewed_by?: string | null;
          status?: string;
          surprise_score?: number;
          text: string;
          updated_at?: string;
        };
        Update: {
          audio_url?: string | null;
          card_image_url?: string | null;
          computed_payload?: Json;
          created_at?: string;
          drop_date?: string;
          id?: string;
          kind?: string;
          reviewed_by?: string | null;
          status?: string;
          surprise_score?: number;
          text?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_season_status: {
        Row: {
          created_at: string;
          league_id: string;
          promoted: boolean;
          season: number;
          source: string;
          team_id: string;
        };
        Insert: {
          created_at?: string;
          league_id: string;
          promoted?: boolean;
          season: number;
          source: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          league_id?: string;
          promoted?: boolean;
          season?: number;
          source?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_season_status_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_season_status_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          color: string;
          created_at: string;
          crest_url: string | null;
          id: string;
          league_id: string;
          name: string;
          short: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          crest_url?: string | null;
          id: string;
          league_id: string;
          name: string;
          short: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          crest_url?: string | null;
          id?: string;
          league_id?: string;
          name?: string;
          short?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_candidates: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          blind_metrics: Json;
          candidate_label: string;
          commercial_use_approved: boolean;
          created_at: string;
          founder_approved: boolean;
          full_length_sample_url: string | null;
          id: string;
          provider: string;
          provider_voice_ref: string;
          pundit_id: string;
          rights_basis: string | null;
          rights_confirmed_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          blind_metrics?: Json;
          candidate_label: string;
          commercial_use_approved?: boolean;
          created_at?: string;
          founder_approved?: boolean;
          full_length_sample_url?: string | null;
          id?: string;
          provider: string;
          provider_voice_ref: string;
          pundit_id: string;
          rights_basis?: string | null;
          rights_confirmed_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          blind_metrics?: Json;
          candidate_label?: string;
          commercial_use_approved?: boolean;
          created_at?: string;
          founder_approved?: boolean;
          full_length_sample_url?: string | null;
          id?: string;
          provider?: string;
          provider_voice_ref?: string;
          pundit_id?: string;
          rights_basis?: string | null;
          rights_confirmed_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      voice_corpus: {
        Row: {
          active: boolean;
          content: string;
          created_at: string;
          id: string;
          kind: string;
          match_type: string | null;
          updated_at: string;
          version: number;
          weight: number;
        };
        Insert: {
          active?: boolean;
          content: string;
          created_at?: string;
          id?: string;
          kind: string;
          match_type?: string | null;
          updated_at?: string;
          version?: number;
          weight?: number;
        };
        Update: {
          active?: boolean;
          content?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          match_type?: string | null;
          updated_at?: string;
          version?: number;
          weight?: number;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          cohort: string | null;
          invited_at: string | null;
          joined_at: string;
          referral_code: string | null;
          referred_by: string | null;
          source: string | null;
          user_id: string;
        };
        Insert: {
          cohort?: string | null;
          invited_at?: string | null;
          joined_at?: string;
          referral_code?: string | null;
          referred_by?: string | null;
          source?: string | null;
          user_id: string;
        };
        Update: {
          cohort?: string | null;
          invited_at?: string | null;
          joined_at?: string;
          referral_code?: string | null;
          referred_by?: string | null;
          source?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_editorial_run: {
        Args: {
          target_coverage_date: string;
          target_harness_version: string;
          target_key: string;
          target_mode: string;
          target_request_id: string;
        };
        Returns: {
          coverage_date: string;
          created_at: string;
          failure: string | null;
          finished_at: string | null;
          harness_version: string;
          id: string;
          idempotency_key: string;
          match_id: string | null;
          mode: string;
          promise_checks: Json;
          request_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "editorial_runs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      publish_daily_drop: { Args: { target_drop_id: string }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
