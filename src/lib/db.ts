import Database from "@tauri-apps/plugin-sql";
import type { ProjectInput, ProjectWithCount, Task, TaskInput } from "./types";
import { addDays, today } from "./format";

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load("sqlite:litedo.db");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT 'blue',
          priority TEXT NOT NULL DEFAULT 'P2',
          note TEXT NOT NULL DEFAULT '',
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER,
          title TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT 'blue',
          priority TEXT NOT NULL DEFAULT 'P2',
          note TEXT NOT NULL DEFAULT '',
          has_time INTEGER NOT NULL DEFAULT 0,
          time_point TEXT,
          reminder INTEGER NOT NULL DEFAULT 0,
          reminder_offset_minutes INTEGER NOT NULL DEFAULT 0,
          done INTEGER NOT NULL DEFAULT 0,
          is_temp INTEGER NOT NULL DEFAULT 0,
          todo_date TEXT,
          last_reminded_date TEXT,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        )
      `);
      await seed(db);
      return db;
    })();
  }
  return dbPromise;
}

async function seed(db: Database) {
  const rows = await db.select<Array<{ c: number }>>("SELECT COUNT(*) AS c FROM projects");
  if (rows[0]?.c) return;

  const t = today();
  const projects: ProjectInput[] = [
    {
      name: "新品立项",
      start_date: addDays(t, -2),
      end_date: addDays(t, 9),
      color: "amber",
      priority: "P1",
      note: "从打样、链接到图片与文案的完整上新流程。",
    },
    {
      name: "618 大促筹备",
      start_date: addDays(t, -10),
      end_date: addDays(t, 7),
      color: "green",
      priority: "P1",
      note: "活动主图、价格策略与页面装修。",
    },
    {
      name: "网站改版",
      start_date: addDays(t, 4),
      end_date: addDays(t, 30),
      color: "blue",
      priority: "P2",
      note: "首页结构、产品展示与移动端适配。",
    },
  ];

  const projectIds: number[] = [];
  for (const p of projects) {
    const result = await db.execute(
      "INSERT INTO projects (name, start_date, end_date, color, priority, note) VALUES (?, ?, ?, ?, ?, ?)",
      [p.name, p.start_date, p.end_date, p.color, p.priority, p.note],
    );
    projectIds.push(Number(result.lastInsertId));
  }

  const tasks: Array<Partial<TaskInput>> = [
    { project_id: projectIds[0], title: "样品确认 — 供应商寄样", start_date: addDays(t, -2), end_date: addDays(t, 4), color: "amber", priority: "P1" },
    { project_id: projectIds[0], title: "链接创建", start_date: t, end_date: addDays(t, 2), color: "blue", priority: "P0", has_time: 1, time_point: "10:00", reminder: 1 },
    { project_id: projectIds[0], title: "图片设计", start_date: addDays(t, 3), end_date: addDays(t, 7), color: "purple", priority: "P2" },
    { project_id: projectIds[0], title: "页面文案", start_date: addDays(t, 5), end_date: addDays(t, 9), color: "teal", priority: "P1" },
    { project_id: projectIds[1], title: "主图卖点提炼", start_date: t, end_date: addDays(t, 2), color: "green", priority: "P0", has_time: 1, time_point: "09:30", reminder: 1, reminder_offset_minutes: 5 },
    { project_id: projectIds[1], title: "价格策略表", start_date: addDays(t, -10), end_date: addDays(t, -3), color: "amber", priority: "P1" },
    { project_id: projectIds[1], title: "活动页装修", start_date: addDays(t, 1), end_date: addDays(t, 7), color: "blue", priority: "P2" },
    { project_id: projectIds[2], title: "信息架构梳理", start_date: addDays(t, 4), end_date: addDays(t, 9), color: "blue", priority: "P1" },
    { project_id: projectIds[2], title: "首页视觉稿", start_date: addDays(t, 9), end_date: addDays(t, 17), color: "purple", priority: "P2" },
    { project_id: null, title: "回复供应商样品邮件", start_date: t, end_date: t, color: "red", priority: "P1", is_temp: 1, todo_date: t, has_time: 1, time_point: "09:30" },
    { project_id: null, title: "确认新品链接创建模板", start_date: t, end_date: t, color: "blue", priority: "P0", is_temp: 1, todo_date: t, has_time: 1, time_point: "10:00", reminder: 1 },
    { project_id: null, title: "设计首版产品图需求", start_date: t, end_date: t, color: "purple", priority: "P2", is_temp: 1, todo_date: t },
  ];

  for (const task of tasks) {
    await db.execute(
      `INSERT INTO tasks
        (project_id, title, start_date, end_date, color, priority, note, has_time, time_point,
         reminder, reminder_offset_minutes, done, is_temp, todo_date)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 0, ?, ?)`,
      [
        task.project_id ?? null,
        task.title,
        task.start_date,
        task.end_date,
        task.color ?? "blue",
        task.priority ?? "P2",
        task.has_time ?? 0,
        task.time_point ?? null,
        task.reminder ?? 0,
        task.reminder_offset_minutes ?? 0,
        task.is_temp ?? 0,
        task.todo_date ?? null,
      ],
    );
  }

  await db.execute(
    "UPDATE tasks SET done = 1 WHERE title = '价格策略表'",
  );
  await db.execute(
    "UPDATE tasks SET done = 1 WHERE title = '回复供应商样品邮件' AND is_temp = 1",
  );
}

export async function listProjects(): Promise<ProjectWithCount[]> {
  const db = await getDb();
  return db.select<ProjectWithCount[]>(`
    SELECT p.*,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.archived = 0) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.archived = 0 AND t.done = 1) AS done_count
    FROM projects p
    WHERE p.archived = 0
    ORDER BY p.start_date ASC
  `);
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDb();
  return db.select<Task[]>(`
    SELECT t.*, p.name AS project_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.archived = 0
    ORDER BY t.start_date ASC, t.id DESC
  `);
}

export async function createProject(input: ProjectInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO projects (name, start_date, end_date, color, priority, note) VALUES (?, ?, ?, ?, ?, ?)",
    [input.name, input.start_date, input.end_date, input.color, input.priority, input.note],
  );
  return Number(result.lastInsertId);
}

export async function updateProject(id: number, input: ProjectInput) {
  const db = await getDb();
  await db.execute(
    "UPDATE projects SET name = ?, start_date = ?, end_date = ?, color = ?, priority = ?, note = ? WHERE id = ?",
    [input.name, input.start_date, input.end_date, input.color, input.priority, input.note, id],
  );
}

export async function deleteProject(id: number) {
  const db = await getDb();
  await db.execute("UPDATE projects SET archived = 1 WHERE id = ?", [id]);
  await db.execute("UPDATE tasks SET archived = 1 WHERE project_id = ?", [id]);
}

export async function createTask(input: TaskInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO tasks
      (project_id, title, start_date, end_date, color, priority, note, has_time, time_point,
       reminder, reminder_offset_minutes, done, is_temp, todo_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      input.project_id,
      input.title,
      input.start_date,
      input.end_date,
      input.color,
      input.priority,
      input.note,
      input.has_time,
      input.time_point,
      input.reminder,
      input.reminder_offset_minutes,
      input.is_temp,
      input.todo_date,
    ],
  );
  return Number(result.lastInsertId);
}

export async function updateTask(id: number, input: TaskInput) {
  const db = await getDb();
  await db.execute(
    `UPDATE tasks SET
       project_id = ?, title = ?, start_date = ?, end_date = ?, color = ?, priority = ?,
       note = ?, has_time = ?, time_point = ?, reminder = ?, reminder_offset_minutes = ?,
       is_temp = ?, todo_date = ?
     WHERE id = ?`,
    [
      input.project_id,
      input.title,
      input.start_date,
      input.end_date,
      input.color,
      input.priority,
      input.note,
      input.has_time,
      input.time_point,
      input.reminder,
      input.reminder_offset_minutes,
      input.is_temp,
      input.todo_date,
      id,
    ],
  );
}

export async function deleteTask(id: number) {
  const db = await getDb();
  await db.execute("UPDATE tasks SET archived = 1 WHERE id = ?", [id]);
}

export async function setTaskDone(id: number, done: number) {
  const db = await getDb();
  await db.execute("UPDATE tasks SET done = ? WHERE id = ?", [done, id]);
}

export async function setTaskReminded(id: number, date: string) {
  const db = await getDb();
  await db.execute("UPDATE tasks SET last_reminded_date = ? WHERE id = ?", [date, id]);
}
