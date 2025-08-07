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
    this.userProgress = {};
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

    // Supabase Client
    this.supabase = null;
    
    // Authentication state
    this.user = null;
    this.isAuthenticated = false;

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
    

    
    // Stwórz UI
    // Inicjalizuj Supabase Auth
    const authSuccess = await this.initSupabaseAuth();
    
    // Sprawdź czy użytkownik jest zalogowany
    if (!this.isAuthenticated) {
      console.log('📱 Użytkownik niezalogowany - pokazuję login');
      this.showLoginPage();
      return;
    }
    
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
          <div class="logo-container">
            <img src="assets/lekarzu-quiz-app-logo.png" alt="Lekarzu Quiz App" class="app-logo" id="logo-clickable">
          </div>
          <div class="header-text">
            <span id="header-title">Wybierz pytanie</span>
            <div class="header-stats">
              <div class="stat-item">
                <span class="stat-label">Odpowiedzi</span>
                <span class="stat-value" id="progress-stat">0/0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Śr. wynik</span>
                <span class="stat-value" id="session-stat">0%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Czas</span>
                <span class="stat-value" id="time-stat">0:00</span>
              </div>
            </div>
          </div>
          <div class="menu-dots">
            <div class="menu-dot"></div>
            <div class="menu-dot"></div>
            <div class="menu-dot"></div>
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
            Poprzednie
          </button>
          <button class="btn btn-primary hidden" id="show-answer-btn">
            Pokaż odpowiedź
          </button>
          <button class="btn btn-success hidden" id="mark-studied-btn">
            Następne pytanie
          </button>
          <button class="btn btn-secondary" id="next-btn">
            Następne
          </button>
          <button class="btn btn-ai" id="ask-gpt-btn">
            Zapytaj ChatGPT
          </button>
          <button class="btn btn-success hidden" id="save-gpt-btn">
            Edytuj odpowiedź ChatGPT
          </button>
        </div>
        

      </div>
    `;
  }
  
  async loadUserAnswers(testId) {
    if (!this.user || !this.supabase) return [];
    
    try {
      const { data, error } = await this.supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', this.user.id)
        .eq('test_id', testId);
      
      if (error) {
        console.error('❌ Błąd wczytywania odpowiedzi:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Błąd wczytywania odpowiedzi:', error);
      return [];
    }
  }
  
  async loadStudyProgress(testId) {
    if (!this.user || !this.supabase) return [];
    
    try {
      const { data, error } = await this.supabase
        .from('study_progress')
        .select('*')
        .eq('user_id', this.user.id)
        .eq('test_id', testId)
        .eq('is_studied', true);
      
      if (error) {
        console.error('❌ Błąd wczytywania postępu nauki:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Błąd wczytywania postępu nauki:', error);
      return [];
    }
  }
  
  async saveUserAnswer(questionId, testId, selectedAnswer, isCorrect) {
    if (!this.user || !this.supabase) return false;
    
    try {
      const { data, error } = await this.supabase
        .from('user_answers')
        .upsert({
          user_id: this.user.id,
          question_id: questionId,
          test_id: testId,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          answered_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('❌ Błąd zapisu odpowiedzi:', error);
        return false;
      }
      
      console.log('✅ Odpowiedź zapisana w Supabase');
      return true;
    } catch (error) {
      console.error('❌ Błąd zapisu odpowiedzi:', error);
      return false;
    }
  }
  
  async markQuestionAsStudied(questionId, testId) {
    if (!this.user || !this.supabase) return false;
    
    try {
      const { data, error } = await this.supabase
        .from('study_progress')
        .upsert({
          user_id: this.user.id,
          question_id: questionId,
          test_id: testId,
          is_studied: true,
          studied_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('❌ Błąd zapisu postępu nauki:', error);
        return false;
      }
      
      console.log('✅ Pytanie oznaczone jako przestudiowane');
      return true;
    } catch (error) {
      console.error('❌ Błąd zapisu postępu nauki:', error);
      return false;
    }
  }
  
  async updateTestStats(testId, isCorrect = null) {
    if (!this.user || !this.supabase) return false;
    
    try {
      // Pobierz aktualne statystyki
      const { data: existingStats } = await this.supabase
        .from('test_stats')
        .select('*')
        .eq('user_id', this.user.id)
        .eq('test_id', testId)
        .single();
      
      const currentStats = existingStats || {
        user_id: this.user.id,
        test_id: testId,
        total_attempts: 0,
        correct_answers: 0,
        total_questions: 0
      };
      
      // Aktualizuj statystyki
      currentStats.total_attempts++;
      if (isCorrect !== null) {
        if (isCorrect) currentStats.correct_answers++;
      }
      currentStats.last_attempted = new Date().toISOString();
      
      // Zapisz zaktualizowane statystyki
      const { error } = await this.supabase
        .from('test_stats')
        .upsert(currentStats);
      
      if (error) {
        console.error('❌ Błąd aktualizacji statystyk testu:', error);
        return false;
      }

      // Oblicz dokładność
      const accuracy = currentStats.total_attempts > 0 
        ? Math.round((currentStats.correct_answers / currentStats.total_attempts) * 100) 
        : 0;

      // Zaktualizuj test_summary
      const { error: summaryError } = await this.supabase
        .from('test_summary')
        .upsert({
          user_id: this.user.id,
          test_id: testId,
          total_attempts: currentStats.total_attempts,
          correct_answers: currentStats.correct_answers,
          accuracy_percentage: accuracy,
          last_attempt: currentStats.last_attempted
        });
      
      if (summaryError) {
        console.error('❌ Błąd aktualizacji test_summary:', summaryError);
      } else {
        console.log('✅ Test summary zaktualizowane');
      }
      
      console.log('✅ Statystyki testu zaktualizowane');
      return true;
    } catch (error) {
      console.error('❌ Błąd aktualizacji statystyk testu:', error);
      return false;
    }
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
    // TYMCZASOWO: Wyłącz zapis do localStorage
    // this.saveProgress();
    
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
    
    // Wyczyść stare sekcje ChatGPT przy przechodzeniu między pytaniami
    const oldGptSection = document.getElementById('chatgpt-response-section');
    if (oldGptSection) {
      oldGptSection.remove();
    }
    const oldButtons = document.querySelectorAll('.show-chatgpt-btn');
    oldButtons.forEach(btn => btn.remove());
    
    // Sprawdź czy pytanie ma odpowiedź ChatGPT i zaktualizuj przyciski
    await this.checkAndUpdateChatGPTButtons(q.id);
    const markStudiedBtn = document.getElementById('mark-studied-btn');
    
    console.log('answerSection:', answerSection);
    console.log('showAnswerBtn:', showAnswerBtn);
    console.log('markStudiedBtn:', markStudiedBtn);
    
    if (answerSection) answerSection.classList.add('hidden');
    if (showAnswerBtn) showAnswerBtn.classList.add('hidden');
    if (markStudiedBtn) markStudiedBtn.classList.add('hidden');
    
    // Reset answer shown state
    this.isAnswerShown = false;
    
    // Sprawdź czy pytanie ma odpowiedź ChatGPT i zaktualizuj przyciski
    await this.checkAndUpdateChatGPTButtons(q.id);
    
    // Update stats
    this.updateStats();
    
    // Update header text based on mode
    this.updateHeaderText();
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
  
  async selectAnswer(selectedIndex) {
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
    
    const isCorrect = selectedAnswer.isCorrect;
    
    // Update session stats
    this.sessionStats.total++;
    if (isCorrect) {
      this.sessionStats.correct++;
    } else {
      this.sessionStats.incorrect++;
    }
    this.sessionStats.accuracy = Math.round((this.sessionStats.correct / this.sessionStats.total) * 100);
    
    // Zapisz odpowiedź do Supabase
    if (this.currentTest) {
      await this.saveUserAnswer(q.id, this.currentTest, selectedIndex, isCorrect);
      await this.updateTestStats(this.currentTest, isCorrect);
    }
    
        this.updateStats();
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
  
  async markAsStudied() {
    // Użyj pytań z testu jeśli jesteśmy w trybie nauki
    const questions = this.currentMode === 'study' && this.testQuestions.length > 0 
      ? this.testQuestions 
      : this.questions;
    
    // Pobierz pytanie z losowej kolejności
    const questionIndex = this.currentMode === 'study' && this.testQuestionOrder.length > 0
      ? this.testQuestionOrder[this.currentIndex]
      : this.currentIndex;
    
    const q = questions[questionIndex];
    
    // Zapisz postęp nauki do Supabase
    if (this.currentTest) {
      await this.markQuestionAsStudied(q.id, this.currentTest);
    }
    
    // Reset button state
    document.getElementById('show-answer-btn').textContent = 'Pokaż odpowiedź';
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
    
    // Progress stat (odpowiedzi w sesji / liczba pytań w teście)
    const progressStat = document.getElementById('progress-stat');
    if (progressStat) {
      const totalQuestions = this.currentMode === 'study' && this.testQuestions.length > 0 
        ? this.testQuestions.length 
        : this.questions.length;
      progressStat.textContent = `${this.sessionStats.total}/${totalQuestions}`;
    }
    
    // Update header text
    this.updateHeaderText();
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
    
    // Logo clickable
    const logoClickable = document.getElementById('logo-clickable');
    if (logoClickable) {
      logoClickable.addEventListener('click', () => this.showTestSelection());
    }
    
    // Menu dots (tylko na stronie pytań)
    const menuDots = document.querySelector('.menu-dots');
    if (menuDots) {
      menuDots.addEventListener('click', () => this.showMenu());
    }
    
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
    const askGptBtn = document.getElementById('ask-gpt-btn');
    const saveGptBtn = document.getElementById('save-gpt-btn');
    
    if (askGptBtn) {
      askGptBtn.addEventListener('click', () => {
        this.askChatGPT();
      });
    }
    
    if (saveGptBtn) {
      saveGptBtn.addEventListener('click', async () => {
        await this.showSaveChatGPTModal();
      });
    }
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
              <textarea id="gpt-response-text" style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: 'Inter', sans-serif;" placeholder="Wklej tutaj odpowiedź z ChatGPT..."></textarea>
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
    
    // Domyślnie ukryj sekcję i pokaż przycisk
    gptSection.classList.add('hidden');
    const showBtn = document.createElement('button');
    showBtn.className = 'btn btn-secondary show-chatgpt-btn';
    showBtn.textContent = 'Pokaż odpowiedź ChatGPT';
    showBtn.style.cssText = 'margin-top: 10px; font-size: 14px; padding: 8px 16px;'; // Większy przycisk
    showBtn.addEventListener('click', () => {
      gptSection.classList.remove('hidden');
      showBtn.remove();
    });
    gptSection.parentNode.insertBefore(showBtn, gptSection.nextSibling);
    
    // Dodaj event listener do przycisku ukrywania
    const hideBtn = gptSection.querySelector('.hide-chatgpt-btn');
    if (hideBtn) {
      hideBtn.addEventListener('click', () => {
        gptSection.classList.add('hidden');
        // Dodaj przycisk "Pokaż odpowiedź ChatGPT"
        const showBtn = document.createElement('button');
        showBtn.className = 'btn btn-secondary show-chatgpt-btn';
        showBtn.textContent = 'Pokaż odpowiedź ChatGPT';
        showBtn.style.cssText = 'margin-top: 10px; font-size: 14px; padding: 8px 16px;'; // Większy przycisk
        showBtn.addEventListener('click', () => {
          gptSection.classList.remove('hidden');
          showBtn.remove();
        });
        gptSection.parentNode.insertBefore(showBtn, gptSection.nextSibling);
      });
    }
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

  async checkAndUpdateChatGPTButtons(questionId) {
    try {
      console.log('🔍 Sprawdzam odpowiedź ChatGPT dla pytania:', questionId);
      const responseData = await this.loadFromSupabase(questionId);
      console.log('📊 Odpowiedź ChatGPT:', responseData ? 'TAK' : 'NIE');
      
      const askGptBtn = document.getElementById('ask-gpt-btn');
      const saveGptBtn = document.getElementById('save-gpt-btn');
      
      console.log('🔘 Przyciski znalezione:', {
        askGptBtn: !!askGptBtn,
        saveGptBtn: !!saveGptBtn
      });
      
      if (responseData && askGptBtn && saveGptBtn) {
        // Jeśli jest odpowiedź ChatGPT, pokaż przycisk "Edytuj"
        console.log('✅ Pokazuję przycisk "Edytuj odpowiedź ChatGPT"');
        askGptBtn.classList.add('hidden');
        saveGptBtn.classList.remove('hidden');
        saveGptBtn.textContent = 'Edytuj odpowiedź ChatGPT';
        
        // Utwórz sekcję ChatGPT z odpowiedzią (zwiniętą)
        this.showChatGPTResponse(responseData);
      } else if (askGptBtn && saveGptBtn) {
        // Jeśli nie ma odpowiedzi, pokaż przycisk "Zapytaj"
        console.log('✅ Pokazuję przycisk "Zapytaj ChatGPT"');
        askGptBtn.classList.remove('hidden');
        saveGptBtn.classList.add('hidden');
      }
    } catch (error) {
      console.error('❌ Błąd sprawdzania odpowiedzi ChatGPT:', error);
    }
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
    
    // Zatrzymaj timer statystyk jeśli jest aktywny
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
    
    const app = document.getElementById('app');
    if (!app) return;
    
    // Pobierz listę testów z metadanych
    const tests = await this.getAvailableTests();
    

    
    app.innerHTML = `
      <div class="container">
        <!-- Header -->
        <header class="header">
          <div class="logo-container">
            <img src="assets/lekarzu-quiz-app-logo.png" alt="Lekarzu Quiz App" class="app-logo" id="logo-clickable">
          </div>
          <div class="header-text">
            <span id="header-title">Wybierz test do nauki</span>
          </div>
        </header>
        
        <!-- Test Selection -->
        <div class="test-selection">
          <div class="test-grid" id="test-grid">
            <!-- Testy będą dodane dynamicznie -->
          </div>
        </div>
      </div>
    `;
    
    // Dodaj testy dynamicznie
    await this.renderTests(tests);
    
    // Update header text
    this.updateHeaderText();
  }

    async renderTests(tests) {
    const testGrid = document.getElementById('test-grid');
    if (!testGrid) return;

    let testHTML = '';
    for (const test of tests) {
      // Pokaż "..." jeśli statystyki nie są jeszcze załadowane
      const attemptsDisplay = test.attempts === null ? '...' : test.attempts;
      const accuracyDisplay = test.accuracy === null ? '...' : `${test.accuracy}%`;

      testHTML += `
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
              <div class="stat-label">Próby:</div>
              <div class="stat-value" id="attempts-${test.id}">${attemptsDisplay}</div>
            </div>
                                      <div class="stat-row">
                            <div class="stat-label">Śr. wynik:</div>
                            <div class="stat-value" id="accuracy-${test.id}">${accuracyDisplay}</div>
                          </div>
          </div>
          <button class="btn btn-primary test-select-btn" data-test="${test.id}">
            Rozpocznij test
          </button>
        </div>
      `;
    }

    testGrid.innerHTML = testHTML;

    // Dodaj event listeners do przycisków testów
    document.querySelectorAll('.test-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const testId = e.target.dataset.test;
        this.startTest(testId);
      });
    });

    // Załaduj statystyki w tle
    this.loadTestStatsInBackground();
  }

  async loadTestStatsInBackground() {
    if (!this.supabase || !this.user) {
      console.log('❌ Brak Supabase lub użytkownika');
      return;
    }

    try {
      console.log('🔄 Ładuję statystyki testów w tle...');
      
      // Sprawdź czy tabela test_summary istnieje
      const { data: summary, error } = await this.supabase
        .from('test_summary')
        .select('*')
        .eq('user_id', this.user.id);
      
      if (error) {
        console.log('❌ Błąd pobierania test_summary:', error);
        return;
      }
      
      console.log('📊 Pobrane dane:', summary);
      
      // Zaktualizuj tylko testy które mają historię
      summary.forEach(item => {
        const attemptsElement = document.getElementById(`attempts-${item.test_id}`);
        const accuracyElement = document.getElementById(`accuracy-${item.test_id}`);
        
        if (attemptsElement && accuracyElement) {
          attemptsElement.textContent = item.total_attempts || 0;
          accuracyElement.textContent = `${item.accuracy_percentage || 0}%`;
          console.log(`✅ Zaktualizowano ${item.test_id}: ${item.total_attempts} prób, ${item.accuracy_percentage}%`);
        }
      });
      
      console.log(`✅ Załadowano statystyki dla ${summary.length} testów`);
      
      // Jeśli nie ma danych w test_summary, spróbuj wypełnić z test_stats
      if (summary.length === 0) {
        console.log('🔄 Brak danych w test_summary, próbuję wypełnić z test_stats...');
        await this.populateTestSummaryFromStats();
      }
    } catch (error) {
      console.log('❌ Błąd ładowania statystyk w tle:', error);
    }
  }

  async populateTestSummaryFromStats() {
    if (!this.supabase || !this.user) {
      return;
    }

    try {
      // Pobierz wszystkie statystyki testów użytkownika
      const { data: testStats, error } = await this.supabase
        .from('test_stats')
        .select('*')
        .eq('user_id', this.user.id);

      if (error) {
        console.log('❌ Błąd pobierania test_stats:', error);
        return;
      }

      if (testStats.length === 0) {
        console.log('ℹ️ Brak danych w test_stats');
        return;
      }

      console.log(`📊 Znaleziono ${testStats.length} wpisów w test_stats`);

      // Wypełnij test_summary
      for (const stat of testStats) {
        const accuracy = stat.total_attempts > 0 
          ? Math.round((stat.correct_answers / stat.total_attempts) * 100) 
          : 0;

        const { error: insertError } = await this.supabase
          .from('test_summary')
          .upsert({
            user_id: this.user.id,
            test_id: stat.test_id,
            total_attempts: stat.total_attempts,
            correct_answers: stat.correct_answers,
            accuracy_percentage: accuracy,
            last_attempt: stat.last_attempted
          });

        if (insertError) {
          console.log(`❌ Błąd wypełniania test_summary dla ${stat.test_id}:`, insertError);
        } else {
          console.log(`✅ Wypełniono test_summary dla ${stat.test_id}`);
        }
      }

      // Odśwież statystyki
      setTimeout(() => {
        this.loadTestStatsInBackground();
      }, 1000);

    } catch (error) {
      console.log('❌ Błąd wypełniania test_summary:', error);
    }
  }

  async getAvailableTests() {
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
      { id: '2022-feb', name: '2022 February', year: '2022', questionCount: 150, date: '2022-02' },
      { id: '2012-study', name: '2012 Study', year: '2012', questionCount: 200, date: '2012' },
      { id: '2011-study', name: '2011 Study', year: '2011', questionCount: 200, date: '2011' },
      { id: '2010-study', name: '2010 Study', year: '2010', questionCount: 200, date: '2010' },
      { id: '2020-09', name: '2009 Study', year: '2009', questionCount: 200, date: '2009' },
      { id: '2008-study', name: '2008 Study', year: '2008', questionCount: 200, date: '2008' },
      { id: '2007-study', name: '2007 Study', year: '2007', questionCount: 200, date: '2007' },
      { id: '2006-study', name: '2006 Study', year: '2006', questionCount: 200, date: '2006' },
      { id: '2005-study', name: '2005 Study', year: '2005', questionCount: 200, date: '2005' }
    ];
    
    // Zwróć podstawowe dane testów (bez statystyk)
    return testList.map(test => ({
      ...test,
      attempts: null, // null = nie załadowano jeszcze
      accuracy: null,
      lastAttempt: null
    }));
  }

  async getTestSummary() {
    if (!this.supabase || !this.user) {
      return {};
    }

    try {
      const { data, error } = await this.supabase
        .from('test_summary')
        .select('*')
        .eq('user_id', this.user.id);

      if (error) {
        console.log(`⚠️ Błąd pobierania test_summary:`, error);
        return {};
      }

      const summary = {};
      
      data.forEach(item => {
        summary[item.test_id] = {
          attempts: item.total_attempts || 0,
          accuracy: item.accuracy_percentage || 0,
          lastAttempt: item.last_attempt
        };
      });
      
      return summary;
    } catch (error) {
      console.log(`❌ Błąd pobierania test_summary:`, error);
      return {};
    }
  }

  async getTestStats(testId) {
    if (!this.supabaseConfig.enabled) {
      return {
        attempts: 0,
        accuracy: 0,
        chatgptResponses: 0,
        lastAttempt: null
      };
    }

    try {
      const response = await fetch(`${this.supabaseConfig.url}/rest/v1/test_stats?select=*&user_id=eq.${this.user.id}&test_id=eq.${testId}`, {
        headers: {
          'apikey': this.supabaseConfig.key,
          'Authorization': `Bearer ${this.supabaseConfig.key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ Błąd pobierania statystyk dla testu ${testId}:`, response.status);
        return {
          attempts: 0,
          accuracy: 0,
          chatgptResponses: 0,
          lastAttempt: null
        };
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const stats = data[0];
        const accuracy = stats.total_attempts > 0 ? Math.round((stats.correct_answers / stats.total_attempts) * 100) : 0;
        
        return {
          attempts: stats.total_attempts || 0,
          accuracy: accuracy,
          chatgptResponses: 0, // Tymczasowo 0, będzie sprawdzane osobno
          lastAttempt: stats.last_attempt || null
        };
      } else {
        return {
          attempts: 0,
          accuracy: 0,
          chatgptResponses: 0,
          lastAttempt: null
        };
      }
    } catch (error) {
      console.log(`❌ Błąd pobierania statystyk dla testu ${testId}:`, error);
      return {
        attempts: 0,
        accuracy: 0,
        chatgptResponses: 0,
        lastAttempt: null
      };
    }
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
    
    // Update header text
    this.updateHeaderText();
    
    // Uruchom timer dla statystyk (aktualizuj co sekundę)
    this.statsTimer = setInterval(() => {
      this.updateStats();
    }, 1000);
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


  
  showMenu() {
    // Stwórz menu dropdown
    const menuHtml = `
      <div class="menu-dropdown" id="menu-dropdown">
        <div class="menu-item" data-action="back-to-tests">
          Powrót do wyboru testów
        </div>
      </div>
    `;
    
    // Usuń istniejące menu
    const existingMenu = document.getElementById('menu-dropdown');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    
    // Dodaj menu do DOM
    document.body.insertAdjacentHTML('beforeend', menuHtml);
    
    // Dodaj event listeners
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleMenuAction(action);
        document.getElementById('menu-dropdown').remove();
      });
    });
    
    // Zamknij menu po kliknięciu poza nim
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('.menu-dropdown') && !e.target.closest('.menu-dots')) {
          const menu = document.getElementById('menu-dropdown');
          if (menu) menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
  
  handleMenuAction(action) {
    switch (action) {
      case 'back-to-tests':
        // Zatrzymaj timer statystyk jeśli jest aktywny
        if (this.statsTimer) {
          clearInterval(this.statsTimer);
          this.statsTimer = null;
        }
        this.showTestSelection();
        break;
      case 'settings':
        // TODO: Dodać ustawienia
        console.log('Ustawienia - do implementacji');
        break;
      case 'stats':
        // TODO: Dodać statystyki
        console.log('Statystyki - do implementacji');
        break;
    }
  }
  
  updateHeaderText() {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
      if (this.currentMode === 'study' && this.currentTest) {
        // W trybie pytania - ukryj tytuł, pokaż tylko statystyki
        headerTitle.style.display = 'none';
      } else {
        // W trybie wyboru testu - pokaż tytuł
        headerTitle.style.display = 'block';
        headerTitle.textContent = 'Wybierz test do nauki';
      }
    }
  }

  // ===== SUPABASE AUTHENTICATION =====
  
  async initSupabaseAuth() {
    if (!this.supabaseConfig.enabled) {
      console.log('📱 Supabase wyłączone - pomijam auth');
      return false;
    }
    
    try {
      // Inicjalizuj Supabase client
      this.supabase = window.supabase.createClient(
        this.supabaseConfig.url,
        this.supabaseConfig.key
      );
      
      // Sprawdź aktualną sesję
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (session) {
        this.user = session.user;
        this.isAuthenticated = true;
        console.log('✅ Użytkownik zalogowany:', this.user.email);
        return true;
      } else {
        console.log('📱 Brak aktywnej sesji');
        return false;
      }
    } catch (error) {
      console.error('❌ Błąd inicjalizacji auth:', error);
      return false;
    }
  }
  
  async signInWithGoogle() {
    if (!this.supabase) {
      console.error('❌ Supabase nie zainicjalizowane');
      return false;
    }
    
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) {
        console.error('❌ Błąd logowania:', error);
        return false;
      }
      
      console.log('🔄 Przekierowanie do Google...');
      return true;
    } catch (error) {
      console.error('❌ Błąd logowania:', error);
      return false;
    }
  }
  
  async signOut() {
    if (!this.supabase) {
      console.error('❌ Supabase nie zainicjalizowane');
      return false;
    }
    
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Błąd wylogowania:', error);
        return false;
      }
      
      this.user = null;
      this.isAuthenticated = false;
      console.log('✅ Wylogowano');
      return true;
    } catch (error) {
      console.error('❌ Błąd wylogowania:', error);
      return false;
    }
  }
  
  showLoginPage() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
      <div class="container login-container">
        <div class="login-card">
          <div class="logo-container">
            <img src="assets/lekarzu-quiz-app-logo.png" alt="Lekarzu Quiz App" class="app-logo">
          </div>
          
          <div class="login-content">
            <h1>Witaj w Lekarzu Quiz App</h1>
            <p>Zaloguj się, aby synchronizować swoje postępy i odpowiedzi ChatGPT</p>
            
            <button class="btn btn-primary login-btn" id="google-login-btn">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Zaloguj przez Google
            </button>
          </div>
        </div>

      </div>
    `;
    
    // Dodaj event listener
    const loginBtn = document.getElementById('google-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.signInWithGoogle());
    }
    

  }

}

// Inicjalizuj aplikację po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MedicalQuizApp();
});