// analyze-questions.js
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// Mapowanie nazw plików na wagi świeżości (wyższy = nowszy)
const freshnessWeights = {
    'updated-new_': 15,  // Najnowszy test!
    '2024-': 10,
    '2023-': 9,
    '2022-': 8,
    '2021-': 7,
    '2020-': 6,
    '2019-': 5,
    '2018-': 4,
    '2017-': 3,
    '2016-': 3,
    '2015-': 2,
    '2014-': 2,
    '2013-': 2,
    '2012-': 1,
    '2011-': 1,
    '2010-': 1,
    '2009-': 1,
    '2008-': 1,
    '2007-': 1,
    '2006-': 1,
    '2005-': 1,
    'default': 1
  };

function getFreshnessScore(filename) {
  for (const [pattern, weight] of Object.entries(freshnessWeights)) {
    if (filename.includes(pattern)) return weight;
  }
  return freshnessWeights.default;
}

async function analyzeQuestions() {
  console.log('🔍 Rozpoczynam analizę pytań...\n');
  
  const testsDir = './data/tests';
  const questionMap = new Map();
  
  try {
    // Odczytaj wszystkie pliki
    const files = await readdir(testsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`📁 Znaleziono ${jsonFiles.length} plików testów\n`);
    
    // Analizuj każdy plik
    for (const file of jsonFiles) {
      console.log(`📄 Analizuję: ${file}`);
      
      const content = await readFile(join(testsDir, file), 'utf8');
      const testData = JSON.parse(content);
      const freshness = getFreshnessScore(file);
      
      if (!testData.questions) {
        console.log(`⚠️  Brak pytań w pliku ${file}`);
        continue;
      }
      
      console.log(`   - Pytań w teście: ${testData.questions.length}`);
      console.log(`   - Świeżość: ${freshness}/10`);
      
      // Przetwórz każde pytanie
      testData.questions.forEach(q => {
        const questionText = q.question || q.question_en || '';
        const key = questionText.toLowerCase().trim();
        
        if (!key) return;
        
        if (!questionMap.has(key)) {
          questionMap.set(key, {
            id: `q_${questionMap.size + 1}`,
            question: questionText,
            question_pl: q.question_pl || '',
            answers: q.answers || [],
            answer_en: q.answer_en || '',
            answer_pl: q.answer_pl || '',
            answer_lat: q.answer_lat || '',
            frequency: 0,
            appearances: [],
            freshnessScores: [],
            maxFreshness: 0
          });
        }
        
        const entry = questionMap.get(key);
        entry.frequency++;
        entry.appearances.push(file);
        entry.freshnessScores.push(freshness);
        entry.maxFreshness = Math.max(entry.maxFreshness, freshness);
      });
    }
    
    console.log(`\n✅ Przeanalizowano wszystkie pliki`);
    console.log(`📊 Znaleziono ${questionMap.size} unikalnych pytań\n`);
    
    // Konwertuj na tablicę i oblicz priorytet
    const questionsArray = Array.from(questionMap.values()).map(q => ({
      ...q,
      priority: q.frequency * 10 + q.maxFreshness * 5,
      avgFreshness: q.freshnessScores.reduce((a, b) => a + b, 0) / q.freshnessScores.length
    }));
    
    // Sortuj po priorytecie
    questionsArray.sort((a, b) => b.priority - a.priority);
    
    // Top 10 najważniejszych pytań
    console.log('🏆 TOP 10 NAJWAŻNIEJSZYCH PYTAŃ:\n');
    questionsArray.slice(0, 10).forEach((q, i) => {
      console.log(`${i + 1}. [Priorytet: ${q.priority}, Częstość: ${q.frequency}x]`);
      console.log(`   ${q.question.substring(0, 100)}...`);
      console.log(`   Występuje w: ${q.appearances.length} testach\n`);
    });
    
    // Statystyki
    const stats = {
      totalQuestions: questionsArray.length,
      totalTests: jsonFiles.length,
      avgFrequency: (questionsArray.reduce((sum, q) => sum + q.frequency, 0) / questionsArray.length).toFixed(2),
      questionsAppearingOnce: questionsArray.filter(q => q.frequency === 1).length,
      questionsAppearingMultiple: questionsArray.filter(q => q.frequency > 1).length,
      mostFrequent: questionsArray[0]?.frequency || 0
    };
    
    console.log('📈 STATYSTYKI:\n');
    console.log(`- Łącznie unikalnych pytań: ${stats.totalQuestions}`);
    console.log(`- Pytania występujące tylko raz: ${stats.questionsAppearingOnce}`);
    console.log(`- Pytania występujące wielokrotnie: ${stats.questionsAppearingMultiple}`);
    console.log(`- Średnia częstotliwość: ${stats.avgFrequency}`);
    console.log(`- Najczęstsze pytanie występuje: ${stats.mostFrequent}x`);
    
    // Zapisz wyniki
    const output = {
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalQuestions: questionsArray.length,
        totalTests: jsonFiles.length,
        stats
      },
      questions: questionsArray
    };
    
    // Pełna wersja do analizy
    await writeFile(
      './data/questions-analyzed.json', 
      JSON.stringify(output, null, 2)
    );
    
    // Wersja dla aplikacji
    const appVersion = `// Auto-generated question database
// Generated: ${new Date().toISOString()}
// Total questions: ${questionsArray.length}
// Total tests analyzed: ${jsonFiles.length}

export const questionDB = {
  questions: ${JSON.stringify(questionsArray.map(q => ({
    id: q.id,
    question: q.question,
    question_pl: q.question_pl,
    answers: q.answers,
    answer_en: q.answer_en,
    answer_pl: q.answer_pl,
    answer_lat: q.answer_lat,
    priority: q.priority,
    frequency: q.frequency,
    maxFreshness: q.maxFreshness
  })), null, 2)}
};

export const dbMetadata = {
  lastUpdated: '${new Date().toISOString()}',
  totalQuestions: ${questionsArray.length},
  totalTests: ${jsonFiles.length},
  stats: ${JSON.stringify(stats, null, 2)}
};`;
    
    await writeFile('./data/questions-db.js', appVersion);
    
    console.log('\n✅ SUKCES! Pliki wygenerowane:');
    console.log('   - data/questions-analyzed.json (pełna analiza)');
    console.log('   - data/questions-db.js (baza dla aplikacji)');
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.error('\nUpewnij się, że:');
    console.error('1. Jesteś w głównym folderze projektu');
    console.error('2. Folder data/tests istnieje i zawiera pliki .json');
  }
}

// Uruchom analizę
analyzeQuestions();