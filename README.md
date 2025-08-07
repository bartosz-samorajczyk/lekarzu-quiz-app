# 🏥 Lekarzu Quiz App

**Profesjonalna aplikacja do nauki do egzaminu LEK/LDEK**

## 🚀 Szybki start

```bash
# Uruchom aplikację
npm start

# Otwórz w przeglądarce
http://localhost:8001
```

## 🎯 Funkcje aplikacji

### ✅ **Główne funkcje:**
- **4789 pytań** z 28 testów (2005-2024)
- **Angielski first** - pytania po angielsku (jak na egzaminie)
- **Polskie tłumaczenia** - na żądanie z ChatGPT
- **Wybór testów** - nowe testy pierwsze
- **Losowa kolejność** - pytania w teście mieszane
- **Progress tracking** - statystyki sesji i historii

### ✅ **ChatGPT Integration:**
- **Bez API key** - copy/paste z ChatGPT Plus
- **Cloud storage** - odpowiedzi w Supabase
- **Cache system** - szybkie ładowanie
- **Wspólna baza** - dla wszystkich użytkowników

### ✅ **User Experience:**
- **Google OAuth** - bezpieczne logowanie
- **Apple-style design** - minimalistyczny, nowoczesny
- **Responsive** - mobile + desktop
- **PWA ready** - instalacja na urządzeniach
- **Performance optimized** - lazy loading

## 📊 Statystyki

- **Pytania**: 4789
- **Testy**: 28 (2005-2024)
- **Użytkownicy**: Cloud authentication
- **Storage**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## 🔧 Technologie

- **Frontend**: Vanilla JavaScript ES6+
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Styling**: CSS3 (Apple-style)
- **Deployment**: Vercel + GitHub
- **Authentication**: Google OAuth

## 📁 Struktura projektu

```
/lekarzu-quiz-app
├── app.js                    # Główna logika aplikacji
├── index.html               # Entry point
├── styles.css               # Style (Apple-style)
├── manifest.json            # PWA config
├── supabase-tables.sql      # Schemat bazy danych
├── test-summary-setup.sql   # Setup tabeli cache
├── data/
│   ├── questions-db.js      # Baza pytań (5.2MB)
│   ├── questions-analyzed.json # Metadane
│   └── tests/               # 28 plików testów
└── assets/
    ├── lekarzu-quiz-app-logo.png
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    └── android-chrome-192x192.png
```

## 🚀 Deployment

Aplikacja jest wdrożona na **Vercel** i dostępna pod adresem:
**https://lekarzu-quiz-app.vercel.app**

## 👥 Dla kogo?

**Gosia** - studentka medycyny przygotowująca się do egzaminu LEK/LDEK

## 📝 Licencja

MIT License - projekt edukacyjny

---

**🎯 Cel: Zdać egzamin LEK/LDEK!** 