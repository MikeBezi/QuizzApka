// Zmienne globalne
let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let QUESTIONS_PER_QUIZ = 30;
let quizFinished = false;

// Inicjalizuj zmienne globalne natychmiast
console.log("Inicjalizacja zmiennych globalnych na początku");
window.quizFinished = false;
window.questions = [];
window.userAnswers = [];
console.log("window.quizFinished ustawione na:", window.quizFinished);

// Elementy DOM
const questionsContainer = document.getElementById('questions');
const checkButton = document.getElementById('check');
const resultsContainer = document.getElementById('results');
const scoreCounter = document.getElementById('scoreCounter');
const questionGrid = document.getElementById('questionGrid');
const navButtons = document.getElementById('navButtons');

// Dodaję tablicę, która śledzi, które pytania zostały już sprawdzone
let checkedQuestions = [];

const quizStartModal = document.getElementById('quizStartModal');
const questionCountInput = document.getElementById('questionCountInput');
const startQuizBtn = document.getElementById('startQuizBtn');
const quickSelect = document.getElementById('quickSelect');

// Funkcja do losowania pytań
function getRandomQuestions(arr, n) {
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

// Wczytaj pytania z pliku JSON
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        allQuestions = data.questions;
        // Ustaw max w input na liczbę wszystkich pytań
        questionCountInput.max = allQuestions.length;
        questionCountInput.value = Math.min(30, allQuestions.length);
        // Dodaj szybkie opcje wyboru
        const quickOptions = [1, 30, 60, 90, 120, 150, 180, 210].filter(n => n <= allQuestions.length);
        quickSelect.innerHTML = quickOptions.map(n => `<button class='quick-btn' data-n='${n}'>${n}</button>`).join(' ');
        quickSelect.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                questionCountInput.value = btn.dataset.n;
            };
        });
        // Pokaż modal wyboru liczby pytań
        quizStartModal.style.display = 'flex';
        startQuizBtn.onclick = () => {
            let val = parseInt(questionCountInput.value);
            if (isNaN(val) || val < 1 || val > allQuestions.length) {
                alert('Podaj liczbę od 1 do ' + allQuestions.length);
                return;
            }
            QUESTIONS_PER_QUIZ = val;
            quizStartModal.style.display = 'none';
            startQuiz();
        };
    } catch (error) {
        console.error('Błąd podczas wczytywania pytań:', error);
        questionsContainer.innerHTML = '<p>Błąd podczas wczytywania pytań. Sprawdź czy plik questions.json istnieje.</p>';
    }
}

function startQuiz() {
    if (allQuestions.length <= QUESTIONS_PER_QUIZ) {
        questions = allQuestions;
    } else {
        questions = getRandomQuestions(allQuestions, QUESTIONS_PER_QUIZ);
    }
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    checkedQuestions = [];
    quizFinished = false;
    
    // Aktualizuj zmienne globalne
    window.quizFinished = false;
    window.questions = questions;
    window.userAnswers = userAnswers;
    
    updateScore();
    displayQuestion();
}

