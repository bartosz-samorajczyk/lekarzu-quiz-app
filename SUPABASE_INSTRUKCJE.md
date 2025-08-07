# 🚀 Instrukcja konfiguracji Supabase

## **KROK 1: Skonfiguruj tabelę w Supabase**

1. **Zaloguj się** na https://supabase.com
2. **Wybierz projekt:** `lekarzu-quiz-app`
3. **Idź do:** "Table Editor" (lewy panel)
4. **Kliknij:** "New table"
5. **Wypełnij:**
   - Name: `chatgpt_responses`
   - **ZAZNACZ:** "Enable Row Level Security (RLS)"
6. **Dodaj kolumny:**
   ```
   id: uuid (Primary Key, auto-generate)
   question_id: text (not null)
   response: text (not null)
   created_at: timestamp (default: now())
   updated_at: timestamp (default: now())
   ```
7. **Kliknij:** "Save"

---

## **KROK 2: Pobierz klucze API**

1. **W Supabase idź do:** "Settings" → "API"
2. **Skopiuj:**
   - **Project URL** (wygląda jak: `https://xxx.supabase.co`)
   - **anon public key** (wygląda jak: `eyJ...`)

---

## **KROK 3: Zaktualizuj kod aplikacji**

**W pliku `app.js` znajdź linię 25-30 i zastąp:**

```javascript
// Konfiguracja Supabase
this.supabaseConfig = {
  url: 'https://YOUR_PROJECT_ID.supabase.co', // ZASTĄP swoim URL
  key: 'YOUR_ANON_KEY', // ZASTĄP swoim kluczem
  enabled: true
};
```

**Twoje rzeczywiste wartości:**
- URL: `https://lekarzu-quiz-app.supabase.co` (lub podobny)
- Key: `eyJ...` (twój anon key z Supabase)

---

## **KROK 4: Wgraj zmiany na GitHub**

```bash
git add .
git commit -m "Dodano integrację z Supabase"
git push
```

---

## **KROK 5: Sprawdź działanie**

1. **Otwórz aplikację** na Vercel
2. **Kliknij:** "💾 Zapisz odpowiedź ChatGPT"
3. **Wklej odpowiedź** z ChatGPT
4. **Kliknij:** "💾 Zapisz"
5. **Powinieneś zobaczyć:** "✅ Odpowiedź zapisana w chmurze! Dostępna dla wszystkich użytkowników."

---

## **✅ GOTOWE!**

Teraz wszystkie odpowiedzi ChatGPT będą zapisywane w Supabase i dostępne dla wszystkich użytkowników aplikacji!

**Korzyści:**
- ☁️ Wspólna baza dla wszystkich użytkowników
- 💾 Automatyczny fallback do localStorage
- 🔒 Bezpieczne (anon key)
- 🆓 Darmowe (do 500MB)
- ⚡ Szybkie
