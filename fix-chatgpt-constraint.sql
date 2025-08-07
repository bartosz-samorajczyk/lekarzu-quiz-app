-- Dodanie unikalnego ograniczenia dla chatgpt_responses
-- To rozwiąże błąd "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- Sprawdź czy ograniczenie już istnieje
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chatgpt_responses_user_id_question_id_key'
    ) THEN
        -- Dodaj unikalne ograniczenie
        ALTER TABLE chatgpt_responses 
        ADD CONSTRAINT chatgpt_responses_user_id_question_id_key 
        UNIQUE (user_id, question_id);
        
        RAISE NOTICE 'Dodano unikalne ograniczenie chatgpt_responses_user_id_question_id_key';
    ELSE
        RAISE NOTICE 'Ograniczenie chatgpt_responses_user_id_question_id_key już istnieje';
    END IF;
END $$;

-- Sprawdź czy RLS jest włączone
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chatgpt_responses';

-- Sprawdź polityki RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'chatgpt_responses';