// Wyświetl aktualne pytanie
function displayQuestion() {
    console.log("displayQuestion() wywołane, quizFinished =", quizFinished);
    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }

    const question = questions[currentQuestionIndex];
    const answers = question.answers;
    const userAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
    const isChecked = userAnswer && userAnswer.isChecked;
    const multi = isMultiSelect(question);
    let selectedAnswers = userAnswer && userAnswer.selectedAnswer ? userAnswer.selectedAnswer : [];

    let html = `
        <div class="question">
            <h2>Pytanie ${currentQuestionIndex + 1} z ${questions.length}</h2>
            <p class="question-text">${question.question}</p>
            <div class="answers">
    `;
    answers.forEach((answer, index) => {
        let checked = '';
        if (multi && selectedAnswers && selectedAnswers.includes(answer.letter)) {
            checked = 'checked';
        } else if (!multi && userAnswer && userAnswer.selectedAnswer === answer.letter) {
            checked = 'checked';
        }
        let disabled = (isChecked || quizFinished) ? 'disabled' : '';
        
        // Dodaj klasy dla poprawnych/błędnych odpowiedzi po zakończeniu quizu
        let answerClass = '';
        if (quizFinished && userAnswer && userAnswer.isChecked) {
            if (answer.correct) {
                answerClass = 'correct-answer';
            } else if (multi && selectedAnswers.includes(answer.letter)) {
                answerClass = userAnswer.isCorrect ? 'user-correct' : 'user-incorrect';
            } else if (!multi && userAnswer.selectedAnswer === answer.letter) {
                answerClass = userAnswer.isCorrect ? 'user-correct' : 'user-incorrect';
            }
        }
        
        html += `
            <label class="answer-option ${answerClass}">
                <input type="${multi ? 'checkbox' : 'radio'}" name="answer" value="${answer.letter}" data-index="${index}" ${checked} ${disabled}>
                <span class="answer-text">${answer.letter}) ${answer.text}</span>
            </label>
        `;
    });
    html += `
            </div>
        </div>
    `;
    
    // Dodaj wyjaśnienie po zakończeniu quizu
    if (quizFinished) {
        const correctLetters = question.answers.filter(a => a.correct).map(a => a.letter);
        let isCorrect = false;
        let userAnswerText = "Brak odpowiedzi";
        
        if (userAnswer && userAnswer.isChecked) {
            isCorrect = userAnswer.isCorrect;
            if (multi) {
                userAnswerText = selectedAnswers.length > 0 ? selectedAnswers.join(', ') : "Brak odpowiedzi";
            } else {
                userAnswerText = userAnswer.selectedAnswer || "Brak odpowiedzi";
            }
        }
        
        html += `
            <div class="answer-explanation ${isCorrect ? 'correct' : 'incorrect'}">
                <h3>${isCorrect ? '✓ Poprawna odpowiedź!' : '✗ Błędna odpowiedź lub brak odpowiedzi'}</h3>
                <p>Twoja odpowiedź: ${userAnswerText}</p>
                <p>Poprawna odpowiedź: ${correctLetters.join(', ')}</p>
            </div>
        `;
    }
    
    questionsContainer.innerHTML = html;
    updateScore();
    renderNavButtons();
    renderQuestionGrid();
    resultsContainer.innerHTML = '';
    checkButton.style.display = (isChecked || quizFinished) ? 'none' : 'block';

    // Dodaj event listener do zapisywania odpowiedzi po zaznaczeniu
    if (!isChecked && !quizFinished) {
        if (multi) {
            document.querySelectorAll('input[name="answer"]').forEach(input => {
                input.addEventListener('change', () => {
                    const checkedInputs = Array.from(document.querySelectorAll('input[name="answer"]:checked'));
                    const selected = checkedInputs.map(i => i.value);
                    saveUserAnswer(currentQuestionIndex, selected);
                });
            });
        } else {
            document.querySelectorAll('input[name="answer"]').forEach(input => {
                input.addEventListener('change', (e) => {
                    saveUserAnswer(currentQuestionIndex, e.target.value);
                });
            });
        }
    }
}

function saveUserAnswer(qIndex, answerLetterOrArray) {
    const question = questions[qIndex];
    const multi = isMultiSelect(question);
    const existingIndex = userAnswers.findIndex(a => a.questionIndex === qIndex);
    if (existingIndex !== -1) {
        userAnswers[existingIndex].selectedAnswer = multi ? answerLetterOrArray : answerLetterOrArray;
    } else {
        userAnswers.push({
            questionIndex: qIndex,
            selectedAnswer: multi ? answerLetterOrArray : answerLetterOrArray,
            isChecked: false
        });
    }
}

// Renderuj przyciski nawigacyjne
function renderNavButtons() {
    let navHtml = '';
    if (currentQuestionIndex > 0) {
        navHtml += `<button onclick="goToPrevious()">Poprzednie</button>`;
    }
    if (currentQuestionIndex < questions.length - 1) {
        navHtml += `<button onclick="goToNext()">Następne</button>`;
    } else if (!quizFinished) {
        navHtml += `<button onclick="finishQuiz()">Zakończ</button>`;
    }
    
    // Po zakończeniu quizu, dodaj przycisk powrotu do wyników
    if (quizFinished) {
        navHtml += `<button onclick="showResults()">Pokaż wyniki końcowe</button>`;
    }
    
    navButtons.innerHTML = navHtml;
}

function goToPrevious() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

