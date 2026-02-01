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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          allow_record_editing: boolean
          created_at: string
          id: string
          password_hash: string
          require_password: boolean
          slot_count: number
          updated_at: string
          username: string
        }
        Insert: {
          allow_record_editing?: boolean
          created_at?: string
          id?: string
          password_hash?: string
          require_password?: boolean
          slot_count?: number
          updated_at?: string
          username?: string
        }
        Update: {
          allow_record_editing?: boolean
          created_at?: string
          id?: string
          password_hash?: string
          require_password?: boolean
          slot_count?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          model_type: string
          name: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          model_type?: string
          name: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          model_type?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      archived_vehicles: {
        Row: {
          archived_at: string
          archived_by_user_id: string | null
          brand: string
          id: string
          model: string
          notes: string | null
          original_vehicle_id: string
          owner_name: string | null
          owner_phone: string | null
          plate_number: string
          service_records: Json | null
          total_cost: number | null
          total_labor_cost: number | null
          total_part_cost: number | null
          year: number
        }
        Insert: {
          archived_at?: string
          archived_by_user_id?: string | null
          brand: string
          id?: string
          model: string
          notes?: string | null
          original_vehicle_id: string
          owner_name?: string | null
          owner_phone?: string | null
          plate_number: string
          service_records?: Json | null
          total_cost?: number | null
          total_labor_cost?: number | null
          total_part_cost?: number | null
          year: number
        }
        Update: {
          archived_at?: string
          archived_by_user_id?: string | null
          brand?: string
          id?: string
          model?: string
          notes?: string | null
          original_vehicle_id?: string
          owner_name?: string | null
          owner_phone?: string | null
          plate_number?: string
          service_records?: Json | null
          total_cost?: number | null
          total_labor_cost?: number | null
          total_part_cost?: number | null
          year?: number
        }
        Relationships: []
      }
      fault_detection_photos: {
        Row: {
          created_at: string
          description: string | null
          fault_detection_id: string
          id: string
          photo_order: number | null
          photo_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fault_detection_id: string
          id?: string
          photo_order?: number | null
          photo_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fault_detection_id?: string
          id?: string
          photo_order?: number | null
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fault_detection_photos_fault_detection_id_fkey"
            columns: ["fault_detection_id"]
            isOneToOne: false
            referencedRelation: "fault_detections"
            referencedColumns: ["id"]
          },
        ]
      }
      fault_detections: {
        Row: {
          analysis_result: Json | null
          created_at: string
          created_by_user_id: string | null
          customer_complaint: string | null
          fault_codes: string[] | null
          id: string
          is_analyzed: boolean | null
          technician_observation: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          customer_complaint?: string | null
          fault_codes?: string[] | null
          id?: string
          is_analyzed?: boolean | null
          technician_observation?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          customer_complaint?: string | null
          fault_codes?: string[] | null
          id?: string
          is_analyzed?: boolean | null
          technician_observation?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fault_detections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_maintenance_records: {
        Row: {
          created_at: string
          id: string
          item_type: string
          product_used: string | null
          service_record_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: string
          product_used?: string | null
          service_record_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          product_used?: string | null
          service_record_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodic_maintenance_records_service_record_id_fkey"
            columns: ["service_record_id"]
            isOneToOne: false
            referencedRelation: "service_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_maintenance: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          planned_date: string
          planned_km: number | null
          title: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          planned_date: string
          planned_km?: number | null
          title: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          planned_date?: string
          planned_km?: number | null
          title?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_mappings: {
        Row: {
          created_at: string
          id: string
          qr_content: string
          slot_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          qr_content: string
          slot_number: number
        }
        Update: {
          created_at?: string
          id?: string
          qr_content?: string
          slot_number?: number
        }
        Relationships: []
      }
      service_records: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_archived: boolean | null
          km_at_service: number
          labor_cost: number | null
          labor_hours: number | null
          operation_type: string | null
          part_cost: number | null
          part_quality: string | null
          part_source: string | null
          quantity: number | null
          record_status: string | null
          service_date: string
          stock_code: string | null
          technician: string | null
          title: string
          unit_price: number | null
          vehicle_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_archived?: boolean | null
          km_at_service: number
          labor_cost?: number | null
          labor_hours?: number | null
          operation_type?: string | null
          part_cost?: number | null
          part_quality?: string | null
          part_source?: string | null
          quantity?: number | null
          record_status?: string | null
          service_date?: string
          stock_code?: string | null
          technician?: string | null
          title: string
          unit_price?: number | null
          vehicle_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_archived?: boolean | null
          km_at_service?: number
          labor_cost?: number | null
          labor_hours?: number | null
          operation_type?: string | null
          part_cost?: number | null
          part_quality?: string | null
          part_source?: string | null
          quantity?: number | null
          record_status?: string | null
          service_date?: string
          stock_code?: string | null
          technician?: string | null
          title?: string
          unit_price?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          position: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          position: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          position?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_summaries: {
        Row: {
          created_at: string
          id: string
          last_service_record_count: number | null
          last_updated_at: string
          suggestions: string | null
          summary_text: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_service_record_count?: number | null
          last_updated_at?: string
          suggestions?: string | null
          summary_text?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_service_record_count?: number | null
          last_updated_at?: string
          suggestions?: string | null
          summary_text?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_summaries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_technician: string | null
          body_code: string | null
          body_parts: Json | null
          body_type: string | null
          brand: string
          chassis_number: string
          color: string
          created_at: string
          created_by_user_id: string | null
          current_km: number
          estimated_delivery_date: string | null
          first_registration_date: string | null
          has_heavy_damage: boolean | null
          id: string
          model: string
          notes: string | null
          owner_address: string | null
          owner_name: string | null
          owner_phone: string | null
          package: string | null
          plate_number: string
          qr_code: string
          status: string | null
          updated_at: string
          year: number
        }
        Insert: {
          assigned_technician?: string | null
          body_code?: string | null
          body_parts?: Json | null
          body_type?: string | null
          brand: string
          chassis_number: string
          color: string
          created_at?: string
          created_by_user_id?: string | null
          current_km?: number
          estimated_delivery_date?: string | null
          first_registration_date?: string | null
          has_heavy_damage?: boolean | null
          id?: string
          model: string
          notes?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          package?: string | null
          plate_number: string
          qr_code: string
          status?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          assigned_technician?: string | null
          body_code?: string | null
          body_parts?: Json | null
          body_type?: string | null
          brand?: string
          chassis_number?: string
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          current_km?: number
          estimated_delivery_date?: string | null
          first_registration_date?: string | null
          has_heavy_damage?: boolean | null
          id?: string
          model?: string
          notes?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          package?: string | null
          plate_number?: string
          qr_code?: string
          status?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          average_labor_time_hours: number | null
          created_at: string
          id: string
          notes: string | null
          technician_stats: Json | null
          total_jobs_completed: number | null
          total_labor_cost: number | null
          total_part_cost: number | null
          total_revenue: number | null
          total_vehicles_serviced: number | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          average_labor_time_hours?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          technician_stats?: Json | null
          total_jobs_completed?: number | null
          total_labor_cost?: number | null
          total_part_cost?: number | null
          total_revenue?: number | null
          total_vehicles_serviced?: number | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          average_labor_time_hours?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          technician_stats?: Json | null
          total_jobs_completed?: number | null
          total_labor_cost?: number | null
          total_part_cost?: number | null
          total_revenue?: number | null
          total_vehicles_serviced?: number | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_display_name: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "technician"
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
      app_role: ["admin", "technician"],
    },
  },
} as const
