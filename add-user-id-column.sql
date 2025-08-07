-- Dodanie kolumny user_id do tabeli chatgpt_responses
ALTER TABLE chatgpt_responses 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Dodanie indeksu dla lepszej wydajności
CREATE INDEX idx_chatgpt_responses_user_id ON chatgpt_responses(user_id);

-- Aktualizacja RLS (Row Level Security) dla nowej kolumny
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

-- Naprawienie tabeli test_summary - dodanie klucza unikalnego
ALTER TABLE test_summary 
ADD CONSTRAINT test_summary_user_id_test_id_key UNIQUE (user_id, test_id);

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
