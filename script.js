// Calculator State
let currentInput = '0';
let history = [];
let isDark = false;
let shouldResetDisplay = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // Buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const value = btn.textContent;
            handleInput(action, value);
        });
    });

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', toggleTheme);

    // History Toggle
    const historyToggle = document.getElementById('history-toggle');
    const historySidebar = document.querySelector('.history-sidebar');
    historyToggle.addEventListener('click', () => {
        historySidebar.classList.toggle('open');
    });

    // History: Close and Clear buttons
    const closeHistoryBtn = document.getElementById('close-history');
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            historySidebar.classList.remove('open');
        });
    }
    const clearHistoryBtn = document.getElementById('clear-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            clearHistory();
        });
    }

    // Close history when clicking outside
    document.addEventListener('click', (e) => {
        if (!historySidebar.contains(e.target) && !historyToggle.contains(e.target) && historySidebar.classList.contains('open')) {
            historySidebar.classList.remove('open');
        }
    });

    // Keyboard support
    document.addEventListener('keydown', handleKeyboard);

    loadHistory();
}

// Handle Input
function handleInput(action, value) {
    const display = document.getElementById('display');
    
    // Prevent multiple operations if error
    if (display.textContent === 'Error') {
        clearCalculator();
    }

    if (!action) {
        // Number
        appendNumber(value);
    } else if (action === 'clear') {
        clearCalculator();
    } else if (action === 'delete') {
        deleteNumber();
    } else if (action === 'equals' || action === '=') {
        evaluate();
    } else if (['+', '-', '*', '/'].includes(action)) {
        appendOperator(action);
    } else {
        handleScientific(action);
    }
}

// Logic: Append Number
function appendNumber(number) {
    if (shouldResetDisplay) {
        currentInput = '';
        shouldResetDisplay = false;
    }

    if (currentInput === '0' && number !== '.') {
        currentInput = number;
    } else {
        if (number === '.' && canAppendDot()) {
            currentInput += number;
        } else if (number !== '.') {
            // Implicit multiplication: (2+2)3 -> (2+2)*3
            const lastChar = currentInput.slice(-1);
            if (lastChar === ')' || lastChar === 'π') {
                currentInput += '*' + number;
            } else {
                currentInput += number;
            }
        }
    }
    updateDisplay();
}

function canAppendDot() {
    // Simple check: take the last number segment and see if it has a dot
    const segments = currentInput.split(/[\+\-\*\/\(\)]/);
    const lastSegment = segments[segments.length - 1];
    return !lastSegment.includes('.');
}

// Logic: Append Operator
function appendOperator(op) {
    shouldResetDisplay = false;
    
    // Prevent stacking operators like ++ or **
    const lastChar = currentInput.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) {
        currentInput = currentInput.slice(0, -1) + op;
    } else {
        currentInput += op;
    }
    updateDisplay();
}

// Logic: Scientific Functions (Infix Style)
function handleScientific(action) {
    shouldResetDisplay = false;
    
    if (currentInput === '0') currentInput = '';

    // Helper to add * if needed (e.g. 2sin -> 2*sin)
    const appendImplicitMult = () => {
        if (currentInput === '') return;
        const lastChar = currentInput.slice(-1);
        if (/[\d\)\π]/.test(lastChar)) {
            currentInput += '*';
        }
    };

    switch(action) {
        case 'sin':
        case 'cos':
        case 'tan':
        case 'log':
            appendImplicitMult();
            currentInput += action + '(';
            break;
        case 'sqrt':
            appendImplicitMult();
            currentInput += '√(';
            break;
        case 'exp': // e^x
            appendImplicitMult();
            currentInput += 'e^(';
            break;
        case 'pow': // x^y
            currentInput += '^';
            break;
        case 'square': // x^2
            currentInput += '^2';
            break;
        case 'pi':
            appendImplicitMult();
            currentInput += 'π';
            break;
        case '(':
            appendImplicitMult();
            currentInput += action;
            break;
        case ')':
            currentInput += action;
            break;
    }
    updateDisplay();
}

