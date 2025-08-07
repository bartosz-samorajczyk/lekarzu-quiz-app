# 🏥 Lekarzu Quiz App

**Aplikacja do przyspieszenia nauki do egzaminu LEK/LDEK**

## 🎯 Cel aplikacji

**Przyspieszyć proces nauki** poprzez:
- **Szybki dostęp** do 4789 pytań z egzaminów LEK/LDEK
- **Flow nauki** - pytanie → odpowiedź → wyjaśnienie
- **ChatGPT integration** - gotowe prompty do kopiowania
- **Progress tracking** - śledzenie postępów

## 🚀 Jak to działa

### 📚 **Workflow nauki:**
1. **Wybierz test** (nowe testy pierwsze)
2. **Zobacz pytanie** po angielsku (jak na egzaminie)
3. **Wybierz odpowiedź** (A, B, C, D, E)
4. **Zobacz wynik** (zielone/czerwone)
5. **Skopiuj prompt** do ChatGPT (przycisk "Zapytaj ChatGPT")
6. **Wklej w ChatGPT** i otrzymaj wyjaśnienie
7. **Następne pytanie** → powtórz

### 🤖 **ChatGPT Integration:**
- **Bez API key** - używaj ChatGPT Plus ($20/miesiąc)
- **Gotowe prompty** - automatycznie generowane
- **Copy/paste** - skopiuj prompt, wklej w ChatGPT
- **Cloud cache** - odpowiedzi zapisywane w Supabase
- **Wspólna baza** - dla wszystkich użytkowników

## 📊 Zawartość

- **4789 pytań** z 28 testów (2005-2024)
- **Angielski first** - pytania po angielsku (jak na egzaminie)
- **Losowa kolejność** - pytania w teście mieszane
- **Progress tracking** - statystyki sesji i historii

## 🔧 Technologie

- **Frontend:** Vanilla JavaScript ES6+
- **Backend:** Supabase (PostgreSQL, Auth)
- **Authentication:** Google OAuth
- **Deployment:** Vercel
- **Styling:** Apple-style minimalism

## 🚀 Szybki start

```bash
# Uruchom lokalnie
npm start

# Otwórz w przeglądarce
http://localhost:8001
```

## 🌐 Live demo

**https://lekarzu-quiz-app.vercel.app**

## 📁 Struktura projektu

```
/lekarzu-quiz-app
├── app.js                    # Główna logika
├── index.html               # Entry point
├── styles.css               # Apple-style design
├── manifest.json            # PWA config
├── data/
│   ├── questions-db.js      # Baza pytań (5.2MB)
│   └── tests/               # 28 plików testów
└── assets/
    ├── lekarzu-quiz-app-logo.png
    └── favicon + icons
```

## 🎯 Dla kogo?

**Gosia** - studentka medycyny przygotowująca się do egzaminu LEK/LDEK

## 💡 Kluczowe zalety

- ⚡ **Szybkość** - błyskawiczny dostęp do pytań
- 🎯 **Flow** - nieprzerwany proces nauki
- 🤖 **ChatGPT** - gotowe prompty do kopiowania
- 📊 **Progress** - śledzenie postępów
- ☁️ **Cloud** - dostęp z każdego urządzenia
- 🆓 **Darmowe** - bez dodatkowych kosztów API

---

**🎯 Cel: Zdać egzamin LEK/LDEK!** 