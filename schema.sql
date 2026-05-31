CREATE TABLE IF NOT EXISTS wrong_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  last_user_answer TEXT,
  correct_answer TEXT,
  wrong_count INTEGER NOT NULL DEFAULT 1,
  mastered INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_wrong_questions_user
ON wrong_questions(user_id);

CREATE INDEX IF NOT EXISTS idx_wrong_questions_user_mastered
ON wrong_questions(user_id, mastered);