// Logic: Evaluate
function evaluate() {
    const displaySecondary = document.getElementById('display-secondary');
    
    try {
        let expression = currentInput;
        
        // Auto-close parentheses
        const openParens = (expression.match(/\(/g) || []).length;
        const closeParens = (expression.match(/\)/g) || []).length;
        if (openParens > closeParens) {
            expression += ')'.repeat(openParens - closeParens);
        }

        // Prepare for evaluation
        // 1. Replace UI symbols with JS
        let evalString = expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/√/g, 'sqrt')
            .replace(/π/g, 'PI')
            .replace(/\^/g, '**')
            .replace(/e\*\*\(/g, 'exp('); // Fix e^( -> exp(

        // Custom Math Context
        const degToRad = (deg) => deg * (Math.PI / 180);
        
        const context = {
            sin: (d) => Math.sin(degToRad(d)),
            cos: (d) => Math.cos(degToRad(d)),
            tan: (d) => Math.tan(degToRad(d)),
            log: Math.log10,
            sqrt: Math.sqrt,
            exp: Math.exp,
            PI: Math.PI,
            E: Math.E
        };

        // Create function with context keys as arguments
        const keys = Object.keys(context);
        const values = Object.values(context);
        
        // Use a Function constructor to evaluate safely within context
        const calcFunc = new Function(...keys, `return ${evalString}`);
        let result = calcFunc(...values);

        // Formatting
        if (!isFinite(result) || isNaN(result)) {
            showError();
            return;
        }

        // Round to avoid floating point errors (e.g. sin(180) should be 0)
        // Check for integer proximity
        if (Math.abs(result - Math.round(result)) < 1e-10) {
            result = Math.round(result);
        } else {
            result = parseFloat(result.toFixed(8));
        }
        
        // Add to history
        addToHistory(expression, result);

        currentInput = result.toString();
        displaySecondary.textContent = expression + ' =';
        shouldResetDisplay = true;
        updateDisplay(true); // true = showing result

    } catch (e) {
        showError();
    }
}

// Logic: Clear
function clearCalculator() {
    currentInput = '0';
    shouldResetDisplay = false;
    document.getElementById('display-secondary').textContent = '';
    updateDisplay();
}

// Logic: Delete
function deleteNumber() {
    if (shouldResetDisplay) {
        clearCalculator();
        return;
    }
    
    const display = document.getElementById('display');
    if (currentInput.length === 1 || display.textContent === 'Error') {
        currentInput = '0';
    } else {
        // Simple delete last char
        currentInput = currentInput.slice(0, -1);
        if (currentInput === '') currentInput = '0';
    }
    updateDisplay();
}

// Logic: Update Display
function updateDisplay(isResult = false) {
    const display = document.getElementById('display');
    display.classList.remove('error');
    let formattedInput = currentInput;
    
    // Replace operators for better UI
    formattedInput = formattedInput
        .replace(/\*/g, '×')
        .replace(/\//g, '÷');

    display.textContent = formattedInput;
    display.scrollLeft = display.scrollWidth;
}

// Error Message
function showError() {
    const display = document.getElementById('display');
    display.textContent = "Error";
    display.classList.add('error');
    currentInput = '0';
    shouldResetDisplay = true;
}

// History Management
function addToHistory(expression, result) {
    const historyItem = { expression, result };
    history.unshift(historyItem);
    if (history.length > 20) history.pop();
    saveHistory();
    renderHistory();
}

function renderHistory() {
    const historyContainer = document.getElementById('history-list');
    if (!historyContainer) return; // Guard clause
    
    historyContainer.innerHTML = '';
    if (history.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'history-placeholder';
        placeholder.textContent = 'No calculations yet ⚽';
        historyContainer.appendChild(placeholder);
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="hist-exp">${item.expression}</div>
            <div class="hist-res">= ${item.result}</div>
        `;
        div.addEventListener('click', () => {
            currentInput = item.result.toString();
            updateDisplay();
            document.querySelector('.history-sidebar').classList.remove('open');
        });
        historyContainer.appendChild(div);
    });
}

function saveHistory() {
    localStorage.setItem('ft_calc_history', JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem('ft_calc_history');
    if (saved) {
        history = JSON.parse(saved);
        renderHistory();
    }
}

function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
}

// Keyboard Support
function handleKeyboard(e) {
    const key = e.key;
    
    if (key >= '0' && key <= '9') handleInput(null, key);
    if (key === '.') handleInput(null, '.');
    if (key === '+') handleInput('+', null);
    if (key === '-') handleInput('-', null);
    if (key === '*') handleInput('*', null);
    if (key === '/') handleInput('/', null);
    if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleInput('equals', null);
    }
    if (key === 'Backspace') handleInput('delete', null);
    if (key === 'Escape') handleInput('clear', null);
    if (key === '(' || key === ')') handleInput(key, null);
}

// Theme Toggle
function toggleTheme() {
    isDark = !isDark;
    const themeToggle = document.getElementById('theme-toggle');
    if (isDark) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<span class="toggle-icon">⚽</span>';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<span class="toggle-icon">⚽</span>';
    }
}
