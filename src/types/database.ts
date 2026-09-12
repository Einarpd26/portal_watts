export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      asignaciones_laborales: {
        Row: {
          created_at: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string
          id: number
          id_cargo: number
          id_persona: number
          id_sucursal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: never
          id_cargo: number
          id_persona: number
          id_sucursal: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: never
          id_cargo?: number
          id_persona?: number
          id_sucursal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_laborales_id_cargo_fkey"
            columns: ["id_cargo"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_laborales_id_persona_fkey"
            columns: ["id_persona"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_laborales_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          descripcion: string | null
          id: number
          nombre_cargo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: never
          nombre_cargo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: never
          nombre_cargo?: string
          updated_at?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          apellidos: string
          auth_user_id: string | null
          ci: string
          created_at: string
          direccion: string | null
          email: string | null
          fecha_baja: string | null
          id: number
          nombres: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          auth_user_id?: string | null
          ci: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_baja?: string | null
          id?: never
          nombres: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          auth_user_id?: string | null
          ci?: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_baja?: string | null
          id?: never
          nombres?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          codigo: string
          created_at: string
          descripcion: string | null
          id: number
          nombre: string
          permisos: string[]
        }
        Insert: {
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: never
          nombre: string
          permisos?: string[]
        }
        Update: {
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: never
          nombre?: string
          permisos?: string[]
        }
        Relationships: []
      }
      sucursales: {
        Row: {
          created_at: string
          descripcion: string
          id: number
          nombre_sucursal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion: string
          id?: never
          nombre_sucursal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          id?: never
          nombre_sucursal?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuario_roles: {
        Row: {
          alcance_tipo: string
          created_at: string
          id: number
          id_persona: number
          id_rol: number
          id_sucursal: number | null
        }
        Insert: {
          alcance_tipo?: string
          created_at?: string
          id?: never
          id_persona: number
          id_rol: number
          id_sucursal?: number | null
        }
        Update: {
          alcance_tipo?: string
          created_at?: string
          id?: never
          id_persona?: number
          id_rol?: number
          id_sucursal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_roles_id_persona_fkey"
            columns: ["id_persona"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_roles_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_roles_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

