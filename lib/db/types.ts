export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      cities: {
        Row: {
          center: unknown;
          id: string;
          is_city: boolean;
          name: string;
          province: Database["public"]["Enums"]["province"];
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          center: unknown;
          id?: string;
          is_city?: boolean;
          name: string;
          province: Database["public"]["Enums"]["province"];
          slug: string;
        };
        Update: {
          center?: unknown;
          id?: string;
          is_city?: boolean;
          name?: string;
          province?: Database["public"]["Enums"]["province"];
          slug?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          category: string | null;
          id: string;
          name: string;
          price: number;
          shop_id: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          category?: string | null;
          id?: string;
          name: string;
          price: number;
          shop_id: string;
          sort_order?: number;
        };
        Update: {
          category?: string | null;
          id?: string;
          name?: string;
          price?: number;
          shop_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shop_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          author_name: string;
          body: string | null;
          created_at: string;
          id: string;
          owner_replied_at: string | null;
          owner_reply: string | null;
          rating: number;
          shop_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_name?: string;
          body?: string | null;
          created_at?: string;
          id?: string;
          owner_replied_at?: string | null;
          owner_reply?: string | null;
          rating: number;
          shop_id: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          body?: string | null;
          created_at?: string;
          id?: string;
          owner_replied_at?: string | null;
          owner_reply?: string | null;
          rating?: number;
          shop_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_shops: {
        Row: {
          created_at: string;
          kind: string;
          shop_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          kind: string;
          shop_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          kind?: string;
          shop_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_shops_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_shops_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_edits: {
        Row: {
          changes: Json;
          created_at: string;
          id: string;
          shop_id: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          changes?: Json;
          created_at?: string;
          id?: string;
          shop_id: string;
          user_id?: string | null;
        };
        Update: {
          changes?: Json;
          created_at?: string;
          id?: string;
          shop_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shop_edits_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shop_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_edits_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_edits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_photos: {
        Row: {
          caption: string | null;
          created_at: string;
          id: string;
          shop_id: string;
          sort_order: number;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          shop_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          shop_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_photos_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shop_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_photos_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      shops: {
        Row: {
          address: string | null;
          city_id: string | null;
          claimed_by: string | null;
          created_at: string;
          description: string | null;
          facebook_url: string | null;
          google_place_id: string | null;
          hours: Json | null;
          id: string;
          instagram_url: string | null;
          latte_price: number | null;
          location: unknown;
          name: string;
          osm_id: string | null;
          phone: string | null;
          price_tier: number | null;
          province: Database["public"]["Enums"]["province"] | null;
          slug: string;
          source: Database["public"]["Enums"]["shop_source"];
          status: Database["public"]["Enums"]["shop_status"];
          type: Database["public"]["Enums"]["shop_type"] | null;
          updated_at: string;
          rating_avg: number | null;
          rating_count: number;
          published_at: string | null;
          verified_at: string | null;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          city_id?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          description?: string | null;
          facebook_url?: string | null;
          google_place_id?: string | null;
          hours?: Json | null;
          id?: string;
          instagram_url?: string | null;
          latte_price?: number | null;
          location: unknown;
          name: string;
          osm_id?: string | null;
          phone?: string | null;
          price_tier?: number | null;
          province?: Database["public"]["Enums"]["province"] | null;
          slug: string;
          source?: Database["public"]["Enums"]["shop_source"];
          status?: Database["public"]["Enums"]["shop_status"];
          type?: Database["public"]["Enums"]["shop_type"] | null;
          updated_at?: string;
          rating_avg?: number | null;
          rating_count?: number;
          published_at?: string | null;
          verified_at?: string | null;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          city_id?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          description?: string | null;
          facebook_url?: string | null;
          google_place_id?: string | null;
          hours?: Json | null;
          id?: string;
          instagram_url?: string | null;
          latte_price?: number | null;
          location?: unknown;
          name?: string;
          osm_id?: string | null;
          phone?: string | null;
          price_tier?: number | null;
          province?: Database["public"]["Enums"]["province"] | null;
          slug?: string;
          source?: Database["public"]["Enums"]["shop_source"];
          status?: Database["public"]["Enums"]["shop_status"];
          type?: Database["public"]["Enums"]["shop_type"] | null;
          updated_at?: string;
          rating_avg?: number | null;
          rating_count?: number;
          published_at?: string | null;
          verified_at?: string | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shops_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shops_claimed_by_fkey";
            columns: ["claimed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["submission_kind"];
          notes: string | null;
          payload: NonNullable<Json>;
          proof_url: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          shop_id: string | null;
          status: Database["public"]["Enums"]["submission_status"];
          submitter_email: string | null;
          submitter_id: string | null;
          submitter_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["submission_kind"];
          notes?: string | null;
          payload?: NonNullable<Json>;
          proof_url?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          shop_id?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
          submitter_email?: string | null;
          submitter_id?: string | null;
          submitter_name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["submission_kind"];
          notes?: string | null;
          payload?: NonNullable<Json>;
          proof_url?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          shop_id?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
          submitter_email?: string | null;
          submitter_id?: string | null;
          submitter_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shop_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      shop_cards: {
        Row: {
          address: string | null;
          city_name: string | null;
          city_slug: string | null;
          cover_path: string | null;
          hours: Json | null;
          id: string;
          lat: number | null;
          latte_price: number | null;
          lng: number | null;
          name: string;
          price_tier: number | null;
          province: Database["public"]["Enums"]["province"] | null;
          slug: string;
          status: Database["public"]["Enums"]["shop_status"];
          type: Database["public"]["Enums"]["shop_type"] | null;
          rating_avg: number | null;
          rating_count: number | null;
          published_at: string | null;
          verified_at: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      admin_link_owner: { Args: { p_email: string; p_shop_id: string }; Returns: string };
      admin_owner_email: { Args: { p_shop_id: string }; Returns: string };
      admin_unlink_owner: { Args: { p_shop_id: string }; Returns: undefined };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      owns_shop: { Args: { p_shop_id: string }; Returns: boolean };
      price_tier_for: { Args: { latte_price: number }; Returns: number };
      shops_in_bbox: {
        Args: {
          city?: string;
          max_lat: number;
          max_lng: number;
          max_results?: number;
          min_lat: number;
          min_lng: number;
          q?: string;
          tiers?: number[];
          types?: Database["public"]["Enums"]["shop_type"][];
        };
        Returns: {
          address: string | null;
          city_name: string | null;
          city_slug: string | null;
          cover_path: string | null;
          hours: Json | null;
          id: string;
          lat: number | null;
          latte_price: number | null;
          lng: number | null;
          name: string;
          price_tier: number | null;
          province: Database["public"]["Enums"]["province"] | null;
          slug: string;
          status: Database["public"]["Enums"]["shop_status"];
          type: Database["public"]["Enums"]["shop_type"] | null;
          rating_avg: number | null;
          rating_count: number | null;
          published_at: string | null;
          verified_at: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "shop_cards";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      shops_near: {
        Args: {
          city?: string;
          lat: number;
          lng: number;
          max_results?: number;
          q?: string;
          radius_m?: number;
          tiers?: number[];
          types?: Database["public"]["Enums"]["shop_type"][];
        };
        Returns: {
          address: string;
          city_name: string;
          city_slug: string;
          cover_path: string;
          distance_m: number;
          hours: Json;
          id: string;
          lat: number;
          latte_price: number;
          lng: number;
          name: string;
          price_tier: number;
          province: Database["public"]["Enums"]["province"];
          slug: string;
          type: Database["public"]["Enums"]["shop_type"];
          verified_at: string;
        }[];
      };
    };
    Enums: {
      province: "negros_occidental" | "negros_oriental";
      shop_source: "admin" | "owner" | "import_osm";
      shop_status: "draft" | "published" | "hidden";
      shop_type: "specialty" | "chain" | "kapihan";
      submission_kind: "new_shop" | "claim" | "correction";
      submission_status: "pending" | "approved" | "rejected";
      user_role: "admin" | "owner" | "user";
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      province: ["negros_occidental", "negros_oriental"],
      shop_source: ["admin", "owner", "import_osm"],
      shop_status: ["draft", "published", "hidden"],
      shop_type: ["specialty", "chain", "kapihan"],
      submission_kind: ["new_shop", "claim", "correction"],
      submission_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "owner", "user"],
    },
  },
} as const;
