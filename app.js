// app.js - Główna aplikacja Medical Quiz
import { questionDB, dbMetadata } from './data/questions-db.js';

class MedicalQuizApp {
  constructor() {
    console.log('=== KONSTRUKTOR START ===');
    console.log('questionDB:', questionDB);
    console.log('dbMetadata:', dbMetadata);
    
    this.questions = questionDB.questions;
    console.log('this.questions:', this.questions);
    console.log('Liczba pytań:', this.questions.length);
    
    this.currentQuestion = null;
    this.currentIndex = 0;
    this.userProgress = this.loadProgress();
    this.currentMode = 'test-selection'; // Zmienione: domyślnie wybór testu
    this.isAnswerShown = false;
    this.sessionStats = {
      correct: 0,
      incorrect: 0,
      total: 0,
      accuracy: 0,
      startTime: Date.now()
    };
    
    // Nowe: informacje o aktualnym teście
    this.currentTest = null;
    this.testQuestions = [];
    this.testQuestionOrder = []; // Losowa kolejność pytań w teście
    
    // Konfiguracja Supabase
    this.supabaseConfig = {
      url: 'https://jxjapiimjkoubdbsfeid.supabase.co', // ZASTĄP swoim URL
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4amFwaWltamtvdWJkYnNmZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NjYyNzYsImV4cCI6MjA3MDE0MjI3Nn0.k2XHIEljXDcJIUH215xcb8t2aicZsCVMCGmgpW4L6DE', // ZASTĄP swoim kluczem
      enabled: true
    };

    // Tymczasowo wyłączamy chmurę - localStorage + eksport/import
    this.cloudConfig = {
      enabled: false,
      fallbackToLocal: true
    };


    console.log('=== KONSTRUKTOR END ===');
    this.init();
  }
  
  async init() {
    console.log('Inicjalizacja aplikacji...');
    
    // Załaduj pytania z questionDB (ES6 modules)
    this.questions = window.questionDB?.questions || [];
    console.log(`Załadowano ${this.questions.length} pytań`);
    
    // Jeśli nie ma pytań, spróbuj załadować z localStorage
    if (this.questions.length === 0) {
      console.log('Brak pytań w questionDB, próbuję localStorage...');
      const cachedQuestions = localStorage.getItem('questions');
      if (cachedQuestions) {
        this.questions = JSON.parse(cachedQuestions);
        console.log(`Załaduj z cache: ${this.questions.length} pytań`);
      }
    }
    
    // Jeśli nadal nie ma pytań, stwórz testowe pytanie
    if (this.questions.length === 0) {
      console.log('Tworzę testowe pytanie...');
      this.questions = [{
        id: 'test-1',
        question: 'Test question: What is the capital of Poland?',
        answers: [
          { text: 'A. Warsaw', isCorrect: true },
          { text: 'B. Krakow', isCorrect: false },
          { text: 'C. Gdansk', isCorrect: false },
          { text: 'D. Poznan', isCorrect: false }
        ],
        priority: 1
      }];
      console.log(`Utworzono testowe pytanie`);
    }
    
    // Załaduj postęp użytkownika
    this.loadProgress();
    
    // Stwórz UI
    this.createUI();
    this.bindEvents();
    
    // Inicjalizuj Supabase
    this.initSupabase().then(success => {
      if (success) {
        console.log('✅ Supabase gotowe');
      } else {
        console.log('📱 Używamy localStorage (Supabase niedostępne)');
      }
    });
    
    // Wyświetl odpowiedni widok
    if (this.currentMode === 'test-selection') {
      this.showTestSelection();
    } else {
      await this.displayQuestion();
      this.updateStats();
      this.updateGlobalStats();
    }
  }

  createUI() {
    console.log('Tworzę UI...');
    const app = document.getElementById('app');
    if (!app) {
      console.error('Nie znaleziono elementu #app');
      return;
    }
    console.log('Element #app znaleziony, tworzę HTML...');
    app.innerHTML = `
      <div class="container">
        <!-- Header -->
        <header class="header">
          <div class="fancy-banner">
            <div class="banner-icon">🏥</div>
            <div class="banner-content">
              <h1 class="banner-title">Lekarzu Quiz App</h1>
              <p class="banner-subtitle">Profesjonalna nauka do egzaminu LEK/LDEK</p>
            </div>
            <div class="banner-decoration">
              <div class="decoration-dot"></div>
              <div class="decoration-dot"></div>
              <div class="decoration-dot"></div>
            </div>
          </div>
          <div class="header-stats">
            <div class="stat-item">
              <span class="stat-label">Odpowiedzi</span>
              <span class="stat-value" id="progress-stat">0/${this.questions.length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Dokładność</span>
              <span class="stat-value" id="session-stat">0%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Czas</span>
              <span class="stat-value" id="time-stat">0:00</span>
            </div>
          </div>
        </header>
        
        <!-- Main Card -->
        <div class="main-card">
          <div class="question-header">
            <span class="question-number" id="question-number">#1</span>
            <div class="question-badges" id="question-badges"></div>
          </div>
          
          <div class="question-content" id="question-content">
            <p class="question-text" id="question-text"></p>
          </div>
          
          <div class="answer-section hidden" id="answer-section">
            <div class="divider"></div>
            <h3>Odpowiedź:</h3>
            <div class="answer-content" id="answer-content"></div>
          </div>
        </div>
        
        <!-- Controls -->
        <div class="controls">
          <button class="btn btn-secondary" id="prev-btn">
            ← Poprzednie
          </button>
          <button class="btn btn-primary hidden" id="show-answer-btn">
            👁️ Pokaż odpowiedź
          </button>
          <button class="btn btn-success hidden" id="mark-studied-btn">
            → Następne pytanie
          </button>
          <button class="btn btn-secondary" id="next-btn">
            Następne →
          </button>
          <button class="btn btn-ai" id="ask-gpt-btn">
            🤖 Zapytaj ChatGPT
          </button>
          <button class="btn btn-success" id="save-gpt-btn">
            💾 Zapisz odpowiedź ChatGPT
          </button>
        </div>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button class="btn-icon" id="back-to-tests-btn" title="Powrót do wyboru testów">🏠</button>
        </div>
      </div>
    `;
  }
  
  loadProgress() {
    const saved = localStorage.getItem('medical_quiz_progress');
    if (saved) {
      return JSON.parse(saved);
    }
    
    const progress = {};
    this.questions.forEach(q => {
      progress[q.id] = {
        seen: 0,
        studied: 0,
        lastSeen: null,
        difficulty: 0, // 0-1, gdzie 1 = bardzo trudne
        lastResult: null,
        avgResult: null,
        results: []
      };
    });
    return progress;
  }
  
  saveProgress() {
    localStorage.setItem('medical_quiz_progress', JSON.stringify(this.userProgress));
  }
  
  loadNextQuestion() {
    this.currentQuestion = this.questions[this.currentIndex];
    this.isAnswerShown = false;
    this.displayQuestion();
  }
  
