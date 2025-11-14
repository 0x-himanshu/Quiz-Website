/**
 * Awesome Quiz App - Vanilla JavaScript Logic (FINAL UPDATED VERSION)
 *
 * Implements:
 * 1. Two-Level Navigation: Category (Subject) -> Sub-Category (Unit/Topic).
 * 2. Auto-Next Logic: Question advances automatically 1.5s after user selection.
 * 3. Permanent Back Button Logic: Manages back navigation across all screens.
 * 4. Timer: Stops on answer, restarts on new question.
 * 5. Theme Toggle, Sound effects, and Apps Script integration.
 */

// --- 1. CONFIGURATION ---

const SHEET_BASE_URL = "https://script.google.com/macros/s/AKfycbz-joLFFraia3zHDWK2_-spuEZuGPbvZ6fULaGjaaX_2c2jYlzlpgwP_eB7lYDAQ4sq9g/exec";
const QUIZ_TIME_SECONDS = 15; 
const SOUND_CORRECT_URL = "https://cdn.jsdelivr.net/gh/himanshudc/cdn/correct.mp3"; 
const SOUND_WRONG_URL = "https://cdn.jsdelivr.net/gh/himanshudc/cdn/wrong.mp3"; 
const AUTO_NEXT_DELAY_MS = 1500; // 1.5 seconds delay before moving to the next question

// --- 2. GLOBAL STATE ---

let currentQuizData = []; 
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let confettiInterval; // For tracking confetti animation

// New state for navigation
let currentScreen = 'homeScreen';
let activeCategory = '';      // Stores the main category name (e.g., 'Python')
let activeQuizSheet = '';     // Stores the Google Sheet name currently being quizzed (e.g., 'Python_Unit1')


// --- 3. TWO-LEVEL CATEGORY STRUCTURE (Customize this based on your Google Sheets) ---
const QUIZ_STRUCTURE = {
    "Internet Of Things": [
        { name: "IOT UT1 (I)",   sheet: "IOT UT1 (I)" },
        { name: "IOT UT1 (II)",  sheet: "IOT UT1 (II)" },

        { name: "IOT UT2 (I)",   sheet: "IOT UT2 (I)" },
        { name: "IOT UT2 (II)",  sheet: "IOT UT2 (II)" },
        { name: "IOT UT2 (III)", sheet: "IOT UT2 (III)" },
       
        { name: "IOT UT3 (I)",   sheet: "IOT UT3 (I)" },
        { name: "IOT UT3 (II)",  sheet: "IOT UT3 (II)" },
        { name: "IOT UT3 (III)", sheet: "IOT UT3 (III)" },
      
        { name: "IOT UT4 (I)",   sheet: "IOT UT4 (I)" },
        { name: "IOT UT4 (II)",  sheet: "IOT UT4 (II)" },
        { name: "IOT UT4 (III)", sheet: "IOT UT4 (III)" },
        { name: "IOT UT4 (IV)",  sheet: "IOT UT4 (IV)" },
    ],
    "Big Data": [
        { name: "Big Data UT1 (I)",   sheet: "BD UT1 (I)" },
        { name: "Big Data UT1 (II)",  sheet: "BD UT1 (II)" },
        { name: "Big Data UT1 (III)", sheet: "BD UT1 (III)" },
        { name: "Big Data UT1 (IV)",  sheet: "BD UT1 (IV)" },
        { name: "Big Data UT2 (I)",   sheet: "BD UT2 (I)" },
        { name: "Big Data UT2 (II)",  sheet: "BD UT2 (II)" },
        { name: "Big Data UT2 (III)", sheet: "BD UT2 (III)" },
        { name: "Big Data UT2 (IV)",  sheet: "BD UT2 (IV)" },
        { name: "Big Data UT3 (I)",   sheet: "BD UT3 (I)" },
        { name: "Big Data UT3 (II)",  sheet: "BD UT3 (II)" },
        { name: "Big Data UT3 (III)", sheet: "BD UT3 (III)" },
        { name: "Big Data UT3 (IV)",  sheet: "BD UT3 (IV)" },
        { name: "Big Data UT4 (I)",   sheet: "BD UT4 (I)" },
        { name: "Big Data UT4 (II)",  sheet: "BD UT4 (II)" },
        { name: "Big Data UT4 (III)", sheet: "BD UT4 (III)" },
        { name: "Big Data UT4 (IV)",  sheet: "BD UT4 (IV)" },
    ]
    // Add all your subjects and units here
};


