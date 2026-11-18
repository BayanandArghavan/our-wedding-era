
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity_id": string | null,"entity_label": string,"entity_type": string,"id": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_label"?: string,"entity_type": string,"id"?: never,"workspace_id": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_label"?: string,"entity_type"?: string,"id"?: never,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"milestone_tasks": {
                  Row: {
                    "milestone_id": string,"task_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "milestone_id": string,"task_id": string,"workspace_id": string
                  }
                  Update: {
                    "milestone_id"?: string,"task_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestone_tasks_workspace_id_milestone_id_fkey"
      columns: ["workspace_id","milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "milestone_tasks_workspace_id_task_id_fkey"
      columns: ["workspace_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "completed_on": string | null,"created_at": string,"created_by": string | null,"description": string,"id": string,"is_completed": boolean,"is_custom": boolean,"seed_key": string | null,"sort_order": number,"title": string,"updated_at": string,"updated_by": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_on"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_completed"?: boolean,"is_custom"?: boolean,"seed_key"?: string | null,"sort_order"?: number,"title": string,"updated_at"?: string,"updated_by"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "completed_on"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_completed"?: boolean,"is_custom"?: boolean,"seed_key"?: string | null,"sort_order"?: number,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"time_zone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"time_zone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"time_zone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"task_activity": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": number,"task_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"task_id": string,"workspace_id": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"task_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_activity_workspace_id_task_id_fkey"
      columns: ["workspace_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"task_categories": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"sort_order": number,"updated_at": string,"updated_by": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_categories_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"task_dependencies": {
                  Row: {
                    "created_at": string,"created_by": string | null,"depends_on_task_id": string,"task_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"depends_on_task_id": string,"task_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"depends_on_task_id"?: string,"task_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_dependencies_workspace_id_depends_on_task_id_fkey"
      columns: ["workspace_id","depends_on_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "task_dependencies_workspace_id_task_id_fkey"
      columns: ["workspace_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"task_subtasks": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_done": boolean,"sort_order": number,"task_id": string,"title": string,"updated_at": string,"updated_by": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_done"?: boolean,"sort_order"?: number,"task_id": string,"title": string,"updated_at"?: string,"updated_by"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_done"?: boolean,"sort_order"?: number,"task_id"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_subtasks_workspace_id_task_id_fkey"
      columns: ["workspace_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee": Database["public"]['Enums']["assignee_kind"],"category_id": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"date_source": Database["public"]['Enums']["date_source"],"days_before": number | null,"description": string,"due_date": string | null,"id": string,"is_booking": boolean,"months_before": number | null,"notes": string,"priority": Database["public"]['Enums']["task_priority"],"reassign_requested_at": string | null,"reassign_requested_by": string | null,"seed_key": string | null,"sort_order": number,"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string,"updated_by": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee"?: Database["public"]['Enums']["assignee_kind"],"category_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_source"?: Database["public"]['Enums']["date_source"],"days_before"?: number | null,"description"?: string,"due_date"?: string | null,"id"?: string,"is_booking"?: boolean,"months_before"?: number | null,"notes"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"reassign_requested_at"?: string | null,"reassign_requested_by"?: string | null,"seed_key"?: string | null,"sort_order"?: number,"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string,"updated_by"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "assignee"?: Database["public"]['Enums']["assignee_kind"],"category_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_source"?: Database["public"]['Enums']["date_source"],"days_before"?: number | null,"description"?: string,"due_date"?: string | null,"id"?: string,"is_booking"?: boolean,"months_before"?: number | null,"notes"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"reassign_requested_at"?: string | null,"reassign_requested_by"?: string | null,"seed_key"?: string | null,"sort_order"?: number,"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_workspace_id_category_id_fkey"
      columns: ["workspace_id","category_id"]
isOneToOne: false
      referencedRelation: "task_categories"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "tasks_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"vendor_needs": {
                  Row: {
                    "category": string,"created_at": string,"created_by": string | null,"id": string,"label": string,"sort_order": number,"status": Database["public"]['Enums']["vendor_need_status"],"updated_at": string,"updated_by": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"label": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["vendor_need_status"],"updated_at"?: string,"updated_by"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"label"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["vendor_need_status"],"updated_at"?: string,"updated_by"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendor_needs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"wedding_settings": {
                  Row: {
                    "alcohol_served": boolean,"catering_notes": string,"ceremony_setting": string,"ceremony_start": string,"ceremony_tradition": string,"checkin_day_of_month": number | null,"confirmed_guest_count": number | null,"created_at": string,"created_by": string | null,"currency": string,"estimated_guest_count": number,"event_end": string,"outside_vendor_notes": string,"partner1_name": string,"partner2_name": string,"planning_start_month": string,"planning_time_zone": string,"reception_setting": string,"reminder_frequency": string,"setup_completed_at": string | null,"setup_step": number,"sofreh_aghd": boolean,"task_division": string,"total_budget": number | null,"updated_at": string,"updated_by": string | null,"venue_confirmation_received": boolean,"venue_deposit_status": string,"venue_location": string,"venue_name": string,"venue_time_zone": string,"wedding_date": string | null,"wedding_month": string,"wedding_style": string,"weekly_summary": boolean,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alcohol_served"?: boolean,"catering_notes"?: string,"ceremony_setting"?: string,"ceremony_start"?: string,"ceremony_tradition"?: string,"checkin_day_of_month"?: number | null,"confirmed_guest_count"?: number | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"estimated_guest_count"?: number,"event_end"?: string,"outside_vendor_notes"?: string,"partner1_name"?: string,"partner2_name"?: string,"planning_start_month"?: string,"planning_time_zone"?: string,"reception_setting"?: string,"reminder_frequency"?: string,"setup_completed_at"?: string | null,"setup_step"?: number,"sofreh_aghd"?: boolean,"task_division"?: string,"total_budget"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"venue_confirmation_received"?: boolean,"venue_deposit_status"?: string,"venue_location"?: string,"venue_name"?: string,"venue_time_zone"?: string,"wedding_date"?: string | null,"wedding_month"?: string,"wedding_style"?: string,"weekly_summary"?: boolean,"workspace_id": string
                  }
                  Update: {
                    "alcohol_served"?: boolean,"catering_notes"?: string,"ceremony_setting"?: string,"ceremony_start"?: string,"ceremony_tradition"?: string,"checkin_day_of_month"?: number | null,"confirmed_guest_count"?: number | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"estimated_guest_count"?: number,"event_end"?: string,"outside_vendor_notes"?: string,"partner1_name"?: string,"partner2_name"?: string,"planning_start_month"?: string,"planning_time_zone"?: string,"reception_setting"?: string,"reminder_frequency"?: string,"setup_completed_at"?: string | null,"setup_step"?: number,"sofreh_aghd"?: boolean,"task_division"?: string,"total_budget"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"venue_confirmation_received"?: boolean,"venue_deposit_status"?: string,"venue_location"?: string,"venue_name"?: string,"venue_time_zone"?: string,"wedding_date"?: string | null,"wedding_month"?: string,"wedding_style"?: string,"weekly_summary"?: boolean,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wedding_settings_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: true
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"wedding_workspaces": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"workspace_invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string,"partner_slot": number,"status": Database["public"]['Enums']["invitation_status"],"token_hash": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email": string,"expires_at": string,"id"?: string,"invited_by": string,"partner_slot": number,"status"?: Database["public"]['Enums']["invitation_status"],"token_hash": string,"workspace_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"partner_slot"?: number,"status"?: Database["public"]['Enums']["invitation_status"],"token_hash"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_invitations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "joined_at": string,"partner_slot": number,"role": Database["public"]['Enums']["member_role"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"partner_slot": number,"role": Database["public"]['Enums']["member_role"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "joined_at"?: string,"partner_slot"?: number,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "wedding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_partner_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"apply_wedding_date_change":
{ Args: { "p_changes": Json,"p_wedding_date": string,"p_wedding_month": string }; Returns: number
                           },
"create_partner_invitation":
{ Args: { "p_email": string }; Returns: string
                           },
"create_workspace":
{ Args: { "p_categories": Json,"p_milestones": Json,"p_partner_slot": number,"p_settings": Json,"p_tasks": Json,"p_vendor_needs": Json }; Returns: string
                           },
"get_invitation_preview":
{ Args: { "p_token": string }; Returns: {
              "invited_email": string,"inviter_name": string,"is_valid": boolean,"partner_slot": number,"partner1_name": string,"partner2_name": string,"reason": string
            }[]
                           },
"is_workspace_member":
{ Args: { "ws": string }; Returns: boolean
                           },
"log_activity":
{ Args: { "p_action": string,"p_details": Json,"p_entity_id": string,"p_entity_type": string,"p_label": string,"p_workspace": string }; Returns: undefined
                           },
"reschedule_task":
{ Args: { "p_new_date": string,"p_reason": string,"p_task_id": string }; Returns: undefined
                           },
"revoke_partner_invitation":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"shares_workspace_with":
{ Args: { "other": string }; Returns: boolean
                           }
          }
          Enums: {
            "assignee_kind": "unassigned"|"partner1"|"partner2"|"together","date_source": "none"|"suggested"|"manual","invitation_status": "pending"|"accepted"|"revoked","member_role": "owner"|"partner","task_priority": "critical"|"high"|"medium"|"low","task_status": "not_started"|"in_progress"|"waiting"|"blocked"|"completed"|"not_applicable","vendor_need_status": "not_booked"|"booked"|"not_needed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "assignee_kind": ["unassigned", "partner1", "partner2", "together"],"date_source": ["none", "suggested", "manual"],"invitation_status": ["pending", "accepted", "revoked"],"member_role": ["owner", "partner"],"task_priority": ["critical", "high", "medium", "low"],"task_status": ["not_started", "in_progress", "waiting", "blocked", "completed", "not_applicable"],"vendor_need_status": ["not_booked", "booked", "not_needed"]
          }
        }
} as const
