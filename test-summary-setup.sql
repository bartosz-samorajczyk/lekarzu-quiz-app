-- ===== UTWORZENIE TABELI test_summary =====
CREATE TABLE IF NOT EXISTS test_summary (
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

-- Usuń stare polityki jeśli istnieją
DROP POLICY IF EXISTS "Users can view their own test summaries" ON test_summary;
DROP POLICY IF EXISTS "Users can insert their own test summaries" ON test_summary;
DROP POLICY IF EXISTS "Users can update their own test summaries" ON test_summary;

-- Utwórz nowe polityki
CREATE POLICY "Users can view their own test summaries" ON test_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test summaries" ON test_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test summaries" ON test_summary
  FOR UPDATE USING (auth.uid() = user_id);

-- ===== DODANIE DANYCH TESTOWYCH =====
-- Zastąp 'YOUR_USER_ID' swoim rzeczywistym user_id z Supabase
-- Możesz go znaleźć w Authentication > Users

-- Przykładowe dane dla testu updated-new
INSERT INTO test_summary (user_id, test_id, total_attempts, correct_answers, accuracy_percentage, last_attempt)
VALUES 
  ('2634c998-e87c-4ef3-b17b-575468ff5a52', 'updated-new', 5, 3, 60, NOW()),
  ('2634c998-e87c-4ef3-b17b-575468ff5a52', '2024-june', 2, 1, 50, NOW()),
  ('2634c998-e87c-4ef3-b17b-575468ff5a52', '2020-2nd', 3, 2, 67, NOW())
ON CONFLICT (user_id, test_id) 
DO UPDATE SET 
  total_attempts = EXCLUDED.total_attempts,
  correct_answers = EXCLUDED.correct_answers,
  accuracy_percentage = EXCLUDED.accuracy_percentage,
  last_attempt = EXCLUDED.last_attempt;
