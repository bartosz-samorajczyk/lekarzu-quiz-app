-- Aktualizacja RLS dla test_summary
ALTER TABLE test_summary ENABLE ROW LEVEL SECURITY;

-- Polityka RLS - użytkownicy mogą widzieć tylko swoje statystyki
DROP POLICY IF EXISTS "Users can view their own test summary" ON test_summary;
CREATE POLICY "Users can view their own test summary" ON test_summary
    FOR SELECT USING (auth.uid() = user_id);

-- Polityka RLS - użytkownicy mogą dodawać/aktualizować tylko swoje statystyki
DROP POLICY IF EXISTS "Users can insert their own test summary" ON test_summary;
CREATE POLICY "Users can insert their own test summary" ON test_summary
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own test summary" ON test_summary;
CREATE POLICY "Users can update their own test summary" ON test_summary
    FOR UPDATE USING (auth.uid() = user_id);

-- Polityka RLS - użytkownicy mogą usuwać tylko swoje statystyki
DROP POLICY IF EXISTS "Users can delete their own test summary" ON test_summary;
CREATE POLICY "Users can delete their own test summary" ON test_summary
    FOR DELETE USING (auth.uid() = user_id);

-- Aktualizacja RLS dla chatgpt_responses (jeśli nie jest włączone)
ALTER TABLE chatgpt_responses ENABLE ROW LEVEL SECURITY;

-- Polityka RLS - użytkownicy mogą widzieć tylko swoje odpowiedzi
DROP POLICY IF EXISTS "Users can view their own chatgpt responses" ON chatgpt_responses;
CREATE POLICY "Users can view their own chatgpt responses" ON chatgpt_responses
    FOR SELECT USING (auth.uid() = user_id);

-- Polityka RLS - użytkownicy mogą dodawać/aktualizować tylko swoje odpowiedzi
DROP POLICY IF EXISTS "Users can insert their own chatgpt responses" ON chatgpt_responses;
CREATE POLICY "Users can insert their own chatgpt responses" ON chatgpt_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chatgpt responses" ON chatgpt_responses;
CREATE POLICY "Users can update their own chatgpt responses" ON chatgpt_responses
    FOR UPDATE USING (auth.uid() = user_id);

-- Polityka RLS - użytkownicy mogą usuwać tylko swoje odpowiedzi
DROP POLICY IF EXISTS "Users can delete their own chatgpt responses" ON chatgpt_responses;
CREATE POLICY "Users can delete their own chatgpt responses" ON chatgpt_responses
    FOR DELETE USING (auth.uid() = user_id);