function goToNext() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function finishQuiz() {
    console.log("finishQuiz() wywołane");
    // Oceń ostatnie pytanie jeśli nie zostało sprawdzone
    if (currentQuestionIndex === questions.length - 1) {
        const userAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (userAnswer && !userAnswer.isChecked) {
            // Wywołaj checkAnswer tylko jeśli coś zaznaczono
            const question = questions[currentQuestionIndex];
            const multi = isMultiSelect(question);
            let selected;
            if (multi) {
                selected = userAnswer.selectedAnswer || [];
                if (selected.length > 0) {
                    // Ręcznie oceniaj
                    const correctLetters = question.answers.filter(a => a.correct).map(a => a.letter);
                    const isCorrect = arraysEqualNoOrder(selected, correctLetters);
                    userAnswer.isCorrect = isCorrect;
                    userAnswer.correctAnswer = correctLetters;
                    userAnswer.isChecked = true;
                    if (isCorrect) score++;
                }
            } else {
                selected = userAnswer.selectedAnswer;
                if (selected) {
                    const isCorrect = question.answers.find(a => a.letter === selected)?.correct || false;
                    const correctLetters = question.answers.filter(a => a.correct).map(a => a.letter);
                    userAnswer.isCorrect = isCorrect;
                    userAnswer.correctAnswer = correctLetters;
                    userAnswer.isChecked = true;
                    if (isCorrect) score++;
                }
            }
        }
    }
    // Oceń wszystkie nieocenione odpowiedzi (pozostałe) i dodaj brakujące
    for (let i = 0; i < questions.length; i++) {
        let userAnswer = userAnswers.find(a => a.questionIndex === i);
        const question = questions[i];
        const multi = isMultiSelect(question);
        const correctLetters = question.answers.filter(a => a.correct).map(a => a.letter);
        
        if (!userAnswer) {
            // Brak odpowiedzi - dodaj pustą odpowiedź
            userAnswer = {
                questionIndex: i,
                selectedAnswer: multi ? [] : '',
                isCorrect: false,
                correctAnswer: correctLetters,
                isChecked: true
            };
            userAnswers.push(userAnswer);
        } else if (!userAnswer.isChecked) {
            // Odpowiedź nieoceniona - oceń ją
            let isCorrect = false;
            if (multi) {
                isCorrect = arraysEqualNoOrder(userAnswer.selectedAnswer || [], correctLetters);
            } else {
                isCorrect = question.answers.find(a => a.letter === userAnswer.selectedAnswer)?.correct || false;
            }
            userAnswer.isCorrect = isCorrect;
            userAnswer.correctAnswer = correctLetters;
            userAnswer.isChecked = true;
            if (isCorrect) score++;
        }
    }
    
    // Oznacz quiz jako zakończony
    quizFinished = true;
    window.quizFinished = true; // Aktualizuj globalną zmienną
    console.log("Quiz zakończony, quizFinished =", quizFinished);
    
    // Pokaż wyniki końcowe
    showResults();
}

// Renderuj siatkę pytań w panelu po prawej
function renderQuestionGrid() {
    let gridHtml = '<div class="question-grid">';
    for (let i = 0; i < questions.length; i++) {
        let statusClass = '';
        const userAnswer = userAnswers.find(a => a.questionIndex === i);
        if (userAnswer) {
            if (userAnswer.isChecked) {
                statusClass = userAnswer.isCorrect ? 'answered-correct' : 'answered-incorrect';
            } else {
                statusClass = 'answered-pending';
            }
        }
        if (i === currentQuestionIndex) {
            statusClass += ' current-question';
        }
        gridHtml += `<button class="grid-btn ${statusClass}" onclick="goToQuestion(${i})">${i + 1}</button>`;
    }
    gridHtml += '</div>';
    questionGrid.innerHTML = gridHtml;
}

window.goToQuestion = function(index) {
    currentQuestionIndex = index;
    displayQuestion();
}

// Zmienne globalne są już zdefiniowane na końcu pliku

// Zmieniamy checkAnswer, by nadpisywać odpowiedź użytkownika
function checkAnswer() {
    const question = questions[currentQuestionIndex];
    const multi = isMultiSelect(question);
    let selected;
    if (multi) {
        selected = Array.from(document.querySelectorAll('input[name="answer"]:checked')).map(i => i.value);
        if (selected.length === 0) {
            alert('Wybierz co najmniej jedną odpowiedź przed sprawdzeniem!');
            return;
        }
    } else {
        const selectedAnswer = document.querySelector('input[name="answer"]:checked');
        if (!selectedAnswer) {
            alert('Wybierz odpowiedź przed sprawdzeniem!');
            return;
        }
        selected = selectedAnswer.value;
    }
    const answers = question.answers;
    let isCorrect = false;
    let correctLetters = answers.filter(a => a.correct).map(a => a.letter);
    if (multi) {
        // Wszystkie poprawne i tylko poprawne muszą być zaznaczone
        isCorrect = arraysEqualNoOrder(selected, correctLetters);
    } else {
        isCorrect = answers.find(a => a.letter === selected)?.correct || false;
    }

    // Zapisz i oceń odpowiedź użytkownika
    const existingIndex = userAnswers.findIndex(a => a.questionIndex === currentQuestionIndex);
    if (existingIndex !== -1) {
        if (!userAnswers[existingIndex].isChecked) {
            userAnswers[existingIndex].isChecked = true;
            userAnswers[existingIndex].isCorrect = isCorrect;
            userAnswers[existingIndex].correctAnswer = correctLetters;
            if (isCorrect) score++;
        }
    } else {
        userAnswers.push({
            questionIndex: currentQuestionIndex,
            selectedAnswer: multi ? selected : selected,
            isCorrect: isCorrect,
            correctAnswer: correctLetters,
            isChecked: true
        });
        if (isCorrect) score++;
    }
    checkedQuestions[currentQuestionIndex] = true;
    showAnswerResult(isCorrect, selected, question, correctLetters, multi);
    updateScore();
}

