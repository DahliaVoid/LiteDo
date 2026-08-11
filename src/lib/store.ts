import { reactive } from "vue";
import type { ProjectWithCount, Task } from "./types";
import * as db from "./db";
import { dateInRange, sortPriority, today } from "./format";

export const store = reactive({
  view: "today" as "today" | "calendar" | "projects" | "project-detail" | "placeholder",
  placeholderTitle: "归档",
  projects: [] as ProjectWithCount[],
  tasks: [] as Task[],
  selectedProjectId: null as number | null,
  selectedDate: today(),
  taskModalDate: today(),
  projectModalOpen: false,
  taskModalOpen: false,
  editingProject: null as ProjectWithCount | null,
  editingTask: null as Task | null,
  taskModalProjectId: null as number | null,
  reminders: [] as Task[],
  snoozedUntil: "",
});

export async function refresh() {
  store.projects = await db.listProjects();
  store.tasks = await db.listTasks();
}

export function currentProject(): ProjectWithCount | null {
  return store.projects.find((p) => p.id === store.selectedProjectId) ?? null;
}

export function projectTasks(projectId: number): Task[] {
  return store.tasks
    .filter((t) => t.project_id === projectId)
    .sort((a, b) => sortPriority(a.priority, b.priority) || a.start_date.localeCompare(b.start_date));
}

export function todayTempTasks(): Task[] {
  return store.tasks
    .filter((t) => t.is_temp === 1 && t.todo_date === today() && !t.archived)
    .sort((a, b) => sortPriority(a.priority, b.priority) || (a.time_point ?? "").localeCompare(b.time_point ?? ""));
}

export function todayProjectTasks(): Task[] {
  return store.tasks
    .filter((t) => !t.is_temp && !t.done && dateInRange(today(), t.start_date, t.end_date))
    .sort((a, b) => sortPriority(a.priority, b.priority) || a.start_date.localeCompare(b.start_date));
}

export function tasksOnDate(date: string): Task[] {
  return store.tasks
    .filter((t) => dateInRange(date, t.start_date, t.end_date))
    .sort((a, b) => sortPriority(a.priority, b.priority) || (a.time_point ?? "").localeCompare(b.time_point ?? ""));
}

export async function toggleTask(task: Task) {
  const next = task.done ? 0 : 1;
  await db.setTaskDone(task.id, next);
  task.done = next;
}

export function openProject(id: number) {
  store.selectedProjectId = id;
  store.view = "project-detail";
}

export function openProjectModal(project: ProjectWithCount | null = null) {
  store.editingProject = project;
  store.projectModalOpen = true;
}

export function openTaskModal(projectId: number | null = null, task: Task | null = null) {
  store.editingTask = task;
  store.taskModalProjectId = task?.project_id ?? projectId;
  store.taskModalOpen = true;
}

export function closeModals() {
  store.projectModalOpen = false;
  store.taskModalOpen = false;
  store.editingProject = null;
  store.editingTask = null;
}

export async function reloadAfterMutation() {
  await refresh();
}
