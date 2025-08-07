-- Tabela: Historia odpowiedzi użytkowników
CREATE TABLE user_answers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  selected_answer INTEGER NOT NULL, -- 0,1,2,3
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id, test_id)
);

-- Tabela: Postęp nauki (oznaczone jako przestudiowane)
CREATE TABLE study_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  is_studied BOOLEAN DEFAULT true,
  studied_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id, test_id)
);

-- Tabela: Statystyki testów
CREATE TABLE test_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  last_attempted TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, test_id)
);

-- Włącz RLS (Row Level Security)
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_stats ENABLE ROW LEVEL SECURITY;

-- Polityki bezpieczeństwa - użytkownik widzi tylko swoje dane
CREATE POLICY "Users can view own answers" ON user_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers" ON user_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers" ON user_answers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own study progress" ON study_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study progress" ON study_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study progress" ON study_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own test stats" ON test_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test stats" ON test_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test stats" ON test_stats
  FOR UPDATE USING (auth.uid() = user_id);
