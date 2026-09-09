-- 初始化应用数据库 schema。
-- 所有语句均为幂等（IF NOT EXISTS），保证旧库（由旧版内联 DDL 创建）重复执行安全。
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  api_base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  api_mode TEXT NOT NULL DEFAULT 'responses',
  model TEXT NOT NULL DEFAULT 'gpt-5.4',
  target_language TEXT NOT NULL DEFAULT 'Chinese',
  smart_target_language INTEGER NOT NULL DEFAULT 1,
  shortcut TEXT NOT NULL DEFAULT 'Alt + `',
  shortcut_enabled INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'system',
  font_scale REAL NOT NULL DEFAULT 1.0,
  startup INTEGER NOT NULL DEFAULT 0,
  auto_copy INTEGER NOT NULL DEFAULT 1,
  api_key_ciphertext TEXT,
  api_key_nonce TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS translation_history (
  id TEXT PRIMARY KEY,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_translation_history_created_at
  ON translation_history(created_at DESC);
