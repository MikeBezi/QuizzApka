let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let QUESTIONS_PER_QUIZ = 30;
let quizFinished = false;
let randomizeAnswers = true;

const questionsContainer = document.getElementById('questions');
const checkButton = document.getElementById('check');
const resultsContainer = document.getElementById('results');
const scoreCounter = document.getElementById('scoreCounter');
const questionGrid = document.getElementById('questionGrid');
const navButtons = document.getElementById('navButtons');
const quizStartModal = document.getElementById('quizStartModal');
const questionCountInput = document.getElementById('questionCountInput');
const startQuizBtn = document.getElementById('startQuizBtn');
const quickSelect = document.getElementById('quickSelect');
const quizSelect = document.getElementById('quizSelect');

let checkedQuestions = [];

function getRandomQuestions(arr, n) {
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

function getCorrectAnswers(answers) {
    const corretAnswers = answers.filter(a => a.correct).map(a => a.text);
    return corretAnswers;  
}

function getRandomAnswers(answers) {
    const randomAnswers = answers.slice().sort(() => 0.5 - Math.random()).map(a => a.text);
    return randomAnswers;
}
async function loadQuestions() {
    try {
        const selectedFile = quizSelect.value;
        const response = await fetch(selectedFile);
        const data = await response.json();
        allQuestions = data.questions;
        questionCountInput.max = allQuestions.length;
        questionCountInput.value = Math.min(30, allQuestions.length);
        const quickOptions = [1, 30, 60, 90, 120, 150, 180, 210].filter(n => n <= allQuestions.length);
        quickSelect.innerHTML = quickOptions.map(n => `<button class='quick-btn' data-n='${n}'>${n}</button>`).join(' ');
        quickSelect.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                questionCountInput.value = btn.dataset.n;
            };
        });
        quizStartModal.style.display = 'flex'; 
        quizSelect.onchange = () => {
            loadQuestions();
        };
        
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
        questionsContainer.innerHTML = '<p>Błąd podczas wczytywania pytań. Sprawdź czy plik istnieje.</p>';
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
    
    updateScore();
    displayQuestion();
}

