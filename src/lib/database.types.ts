export type Project = {
  id: string;
  slug: string;
  title: string;
  bpm: number;
  bar_offset_seconds: number;
  created_at: string;
};

export type Track = {
  id: string;
  project_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  duration_seconds: number;
  sort_order: number;
  created_at: string;
};

export type TimelineComment = {
  id: string;
  project_id: string;
  track_id: string;
  position_seconds: number;
  author_name: string;
  body: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Project, "id" | "created_at">>;
        Relationships: [];
      };
      tracks: {
        Row: Track;
        Insert: Omit<Track, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Track, "id" | "created_at">>;
        Relationships: [];
      };
      comments: {
        Row: TimelineComment;
        Insert: Omit<TimelineComment, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<TimelineComment, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
