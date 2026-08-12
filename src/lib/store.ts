import { reactive } from "vue";
import type { ProjectWithCount, Task } from "./types";
import * as db from "./db";
import { advanceRepeat, dateInRange, sortPriority, today } from "./format";

export interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

export const store = reactive({
  view: "today" as "today" | "calendar" | "projects" | "project-detail" | "archive" | "placeholder",
  projects: [] as ProjectWithCount[],
  archivedProjects: [] as ProjectWithCount[],
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
  confirm: null as ConfirmState | null,
});

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/** 主题化确认弹窗（替代原生 confirm，居中显示） */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    store.confirm = {
      title: options.title ?? "确认",
      message: options.message,
      confirmText: options.confirmText ?? "确定",
      cancelText: options.cancelText ?? "取消",
      danger: options.danger ?? true,
      resolve,
    };
  });
}

export async function refresh() {
  store.projects = await db.listProjects();
  store.archivedProjects = await db.listArchivedProjects();
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
  // 重复任务：勾选完成 = 顺延到下一周期，状态保持未完成（不写入 done=1）
  if (!task.done && task.repeat) {
    let start = advanceRepeat(task.start_date, task.repeat);
    let end = advanceRepeat(task.end_date, task.repeat);
    let todoDate = task.todo_date ? advanceRepeat(task.todo_date, task.repeat) : null;
    // 若下一周期仍落在过去，连续推进到覆盖今天
    while (start < today()) {
      start = advanceRepeat(start, task.repeat);
      end = advanceRepeat(end, task.repeat);
      todoDate = todoDate ? advanceRepeat(todoDate, task.repeat) : null;
    }
    await db.setTaskDates(task.id, start, end, todoDate);
    task.start_date = start;
    task.end_date = end;
    task.todo_date = todoDate;
    task.last_reminded_date = null;
    return;
  }

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
