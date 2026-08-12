export type Color = "red" | "amber" | "green" | "blue" | "purple" | "teal";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Repeat = "" | "daily" | "weekly" | "monthly";

export interface Project {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  color: Color;
  priority: Priority;
  note: string;
  archived: number;
  created_at: string;
}

export interface ProjectWithCount extends Project {
  task_count: number;
  done_count: number;
}

export interface Task {
  id: number;
  project_id: number | null;
  title: string;
  start_date: string;
  end_date: string;
  color: Color;
  priority: Priority;
  note: string;
  has_time: number;
  time_point: string | null;
  reminder: number;
  reminder_offset_minutes: number;
  done: number;
  is_temp: number;
  todo_date: string | null;
  last_reminded_date: string | null;
  repeat: Repeat;
  archived: number;
  created_at: string;
  project_name?: string;
}

export interface ProjectInput {
  name: string;
  start_date: string;
  end_date: string;
  color: Color;
  priority: Priority;
  note: string;
}

export interface TaskInput {
  project_id: number | null;
  title: string;
  start_date: string;
  end_date: string;
  color: Color;
  priority: Priority;
  note: string;
  has_time: number;
  time_point: string | null;
  reminder: number;
  reminder_offset_minutes: number;
  is_temp: number;
  todo_date: string | null;
  repeat: Repeat;
}