function arraysEqualNoOrder(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
}

// Pokaż wynik odpowiedzi
function showAnswerResult(isCorrect, selectedAnswer, question, correctLetters, multi) {
    let correctAnswers = question.answers.filter(a => correctLetters.includes(a.letter));
    let selectedAnswers = multi
        ? question.answers.filter(a => selectedAnswer.includes(a.letter))
        : [question.answers.find(a => a.letter === selectedAnswer)];
    let resultHtml = `
        <div class="answer-result ${isCorrect ? 'correct' : 'incorrect'}">
            <h3>${isCorrect ? '✓ Poprawna odpowiedź!' : '✗ Błędna odpowiedź'}</h3>
            <p>Twoja odpowiedź: ${selectedAnswers.map(a => a ? a.letter + ') ' + a.text : '').join('<br>')}</p>
    `;
    if (!isCorrect) {
        resultHtml += `<p>Poprawna odpowiedź: ${correctAnswers.map(a => a.letter + ') ' + a.text).join('<br>')}</p>`;
    }
    resultHtml += `
            <button onclick=\"nextQuestion()\">Następne pytanie</button>
        </div>
    `;
    resultsContainer.innerHTML = resultHtml;
    checkButton.style.display = 'none';
}

// Przejdź do następnego pytania
function nextQuestion() {
    currentQuestionIndex++;
    resultsContainer.innerHTML = '';
    checkButton.style.display = 'block';
    displayQuestion();
}

// Pokaż końcowe wyniki
function showResults() {
    const percentage = Math.round((score / questions.length) * 100);
    
    let resultsHtml = `
        <div class="final-results">
            <h2>Wyniki końcowe</h2>
            <p>Uzyskany wynik: ${score} z ${questions.length} (${percentage}%)</p>
            <div class="score-bar">
                <div class="score-fill" style="width: ${percentage}%"></div>
            </div>
            <h3>Szczegółowe wyniki:</h3>
    `;
    
    userAnswers.forEach((answer, index) => {
        const question = questions[answer.questionIndex];
        const status = answer.isCorrect ? '✓' : '✗';
        const statusClass = answer.isCorrect ? 'correct' : 'incorrect';
        
        resultsHtml += `
            <div class="answer-summary ${statusClass}">
                <span class="status">${status}</span>
                <span class="question-number">Pytanie ${index + 1}:</span>
                <span class="user-answer">${answer.selectedAnswer})</span>
                ${!answer.isCorrect ? `<span class="correct-answer">Poprawna: ${answer.correctAnswer})</span>` : ''}
            </div>
        `;
    });
    
    resultsHtml += `
            <button onclick="restartQuiz()">Rozpocznij ponownie</button>
            <button onclick="reviewQuestions()">Przejrzyj pytania</button>
        </div>
    `;
    
    questionsContainer.innerHTML = '';
    checkButton.style.display = 'none';
    resultsContainer.innerHTML = resultsHtml;
    updateScore();
}

// Rozpocznij quiz ponownie
function restartQuiz() {
    quizStartModal.style.display = 'flex';
    // Po ponownym wyborze liczby pytań quiz wystartuje przez startQuizBtn.onclick
}

// Przejrzyj pytania po zakończeniu
function reviewQuestions() {
    currentQuestionIndex = 0;
    displayQuestion();
}

// Aktualizuj licznik punktów
function updateScore() {
    if (scoreCounter) {
        scoreCounter.textContent = `${score} / ${questions.length}`;
    }
}

// Zmienne globalne są już zdefiniowane na początku pliku

// Event listeners
checkButton.addEventListener('click', checkAnswer);

document.addEventListener('DOMContentLoaded', loadQuestions);

function isMultiSelect(question) {
    return question.answers.filter(a => a.correct).length > 1;
}