  async displayQuestion() {
    console.log('=== DISPLAY QUESTION START ===');
    console.log('currentIndex:', this.currentIndex);
    
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    if (!q) {
      console.error('Brak pytania dla indeksu:', questionIndex);
      return;
    }
    console.log('Pytanie znalezione:', q.question.substring(0, 100) + '...');
    console.log('=== DISPLAY QUESTION - PRZED INICJALIZACJĄ PROGRESS ===');
    
    // Inicjalizuj progress dla nowego pytania
    console.log('=== DISPLAY QUESTION - INICJALIZACJA PROGRESS ===');
    if (!this.userProgress[q.id]) {
      console.log('Tworzę nowy progress dla pytania:', q.id);
      this.userProgress[q.id] = {
        seen: 0,
        studied: 0,
        lastResult: null,
        avgResult: '0%',
        results: []
      };
    }
    console.log('=== DISPLAY QUESTION - PO INICJALIZACJI PROGRESS ===');
    
    // Inicjalizuj progress dla nowego pytania
    if (!this.userProgress[q.id]) {
      this.userProgress[q.id] = {
        seen: 0,
        studied: 0,
        lastResult: null,
        avgResult: '0%',
        results: []
      };
    }
    
    // Zaktualizuj lastSeen
    this.userProgress[q.id].lastSeen = Date.now();
    this.userProgress[q.id].seen++;
    this.saveProgress();
    
    // Display question
    console.log('Próbuję znaleźć element question-text...');
    const questionTextElement = document.getElementById('question-text');
    console.log('Element question-text:', questionTextElement);
    if (questionTextElement) {
      questionTextElement.textContent = q.question;
      console.log('Pytanie zostało ustawione:', q.question);
    } else {
      console.error('Element question-text nie istnieje!');
      console.log('Dostępne elementy w question-content:', document.getElementById('question-content')?.innerHTML);
    }
    
    // Display question number
    const questionNumberElement = document.getElementById('question-number');
    if (questionNumberElement) {
      questionNumberElement.textContent = `#${this.currentIndex + 1}`;
    }
    
    // Display badges
    const badgesContainer = document.getElementById('question-badges');
    if (badgesContainer) {
      const progress = this.userProgress[q.id];
      const testInfo = this.currentTest ? `<span class="badge test">Test: ${this.currentTest}</span>` : '';
      const historicalInfo = progress.historicalAccuracy !== undefined ? 
        `<span class="badge historical">Historia: ${progress.historicalAccuracy}%</span>` : '';
      const sessionInfo = progress.sessionAccuracy !== undefined ? 
        `<span class="badge session">Dziś: ${progress.sessionAccuracy}%</span>` : '';
      const seenInfo = progress.historicalAnswers && progress.historicalAnswers.length > 0 ? 
        `<span class="badge seen">Widziane: ${progress.historicalAnswers.length}x</span>` : '';
      
      badgesContainer.innerHTML = `
        ${testInfo}
        ${historicalInfo}
        ${sessionInfo}
        ${seenInfo}
      `;
    }
    
    // Display answer options immediately
    const answers = this.getAnswerOptions(q);
    this.displayAnswerOptions(answers);
    
    // Hide sections by default
    console.log('=== SPRAWDZANIE ELEMENTÓW DOM ===');
    const answerSection = document.getElementById('answer-section');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const markStudiedBtn = document.getElementById('mark-studied-btn');
    
    console.log('answerSection:', answerSection);
    console.log('showAnswerBtn:', showAnswerBtn);
    console.log('markStudiedBtn:', markStudiedBtn);
    
    if (answerSection) answerSection.classList.add('hidden');
    if (showAnswerBtn) showAnswerBtn.classList.add('hidden');
    if (markStudiedBtn) markStudiedBtn.classList.add('hidden');
    
    // Reset answer shown state
    this.isAnswerShown = false;
    
    // Sprawdź czy jest zapisana odpowiedź ChatGPT (z Supabase lub localStorage)
    await this.loadChatGPTResponse(q.id);
    
    // Zaktualizuj widoczność przycisków ChatGPT
    const askGptBtn = document.getElementById('ask-gpt-btn');
    const saveGptBtn = document.getElementById('save-gpt-btn');
    
    if (askGptBtn && saveGptBtn) {
      const hasChatGPTResponse = document.getElementById('chatgpt-response-section') && 
        !document.getElementById('chatgpt-response-section').classList.contains('hidden');
      
      if (hasChatGPTResponse) {
        // Jeśli jest odpowiedź - pokaż tylko "Edytuj"
        askGptBtn.textContent = '✏️ Edytuj odpowiedź ChatGPT';
        askGptBtn.className = 'btn btn-success';
        saveGptBtn.style.display = 'none';
      } else {
        // Jeśli nie ma odpowiedzi - pokaż oba przyciski
        askGptBtn.textContent = '🤖 Zapytaj ChatGPT';
        askGptBtn.className = 'btn btn-ai';
        saveGptBtn.style.display = 'inline-block';
      }
    }
    
    // Update stats
    this.updateStats();
  }
  
  getAnswerOptions(question) {
    // Jeśli pytanie ma answers, użyj ich
    if (question.answers && question.answers.length > 0) {
      console.log('Używam answers z pytania:', question.answers);
      return question.answers;
    }
    
    // Jeśli ma answer_en, stwórz opcję
    if (question.answer_en) {
      console.log('Tworzę opcję z answer_en:', question.answer_en);
      return [{
        text: question.answer_en,
        isCorrect: true
      }];
    }
    
    // Jeśli nie ma żadnej odpowiedzi, stwórz domyślne opcje na podstawie pytania
    console.log('Tworzę domyślne opcje dla pytania');
    return this.generateDefaultAnswers(question);
  }
  
  generateDefaultAnswers(question) {
    // Dla pytania o gruźlicę nerkową
    if (question.question.includes('renal tuberculosis') && question.question.includes('cord factor')) {
      return [
        {
          text: "Inoculation of laboratory animals",
          isCorrect: true
        },
        {
          text: "Serological identification of the causative agent",
          isCorrect: false
        },
        {
          text: "Toxigenicity testing",
          isCorrect: false
        },
        {
          text: "Phage typing of the obtained culture",
          isCorrect: false
        },
        {
          text: "Allergy skin test",
          isCorrect: false
        }
      ];
    }
    
    // Dla innych pytań - stwórz generyczne opcje
    return [
      {
        text: "Opcja A",
        isCorrect: true
      },
      {
        text: "Opcja B", 
        isCorrect: false
      },
      {
        text: "Opcja C",
        isCorrect: false
      },
      {
        text: "Opcja D",
        isCorrect: false
      }
    ];
  }
  
