import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

export async function initDatabase() {
  const SQL = await initSqlJs();
  dbPath = path.join(__dirname, '../../data/aifactory.db');

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('Database loaded from disk:', dbPath);
  } else {
    db = new SQL.Database();
    console.log('New database created');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      node_name TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      model_versions TEXT NOT NULL,
      available_hours TEXT NOT NULL,
      load_threshold INTEGER NOT NULL DEFAULT 80,
      status TEXT NOT NULL DEFAULT 'offline',
      last_heartbeat TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT,
      requirements TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_node_id TEXT,
      creator_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      assigned_at TEXT,
      completed_at TEXT,
      points_cost INTEGER NOT NULL,
      FOREIGN KEY (assigned_node_id) REFERENCES nodes(id),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      task_id TEXT,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_user_id ON nodes(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_node_id ON tasks(assigned_node_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`);

  saveDatabase();
  console.log('Database initialized successfully');
}

export function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getUserByEmail(email: string) {
  if (!db) return undefined;
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  stmt.bind([email]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function getUserById(id: string) {
  if (!db) return undefined;
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function createUser(id: string, email: string, passwordHash: string, role: string = 'user') {
  if (!db) return;
  const stmt = db.prepare('INSERT INTO users (id, email, password_hash, role, points) VALUES (?, ?, ?, ?, ?)');
  stmt.run([id, email, passwordHash, role, 0]);
  stmt.free();
  saveDatabase();
}

export function updateUserPoints(userId: string, points: number) {
  if (!db) return;
  const stmt = db.prepare('UPDATE users SET points = points + ? WHERE id = ?');
  stmt.run([points, userId]);
  stmt.free();
  saveDatabase();
}

export function getNodeById(id: string) {
  if (!db) return undefined;
  const stmt = db.prepare('SELECT * FROM nodes WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function getNodesByUserId(userId: string) {
  if (!db) return [];
  const results: any[] = [];
  const stmt = db.prepare('SELECT * FROM nodes WHERE user_id = ?');
  stmt.bind([userId]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getOnlineNodesByCapability(capability: string) {
  if (!db) return [];
  const results: any[] = [];
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE status = 'online'
    AND capabilities LIKE ?
    ORDER BY last_heartbeat DESC
  `);
  stmt.bind([`%${capability}%`]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function createNode(node: {
  id: string;
  userId: string;
  nodeName: string;
  capabilities: string[];
  modelVersions: string[];
  availableHours: { start: number; end: number };
  loadThreshold: number;
}) {
  if (!db) return;
  const stmt = db.prepare(`
    INSERT INTO nodes (id, user_id, node_name, capabilities, model_versions, available_hours, load_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    node.id,
    node.userId,
    node.nodeName,
    JSON.stringify(node.capabilities),
    JSON.stringify(node.modelVersions),
    JSON.stringify(node.availableHours),
    node.loadThreshold
  ]);
  stmt.free();
  saveDatabase();
}

export function updateNodeStatus(nodeId: string, status: string, lastHeartbeat: string) {
  if (!db) return;
  const stmt = db.prepare('UPDATE nodes SET status = ?, last_heartbeat = ? WHERE id = ?');
  stmt.run([status, lastHeartbeat, nodeId]);
  stmt.free();
  saveDatabase();
}

export function createTask(task: {
  id: string;
  type: string;
  input: string;
  requirements: string;
  creatorId: string;
  pointsCost: number;
}) {
  if (!db) return;
  const stmt = db.prepare(`
    INSERT INTO tasks (id, type, input, requirements, creator_id, points_cost, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);
  stmt.run([task.id, task.type, task.input, task.requirements, task.creatorId, task.pointsCost]);
  stmt.free();
  saveDatabase();
}

export function getTaskById(id: string) {
  if (!db) return undefined;
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function getTasksByCreatorId(creatorId: string) {
  if (!db) return [];
  const results: any[] = [];
  const stmt = db.prepare('SELECT * FROM tasks WHERE creator_id = ? ORDER BY created_at DESC');
  stmt.bind([creatorId]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getPendingTasks() {
  if (!db) return [];
  const results: any[] = [];
  const stmt = db.prepare("SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at ASC");
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function updateTaskAssignment(taskId: string, nodeId: string) {
  if (!db) return;
  const stmt = db.prepare(`
    UPDATE tasks
    SET status = 'assigned', assigned_node_id = ?, assigned_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run([nodeId, taskId]);
  stmt.free();
  saveDatabase();
}

export function updateTaskOutput(taskId: string, output: string, status: string) {
  if (!db) return;
  let completedAt = 'datetime(\'now\')';
  if (status !== 'completed') {
    completedAt = 'NULL';
  }
  const stmt = db.prepare(`
    UPDATE tasks
    SET output = ?, status = ?, completed_at = ${completedAt}
    WHERE id = ?
  `);
  stmt.run([output, status, taskId]);
  stmt.free();
  saveDatabase();
}

export function createTransaction(transaction: {
  id: string;
  userId: string;
  type: string;
  amount: number;
  taskId?: string;
  description: string;
}) {
  if (!db) return;
  const stmt = db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, task_id, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run([transaction.id, transaction.userId, transaction.type, transaction.amount, transaction.taskId || null, transaction.description]);
  stmt.free();
  saveDatabase();
}

export function getTransactionsByUserId(userId: string) {
  if (!db) return [];
  const results: any[] = [];
  const stmt = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC');
  stmt.bind([userId]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getStatistics() {
  if (!db) {
    return {
      nodes: { total: 0, online: 0 },
      tasks: { total: 0, completed: 0, pending: 0 },
      points: { total_income: 0, total_expense: 0 }
    };
  }

  const nodeStats = db.exec(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online
    FROM nodes
  `);

  const taskStats = db.exec(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM tasks
  `);

  const pointsStats = db.exec(`
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
    FROM transactions
  `);

  const nodes = nodeStats[0]?.values[0] || [0, 0];
  const tasks = taskStats[0]?.values[0] || [0, 0, 0];
  const points = pointsStats[0]?.values[0] || [0, 0];

  return {
    nodes: { total: nodes[0] || 0, online: nodes[1] || 0 },
    tasks: { total: tasks[0] || 0, completed: tasks[1] || 0, pending: tasks[2] || 0 },
    points: { total_income: points[0] || 0, total_expense: points[1] || 0 }
  };
}

export function getAllNodes() {
  if (!db) return [];
  const results: any[] = [];
  const stmt = db.prepare('SELECT * FROM nodes ORDER BY created_at DESC');
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getAllTasks() {
  if (!db) return [];
  const results: any[] = [];
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function banNode(nodeId: string) {
  if (!db) return;
  const stmt = db.prepare("UPDATE nodes SET status = 'offline' WHERE id = ?");
  stmt.run([nodeId]);
  stmt.free();
  saveDatabase();
}

export function cancelTask(taskId: string) {
  if (!db) return;
  const stmt = db.prepare("UPDATE tasks SET status = 'cancelled' WHERE id = ? AND status = 'pending'");
  stmt.run([taskId]);
  stmt.free();
  saveDatabase();
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
