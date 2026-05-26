export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          content: Json | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string
          content?: Json | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: Json | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      document_collaborators: {
        Row: {
          id: string
          document_id: string
          user_id: string
          role: 'viewer' | 'editor'
          invited_by: string | null
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          role: 'viewer' | 'editor'
          invited_by?: string | null
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          role?: 'viewer' | 'editor'
          invited_by?: string | null
          accepted_at?: string | null
          created_at?: string
        }
      }
      document_invites: {
        Row: {
          id: string
          document_id: string
          email: string
          role: 'viewer' | 'editor'
          token: string
          invited_by: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          document_id: string
          email: string
          role: 'viewer' | 'editor'
          token?: string
          invited_by?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          email?: string
          role?: 'viewer' | 'editor'
          token?: string
          invited_by?: string | null
          created_at?: string
          expires_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          document_id: string
          author_id: string
          content: string
          resolved: boolean
          selection_from: number | null
          selection_to: number | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          author_id: string
          content: string
          resolved?: boolean
          selection_from?: number | null
          selection_to?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          author_id?: string
          content?: string
          resolved?: boolean
          selection_from?: number | null
          selection_to?: number | null
          created_at?: string
        }
      }
      comment_replies: {
        Row: {
          id: string
          comment_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          author_id?: string
          content?: string
          created_at?: string
        }
      }
      fonts: {
        Row: {
          id: string
          owner_id: string
          name: string
          family: string
          file_url: string
          file_path: string
          format: 'woff2' | 'woff' | 'ttf' | 'otf'
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          family: string
          file_url: string
          file_path: string
          format: 'woff2' | 'woff' | 'ttf' | 'otf'
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          family?: string
          file_url?: string
          file_path?: string
          format?: 'woff2' | 'woff' | 'ttf' | 'otf'
          created_at?: string
        }
      }
    }
  }
}