  displayAnswerOptions(answers) {
    console.log('displayAnswerOptions wywołane z:', answers);
    
    const questionContent = document.getElementById('question-content');
    console.log('questionContent element:', questionContent);
    
    if (!questionContent) {
      console.error('Element question-content nie istnieje!');
      return;
    }
    
    const optionsHTML = `
      <div class="answer-options">
        <h3>Wybierz odpowiedź:</h3>
        <div class="options-list">
          ${answers.map((answer, index) => `
            <button class="option-btn" data-index="${index}">
              ${answer.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    console.log('Generated HTML:', optionsHTML);
    
    // Remove existing options
    const existingOptions = questionContent.querySelector('.answer-options');
    if (existingOptions) {
      existingOptions.remove();
    }
    
    // Insert new options
    questionContent.insertAdjacentHTML('beforeend', optionsHTML);
    console.log('Opcje zostały dodane do DOM');
    
    // Bind option clicks
    const optionButtons = document.querySelectorAll('.option-btn');
    console.log('Znalezione przyciski opcji:', optionButtons.length);
    
    optionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectAnswer(parseInt(e.target.dataset.index));
      });
    });
  }
  
  selectAnswer(selectedIndex) {
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    const answers = q.answers;
    
    // Sprawdź czy pytanie już zostało odpowiedziane w tej sesji
    if (!this.userProgress[q.id]) {
      this.userProgress[q.id] = {
        studied: 0,
        sessionAnswers: [],
        historicalAnswers: [],
        historicalAccuracy: 0,
        sessionAccuracy: 0,
        answeredInSession: false
      };
    }
    
    const progress = this.userProgress[q.id];
    
    // Jeśli już odpowiedziano w tej sesji, nie licz ponownie
    if (progress.answeredInSession) {
      console.log('Pytanie już odpowiedziane w tej sesji');
      return;
    }
    
    // Remove previous selections
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.remove('selected', 'correct', 'incorrect');
    });
    
    // Mark selected answer
    const selectedBtn = document.querySelector(`[data-index="${selectedIndex}"]`);
    selectedBtn.classList.add('selected');
    
    // Check if correct
    const selectedAnswer = answers[selectedIndex];
    if (selectedAnswer.isCorrect) {
      selectedBtn.classList.add('correct');
    } else {
      selectedBtn.classList.add('incorrect');
      // Show correct answer
      answers.forEach((answer, index) => {
        if (answer.isCorrect) {
          document.querySelector(`[data-index="${index}"]`).classList.add('correct');
        }
      });
    }
    
    // Oznacz pytanie jako odpowiedziane w tej sesji
    progress.answeredInSession = true;
    
    const isCorrect = selectedAnswer.isCorrect;
    
    // Inicjalizuj statystyki pytania jeśli nie istnieją
    if (!progress.sessionAnswers) progress.sessionAnswers = [];
    if (!progress.historicalAnswers) progress.historicalAnswers = [];
    
    // Dodaj odpowiedź do historii
    progress.historicalAnswers.push({
      isCorrect: isCorrect,
      timestamp: Date.now()
    });
    
    // Dodaj odpowiedź do sesji
    progress.sessionAnswers.push({
      isCorrect: isCorrect,
      timestamp: Date.now()
    });
    
    // Oblicz statystyki pytania
    const historicalCorrect = progress.historicalAnswers.filter(a => a.isCorrect).length;
    const historicalTotal = progress.historicalAnswers.length;
    const sessionCorrect = progress.sessionAnswers.filter(a => a.isCorrect).length;
    const sessionTotal = progress.sessionAnswers.length;
    
    progress.historicalAccuracy = historicalTotal > 0 ? Math.round((historicalCorrect / historicalTotal) * 100) : 0;
    progress.sessionAccuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
    progress.lastResult = isCorrect ? 'Poprawna' : 'Błędna';
    
    // Update session stats
    this.sessionStats.total++;
    if (isCorrect) {
      this.sessionStats.correct++;
    } else {
      this.sessionStats.incorrect++;
    }
    this.sessionStats.accuracy = Math.round((this.sessionStats.correct / this.sessionStats.total) * 100);
    
    // Aktualizuj dokładność testu
    if (this.currentTest) {
      this.updateTestStats(this.currentTest, 'accuracy', this.sessionStats.accuracy);
    }
    
    this.saveProgress();
    this.updateStats();
    this.updateGlobalStats();
  }
  
  showAnswer() {
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    this.isAnswerShown = true;
    
    // If user already selected an answer, just show the explanation
    if (q.answers && q.answers.length > 0) {
      // User already made a choice, show explanation
      this.showAnswerExplanation();
    } else {
      // Show answer section
      const answerSection = document.getElementById('answer-section');
      const answerContent = document.getElementById('answer-content');
      
      answerContent.innerHTML = `
        <div class="answer-explanation">
          <h4>Odpowiedź:</h4>
          <p class="correct-answer">${q.answer_en}</p>
        </div>
      `;
      
      answerSection.classList.remove('hidden');
    }
  }
  
  showAnswerExplanation() {
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    const answerSection = document.getElementById('answer-section');
    const answerContent = document.getElementById('answer-content');
    
    // Find correct answer
    const correctAnswer = q.answers.find(a => a.isCorrect);
    
    answerContent.innerHTML = `
      <div class="answer-explanation">
        <h4>Odpowiedź:</h4>
        <p class="correct-answer">${correctAnswer.text}</p>
        <p><em>Kliknij "Nauczyłam się" aby przejść do następnego pytania.</em></p>
      </div>
    `;
    
    answerSection.classList.remove('hidden');
  }
  
  markAsStudied() {
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    const progress = this.userProgress[q.id];
    
    // Zaznacz że pytanie było studiowane
    progress.studied = (progress.studied || 0) + 1;
    
    // Reset button state
    document.getElementById('show-answer-btn').textContent = '👁️ Pokaż odpowiedź';
    document.getElementById('show-answer-btn').onclick = () => this.showAnswer();
    
    // Auto next question
    setTimeout(() => this.nextQuestion(), 500);
  }
  
  nextQuestion() {
    // W trybie testu używamy prostego przechodzenia
    if (this.currentMode === 'study' && this.testQuestions.length > 0) {
      this.currentIndex = this.getNextQuestionIndex();
    } else {
      // Inteligentne losowanie z priorytetami dla wszystkich pytań
      this.currentIndex = this.getNextQuestionIndex();
    }
    this.displayQuestion();
  }
  
  getNextQuestionIndex() {
    // W trybie testu używamy prostego przechodzenia
    if (this.currentMode === 'study' && this.testQuestions.length > 0) {
      const totalQuestions = this.testQuestions.length;
      if (this.currentIndex >= totalQuestions - 1) {
        return 0; // Wróć na początek
      }
      return this.currentIndex + 1;
    }
    
    // Dla wszystkich pytań używamy inteligentnego losowania
    const questions = this.questions;
    const weights = questions.map((q, index) => {
      const progress = this.userProgress[q.id] || { seen: 0, studied: 0, lastResult: null, avgResult: 0 };
      
      // Podstawowa waga = priorytet pytania (1-10)
      let weight = (q.priority || 1) * 10;
      
      // Bonus za nieuczone pytania
      if (progress.studied === 0) {
        weight += 50; // Duży bonus za nowe pytania
      }
      
      // Bonus za trudne pytania (złe wyniki)
      if (progress.studied > 0) {
        const avgResult = parseFloat(progress.avgResult) || 0;
        if (avgResult < 50) {
          weight += 30; // Bonus za trudne pytania
        } else if (avgResult < 80) {
          weight += 15; // Mniejszy bonus za średnie pytania
        }
      }
      
      // Bonus za spaced repetition (im dłużej nie powtarzane, tym większy bonus)
      if (progress.lastSeen) {
        const daysSinceLastStudy = (Date.now() - progress.lastSeen) / (1000 * 60 * 60 * 24);
        if (daysSinceLastStudy > 7) {
          weight += Math.min(daysSinceLastStudy * 2, 40); // Maksymalnie 40 punktów bonusu
        }
      }
      
      // Bonus za pytania z błędnymi odpowiedziami
      if (progress.lastResult === 'Błędna') {
        weight += 25;
      }
      
      return { index, weight };
    });
    
    // Sortuj po wadze (malejąco)
    weights.sort((a, b) => b.weight - a.weight);
    
    // Wybierz z górnych 20% z większym prawdopodobieństwem
    const topCount = Math.max(1, Math.floor(weights.length * 0.2));
    const topQuestions = weights.slice(0, topCount);
    
    // Losuj z górnych 20% z większym prawdopodobieństwem
    const random = Math.random();
    if (random < 0.7) {
      // 70% szans na pytanie z górnych 20%
      return topQuestions[Math.floor(Math.random() * topQuestions.length)].index;
    } else {
      // 30% szans na losowe pytanie
      return weights[Math.floor(Math.random() * weights.length)].index;
    }
  }
  
  prevQuestion() {
    if (this.currentMode === 'study' && this.testQuestions.length > 0) {
      // W trybie testu
      if (this.currentIndex > 0) {
        this.currentIndex--;
      } else {
        this.currentIndex = this.testQuestions.length - 1;
      }
    } else {
      // Dla wszystkich pytań
      if (this.currentIndex > 0) {
        this.currentIndex--;
      } else {
        this.currentIndex = this.questions.length - 1;
      }
    }
    this.displayQuestion();
  }
  
  goToRandomQuestion() {
    if (this.currentMode === 'study' && this.testQuestions.length > 0) {
      // W trybie testu - losowe pytanie z testu
      this.currentIndex = Math.floor(Math.random() * this.testQuestions.length);
    } else {
      // Dla wszystkich pytań
      this.currentIndex = Math.floor(Math.random() * this.questions.length);
    }
    this.displayQuestion();
  }
  
  goToPriorityQuestions() {
    // Sort by priority and go to highest
    const sorted = [...this.questions].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const topQuestion = sorted[0];
    this.currentQuestionIndex = this.questions.findIndex(q => q.id === topQuestion.id);
    this.displayQuestion();
  }
  
  goToNewQuestions() {
    // Find unseen questions
    const unseenIndex = this.questions.findIndex(q => 
      !this.userProgress[q.id] || this.userProgress[q.id].seen === 0
    );
    
    if (unseenIndex !== -1) {
      this.currentQuestionIndex = unseenIndex;
    } else {
      // All seen, go to least seen
      const sorted = [...this.questions].sort((a, b) => {
        const aSeen = this.userProgress[a.id]?.seen || 0;
        const bSeen = this.userProgress[b.id]?.seen || 0;
        return aSeen - bSeen;
      });
      const leastSeen = sorted[0];
      this.currentQuestionIndex = this.questions.findIndex(q => q.id === leastSeen.id);
    }
    this.displayQuestion();
  }
  
  goToHardQuestions() {
    // Find questions studied but with low success rate
    const hardQuestions = this.questions.filter(q => {
      const progress = this.userProgress[q.id];
      return progress && progress.studied > 0 && (progress.avgResult || 0) < 50;
    });
    
    if (hardQuestions.length > 0) {
      const hardest = hardQuestions[0];
      this.currentQuestionIndex = this.questions.findIndex(q => q.id === hardest.id);
      this.displayQuestion();
    } else {
      alert('Nie masz jeszcze trudnych pytań. Ucz się dalej!');
    }
  }
  
  updateStats() {
    // Session time
    const elapsed = Math.floor((Date.now() - this.sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStat = document.getElementById('time-stat');
    if (timeStat) {
      timeStat.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Session accuracy
    const sessionStat = document.getElementById('session-stat');
    if (sessionStat) {
      sessionStat.textContent = `${this.sessionStats.accuracy}%`;
    }
  }
  
  updateGlobalStats() {
    const progressStat = document.getElementById('progress-stat');
    if (progressStat) {
      const totalQuestions = this.currentMode === 'study' && this.testQuestions.length > 0 
        ? this.testQuestions.length 
        : this.questions.length;
      progressStat.textContent = `${this.sessionStats.total}/${totalQuestions}`;
    }
    
    // Update timer every second
    setInterval(() => this.updateStats(), 1000);
  }
  

  
  bindEvents() {
    // Main buttons
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const markStudiedBtn = document.getElementById('mark-studied-btn');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    
    if (showAnswerBtn) showAnswerBtn.addEventListener('click', () => this.showAnswer());
    if (markStudiedBtn) markStudiedBtn.addEventListener('click', () => this.markAsStudied());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevQuestion());
    
    // Quick actions
    const backToTestsBtn = document.getElementById('back-to-tests-btn');
    
    if (backToTestsBtn) backToTestsBtn.addEventListener('click', () => this.showTestSelection());
    
    // Translations


    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.nextQuestion();
      if (e.key === 'ArrowLeft') this.prevQuestion();
      if (e.key === ' ') { // Space
        e.preventDefault();
        if (!this.isAnswerShown) {
          this.showAnswer();
        } else {
          this.markAsStudied();
        }
      }
    });

    // ChatGPT buttons
    document.getElementById('ask-gpt-btn').addEventListener('click', () => {
      this.askChatGPT();
    });
    
    document.getElementById('save-gpt-btn').addEventListener('click', async () => {
      await this.showSaveChatGPTModal();
    });
  }

  askChatGPT() {
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    
    // Sprawdź cache
    const cacheKey = `chatgpt_${q.id}`;
    const cachedResponse = localStorage.getItem(cacheKey);
    
    if (cachedResponse) {
      this.showChatGPTResponse(JSON.parse(cachedResponse));
      return;
    }
    
    // Generuj prompt używając oryginalnej funkcji
    const prompt = this.generateChatGPTPrompt(q);
    
    // Kopiuj do schowka
    navigator.clipboard.writeText(prompt)
      .then(() => {
        console.log('Prompt skopiowany do schowka!');
        
        // Pokaż modal do wklejania odpowiedzi
        this.showSaveChatGPTModal();
      })
      .catch(err => {
        console.error('Błąd kopiowania promptu:', err);
        alert('Nie udało się skopiować promptu. Skopiuj ręcznie: ' + prompt);
      });
    
    // Otwórz ChatGPT w nowej karcie
    window.open('https://chat.openai.com/', '_blank');
  }
  
  generateChatGPTPrompt(question) {
    // Oryginalna implementacja
    const correctAnswer = question.answers ? question.answers.find(a => a.isCorrect) : null;
    const answerText = correctAnswer ? correctAnswer.text : question.answer_en || 'Brak odpowiedzi';
    
    // Zbierz wszystkie odpowiedzi
    let allAnswersText = '';
    if (question.answers && question.answers.length > 0) {
      allAnswersText = question.answers.map((answer, index) => {
        const letter = String.fromCharCode(65 + index);
        // Sprawdź czy odpowiedź już zaczyna się od litery
        const answerText = answer.text.trim();
        if (answerText.match(/^[A-E]\.\s/)) {
          // Jeśli już ma literę, użyj jak jest
          return answerText;
        } else {
          // Jeśli nie ma litery, dodaj
          return `${letter}. ${answerText}`;
        }
      }).join('\n');
    }
    
    // Znajdź poprawną odpowiedź i jej literę
    let correctAnswerLetter = '';
    if (question.answers && question.answers.length > 0) {
      const correctIndex = question.answers.findIndex(a => a.isCorrect);
      if (correctIndex !== -1) {
        correctAnswerLetter = String.fromCharCode(65 + correctIndex);
      }
    }
    
    return `Jesteś ekspertem medycznym i nauczycielem. Wyjaśniaj przystępnie ale dokładnie. Używaj przykładów klinicznych. Odpowiadaj po polsku.

Pytanie egzaminacyjne: "${question.question}"

Wszystkie odpowiedzi:
${allAnswersText}

Poprawna odpowiedź: "${answerText}"

Proszę wyjaśnij:
1. Przetłumacz pytanie na język polski (prostymi słowami)
2. O co dokładnie pyta to pytanie? (prostymi słowami)
3. Jakie są wszystkie odpowiedzi wraz z polskim i łacińskim tłumaczeniem oraz dlaczego odpowiedź ${correctAnswerLetter} jest poprawna?
4. Jakie kluczowe koncepty medyczne muszę znać?
5. Podaj praktyczny przykład kliniczny
6. Wyjaśnij dlaczego każda z pozostałych odpowiedzi jest niepoprawna
7. Wskaż najczęstsze błędy studentów przy tym pytaniu
8. Podaj link do polskiego źródła medycznego (np. PZWL, Elsevier, Medycyna Praktyczna)

Odpowiedz w formacie:
**Tłumaczenie pytania:**
[przekład na polski]

**Wszystkie odpowiedzi z tłumaczeniami:**
- A. [nazwa angielska] - [tłumaczenie polskie] - [tłumaczenie łacińskie]
- B. [nazwa angielska] - [tłumaczenie polskie] - [tłumaczenie łacińskie]
- C. [nazwa angielska] - [tłumaczenie polskie] - [tłumaczenie łacińskie]
- D. [nazwa angielska] - [tłumaczenie polskie] - [tłumaczenie łacińskie]
- E. [nazwa angielska] - [tłumaczenie polskie] - [tłumaczenie łacińskie]

**Analiza pytania:**
[wyjaśnienie]

**Dlaczego ta odpowiedź jest poprawna:**
[wyjaśnienie]

**Kluczowe koncepty:**
- [koncept 1]
- [koncept 2]

**Przykład kliniczny:**
[przykład]

**Dlaczego pozostałe odpowiedzi są niepoprawne:**
- A. [nazwa angielska] (tłumaczenie polskie) - [wyjaśnienie dlaczego błędna]
- B. [nazwa angielska] (tłumaczenie polskie) - [wyjaśnienie dlaczego błędna]
- C. [nazwa angielska] (tłumaczenie polskie) - [wyjaśnienie dlaczego błędna]
- D. [nazwa angielska] (tłumaczenie polskie) - [wyjaśnienie dlaczego błędna]
- E. [nazwa angielska] (tłumaczenie polskie) - [wyjaśnienie dlaczego błędna]

**Częste błędy:**
- [błąd 1]
- [błąd 2]

**Źródła:**
- [link do polskiego źródła]`;
  }
  
  async showSaveChatGPTModal() {
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    const cacheKey = `chatgpt_${q.id}`;
    
    // Sprawdź czy już ma zapisaną odpowiedź (z Supabase lub localStorage)
    const existingResponse = await this.loadFromSupabase(q.id) || localStorage.getItem(cacheKey);
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 10px;
      width: 80%;
      max-width: 600px;
      max-height: 80%;
      overflow-y: auto;
    `;
    
    modalContent.innerHTML = `
      <h3>💾 Zapisz odpowiedź ChatGPT</h3>
      <p><strong>Pytanie:</strong> ${q.question.substring(0, 100)}...</p>
      ${existingResponse ? '<p style="color: #28a745;"><strong>✅ Znaleziono zapisaną odpowiedź dla tego pytania</strong></p>' : ''}
      <p style="color: #666; font-size: 14px; margin: 10px 0;">☁️ <strong>Zapis w chmurze:</strong> Odpowiedzi są zapisywane w Supabase i dostępne dla wszystkich użytkowników</p>
      <p>Wklej tutaj pełną odpowiedź z ChatGPT:</p>
      <textarea id="gpt-response-text" style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: Arial, sans-serif;" placeholder="Wklej tutaj odpowiedź z ChatGPT..."></textarea>
      <div style="margin-top: 15px; text-align: right;">
        <button id="cancel-save" style="margin-right: 10px; padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">Anuluj</button>
        <button id="save-response" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">💾 Zapisz</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Focus na textarea
    const textarea = document.getElementById('gpt-response-text');
    textarea.focus();
    
    // Event listeners
    document.getElementById('cancel-save').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('save-response').addEventListener('click', async () => {
      const responseText = textarea.value.trim();
      if (responseText) {
        // Przygotuj dane do zapisu
        const responseData = {
          question: q.question,
          response: responseText,
          savedAt: new Date().toISOString(),
          questionId: q.id
        };
        
        // Pokaż informację o zapisywaniu
        const saveBtn = document.getElementById('save-response');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '💾 Zapisywanie...';
        saveBtn.disabled = true;
        
        // Zapisz w Supabase (z fallback do localStorage)
        const saved = await this.saveToSupabase(q.id, responseData);
        
        // Przywróć przycisk
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
        // Pokaż odpowiednie potwierdzenie
        if (saved) {
          alert('✅ Odpowiedź zapisana w chmurze! Dostępna dla wszystkich użytkowników.');
        } else {
          alert('✅ Odpowiedź zapisana lokalnie (błąd chmury)');
        }
        
        // Zamknij modal
        document.body.removeChild(modal);
        
        // Odśwież wyświetlanie pytania żeby pokazać zapisaną odpowiedź
        this.displayQuestion();
      } else {
        alert('Proszę wklej odpowiedź z ChatGPT');
      }
    });
    
    // Zamknij modal po kliknięciu w tło
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Zamknij modal po ESC
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  showChatGPTResponse(responseData) {
    // Znajdź lub utwórz sekcję na odpowiedź ChatGPT
    let gptSection = document.getElementById('chatgpt-response-section');
    if (!gptSection) {
      gptSection = document.createElement('div');
      gptSection.id = 'chatgpt-response-section';
      gptSection.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
      `;
      
      // Dodaj sekcję po answer-section
      const answerSection = document.getElementById('answer-section');
      answerSection.parentNode.insertBefore(gptSection, answerSection.nextSibling);
    }
    
    gptSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h4 style="margin: 0; color: #28a745;">🤖 Odpowiedź ChatGPT</h4>
        <div style="display: flex; align-items: center; gap: 10px;">
          <small style="color: #6c757d;">Zapisano: ${new Date(responseData.timestamp || responseData.savedAt).toLocaleString('pl-PL')}</small>
          <button class="btn btn-secondary hide-chatgpt-btn" style="font-size: 12px; padding: 4px 8px;">Ukryj odpowiedź</button>
        </div>
      </div>
      <div style="white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${responseData.response}</div>
    `;
    
    // Dodaj event listener do przycisku ukrywania
    const hideBtn = gptSection.querySelector('.hide-chatgpt-btn');
    if (hideBtn) {
      hideBtn.addEventListener('click', () => {
        gptSection.classList.add('hidden');
        // Dodaj przycisk "Pokaż odpowiedź ChatGPT"
        const showBtn = document.createElement('button');
        showBtn.className = 'btn btn-secondary show-chatgpt-btn';
        showBtn.textContent = 'Pokaż odpowiedź ChatGPT';
        showBtn.style.cssText = 'margin-top: 10px; font-size: 12px; padding: 4px 8px;';
        showBtn.addEventListener('click', () => {
          gptSection.classList.remove('hidden');
          showBtn.remove();
        });
        gptSection.parentNode.insertBefore(showBtn, gptSection.nextSibling);
      });
    }
    
    gptSection.classList.remove('hidden');
  }

  showChatGPTPrompt(prompt, cacheKey) {
    const modal = this.createModal();
    
    modal.innerHTML = `
      <div class="modal-content chatgpt-modal">
        <span class="close-modal">&times;</span>
        <h2>🤖 ChatGPT Helper</h2>
        
        <div class="chatgpt-container">
          <div class="chatgpt-header">
            <h3>📋 Krok 1: Skopiuj prompt</h3>
            <p>Kliknij przycisk poniżej aby skopiować gotowy prompt do ChatGPT:</p>
            <button class="btn btn-primary" id="copy-prompt">📋 Skopiuj prompt</button>
          </div>
          
          <div class="prompt-preview">
            <h3>🔍 Podgląd promptu:</h3>
            <div class="prompt-text">${prompt.substring(0, 200)}...</div>
          </div>
          
          <div class="chatgpt-steps">
            <h3>📝 Krok 2: Otwórz ChatGPT</h3>
            <button class="btn btn-secondary" id="open-chatgpt">🔗 Otwórz ChatGPT</button>
            
            <h3>📋 Krok 3: Wklej i wyślij</h3>
            <p>W otwartej karcie ChatGPT wklej prompt (Ctrl+V) i naciśnij Enter</p>
            
            <h3>📝 Krok 4: Wklej odpowiedź</h3>
            <p>Po otrzymaniu odpowiedzi skopiuj ją i wklej poniżej:</p>
            <textarea id="chatgpt-response" placeholder="Wklej tutaj odpowiedź z ChatGPT..." rows="8"></textarea>
            
            <div class="chatgpt-actions">
              <button class="btn btn-primary" id="save-response">✏️ Edytuj odpowiedź</button>
              <button class="btn btn-secondary" id="clear-response">🗑️ Wyczyść</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Ukryj sekcję wklejania na początku
    const chatgptSteps = modal.querySelector('.chatgpt-steps');
    if (chatgptSteps) {
      chatgptSteps.style.display = 'none';
    }
    
    document.body.appendChild(modal);
    
    // Close button
    modal.querySelector('.close-modal').onclick = () => modal.remove();
    
    // Copy prompt
    modal.querySelector('#copy-prompt').onclick = () => {
      navigator.clipboard.writeText(prompt).then(() => {
        alert('Prompt skopiowany do schowka!');
      }).catch(err => {
        console.error('Błąd kopiowania:', err);
        alert('Skopiuj prompt ręcznie z podglądu powyżej');
      });
    };
    
    // Open ChatGPT
    modal.querySelector('#open-chatgpt').onclick = () => {
      window.open('https://chat.openai.com', '_blank');
      // Pokaż sekcję wklejania odpowiedzi
      modal.querySelector('.chatgpt-steps').style.display = 'block';
    };
    
    // Save response
    modal.querySelector('#save-response').onclick = () => {
      const response = modal.querySelector('#chatgpt-response').value.trim();
      if (response) {
        const responseData = {
          question: this.questions[this.currentQuestionIndex].question,
          response: response,
          timestamp: Date.now()
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(responseData));
        this.showChatGPTResponse(responseData);
        modal.remove();
      } else {
        alert('Wklej odpowiedź z ChatGPT przed zapisaniem!');
      }
    };
    
    // Clear response
    modal.querySelector('#clear-response').onclick = () => {
      modal.querySelector('#chatgpt-response').value = '';
    };
  }
  
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    return modal;
  }

  formatChatResponse(text) {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/(\d+\.)/g, '<br><strong>$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  // ===== SUPABASE CLOUD STORAGE =====
  
  async initSupabase() {
    if (!this.supabaseConfig.enabled) {
      console.log('📱 Supabase wyłączone - używamy localStorage');
      return false;
    }
    
    try {
      // Test połączenia z Supabase
      const response = await fetch(`${this.supabaseConfig.url}/rest/v1/chatgpt_responses?select=count`, {
        headers: {
          'apikey': this.supabaseConfig.key,
          'Authorization': `Bearer ${this.supabaseConfig.key}`
        }
      });
      
      if (response.ok) {
        console.log('✅ Połączono z Supabase');
        return true;
      } else {
        console.warn('❌ Błąd połączenia z Supabase:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('❌ Błąd połączenia z Supabase:', error);
      return false;
    }
  }
  
  async saveToSupabase(questionId, responseData) {
    if (!this.supabaseConfig.enabled) {
      // Fallback do localStorage
      localStorage.setItem(`chatgpt_${questionId}`, JSON.stringify(responseData));
      console.log('📱 Zapisano lokalnie (Supabase wyłączone):', questionId);
      return true;
    }
    
    try {
      const response = await fetch(`${this.supabaseConfig.url}/rest/v1/chatgpt_responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.key,
          'Authorization': `Bearer ${this.supabaseConfig.key}`
        },
        body: JSON.stringify({
          question_id: questionId,
          response: responseData.response,
          created_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('☁️ Zapisano w Supabase:', questionId);
        
        // Zwiększ licznik odpowiedzi ChatGPT dla testu
        if (this.currentTest) {
          this.updateTestStats(this.currentTest, 'chatgpt');
        }
        
        return true;
      } else {
        console.warn('❌ Błąd zapisu w Supabase:', response.status);
        // Fallback do localStorage
        localStorage.setItem(`chatgpt_${questionId}`, JSON.stringify(responseData));
        return false;
      }
    } catch (error) {
      console.warn('❌ Błąd zapisu w Supabase:', error);
      // Fallback do localStorage
      localStorage.setItem(`chatgpt_${questionId}`, JSON.stringify(responseData));
      return false;
    }
  }
  
  async loadFromSupabase(questionId) {
    if (!this.supabaseConfig.enabled) {
      // Fallback do localStorage
      const cached = localStorage.getItem(`chatgpt_${questionId}`);
      return cached ? JSON.parse(cached) : null;
    }
    
    try {
      const response = await fetch(`${this.supabaseConfig.url}/rest/v1/chatgpt_responses?question_id=eq.${encodeURIComponent(questionId)}&order=created_at.desc&limit=1`, {
        headers: {
          'apikey': this.supabaseConfig.key,
          'Authorization': `Bearer ${this.supabaseConfig.key}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          console.log('☁️ Załadowano z Supabase:', questionId);
          return {
            question: data[0].question_id,
            response: data[0].response,
            timestamp: new Date(data[0].created_at).getTime()
          };
        }
      } else {
        console.warn('❌ Błąd ładowania z Supabase:', response.status);
      }
    } catch (error) {
      console.warn('❌ Błąd ładowania z Supabase:', error);
    }
    
    // Fallback do localStorage
    const cached = localStorage.getItem(`chatgpt_${questionId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async loadChatGPTResponse(questionId) {
    try {
      const responseData = await this.loadFromSupabase(questionId);
      if (responseData) {
        this.showChatGPTResponse(responseData);
      } else {
        // Ukryj sekcję ChatGPT jeśli nie ma odpowiedzi
        const gptSection = document.getElementById('chatgpt-response-section');
        if (gptSection) {
          gptSection.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('Błąd ładowania odpowiedzi ChatGPT:', error);
      // Ukryj sekcję ChatGPT w przypadku błędu
      const gptSection = document.getElementById('chatgpt-response-section');
      if (gptSection) {
        gptSection.classList.add('hidden');
      }
    }
  }

  // Nowe funkcje do obsługi testów
  async showTestSelection() {
    console.log('Wyświetlam wybór testów...');
    
    const app = document.getElementById('app');
    if (!app) return;
    
    // Pobierz listę testów z metadanych
    const tests = this.getAvailableTests();
    
    // Pobierz statystyki ChatGPT dla wszystkich testów jednym zapytaniem
    const testCounts = await this.getAllTestChatGPTCoverage();
    
    app.innerHTML = `
      <div class="container">
        <!-- Header -->
        <header class="header">
          <div class="fancy-banner">
            <div class="banner-icon">📚</div>
            <div class="banner-content">
              <h1 class="banner-title">Lekarzu Quiz App</h1>
              <p class="banner-subtitle">Wybierz test do nauki</p>
            </div>
            <div class="banner-decoration">
              <div class="decoration-dot"></div>
              <div class="decoration-dot"></div>
              <div class="decoration-dot"></div>
            </div>
          </div>
        </header>
        
        <!-- Test Selection -->
        <div class="test-selection">
          <div class="test-grid">
            ${tests.map(test => `
              <div class="test-card" data-test="${test.id}">
                <div class="test-header">
                  <h3>${test.name}</h3>
                  <span class="test-year">${test.year}</span>
                </div>
                <div class="test-info">
                  <span class="test-questions">${test.questionCount} pytań</span>
                  <span class="test-date">${test.date}</span>
                </div>
                <div class="test-stats">
                  <div class="stat-row">
                    <span class="stat-label">Próby:</span>
                    <span class="stat-value">${test.attempts || 0}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Dokładność:</span>
                    <span class="stat-value">${test.accuracy || 0}%</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">ChatGPT:</span>
                    <span class="stat-value">${this.getTestChatGPTCoverage(test.id, testCounts)}%</span>
                  </div>
                </div>
                <button class="btn btn-primary test-select-btn" data-test="${test.id}">
                  Rozpocznij test
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    // Dodaj event listeners do przycisków testów
    document.querySelectorAll('.test-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const testId = e.target.dataset.test;
        this.startTest(testId);
      });
    });
  }

  getAvailableTests() {
    // Lista testów w kolejności od najnowszych
    const testList = [
      { id: 'updated-new', name: 'Updated New', year: '2025', questionCount: 54, date: '2025-08-02' },
      { id: '2024-june', name: '2024 June', year: '2024', questionCount: 150, date: '2024-06' },
      { id: '2024-feb', name: '2024 February', year: '2024', questionCount: 150, date: '2024-02' },
      { id: '2023-june', name: '2023 June', year: '2023', questionCount: 150, date: '2023-06' },
      { id: '2022-feb', name: '2022 February', year: '2022', questionCount: 150, date: '2022-02' },
      { id: '2021-may', name: '2021 May', year: '2021', questionCount: 150, date: '2021-05' },
      { id: '2021-feb', name: '2021 February', year: '2021', questionCount: 150, date: '2021-02' },
      { id: '2021-day2', name: '2021 Day 2', year: '2021', questionCount: 150, date: '2021' },
      { id: '2021-day1', name: '2021 Day 1', year: '2021', questionCount: 150, date: '2021' },
      { id: '2020-feb', name: '2020 February', year: '2020', questionCount: 139, date: '2020-02' },
      { id: '2020-30', name: '2020 30th', year: '2020', questionCount: 150, date: '2020' },
      { id: '2020-29', name: '2020 29th', year: '2020', questionCount: 150, date: '2020' },
      { id: '2020-2nd', name: '2020 2nd', year: '2020', questionCount: 150, date: '2020' },
      { id: '2019-study', name: '2019 Study', year: '2019', questionCount: 150, date: '2019' },
      { id: '2018-study', name: '2018 Study', year: '2018', questionCount: 200, date: '2018' },
      { id: '2017-study', name: '2017 Study', year: '2017', questionCount: 200, date: '2017' },
      { id: '2016-study', name: '2016 Study', year: '2016', questionCount: 200, date: '2016' },
      { id: '2015-study', name: '2015 Study', year: '2015', questionCount: 200, date: '2015' },
      { id: '2014-study', name: '2014 Study', year: '2014', questionCount: 200, date: '2014' },
      { id: '2013-study', name: '2013 Study', year: '2013', questionCount: 200, date: '2013' },
      { id: '2012-study', name: '2012 Study', year: '2012', questionCount: 200, date: '2012' },
      { id: '2011-study', name: '2011 Study', year: '2011', questionCount: 200, date: '2011' },
      { id: '2010-study', name: '2010 Study', year: '2010', questionCount: 200, date: '2010' },
      { id: '2020-09', name: '2009 Study', year: '2009', questionCount: 200, date: '2009' },
      { id: '2008-study', name: '2008 Study', year: '2008', questionCount: 200, date: '2008' },
      { id: '2007-study', name: '2007 Study', year: '2007', questionCount: 200, date: '2007' },
      { id: '2006-study', name: '2006 Study', year: '2006', questionCount: 200, date: '2006' },
      { id: '2005-study', name: '2005 Study', year: '2005', questionCount: 200, date: '2005' }
    ];
    
    // Dodaj statystyki dla każdego testu
    return testList.map(test => {
      const testStats = this.getTestStats(test.id);
      return {
        ...test,
        ...testStats
      };
    });
  }

  getTestStats(testId) {
    // Pobierz statystyki testu z localStorage (tymczasowo)
    const testStats = localStorage.getItem(`test_stats_${testId}`);
    if (testStats) {
      return JSON.parse(testStats);
    }
    
    // Domyślne statystyki
    return {
      attempts: 0,
      accuracy: 0,
      chatgptResponses: 0,
      lastAttempt: null
    };
  }

  async getAllTestChatGPTCoverage() {
    // PRAWDZIWIE SENIORSKIE ROZWIĄZANIE: Sprawdź tylko testy z próbami!
    if (this.supabaseConfig.enabled) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.supabaseConfig.url}/rest/v1/chatgpt_responses?select=question_id`, {
          headers: {
            'apikey': this.supabaseConfig.key,
            'Authorization': `Bearer ${this.supabaseConfig.key}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Wszystkie question_id z Supabase:', data.map(item => item.question_id));
          
          // PRAWDZIWIE SENIORSKIE: Sprawdź tylko testy które mają próby (czyli były robione)
          const testCounts = {};
          const tests = this.getAvailableTests();
          
          // Filtruj tylko testy z próbami
          const testsWithAttempts = tests.filter(test => {
            const stats = this.getTestStats(test.id);
            return stats.attempts > 0;
          });
          
          console.log(`🎯 Sprawdzam tylko ${testsWithAttempts.length} testów z próbami z ${tests.length} dostępnych`);
          
          for (const test of testsWithAttempts) {
            try {
              await this.loadTestQuestions(test.id);
              
              // Sprawdź które pytania z Supabase są w tym teście
              let count = 0;
              for (const item of data) {
                const questionId = item.question_id;
                const cleanId = questionId.startsWith('q_') ? questionId.replace('q_', '') : questionId;
                
                const found = this.testQuestions.find(q => q.id === cleanId);
                if (found) {
                  count++;
                  console.log(`✅ Pytanie ${cleanId} znalezione w teście ${test.id}`);
                }
              }
              
              if (count > 0) {
                testCounts[test.id] = count;
                console.log(`📊 Test ${test.id}: ${count} odpowiedzi ChatGPT`);
              }
              
            } catch (error) {
              console.log(`❌ Nie udało się załadować testu: ${test.id}`, error);
            }
          }
          
          console.log('📊 Końcowe statystyki testów:', testCounts);
          return testCounts;
        }
      } catch (error) {
        console.log('❌ Błąd pobierania z Supabase:', error);
      }
    }
    
    // Fallback do localStorage
    const tests = this.getAvailableTests();
    const testCounts = {};
    tests.forEach(test => {
      const testStats = this.getTestStats(test.id);
      testCounts[test.id] = testStats.chatgptResponses || 0;
    });
    
    return testCounts;
  }

  getTestChatGPTCoverage(testId, testCounts = {}) {
    // Pobierz liczbę pytań w teście
    const test = this.getAvailableTests().find(t => t.id === testId);
    if (!test) return 0;
    
    // Użyj podanych statystyk lub pobierz z localStorage
    const chatgptCount = testCounts[testId] || 0;
    return Math.round((chatgptCount / test.questionCount) * 100);
  }

  async startTest(testId) {
    console.log(`Rozpoczynam test: ${testId}`);
    
    // Załaduj pytania z wybranego testu
    await this.loadTestQuestions(testId);
    
    // Wygeneruj losową kolejność pytań
    this.generateTestQuestionOrder();
    
    // Przełącz na tryb nauki
    this.currentMode = 'study';
    this.currentTest = testId;
    this.currentIndex = 0;
    
    // Resetuj statystyki sesji
    this.sessionStats = {
      correct: 0,
      incorrect: 0,
      total: 0,
      accuracy: 0,
      startTime: Date.now()
    };
    
    // Wyczyść statystyki sesji dla wszystkich pytań
    Object.values(this.userProgress).forEach(progress => {
      if (progress.sessionAnswers) {
        progress.sessionAnswers = [];
        progress.sessionAccuracy = 0;
        progress.answeredInSession = false;
      }
    });
    
    // Zwiększ licznik prób testu
    this.updateTestStats(testId, 'attempt');
    
    // Stwórz UI do nauki
    this.createUI();
    this.bindEvents();
    
    // Wyświetl pierwsze pytanie
    this.displayQuestion();
    this.updateStats();
    this.updateGlobalStats();
  }

  async loadTestQuestions(testId) {
    try {
      // Załaduj pytania z pliku testu
      const response = await fetch(`./data/tests/${testId}_2025-08-02_150q.json`);
      if (!response.ok) {
        // Spróbuj inne warianty nazw plików
        const variants = [
          `${testId}_2025-08-02_54q.json`,
          `${testId}_2025-08-02_139q_v8.json`,
          `${testId}_2025-08-04_150q_v6.json`,
          `${testId}_2025-08-04_150q_v7.json`,
          `${testId}_2025-08-04_150q_v8.json`,
          `${testId}_2025-08-05_200q_v8.json`
        ];
        
        let loaded = false;
        for (const variant of variants) {
          const variantResponse = await fetch(`./data/tests/${variant}`);
          if (variantResponse.ok) {
            const testData = await variantResponse.json();
            this.testQuestions = testData.questions;
            loaded = true;
            break;
          }
        }
        
        if (!loaded) {
          throw new Error(`Nie można załadować testu: ${testId}`);
        }
      } else {
        const testData = await response.json();
        this.testQuestions = testData.questions;
      }
      
      console.log(`Załadowano ${this.testQuestions.length} pytań z testu ${testId}`);
    } catch (error) {
      console.error('Błąd ładowania testu:', error);
      // Fallback do wszystkich pytań
      this.testQuestions = this.questions;
    }
  }

  generateTestQuestionOrder() {
    // Wygeneruj losową kolejność pytań dla tej sesji
    this.testQuestionOrder = Array.from({ length: this.testQuestions.length }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = this.testQuestionOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.testQuestionOrder[i], this.testQuestionOrder[j]] = [this.testQuestionOrder[j], this.testQuestionOrder[i]];
    }
    
    console.log('Wygenerowano losową kolejność pytań:', this.testQuestionOrder);
  }

  updateTestStats(testId, type, value = null) {
    const stats = this.getTestStats(testId);
    
    switch (type) {
      case 'attempt':
        stats.attempts = (stats.attempts || 0) + 1;
        stats.lastAttempt = new Date().toISOString();
        break;
      case 'accuracy':
        stats.accuracy = value;
        break;
      case 'chatgpt':
        stats.chatgptResponses = (stats.chatgptResponses || 0) + 1;
        break;
    }
    
    // Zapisz w localStorage (tymczasowo)
    localStorage.setItem(`test_stats_${testId}`, JSON.stringify(stats));
  }

}

// Inicjalizuj aplikację po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MedicalQuizApp();
});