// --- 4. DOM ELEMENT REFERENCES ---

const elements = {};

const getElements = () => {
    // Standard Screens
    elements.homeScreen = document.getElementById('homeScreen');
    elements.quizPanel = document.getElementById('quizPanel');
    elements.endScreen = document.getElementById('endScreen');

    // New Sub-Category Screen Elements
    elements.subCategoryScreen = document.getElementById('subCategoryScreen');
    elements.subCategoryList = document.getElementById('subCategoryList');
    elements.subCategoryTitle = document.getElementById('subCategoryTitle');
    elements.permanentBackButton = document.getElementById('permanentBackButton'); // New

    // Core Elements
    elements.categoryList = document.getElementById('categoryList');
    elements.categorySearch = document.getElementById('categorySearch');
    elements.quizCategoryTitle = document.getElementById('quizCategoryTitle');
    elements.questionText = document.getElementById('questionText');
    elements.optionsContainer = document.getElementById('optionsContainer');
    elements.currentScore = document.getElementById('currentScore');
    elements.progressBar = document.getElementById('progressBar');
    elements.finalScore = document.getElementById('finalScore');
    elements.restartQuizButton = document.getElementById('restartQuizButton');
    elements.backToHomeButton = document.getElementById('backToHomeButton');
    elements.themeToggle = document.getElementById('themeToggle');
    elements.cursorTrail = document.querySelector('.cursor-trail');
};

// --- 5. UTILITY FUNCTIONS ---

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const playSound = (url) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.warn("Sound playback failed:", e));
};

// --- 6. THEME TOGGLE LOGIC (Remains unchanged) ---
const setupThemeToggle = () => {
    // ... [Theme Toggle logic remains the same] ...
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');

    const setAppTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        elements.themeToggle.checked = (theme === 'light');
    };

    if (storedTheme) {
        setAppTheme(storedTheme);
    } else {
        setAppTheme(prefersDark ? 'dark' : 'light');
    }

    elements.themeToggle.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        setAppTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
};


// --- 7. NAVIGATION CONTROL ---

/**
 * Switches between the application screens, updates currentScreen state, and manages the Back button.
 */
const switchScreen = (screenToShowId) => {
    const allScreens = [elements.homeScreen, elements.subCategoryScreen, elements.quizPanel, elements.endScreen];
    
    allScreens.forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    const screenToShow = document.getElementById(screenToShowId);
    if (screenToShow) screenToShow.classList.add('active');
    
    currentScreen = screenToShowId;

    // Permanent Back button visibility logic
    if (screenToShowId === 'homeScreen') {
        elements.permanentBackButton.style.display = 'none';
    } else {
        elements.permanentBackButton.style.display = 'block';
    }
};

/**
 * Loads the main categories (Subjects) on the home screen.
 */
const fetchMainCategories = () => {
    switchScreen('homeScreen');
    elements.categoryList.innerHTML = '';
    
    const mainCategories = Object.keys(QUIZ_STRUCTURE);

    if (mainCategories.length === 0) {
        elements.categoryList.innerHTML = `<p style="color:var(--color-error);">No categories defined in QUIZ_STRUCTURE.</p>`;
        return;
    }
    
    mainCategories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.textContent = cat;
        card.addEventListener('click', () => loadSubCategories(cat)); 
        elements.categoryList.appendChild(card);
    });
};

/**
 * Loads and displays the sub-categories (Units/Topics) for a selected main category.
 */
const loadSubCategories = (categoryName) => {
    switchScreen('subCategoryScreen');
    elements.subCategoryTitle.textContent = `Topics in ${categoryName}`;
    elements.subCategoryList.innerHTML = '';
    activeCategory = categoryName;

    const subCategories = QUIZ_STRUCTURE[categoryName] || [];

    if (subCategories.length === 0) {
        elements.subCategoryList.innerHTML = `<p style="color:var(--color-error);">No topics found for ${categoryName}.</p>`;
        return;
    }

    subCategories.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.textContent = sub.name;
        card.addEventListener('click', () => {
            activeQuizSheet = sub.sheet; 
            elements.quizCategoryTitle.textContent = `${categoryName} - ${sub.name}`;
            loadQuiz(sub.sheet); 
        });
        elements.subCategoryList.appendChild(card);
    });
};

