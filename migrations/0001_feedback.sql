CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY,
  pain_point TEXT NOT NULL CHECK (length(pain_point) BETWEEN 10 AND 2000),
  search_query TEXT NOT NULL DEFAULT '' CHECK (length(search_query) <= 200),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'zh')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS feedback_status_id ON feedback (status, id DESC);
