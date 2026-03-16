-- =============================================
-- HABITHARBOR — COMPLETE DATABASE SCHEMA
-- Run this once in Supabase SQL Editor.
-- It is idempotent (safe to re-run).
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                   UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  name                 VARCHAR(255)  NOT NULL,
  email                VARCHAR(255)  UNIQUE NOT NULL,
  password             VARCHAR(255)  NOT NULL,
  phone                VARCHAR(20),
  avatar_url           TEXT,
  role                 VARCHAR(50)   DEFAULT 'user',
  reset_token          TEXT,
  reset_token_expires  TIMESTAMPTZ,
  preferences          JSONB         DEFAULT '{"theme": "dark", "accent": "violet"}',
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW()
);


-- ─── TASKS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  status       VARCHAR(50)  DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority     VARCHAR(50)  DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category     VARCHAR(100) DEFAULT 'personal',
  due_date     DATE,
  tags         TEXT[]       DEFAULT '{}',
  position     INTEGER      DEFAULT 0,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);


-- ─── EVENTS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  start_time        TIMESTAMPTZ  NOT NULL,
  end_time          TIMESTAMPTZ,
  color             VARCHAR(20)  DEFAULT '#8B5CF6',
  reminder_minutes  INTEGER      DEFAULT 30,
  is_all_day        BOOLEAN      DEFAULT FALSE,
  location          VARCHAR(500),
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);


-- ─── JOURNAL ENTRIES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL DEFAULT 'Untitled Entry',
  content     TEXT         DEFAULT '',
  entry_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
  mood        VARCHAR(100),
  tags        TEXT[]       DEFAULT '{}',
  is_private  BOOLEAN      DEFAULT TRUE,
  font_style  VARCHAR(50),
  bg_color    VARCHAR(20),
  image_url   TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);


-- ─── GOALS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS goals (
  id                    UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                 VARCHAR(500) NOT NULL,
  description           TEXT,
  category              VARCHAR(100) DEFAULT 'personal',
  status                VARCHAR(50)  DEFAULT 'active'
                          CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  target_date           DATE,
  target_value          NUMERIC      DEFAULT 100,
  current_value         NUMERIC      DEFAULT 0,
  unit                  VARCHAR(50)  DEFAULT '%',
  completion_percentage INTEGER      DEFAULT 0,
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);


-- ─── GOAL MILESTONES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS goal_milestones (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id       UUID         NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title         VARCHAR(500) NOT NULL,
  target_value  NUMERIC,
  completed     BOOLEAN      DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);


-- ─── HABITS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS habits (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  frequency       VARCHAR(50)  DEFAULT 'daily',
  target_count    INTEGER      DEFAULT 1,
  current_streak  INTEGER      DEFAULT 0,
  longest_streak  INTEGER      DEFAULT 0,
  color           VARCHAR(20)  DEFAULT '#8B5CF6',
  icon            VARCHAR(10)  DEFAULT '⭐',
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);


-- ─── HABIT LOGS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS habit_logs (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id  UUID        NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date  DATE        NOT NULL,
  count     INTEGER     DEFAULT 1,
  completed BOOLEAN     DEFAULT TRUE,
  notes     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, log_date)
);


-- ─── MOOD LOGS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mood_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_score  INTEGER     NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
  mood_label  VARCHAR(100),
  notes       TEXT,
  emotions    TEXT[]      DEFAULT '{}',
  log_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);


-- ─── FINANCE TRANSACTIONS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_transactions (
  id          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(10)    NOT NULL CHECK (type IN ('income', 'expense')),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category    VARCHAR(100)   DEFAULT 'Other',
  description TEXT           DEFAULT '',
  date        DATE           NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    DEFAULT NOW()
);


-- ─── FOCUS SESSIONS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS focus_sessions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  duration    INTEGER     NOT NULL,
  completed   BOOLEAN     DEFAULT FALSE,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ
);


-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tasks_user_id       ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date      ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_events_user_id      ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time   ON events(start_time);

CREATE INDEX IF NOT EXISTS idx_journal_user_id     ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_date        ON journal_entries(entry_date);

CREATE INDEX IF NOT EXISTS idx_goals_user_id       ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id  ON goal_milestones(goal_id);

CREATE INDEX IF NOT EXISTS idx_habits_user_id      ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date     ON habit_logs(log_date);

CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id   ON mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_date      ON mood_logs(log_date);

CREATE INDEX IF NOT EXISTS idx_finance_user_id     ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_date        ON finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_finance_type        ON finance_transactions(type);


-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Backend uses the SERVICE ROLE KEY so RLS policies are bypassed in practice.
-- RLS is still enabled as a security best practice.

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;


-- ─── TRIGGERS: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users
DROP TRIGGER IF EXISTS users_updated ON users;
CREATE TRIGGER users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tasks
DROP TRIGGER IF EXISTS tasks_updated ON tasks;
CREATE TRIGGER tasks_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Goals
DROP TRIGGER IF EXISTS goals_updated ON goals;
CREATE TRIGGER goals_updated
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Goal Milestones
DROP TRIGGER IF EXISTS goal_milestones_updated ON goal_milestones;
CREATE TRIGGER goal_milestones_updated
  BEFORE UPDATE ON goal_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Journal Entries
DROP TRIGGER IF EXISTS journal_entries_updated ON journal_entries;
CREATE TRIGGER journal_entries_updated
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Habits
DROP TRIGGER IF EXISTS habits_updated ON habits;
CREATE TRIGGER habits_updated
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mood Logs
DROP TRIGGER IF EXISTS mood_logs_updated ON mood_logs;
CREATE TRIGGER mood_logs_updated
  BEFORE UPDATE ON mood_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Finance Transactions
DROP TRIGGER IF EXISTS finance_updated ON finance_transactions;
CREATE TRIGGER finance_updated
  BEFORE UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── ADMIN SETUP ──────────────────────────────────────────────────────────────
-- After running this schema, promote yourself to admin:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
