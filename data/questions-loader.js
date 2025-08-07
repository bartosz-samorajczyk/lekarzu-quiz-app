// Loader dla pytań - konwertuje ES6 modules na window object
import { questionDB } from './questions-db.js';

// Eksportuj pytania do window object
window.questionDB = questionDB;
window.questions = questionDB.questions;

console.log(`Załaduj pytania: ${questionDB.questions.length} pytań`); 