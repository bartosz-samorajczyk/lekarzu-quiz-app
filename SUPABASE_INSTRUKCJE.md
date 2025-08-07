# 🚀 Instrukcja konfiguracji Supabase

## **KROK 1: Utwórz tabele w Supabase**

1. **Zaloguj się** na https://supabase.com
2. **Wybierz projekt:** `lekarzu-quiz-app`
3. **Idź do:** "SQL Editor" (lewy panel)
4. **Kliknij:** "New query"
5. **Wklej kod z pliku `supabase-tables.sql`**
6. **Kliknij:** "Run"

**To utworzy wszystkie potrzebne tabele:**
- `user_answers` - odpowiedzi użytkowników
- `study_progress` - postęp nauki
- `test_stats` - statystyki testów
- `test_summary` - cache statystyk
- `chatgpt_responses` - odpowiedzi ChatGPT

---

## **KROK 2: Dodaj dane testowe (opcjonalnie)**

1. **W SQL Editor wklej kod z `test-summary-setup.sql`**
2. **Zastąp `YOUR_USER_ID` swoim user_id**
3. **Kliknij:** "Run"

**To doda przykładowe statystyki dla testów.**

---

## **KROK 3: Sprawdź konfigurację**

**W pliku `app.js` sprawdź czy masz:**

```javascript
// Konfiguracja Supabase
this.supabaseConfig = {
  url: 'https://jxjapiimjkoubdbsfeid.supabase.co',
  key: 'twój-klucz-here',
  enabled: true
};
```

**Klucze znajdziesz w:** Settings → API

---

## **KROK 4: Sprawdź działanie**

1. **Otwórz aplikację** na Vercel
2. **Zaloguj się** przez Google
3. **Wybierz test** i odpowiedz na pytanie
4. **Sprawdź czy statystyki się aktualizują**

---

## **✅ GOTOWE!**

**Teraz aplikacja ma:**
- ☁️ **Cloud storage** - wszystkie dane w Supabase
- 🔐 **Authentication** - Google OAuth
- 📊 **Progress tracking** - statystyki i postęp
- 🤖 **ChatGPT cache** - wspólna baza odpowiedzi
- ⚡ **Performance** - lazy loading i cache

**Korzyści:**
- 🆓 Darmowe (do 500MB)
- 🔒 Bezpieczne (RLS)
- ⚡ Szybkie
- 📱 Multi-device