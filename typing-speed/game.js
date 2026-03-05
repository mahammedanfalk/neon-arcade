// ===== Typing Speed — Neon Edition =====
(function () {
    'use strict';

    const WORDS = [
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
        'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
        'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
        'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
        'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
        'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
        'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
        'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
        'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
        'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
        'any', 'these', 'give', 'day', 'most', 'us', 'great', 'between', 'need',
        'large', 'under', 'never', 'each', 'game', 'life', 'write', 'become',
        'three', 'high', 'place', 'years', 'live', 'where', 'off', 'always',
        'play', 'home', 'read', 'hand', 'port', 'move', 'try', 'kind', 'begin',
        'world', 'next', 'still', 'much', 'let', 'here', 'call', 'keep', 'last',
        'long', 'should', 'city', 'own', 'small', 'found', 'those', 'head',
        'stand', 'every', 'change', 'many', 'light', 'page', 'name', 'point',
        'turn', 'right', 'start', 'might', 'story', 'far', 'ask', 'late',
        'run', 'while', 'close', 'night', 'real', 'power', 'set', 'open',
        'seem', 'school', 'watch', 'water', 'room', 'mother', 'area', 'money',
        'side', 'young', 'week', 'social', 'end', 'mind', 'hold', 'state',
        'code', 'plan', 'group', 'line', 'left', 'number', 'form', 'old',
        'build', 'part', 'south', 'sure', 'such', 'car', 'long', 'hard',
        'study', 'music', 'door', 'land', 'food', 'war', 'stop', 'once',
        'earth', 'face', 'fire', 'best', 'team', 'eye', 'top', 'key',
        'above', 'below', 'body', 'color', 'half', 'often', 'table', 'early',
        'reach', 'fast', 'human', 'local', 'level', 'clear', 'unit', 'drive',
        'dark', 'note', 'voice', 'fall', 'order', 'field', 'free', 'press',
        'stay', 'later', 'role', 'maybe', 'pick', 'able', 'rock', 'miss',
        'least', 'space', 'class', 'piece', 'whole', 'wall', 'force', 'floor',
        'past', 'prove', 'fly', 'figure', 'view', 'true', 'trade', 'heart',
        'deep', 'happy', 'full', 'front', 'cover', 'final', 'main', 'bit'
    ];

    let duration = 30;
    let timer = null;
    let timeLeft = 30;
    let started = false;
    let finished = false;
    let currentText = '';
    let typedChars = 0;
    let correctChars = 0;
    let totalKeystrokes = 0;
    let startTime = 0;
    let bestWPM = parseInt(localStorage.getItem('typing-best-wpm') || '0', 10);

    // DOM
    const textDisplay = document.getElementById('text-display');
    const inputField = document.getElementById('input-field');
    const wpmEl = document.getElementById('wpm-val');
    const accEl = document.getElementById('acc-val');
    const timeEl = document.getElementById('time-val');
    const bestEl = document.getElementById('best-val');
    const resultPanel = document.getElementById('result-panel');
    const resultStats = document.getElementById('result-stats');
    const retryBtn = document.getElementById('retry-btn');

    bestEl.textContent = bestWPM;

    // Generate random text
    function generateText(wordCount = 80) {
        const result = [];
        for (let i = 0; i < wordCount; i++) {
            result.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
        }
        return result.join(' ');
    }

    // Render text with character spans
    function renderText() {
        textDisplay.innerHTML = '';
        for (let i = 0; i < currentText.length; i++) {
            const span = document.createElement('span');
            span.classList.add('char');
            span.classList.add(i === 0 ? 'current' : 'pending');
            span.textContent = currentText[i];
            textDisplay.appendChild(span);
        }
    }

    // Initialize
    function initGame() {
        currentText = generateText();
        typedChars = 0;
        correctChars = 0;
        totalKeystrokes = 0;
        timeLeft = duration;
        started = false;
        finished = false;
        startTime = 0;

        wpmEl.textContent = '0';
        accEl.textContent = '100%';
        timeEl.textContent = duration;
        inputField.value = '';
        inputField.disabled = false;
        resultPanel.classList.add('hidden');
        textDisplay.classList.remove('hidden');
        inputField.classList.remove('hidden');

        renderText();
        inputField.focus();

        if (timer) clearInterval(timer);
    }

    // Start timer
    function startTimer() {
        started = true;
        startTime = Date.now();
        timer = setInterval(() => {
            timeLeft--;
            timeEl.textContent = timeLeft;
            updateWPM();
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    // Update WPM
    function updateWPM() {
        const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
        if (elapsed <= 0) return;
        const wpm = Math.round(correctChars / 5 / elapsed);
        wpmEl.textContent = wpm;
        return wpm;
    }

    // End game
    function endGame() {
        finished = true;
        clearInterval(timer);
        inputField.disabled = true;

        const elapsed = (Date.now() - startTime) / 1000;
        const minutes = elapsed / 60;
        const wpm = Math.round(correctChars / 5 / minutes) || 0;
        const accuracy = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 100) : 100;

        wpmEl.textContent = wpm;
        accEl.textContent = accuracy + '%';

        if (wpm > bestWPM) {
            bestWPM = wpm;
            localStorage.setItem('typing-best-wpm', bestWPM.toString());
            bestEl.textContent = bestWPM;
        }

        // Show results
        const isNewBest = wpm >= bestWPM && wpm > 0;
        resultStats.innerHTML = `
            <div style="font-family:'Orbitron',sans-serif;font-size:1.5rem;color:#00ff88;margin-bottom:8px;">${wpm} WPM</div>
            <div>Accuracy: <strong style="color:#00d4ff">${accuracy}%</strong></div>
            <div>Characters: <strong style="color:#b44dff">${correctChars}</strong> correct / ${totalKeystrokes} total</div>
            <div>Time: <strong>${Math.round(elapsed)}s</strong></div>
            ${isNewBest ? '<div style="color:#ffe600;margin-top:8px;font-family:Orbitron;font-size:0.7rem;">🏆 NEW BEST!</div>' : ''}
        `;
        resultPanel.classList.remove('hidden');

        if (window.NeonSFX) NeonSFX.win();
    }

    // Input handler
    inputField.addEventListener('input', () => {
        if (finished) return;
        if (!started) startTimer();

        const inputVal = inputField.value;
        const chars = textDisplay.querySelectorAll('.char');
        totalKeystrokes = inputVal.length;

        let correct = 0;
        for (let i = 0; i < currentText.length; i++) {
            const span = chars[i];
            span.classList.remove('correct', 'incorrect', 'current', 'pending');

            if (i < inputVal.length) {
                if (inputVal[i] === currentText[i]) {
                    span.classList.add('correct');
                    correct++;
                } else {
                    span.classList.add('incorrect');
                }
            } else if (i === inputVal.length) {
                span.classList.add('current');
            } else {
                span.classList.add('pending');
            }
        }

        correctChars = correct;
        typedChars = inputVal.length;

        const accuracy = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 100) : 100;
        accEl.textContent = accuracy + '%';

        updateWPM();

        // Auto-scroll text display to keep current char visible
        if (inputVal.length < chars.length) {
            const currentChar = chars[inputVal.length];
            const rect = currentChar.getBoundingClientRect();
            const displayRect = textDisplay.getBoundingClientRect();
            if (rect.bottom > displayRect.bottom - 10) {
                textDisplay.scrollTop += rect.bottom - displayRect.bottom + 30;
            }
        }

        // If typed all text, generate more
        if (inputVal.length >= currentText.length) {
            const moreText = generateText(40);
            currentText += ' ' + moreText;
            // Re-render
            for (let i = 0; i < moreText.length + 1; i++) {
                const span = document.createElement('span');
                span.classList.add('char', 'pending');
                span.textContent = (i === 0 ? ' ' : moreText[i - 1]);
                textDisplay.appendChild(span);
            }
        }
    });

    // Duration selector
    document.querySelectorAll('.dur-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            duration = parseInt(btn.dataset.dur, 10);
            document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            initGame();
        });
    });

    // Retry
    retryBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        initGame();
    });

    // Mute
    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = document.getElementById('mute-icon');
    if (muteBtn && muteIcon) {
        muteBtn.addEventListener('click', () => {
            if (!window.NeonSFX) return;
            const muted = NeonSFX.toggleMute();
            muteIcon.textContent = muted ? '🔇' : '🔊';
            muteBtn.style.borderColor = muted ? 'rgba(255,45,117,0.3)' : 'rgba(0,255,136,0.2)';
            muteBtn.style.color = muted ? '#ff2d75' : '#00ff88';
        });
    }

    // Init
    window.addEventListener('DOMContentLoaded', initGame);
})();