/**
 * Logic for the permanent back button.
 */
const handlePermanentBack = () => {
    clearTimeout(timerInterval); // Stop any quiz timer
    if (currentScreen === 'subCategoryScreen') {
        fetchMainCategories(); // Units -> Subjects (Home)
    } else if (currentScreen === 'quizPanel' || currentScreen === 'endScreen') {
        loadSubCategories(activeCategory); // Quiz/End -> Units list
    }
};

/**
 * Filters the main category list based on search input.
 */
const filterCategories = (event) => {
    const searchText = event.target.value.toLowerCase();
    const cards = elements.categoryList.querySelectorAll('.category-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        // Use 'block' or 'grid' depending on your CSS display for category cards
        card.style.display = text.includes(searchText) ? 'grid' : 'none'; 
    });
};


// --- 8. QUIZ FLOW ---

/**
 * Fetches quiz data from Google Sheets using the specified sheet name.
 */
const loadQuiz = async (sheetName) => {
    switchScreen('quizPanel');
    currentQuestionIndex = 0;
    score = 0;
    elements.currentScore.textContent = score;
    elements.questionText.textContent = "Fetching questions, please wait...";
    elements.optionsContainer.innerHTML = ''; 

    const url = `${SHEET_BASE_URL}?sheet=${encodeURIComponent(sheetName)}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.data.length > 0) {
            currentQuizData = result.data;
            displayQuestion();
        } else {
            elements.questionText.textContent = "No questions found for this category. Check your Google Sheet name/data.";
        }
    } catch (error) {
        console.error("Failed to fetch quiz data:", error);
        elements.questionText.textContent = `API Error: Check URL and Apps Script deployment. (${error.message})`;
    }
};

/**
 * Displays the current question and shuffles/renders options.
 */
const displayQuestion = () => {
    clearTimeout(timerInterval);
    
    if (currentQuestionIndex >= currentQuizData.length) {
        showEndScreen();
        return;
    }

    const q = currentQuizData[currentQuestionIndex];
    elements.questionText.textContent = `${currentQuestionIndex + 1}. ${q.Questions}`;
    elements.optionsContainer.innerHTML = '';

    const options = [q.Option1, q.Option2, q.Option3, q.Option4];
    const correctAnswer = q.Answer;

    shuffleArray(options);

    options.forEach(optionText => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = optionText;
        button.dataset.answer = (optionText === correctAnswer) ? 'correct' : 'incorrect';
        button.addEventListener('click', () => checkAnswer(button, correctAnswer)); 
        elements.optionsContainer.appendChild(button);
    });

    startTimer();
};

// --- 9. QUIZ MECHANICS ---

/**
 * Starts the countdown timer.
 */
const startTimer = () => {
    elements.progressBar.style.transition = 'none';
    elements.progressBar.style.width = '100%';

    setTimeout(() => {
        elements.progressBar.style.transition = `width ${QUIZ_TIME_SECONDS}s linear`;
        elements.progressBar.style.width = '0%';
    }, 50);

    timerInterval = setTimeout(() => {
        checkAnswer(null, currentQuizData[currentQuestionIndex].Answer, true); 
    }, QUIZ_TIME_SECONDS * 1000);
};

/**
 * Checks the selected answer and implements AUTO-NEXT.
 */
const checkAnswer = (selectedButton, correctAnswer, isTimeout = false) => {
    clearTimeout(timerInterval); // Stop the timer immediately
    
    const optionButtons = elements.optionsContainer.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => btn.disabled = true); // Disable all options

    if (isTimeout) {
        playSound(SOUND_WRONG_URL);
        optionButtons.forEach(btn => {
            if (btn.textContent === correctAnswer) {
                btn.classList.add('correct');
            }
        });
        elements.questionText.textContent += " (Time Out!)";
    } else {
        // User clicked an option
        if (selectedButton.dataset.answer === 'correct') {
            score++;
            playSound(SOUND_CORRECT_URL);
            selectedButton.classList.add('correct');
        } else {
            playSound(SOUND_WRONG_URL);
            selectedButton.classList.add('wrong');
            // Highlight the correct answer
            optionButtons.forEach(btn => {
                if (btn.textContent === correctAnswer) {
                    btn.classList.add('correct');
                }
            });
        }
        elements.currentScore.textContent = score;
    }

    // *** AUTO-NEXT LOGIC ***
    // 1.5 सेकंड बाद अगले प्रश्न पर जाएं (Smooth transition)
    setTimeout(() => {
        nextQuestion();
    }, AUTO_NEXT_DELAY_MS);
};

/**
 * Moves to the next question.
 */
const nextQuestion = () => {
    currentQuestionIndex++;
    displayQuestion();
};

/**
 * Displays the final score and end screen.
 */
const showEndScreen = () => {
    switchScreen('endScreen');
    elements.finalScore.textContent = `${score} / ${currentQuizData.length}`;
    
    // Confetti for good score
    if (score >= currentQuizData.length * 0.6) {
        triggerConfetti();
    }
};

/**
 * Retries the current quiz using the saved sheet name.
 */
const restartQuiz = () => {
    // Retry button uses the last saved quiz sheet
    loadQuiz(activeQuizSheet);
};

/**
 * Returns to the main subject categories.
 */
const returnToHome = () => {
    fetchMainCategories();
};


// --- 10. UI EFFECTS (Confetti & Cursor Trail) ---

// Confetti logic using simple JS for particle creation
const triggerConfetti = () => {
    // ... [Detailed Confetti logic remains the same] ...
    const colors = [
        'var(--color-neon-pink)', 
        'var(--color-neon-purple)', 
        '#fff', 
        'var(--color-success)'
    ];
    const count = 50;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight / 2;
        
        const angle = Math.random() * 360;
        const velocity = Math.random() * 15 + 10;
        const rotation = Math.random() * 360;

        particle.style.left = `${startX}px`;
        particle.style.top = `${startY}px`;
        particle.style.opacity = 1;
        particle.style.transform = `rotate(${rotation}deg)`;
        
        document.body.appendChild(particle);

        particle.animate([
            { 
                transform: `translate(0, 0) rotate(${rotation}deg)`, 
                opacity: 1 
            },
            { 
                transform: `translate(${Math.cos(angle * Math.PI / 180) * velocity * 20}px, ${Math.sin(angle * Math.PI / 180) * velocity * 20}px) rotate(${rotation + 720}deg)`,
                opacity: 0
            }
        ], {
            duration: Math.random() * 2000 + 1000,
            easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
            fill: 'forwards'
        }).onfinish = () => {
            particle.remove();
        };
    }
};

// Cursor trail logic using simple element creation
const setupCursorTrail = () => {
    document.addEventListener('mousemove', (e) => {
        const particle = document.createElement('span');
        particle.style.left = `${e.clientX}px`;
        particle.style.top = `${e.clientY}px`;
        particle.className = 'trail-particle';
        
        // Setup styles (from CSS for fading)
        particle.style.position = 'fixed';
        particle.style.width = '10px';
        particle.style.height = '10px';
        particle.style.pointerEvents = 'none';

        elements.cursorTrail.appendChild(particle);

        setTimeout(() => {
            particle.style.opacity = '0';
            particle.style.transform = 'scale(0.1)';
        }, 100);

        setTimeout(() => {
            particle.remove();
        }, 600);
    });
};


// --- 11. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get DOM references
    getElements();

    // 2. Setup event listeners
    elements.restartQuizButton.addEventListener('click', restartQuiz);
    elements.backToHomeButton.addEventListener('click', returnToHome);
    elements.categorySearch.addEventListener('input', filterCategories);
    elements.permanentBackButton.addEventListener('click', handlePermanentBack); // NEW

    // 3. Initialize features
    setupThemeToggle();
    setupCursorTrail();
    
    // 4. Start the application by fetching MAIN categories
    fetchMainCategories();
});