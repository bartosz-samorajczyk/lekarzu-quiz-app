-- ===== TABELA DLA PODSUMOWANIA TESTÓW =====
CREATE TABLE test_summary (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  accuracy_percentage INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, test_id)
);

-- RLS dla test_summary
ALTER TABLE test_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test summaries" ON test_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test summaries" ON test_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test summaries" ON test_summary
  FOR UPDATE USING (auth.uid() = user_id);

-- ===== TABELA DLA ODPOWIEDZI UŻYTKOWNIKÓW =====
CREATE TABLE user_answers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id, test_id)
);

-- RLS dla user_answers
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own answers" ON user_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own answers" ON user_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers" ON user_answers
  FOR UPDATE USING (auth.uid() = user_id);

-- ===== TABELA DLA POSTĘPU NAUKI =====
CREATE TABLE study_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  studied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id, test_id)
);

-- RLS dla study_progress
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own study progress" ON study_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study progress" ON study_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study progress" ON study_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- ===== TABELA DLA STATYSTYK TESTÓW =====
CREATE TABLE test_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, test_id)
);

-- RLS dla test_stats
ALTER TABLE test_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test stats" ON test_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test stats" ON test_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test stats" ON test_stats
  FOR UPDATE USING (auth.uid() = user_id);
