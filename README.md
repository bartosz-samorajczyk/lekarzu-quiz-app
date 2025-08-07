# Lekarzu Quiz App

Aplikacja do nauki do egzaminu LEK/LDEK dla Gosi.

## 🚀 Szybki start

```bash
# Uruchom aplikację
npm start

# Otwórz w przeglądarce
http://localhost:8001
```

## 📝 Tłumaczenie pytań

### 1. Ustaw klucz API OpenAI

```bash
export OPENAI_API_KEY="twój-klucz-api"
```

### 2. Uruchom tłumaczenie

```bash
# Tłumacz wszystkie pytania (partie po 50)
npm run translate

# Lub tłumacz mniejszymi partiami (25 pytań)
npm run translate-batch
```

### 3. Jak to działa

- **Partie**: Pytania są tłumaczone w partiach po 50 (lub 25) sztuk
- **Cache**: Tłumaczenia są zapisywane w `data/translations.json`
- **Pauzy**: 5 sekund między partiami (żeby nie przekroczyć limitów API)
- **Retry**: Automatyczne ponowne próby przy błędach
- **Progress**: Pokazuje postęp tłumaczenia

### 4. Format tłumaczeń

```json
{
  "0": {
    "question_pl": "36-letni mężczyzna tymczasowo zdiagnozowany z gruźlicą nerkową...",
    "answers_pl": [
      "A. Zaszczepienie zwierząt laboratoryjnych",
      "B. Serologiczna identyfikacja czynnika sprawczego",
      "C. Badanie toksyczności",
      "D. Typowanie fagowe uzyskanej hodowli",
      "E. Test skórny alergiczny"
    ],
    "answers_lat": [
      "A. Inoculatio animalium laboratoriorum",
      "B. Identificatio serologica agentis causalis",
      "C. Testatio toxigenicitatis",
      "D. Typing phage culturae obtentae",
      "E. Test cutaneus allergiae"
    ]
  }
}
```

## 🎯 Funkcje aplikacji

- ✅ **Losowe pytanie startowe** - za każdym razem inne pytanie
- ✅ **Tłumaczenia automatyczne** - polskie + łacińskie
- ✅ **ChatGPT integration** - bez API key (copy/paste)
- ✅ **Progress tracking** - localStorage
- ✅ **Priority system** - ważne pytania
- ✅ **Responsive design** - mobile + desktop

## 📊 Statystyki

- **Pytania**: ~3000-5000
- **Testy**: 28 (2006-2024)
- **Tłumaczenia**: Automatyczne przez ChatGPT
- **Cache**: localStorage + pliki JSON

## 🔧 Technologie

- **Frontend**: Vanilla JavaScript ES6+
- **Styling**: CSS3
- **Data**: JSON
- **Translation**: OpenAI GPT-4
- **Server**: Python HTTP Server

## 📁 Struktura

```
/lekarzu-quiz-app
├── app.js              # Główna logika
├── index.html          # Entry point
├── styles.css          # Style
├── translate-questions.js  # Skrypt tłumaczeń
├── data/
│   ├── questions-db.js     # Baza pytań
│   ├── translations.json   # Tłumaczenia (generowane)
│   └── tests/              # Pliki testów
└── package.json
```

## 🎮 Workflow nauki

1. **Widzi pytanie** (po angielsku)
2. **Widzi opcje** (A, B, C, D, E)
3. **Kliknie opcję** → zielone/czerwone
4. **"Przetłumacz odpowiedzi"** → polskie + łacińskie
5. **"Zapytaj ChatGPT"** → pełne wyjaśnienie
6. **"Nauczyłam się"** → następne pytanie

## 💡 Tips

- **Tłumaczenia**: Uruchom `npm run translate` raz, potem będą dostępne offline
- **ChatGPT**: Użyj copy/paste - nie potrzebujesz API key
- **Progress**: Automatycznie zapisuje się w przeglądarce
- **Mobile**: Responsive design, ale głównie dla desktop

## 🚫 Ograniczenia

- Tłumaczenia wymagają OpenAI API key
- ChatGPT integration przez copy/paste (nie iframe)
- Brak backend - wszystko w localStorage
- Tylko pytania angielskie (jak na egzaminie)

## 🎯 Cel

Pomóc Gosi zdać egzamin LEK/LDEK! 🏥📚 