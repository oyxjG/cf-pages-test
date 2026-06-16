CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nick_name TEXT,
  phone TEXT,
  email TEXT,
  is_delete INTEGER DEFAULT 0, -- 0-未删除 1-已删除
  status INTEGER DEFAULT 0,    -- 0-正常 1-停用
  avatar TEXT,
  role TEXT DEFAULT 'user',
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT DEFAULT '管理员',
  content TEXT NOT NULL,
  status TEXT DEFAULT 'published',
  created_at INTEGER
);