function displayQuestion() {
    const question = questions[currentQuestionIndex];
    const answers = question.answers;
    const correctAnswers = getCorrectAnswers(answers);
    const randomAnswers = getRandomAnswers(answers);
    console.log(correctAnswers);
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
  
    const answersToDisplay = answers.length === 2 ? answers.map(a => a.text) : randomAnswers;
    
    answersToDisplay.forEach((answer, index) => {
        let checked = '';
        if (multi && selectedAnswers && selectedAnswers.includes(answer)) {
            checked = 'checked';
        } else if (!multi && userAnswer && userAnswer.selectedAnswer === answer) {
            checked = 'checked';
        }
        let disabled = (isChecked || quizFinished) ? 'disabled' : '';
        
        let answerClass = '';
        if (quizFinished && userAnswer && userAnswer.isChecked) {
            if (correctAnswers.includes(answer)) {
                answerClass = 'correct-answer';
            } else if (multi && selectedAnswers.includes(answer)) {
                answerClass = userAnswer.isCorrect ? 'user-correct' : 'user-incorrect';
            } else if (!multi && userAnswer.selectedAnswer === answer) {
                answerClass = userAnswer.isCorrect ? 'user-correct' : 'user-incorrect';
            }
        }

        
        html += `
            <label class="answer-option ${answerClass}">
                <input type="${multi ? 'checkbox' : 'radio'}" name="answer" value="${answer}" ${checked} ${disabled}>
                <span class="answer-text">${String.fromCharCode(65 + index)}) ${answer}</span>
            </label>
        `;
    });
    html += `
            </div>
        </div>
    `;

    if (quizFinished) {
        const correctLetters = randomAnswers.filter(a => a.correct).map((a, idx) => String.fromCharCode(65 + idx));
        let isCorrect = false;
        let userAnswerText = "Brak odpowiedzi";
        
        if (userAnswer && userAnswer.isChecked) {
            isCorrect = userAnswer.isCorrect;
            if (multi) {
                if (Array.isArray(userAnswer.selectedAnswer) && userAnswer.selectedAnswer.length > 0) {
                    const userLetters = userAnswer.selectedAnswer.map(text => {
                        const idx = randomAnswers.findIndex(a => a === text);
                        return idx >= 0 ? String.fromCharCode(65 + idx) : '?';
                    }).join(', ');
                    userAnswerText = userLetters;
                } else {
                    userAnswerText = "Brak odpowiedzi";
                }
            } else {
                if (userAnswer.selectedAnswer !== undefined && userAnswer.selectedAnswer !== '') {
                    const idx = randomAnswers.findIndex(a => a === userAnswer.selectedAnswer);
                    userAnswerText = idx >= 0 ? String.fromCharCode(65 + idx) : "Brak odpowiedzi";
                } else {
                    userAnswerText = "Brak odpowiedzi";
                }
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
    if (currentQuestionIndex === questions.length - 1) {
        const userAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (userAnswer && !userAnswer.isChecked) {
            const question = questions[currentQuestionIndex];
            const answers = question.answers;
            const multi = isMultiSelect(question);
            let selectedTexts = userAnswer.selectedAnswer;
            if (multi) {
                if (selectedTexts && selectedTexts.length > 0) {
                    const selectedIndices = selectedTexts.map(text => answers.findIndex(a => a.text === text));
                    const correctIndices = answers.map((a, idx) => a.correct ? idx : -1).filter(idx => idx !== -1);
                    const isCorrect = arraysEqualNoOrder(selectedIndices, correctIndices);
                    userAnswer.isCorrect = isCorrect;
                    userAnswer.correctAnswer = correctIndices;
                    userAnswer.isChecked = true;
                    if (isCorrect) score++;
                }
            } else {
                if (selectedTexts !== undefined && selectedTexts !== '') {
                    const selectedIndex = answers.findIndex(a => a.text === selectedTexts);
                    const correctIndices = answers.map((a, idx) => a.correct ? idx : -1).filter(idx => idx !== -1);
                    const isCorrect = answers[selectedIndex]?.correct || false;
                    userAnswer.isCorrect = isCorrect;
                    userAnswer.correctAnswer = correctIndices;
                    userAnswer.isChecked = true;
                    if (isCorrect) score++;
                }
            }
        }
    }

    for (let i = 0; i < questions.length; i++) {
        let userAnswer = userAnswers.find(a => a.questionIndex === i);
        const question = questions[i];
        const answers = question.answers;
        const multi = isMultiSelect(question);
        const correctIndices = answers.map((a, idx) => a.correct ? idx : -1).filter(idx => idx !== -1);
        
        if (!userAnswer) {
            userAnswer = {
                questionIndex: i,
                selectedAnswer: multi ? [] : '',
                isCorrect: false,
                correctAnswer: correctIndices,
                isChecked: true
            };
            userAnswers.push(userAnswer);
        } else if (!userAnswer.isChecked) {
            let isCorrect = false;
            let selectedTexts = userAnswer.selectedAnswer;
            if (multi) {
                const selectedIndices = selectedTexts && selectedTexts.length > 0 
                    ? selectedTexts.map(text => answers.findIndex(a => a.text === text)) 
                    : [];
                isCorrect = arraysEqualNoOrder(selectedIndices, correctIndices);
            } else {
                const selectedIndex = selectedTexts ? answers.findIndex(a => a.text === selectedTexts) : -1;
                isCorrect = selectedIndex >= 0 ? answers[selectedIndex]?.correct || false : false;
            }
            userAnswer.isCorrect = isCorrect;
            userAnswer.correctAnswer = correctIndices;
            userAnswer.isChecked = true;
            if (isCorrect) score++;
        }
    }
    
    quizFinished = true;
    showResults();
}

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

function checkAnswer() {
    const question = questions[currentQuestionIndex];
    const answers = question.answers;
    const multi = isMultiSelect(question);
    let selectedTexts;

    if (multi) {
        selectedTexts = Array.from(document.querySelectorAll('input[name="answer"]:checked')).map(i => i.value);
        if (selectedTexts.length === 0) {
            alert('Wybierz co najmniej jedną odpowiedź przed sprawdzeniem!');
            return;
        }
    } else {
        const selectedAnswer = document.querySelector('input[name="answer"]:checked');
        if (!selectedAnswer) {
            alert('Wybierz odpowiedź przed sprawdzeniem!');
            return;
        }
        selectedTexts = selectedAnswer.value;
    }

    let selectedIndices;
    if (multi) {
        selectedIndices = selectedTexts.map(text => answers.findIndex(a => a.text === text));
    } else {
        selectedIndices = answers.findIndex(a => a.text === selectedTexts);
    }

    const correctIndices = answers
        .map((a, idx) => a.correct ? idx : -1)
        .filter(idx => idx !== -1);

    let isCorrect = false;
    if (multi) {
        isCorrect = arraysEqualNoOrder(selectedIndices, correctIndices);
    } else {
        isCorrect = answers[selectedIndices]?.correct || false;
    }

    const existingIndex = userAnswers.findIndex(a => a.questionIndex === currentQuestionIndex);
    if (existingIndex !== -1) {
        if (!userAnswers[existingIndex].isChecked) {
            userAnswers[existingIndex].isChecked = true;
            userAnswers[existingIndex].isCorrect = isCorrect;
            userAnswers[existingIndex].correctAnswer = correctIndices;
            userAnswers[existingIndex].selectedAnswer = multi ? selectedTexts : selectedTexts;
            if (isCorrect) score++;
        }
    } else {
        userAnswers.push({
            questionIndex: currentQuestionIndex,
            selectedAnswer: multi ? selectedTexts : selectedTexts,
            isCorrect: isCorrect,
            correctAnswer: correctIndices,
            isChecked: true
        });
        if (isCorrect) score++;
    }
    checkedQuestions[currentQuestionIndex] = true;
    showAnswerResult(isCorrect, selectedIndices, question, correctIndices, multi);
    updateScore();
}

function arraysEqualNoOrder(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
}

function showAnswerResult(isCorrect, selectedAnswer, question, correctIndices, multi) {
    const answers = question.answers;
    let correctAnswers = correctIndices.map(idx => answers[idx]);
    let selectedAnswers = multi ? selectedAnswer.map(idx => answers[idx]) : [answers[selectedAnswer]];
    
    let selectedDisplayText = selectedAnswers.map(a => {
        if (!a) return '';
        return a.text;
    }).join('<br>');
    
    let correctDisplayText = correctAnswers.map(a => {
        return a.text;
    }).join('<br>');
    
    let resultHtml = `
        <div class="answer-result ${isCorrect ? 'correct' : 'incorrect'}">
            <h3>${isCorrect ? '✓ Poprawna odpowiedź!' : '✗ Błędna odpowiedź'}</h3>
            <p>Twoja odpowiedź: ${selectedDisplayText}</p>
    `;
    if (!isCorrect) {
        resultHtml += `<p>Poprawna odpowiedź: ${correctDisplayText}</p>`;
    }
    resultHtml += `
            <button onclick=\"nextQuestion()\">Następne pytanie</button>
        </div>
    `;
    resultsContainer.innerHTML = resultHtml;
    checkButton.style.display = 'none';
}

function nextQuestion() {
    currentQuestionIndex++;
    resultsContainer.innerHTML = '';
    checkButton.style.display = 'block';
    displayQuestion();
}

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
        const answers = question.answers;
        const status = answer.isCorrect ? '✓' : '✗';
        const statusClass = answer.isCorrect ? 'correct' : 'incorrect';
        
        let userAnswerText = "Brak";
        if (Array.isArray(answer.selectedAnswer)) {
            userAnswerText = answer.selectedAnswer.map(text => text.substring(0, 50) + (text.length > 50 ? '...' : '')).join('; ');
        } else if (answer.selectedAnswer !== undefined && answer.selectedAnswer !== '') {
            const text = answer.selectedAnswer;
            userAnswerText = text.substring(0, 50) + (text.length > 50 ? '...' : '');
        }
        
        let correctAnswerText = "";
        if (Array.isArray(answer.correctAnswer)) {
            correctAnswerText = answer.correctAnswer.map(idx => {
                const text = answers[idx]?.text || '?';
                return text.substring(0, 50) + (text.length > 50 ? '...' : '');
            }).join('; ');
        }
        
        resultsHtml += `
            <div class="answer-summary ${statusClass}">
                <span class="status">${status}</span>
                <span class="question-number">Pytanie ${index + 1}:</span>
                <span class="user-answer">${userAnswerText}</span>
                ${!answer.isCorrect ? `<span class="correct-answer">Poprawna: ${correctAnswerText}</span>` : ''}
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

function restartQuiz() {
    quizStartModal.style.display = 'flex';
}

function reviewQuestions() {
    currentQuestionIndex = 0;
    displayQuestion();
}

function updateScore() {
    if (scoreCounter) {
        scoreCounter.textContent = `${score} / ${questions.length}`;
    }
}

checkButton.addEventListener('click', checkAnswer);

document.addEventListener('DOMContentLoaded', loadQuestions);

function isMultiSelect(question) {
    return question.answers.filter(a => a.correct).length > 1;
}
