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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_photos: {
        Row: {
          alt_text: string
          caption: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
          visible: boolean
        }
        Insert: {
          alt_text?: string
          caption?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
          visible?: boolean
        }
        Update: {
          alt_text?: string
          caption?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
          visible?: boolean
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          note: string
          old_status: string | null
          reviewer_department: string
          reviewer_member_code: string
          reviewer_member_id: string | null
          reviewer_name: string
          reviewer_position: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          note?: string
          old_status?: string | null
          reviewer_department?: string
          reviewer_member_code?: string
          reviewer_member_id?: string | null
          reviewer_name?: string
          reviewer_position?: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          note?: string
          old_status?: string | null
          reviewer_department?: string
          reviewer_member_code?: string
          reviewer_member_id?: string | null
          reviewer_name?: string
          reviewer_position?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_applications: {
        Row: {
          admin_note: string
          ai_summary: string | null
          answers: Json
          chinese_level: string
          choices: Json
          code: string
          created_at: string
          cv_path: string | null
          email: string
          full_name: string
          hsk_level: string
          id: string
          intro: string
          organization: string
          period_id: string
          phone: string
          status: string
        }
        Insert: {
          admin_note?: string
          ai_summary?: string | null
          answers?: Json
          chinese_level?: string
          choices?: Json
          code?: string
          created_at?: string
          cv_path?: string | null
          email: string
          full_name: string
          hsk_level?: string
          id?: string
          intro: string
          organization: string
          period_id: string
          phone: string
          status?: string
        }
        Update: {
          admin_note?: string
          ai_summary?: string | null
          answers?: Json
          chinese_level?: string
          choices?: Json
          code?: string
          created_at?: string
          cv_path?: string | null
          email?: string
          full_name?: string
          hsk_level?: string
          id?: string
          intro?: string
          organization?: string
          period_id?: string
          phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_applications_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "recruitment_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          admin_note: string
          code: string
          course_id: string | null
          created_at: string
          current_level: string
          email: string
          full_name: string
          goal: string
          hsk_class_id: string | null
          id: string
          level: number
          message: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_note?: string
          code?: string
          course_id?: string | null
          created_at?: string
          current_level?: string
          email: string
          full_name: string
          goal?: string
          hsk_class_id?: string | null
          id?: string
          level: number
          message?: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_note?: string
          code?: string
          course_id?: string | null
          created_at?: string
          current_level?: string
          email?: string
          full_name?: string
          goal?: string
          hsk_class_id?: string | null
          id?: string
          level?: number
          message?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_hsk_class_id_fkey"
            columns: ["hsk_class_id"]
            isOneToOne: false
            referencedRelation: "hsk_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_settings: {
        Row: {
          capacity: number
          fee_amount: number
          fee_type: string
          level: number
          registration_open: boolean
          updated_at: string
        }
        Insert: {
          capacity?: number
          fee_amount?: number
          fee_type?: string
          level: number
          registration_open?: boolean
          updated_at?: string
        }
        Update: {
          capacity?: number
          fee_amount?: number
          fee_type?: string
          level?: number
          registration_open?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          capacity: number
          course_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          duration: string
          facebook_url: string
          format: string
          id: string
          is_published: boolean
          level: string
          price: number
          registration_url: string
          schedule: string
          short_description: string
          show_in_activities: boolean
          show_in_courses: boolean
          slug: string
          status: string
          teacher_id: string | null
          thumbnail_path: string
          title: string
          updated_at: string
          website_url: string
        }
        Insert: {
          capacity?: number
          course_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          duration?: string
          facebook_url?: string
          format?: string
          id?: string
          is_published?: boolean
          level?: string
          price?: number
          registration_url?: string
          schedule?: string
          short_description?: string
          show_in_activities?: boolean
          show_in_courses?: boolean
          slug: string
          status?: string
          teacher_id?: string | null
          thumbnail_path?: string
          title: string
          updated_at?: string
          website_url?: string
        }
        Update: {
          capacity?: number
          course_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          duration?: string
          facebook_url?: string
          format?: string
          id?: string
          is_published?: boolean
          level?: string
          price?: number
          registration_url?: string
          schedule?: string
          short_description?: string
          show_in_activities?: boolean
          show_in_courses?: boolean
          slug?: string
          status?: string
          teacher_id?: string | null
          thumbnail_path?: string
          title?: string
          updated_at?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      department_channels: {
        Row: {
          department: string
          note: string
          resources_url: string
          updated_at: string
          zalo_url: string
        }
        Insert: {
          department: string
          note?: string
          resources_url?: string
          updated_at?: string
          zalo_url?: string
        }
        Update: {
          department?: string
          note?: string
          resources_url?: string
          updated_at?: string
          zalo_url?: string
        }
        Relationships: []
      }
      hsk_classes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          duration: string
          end_date: string | null
          fee_amount: number
          fee_type: string
          format: string
          id: string
          is_published: boolean
          level: number
          max_students: number
          name: string
          registration_url: string
          schedule: string
          start_date: string | null
          status: string
          teacher_id: string | null
          thumbnail_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          duration?: string
          end_date?: string | null
          fee_amount?: number
          fee_type?: string
          format?: string
          id?: string
          is_published?: boolean
          level: number
          max_students?: number
          name: string
          registration_url?: string
          schedule?: string
          start_date?: string | null
          status?: string
          teacher_id?: string | null
          thumbnail_path?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          duration?: string
          end_date?: string | null
          fee_amount?: number
          fee_type?: string
          format?: string
          id?: string
          is_published?: boolean
          level?: number
          max_students?: number
          name?: string
          registration_url?: string
          schedule?: string
          start_date?: string | null
          status?: string
          teacher_id?: string | null
          thumbnail_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hsk_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      member_accounts: {
        Row: {
          account_status: string
          created_at: string
          last_login_at: string | null
          login_email: string
          member_id: string
          must_change_password: boolean
          permissions: string[]
          user_id: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          last_login_at?: string | null
          login_email: string
          member_id: string
          must_change_password?: boolean
          permissions?: string[]
          user_id: string
        }
        Update: {
          account_status?: string
          created_at?: string
          last_login_at?: string | null
          login_email?: string
          member_id?: string
          must_change_password?: boolean
          permissions?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          application_id: string | null
          avatar_path: string | null
          contribution_points: number
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          is_public: boolean
          joined_on: string
          member_code: string
          phone: string
          position: string
          status: string
        }
        Insert: {
          application_id?: string | null
          avatar_path?: string | null
          contribution_points?: number
          created_at?: string
          department: string
          email?: string
          full_name: string
          id?: string
          is_public?: boolean
          joined_on?: string
          member_code?: string
          phone?: string
          position: string
          status?: string
        }
        Update: {
          application_id?: string | null
          avatar_path?: string | null
          contribution_points?: number
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          is_public?: boolean
          joined_on?: string
          member_code?: string
          phone?: string
          position?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string | null
          delta: number
          id: string
          kind: string
          member_id: string
          reason: string
          task_id: string | null
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          kind?: string
          member_id: string
          reason: string
          task_id?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          kind?: string
          member_id?: string
          reason?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_periods: {
        Row: {
          created_at: string
          description: string
          ends_on: string
          id: string
          name: string
          starts_on: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string
          ends_on: string
          id?: string
          name: string
          starts_on: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          ends_on?: string
          id?: string
          name?: string
          starts_on?: string
          status?: string
        }
        Relationships: []
      }
      recruitment_positions: {
        Row: {
          department: string
          enabled: boolean
          id: string
          period_id: string
          position: string
        }
        Insert: {
          department: string
          enabled?: boolean
          id?: string
          period_id: string
          position: string
        }
        Update: {
          department?: string
          enabled?: boolean
          id?: string
          period_id?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_positions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "recruitment_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_questions: {
        Row: {
          id: string
          kind: string
          options: string[]
          prompt: string
          required: boolean
          sort_order: number
          topic_id: string
          visible: boolean
        }
        Insert: {
          id?: string
          kind?: string
          options?: string[]
          prompt: string
          required?: boolean
          sort_order?: number
          topic_id: string
          visible?: boolean
        }
        Update: {
          id?: string
          kind?: string
          options?: string[]
          prompt?: string
          required?: boolean
          sort_order?: number
          topic_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "recruitment_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_topics: {
        Row: {
          created_at: string
          department: string | null
          description: string
          id: string
          period_id: string | null
          position: string | null
          sort_order: number
          title: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string
          id?: string
          period_id?: string | null
          position?: string | null
          sort_order?: number
          title: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string
          id?: string
          period_id?: string | null
          position?: string | null
          sort_order?: number
          title?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_topics_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "recruitment_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          department: string
          description: string
          due_on: string | null
          evidence_url: string
          id: string
          points: number
          priority: string
          report_note: string
          review_note: string
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          title: string
        }
        Insert: {
          assignee_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department: string
          description?: string
          due_on?: string | null
          evidence_url?: string
          id?: string
          points?: number
          priority?: string
          report_note?: string
          review_note?: string
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          title: string
        }
        Update: {
          assignee_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          due_on?: string | null
          evidence_url?: string
          id?: string
          points?: number
          priority?: string
          report_note?: string
          review_note?: string
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          avatar_url: string
          bio: string
          created_at: string
          full_name: string
          id: string
          member_id: string | null
          sort_order: number
          teaching_levels: number[]
          title: string
          visible: boolean
        }
        Insert: {
          avatar_url?: string
          bio?: string
          created_at?: string
          full_name: string
          id?: string
          member_id?: string | null
          sort_order?: number
          teaching_levels?: number[]
          title?: string
          visible?: boolean
        }
        Update: {
          avatar_url?: string
          bio?: string
          created_at?: string
          full_name?: string
          id?: string
          member_id?: string | null
          sort_order?: number
          teaching_levels?: number[]
          title?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "teachers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      _apply_points: {
        Args: {
          _delta: number
          _kind: string
          _member: string
          _reason: string
          _task: string
        }
        Returns: undefined
      }
      adjust_points: {
        Args: {
          _delta: number
          _kind: string
          _member: string
          _reason: string
        }
        Returns: undefined
      }
      can_manage_department: { Args: { _dept: string }; Returns: boolean }
      can_review_application: { Args: { _app: string }; Returns: boolean }
      claim_invited_role: { Args: never; Returns: undefined }
      create_task: {
        Args: {
          _assignee: string
          _description: string
          _due_on: string
          _points: number
          _priority: string
          _title: string
        }
        Returns: string
      }
      delete_task: { Args: { _task: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hsk_class_seats: { Args: { _class: string }; Returns: number }
      mark_password_changed: { Args: never; Returns: undefined }
      member_update_task: {
        Args: {
          _action: string
          _evidence: string
          _note: string
          _task: string
        }
        Returns: undefined
      }
      my_account: { Args: never; Returns: Json }
      my_department: { Args: never; Returns: Json }
      my_head_department: { Args: never; Returns: string }
      my_member_id: { Args: never; Returns: string }
      public_org_chart: {
        Args: never
        Returns: {
          dept: string
          display_name: string
          member_count: number
          role_title: string
        }[]
      }
      record_login: { Args: never; Returns: undefined }
      reorder_activity_photos: {
        Args: { photo_ids: string[] }
        Returns: undefined
      }
      review_task: {
        Args: { _approve: boolean; _note: string; _task: string }
        Returns: undefined
      }
      set_application_status: {
        Args: { _app: string; _note: string; _status: string }
        Returns: undefined
      }
      set_member_visibility: {
        Args: { _member: string; _public: boolean }
        Returns: undefined
      }
      set_my_visibility: { Args: { _public: boolean }; Returns: undefined }
      update_my_profile: {
        Args: { _avatar_path: string; _full_name: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "department_head" | "member"
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
      app_role: ["admin", "department_head", "member"],
    },
  },
} as const
