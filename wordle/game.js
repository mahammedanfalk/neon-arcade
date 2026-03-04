// ===== Wordle — Neon Edition =====
(function () {
    'use strict';

    // 500 target words (randomly selected from this list each game)
    const WORDS = [
        'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again',
        'agent', 'agree', 'ahead', 'alarm', 'album', 'alert', 'alien', 'align', 'alive', 'alley',
        'allow', 'alone', 'along', 'alter', 'amaze', 'among', 'angel', 'anger', 'angle', 'angry',
        'apart', 'apple', 'apply', 'arena', 'argue', 'arise', 'armor', 'array', 'aside', 'asset',
        'avoid', 'award', 'aware', 'awful', 'badly', 'baker', 'bases', 'basic', 'basin', 'basis',
        'batch', 'beach', 'begun', 'being', 'below', 'bench', 'bible', 'birth', 'black', 'blade',
        'blame', 'bland', 'blank', 'blast', 'blaze', 'bleed', 'blend', 'bless', 'blind', 'block',
        'blood', 'bloom', 'blown', 'board', 'bonus', 'boost', 'booth', 'bound', 'brain', 'brand',
        'brave', 'bread', 'break', 'breed', 'brick', 'bride', 'brief', 'bring', 'broad', 'broke',
        'brook', 'brown', 'brush', 'buddy', 'build', 'built', 'bunch', 'burst', 'buyer', 'cabin',
        'cable', 'camel', 'candy', 'cargo', 'carry', 'catch', 'cause', 'cedar', 'chain', 'chair',
        'chalk', 'champ', 'chaos', 'charm', 'chart', 'chase', 'cheap', 'check', 'cheek', 'cheer',
        'chess', 'chest', 'chief', 'child', 'china', 'choir', 'chunk', 'cinch', 'civic', 'claim',
        'clash', 'class', 'clean', 'clear', 'clerk', 'click', 'cliff', 'climb', 'cling', 'clock',
        'clone', 'close', 'cloth', 'cloud', 'clown', 'coach', 'coast', 'color', 'comet', 'comic',
        'coral', 'couch', 'could', 'count', 'court', 'cover', 'crack', 'craft', 'crane', 'crash',
        'crawl', 'crazy', 'cream', 'creek', 'crime', 'crisp', 'cross', 'crowd', 'crown', 'crude',
        'crush', 'curve', 'cycle', 'daily', 'dance', 'dealt', 'death', 'debug', 'debut', 'decay',
        'delay', 'delta', 'demon', 'dense', 'depot', 'depth', 'derby', 'devil', 'diary', 'diner',
        'dirty', 'disco', 'ditch', 'dizzy', 'dodge', 'donor', 'doubt', 'dough', 'draft', 'drain',
        'drake', 'drama', 'drank', 'drawn', 'dream', 'dress', 'dried', 'drift', 'drill', 'drink',
        'drive', 'drone', 'drove', 'dummy', 'dusty', 'dwarf', 'dwell', 'dying', 'eager', 'early',
        'earth', 'eater', 'eight', 'elbow', 'elder', 'elect', 'elite', 'email', 'empty', 'endow',
        'enemy', 'enjoy', 'enter', 'entry', 'equal', 'equip', 'error', 'essay', 'ethic', 'event',
        'every', 'exact', 'exert', 'exile', 'exist', 'extra', 'fable', 'facet', 'faint', 'fairy',
        'faith', 'false', 'fancy', 'fatal', 'fatty', 'fault', 'feast', 'fence', 'ferry', 'fever',
        'fewer', 'fiber', 'field', 'fiery', 'fifth', 'fifty', 'fight', 'final', 'first', 'fixed',
        'flame', 'flash', 'flask', 'flesh', 'fleet', 'float', 'flood', 'floor', 'flora', 'flour',
        'fluid', 'flush', 'flute', 'focal', 'focus', 'foggy', 'force', 'forge', 'forth', 'forum',
        'fossil', 'found', 'foxes', 'frame', 'frank', 'fraud', 'fresh', 'front', 'frost', 'froze',
        'fruit', 'fully', 'fungi', 'funny', 'fuzzy', 'giant', 'given', 'gladly', 'glass', 'gleam',
        'glide', 'globe', 'gloom', 'glory', 'glove', 'going', 'grace', 'grade', 'grain', 'grand',
        'grant', 'grape', 'grasp', 'grass', 'grave', 'great', 'greed', 'green', 'greet', 'grief',
        'grill', 'grind', 'groan', 'groom', 'gross', 'group', 'grove', 'growl', 'grown', 'guard',
        'guess', 'guest', 'guide', 'guilt', 'guise', 'gulch', 'gummy', 'guppy', 'gusty', 'gypsy',
        'habit', 'happy', 'harsh', 'haven', 'heart', 'heavy', 'hedge', 'heist', 'hello', 'herbs',
        'hinge', 'hippo', 'hobby', 'homer', 'honey', 'honor', 'horse', 'hotel', 'house', 'human',
        'humid', 'humor', 'hurry', 'hyena', 'hymns', 'ideal', 'image', 'imply', 'inbox', 'index',
        'indie', 'infer', 'inner', 'input', 'irony', 'issue', 'ivory', 'jazzy', 'jelly', 'jewel',
        'joint', 'joker', 'jolly', 'judge', 'juice', 'juicy', 'jumbo', 'jumpy', 'karate', 'kayak',
        'knack', 'knead', 'kneel', 'knife', 'knock', 'known', 'label', 'labor', 'ladle', 'lance',
        'large', 'laser', 'later', 'laugh', 'layer', 'leach', 'learn', 'lease', 'leave', 'legal',
        'lemon', 'level', 'light', 'limit', 'linen', 'liner', 'liter', 'liver', 'local', 'lodge',
        'logic', 'login', 'loser', 'lover', 'lower', 'loyal', 'lucky', 'lunar', 'lunch', 'lunge',
        'lying', 'magic', 'major', 'maker', 'manor', 'maple', 'march', 'match', 'mayor', 'meant',
        'medal', 'media', 'mercy', 'merge', 'merit', 'metal', 'meter', 'might', 'miner', 'minor',
        'minus', 'model', 'money', 'month', 'moral', 'motor', 'mount', 'mouse', 'mouth', 'movie',
        'muddy', 'music', 'naked', 'nasty', 'naval', 'nerve', 'never', 'newly', 'night', 'noble',
        'noise', 'north', 'novel', 'nurse', 'nylon', 'ocean', 'offer', 'often', 'olive', 'onset',
        'opera', 'orbit', 'order', 'organ', 'other', 'ought', 'outer', 'owned', 'owner', 'oxide',
        'ozone', 'panic', 'paper', 'party', 'pasta', 'patch', 'pause', 'peace', 'peach', 'pearl',
        'penny', 'perch', 'phase', 'phone', 'photo', 'piano', 'piece', 'pilot', 'pinch', 'pixel',
        'pizza', 'place', 'plain', 'plane', 'plant', 'plate', 'plaza', 'plead', 'pluck', 'plumb',
        'plume', 'plump', 'plunge', 'point', 'poker', 'polar', 'pound', 'power', 'press', 'price',
        'pride', 'prime', 'print', 'prior', 'prize', 'probe', 'prone', 'proof', 'proud', 'prove',
        'proxy', 'prune', 'pulse', 'punch', 'pupil', 'purse', 'queen', 'query', 'quest', 'quick',
        'quiet', 'quota', 'quote', 'racer', 'radar', 'radio', 'raise', 'rally', 'ranch', 'range',
        'rapid', 'ratio', 'reach', 'react', 'realm', 'rebel', 'reign', 'relax', 'relay', 'renew',
        'repay', 'reply', 'reset', 'rider', 'ridge', 'rifle', 'right', 'rigid', 'risky', 'rival',
        'river', 'robin', 'robot', 'rocky', 'roger', 'rogue', 'roman', 'roost', 'rouge', 'rough',
        'round', 'route', 'royal', 'rugby', 'ruler', 'rural', 'rusty', 'sadly', 'saint', 'salad',
        'salon', 'sandy', 'satin', 'sauce', 'sauna', 'scale', 'scare', 'scene', 'scent', 'scope',
        'score', 'scout', 'scrap', 'sedan', 'seize', 'sense', 'serve', 'setup', 'seven', 'shade',
        'shaft', 'shake', 'shame', 'shape', 'share', 'shark', 'sharp', 'sheep', 'sheer', 'sheet',
        'shelf', 'shell', 'shift', 'shine', 'shirt', 'shock', 'shore', 'short', 'shout', 'shove',
        'shrub', 'sight', 'sigma', 'since', 'sixty', 'sized', 'skate', 'skill', 'skull', 'slate',
        'sleep', 'slice', 'slide', 'slope', 'smart', 'smell', 'smile', 'smoke', 'snack', 'snake',
        'solar', 'solid', 'solve', 'sorry', 'sound', 'south', 'space', 'spare', 'spark', 'speak',
        'spear', 'speed', 'spend', 'spice', 'spine', 'spite', 'split', 'spoke', 'spoon', 'sport',
        'spray', 'squad', 'stack', 'staff', 'stage', 'stain', 'stake', 'stale', 'stall', 'stamp',
        'stand', 'stare', 'stark', 'start', 'state', 'steal', 'steam', 'steel', 'steep', 'steer',
        'stern', 'stick', 'stiff', 'still', 'stock', 'stone', 'stood', 'store', 'storm', 'story',
        'stove', 'strip', 'stuck', 'study', 'stuff', 'stump', 'style', 'sugar', 'suite', 'super',
        'surge', 'swamp', 'swear', 'sweep', 'sweet', 'swept', 'swift', 'swing', 'sword', 'syrup',
    ];

    // Extended valid guesses (any 5-letter word players might type)
    const EXTRA_GUESSES = [
        'acids', 'acoustic', 'acres', 'acted', 'added', 'admin', 'admit', 'aided', 'aimed', 'aired',
        'aisle', 'album', 'algae', 'angel', 'ample', 'amply', 'angel', 'angle', 'ankle', 'annex',
        'anvil', 'aorta', 'aping', 'apple', 'aptly', 'areas', 'argue', 'arose', 'asked', 'attic',
        'audio', 'audit', 'aunts', 'avian', 'awash', 'axial', 'azure', 'badge', 'badly', 'bagel',
        'baggy', 'baits', 'baked', 'balls', 'bands', 'banks', 'baron', 'based', 'baton', 'bears',
        'beast', 'beats', 'begun', 'belts', 'berry', 'bikes', 'bills', 'birds', 'birth', 'bites',
        'blown', 'blues', 'bluff', 'blunt', 'blurb', 'boats', 'bolts', 'bonds', 'bones', 'books',
        'boost', 'boots', 'borne', 'brace', 'brake', 'brass', 'brash', 'bravo', 'brawn', 'bread',
        'brick', 'bride', 'brisk', 'brood', 'broom', 'broth', 'brush', 'buggy', 'bulge', 'bulls',
        'bumps', 'burns', 'buses', 'busts', 'bytes', 'cache', 'caged', 'cakes', 'calms', 'camps',
        'caned', 'canoe', 'caper', 'cards', 'cares', 'cargo', 'carry', 'cases', 'catch', 'cause',
        'caves', 'cease', 'cells', 'cents', 'chafe', 'chalk', 'chant', 'chaos', 'charm', 'chase',
        'cheat', 'chess', 'chili', 'chill', 'china', 'chips', 'choke', 'chore', 'chunk', 'cited',
        'clamp', 'clams', 'clang', 'claps', 'clash', 'clasp', 'class', 'claws', 'clean', 'clerk',
        'clips', 'cloak', 'close', 'cloth', 'clubs', 'clued', 'coals', 'coats', 'cocoa', 'coded',
        'coils', 'coins', 'comet', 'comic', 'comma', 'condo', 'cones', 'cooks', 'coped', 'copse',
        'coral', 'cords', 'cores', 'costs', 'couch', 'could', 'count', 'coupe', 'cover', 'crack',
        'crate', 'creak', 'cream', 'crews', 'crimp', 'crown', 'crude', 'cruet', 'crumb', 'crush',
        'cubic', 'curds', 'cured', 'curls', 'curry', 'curse', 'curve', 'cycle', 'daddy', 'daily',
        'dairy', 'dally', 'dance', 'dates', 'dawns', 'deals', 'dealt', 'death', 'debit', 'decay',
        'decks', 'decor', 'decoy', 'decry', 'deeds', 'deity', 'delay', 'delta', 'delve', 'demon',
        'denim', 'dense', 'depot', 'depth', 'deter', 'devil', 'dials', 'dices', 'digit', 'dimly',
        'diode', 'dirge', 'dirty', 'disco', 'disks', 'ditch', 'ditty', 'diver', 'dizzy', 'docks',
        'dodge', 'doing', 'dolls', 'donor', 'donut', 'doors', 'doses', 'doubt', 'dough', 'downs',
        'draft', 'drain', 'drape', 'drawn', 'dread', 'dream', 'dress', 'dried', 'drink', 'drive',
        'droit', 'drone', 'drool', 'drops', 'drown', 'drums', 'drunk', 'dryer', 'dryly', 'ducks',
        'dully', 'dummy', 'dumps', 'dunce', 'dunes', 'dunks', 'dusty', 'dutch', 'dwarf', 'dwell',
        'dyers', 'dying', 'eager', 'eagle', 'early', 'earth', 'eased', 'easel', 'eaten', 'eater',
        'ebony', 'edges', 'edged', 'edict', 'eight', 'elect', 'elite', 'elope', 'elude', 'email',
        'ember', 'emits', 'empty', 'ended', 'enemy', 'enjoy', 'enter', 'entry', 'envoy', 'epoch',
        'equal', 'equip', 'erase', 'error', 'essay', 'ether', 'ethic', 'evade', 'event', 'every',
        'exact', 'exalt', 'exams', 'excel', 'exert', 'exile', 'exist', 'expat', 'expel', 'extra',
        'exult', 'fable', 'faces', 'facts', 'faded', 'fails', 'faint', 'fairy', 'faith', 'falls',
        'false', 'famed', 'fancy', 'fangs', 'farce', 'farms', 'fatal', 'fatty', 'fault', 'fauna',
        'feast', 'feats', 'feeds', 'feels', 'feign', 'feint', 'fence', 'ferns', 'ferry', 'fetch',
        'feuds', 'fewer', 'fiber', 'fibre', 'field', 'fiend', 'fifty', 'fight', 'filch', 'filed',
        'fills', 'films', 'filth', 'final', 'finds', 'fined', 'fines', 'fired', 'fires', 'firms',
        'first', 'fixed', 'fixer', 'fizzy', 'flags', 'flair', 'flake', 'flame', 'flank', 'flaps',
        'flare', 'flash', 'flask', 'flats', 'flaws', 'fleet', 'flesh', 'flies', 'fling', 'flint',
        'flips', 'float', 'flock', 'flood', 'floor', 'flora', 'floss', 'flour', 'flows', 'flown',
        'fluff', 'fluid', 'fluke', 'flung', 'flush', 'flute', 'focal', 'focus', 'foggy', 'folds',
        'folks', 'fonts', 'foray', 'force', 'forge', 'forms', 'forte', 'forth', 'forum', 'found',
        'foxes', 'foyer', 'frail', 'frame', 'frank', 'fraud', 'frees', 'fresh', 'friar', 'fries',
        'frill', 'frisk', 'front', 'frost', 'froze', 'fruit', 'fryer', 'fuels', 'fully', 'fumble',
        'funds', 'fungi', 'funny', 'fuzzy', 'gains', 'galas', 'gales', 'gamma', 'gangs', 'garbs',
    ];

    const VALID_WORDS = new Set([...WORDS, ...EXTRA_GUESSES]);


    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const KB_ROWS = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
    ];

    // State
    let targetWord = '';
    let currentRow = 0;
    let currentCol = 0;
    let currentGuess = '';
    let gameOver = false;
    let tiles = []; // 2D array of tile elements
    let keyEls = {}; // Map of letter -> key element

    // Stats
    let stats = JSON.parse(localStorage.getItem('wordle-stats') || '{"played":0,"wins":0,"streak":0,"maxStreak":0}');

    // DOM
    const boardEl = document.getElementById('board');
    const kbEl = document.getElementById('keyboard');
    const messageEl = document.getElementById('message');
    const playedEl = document.getElementById('played-val');
    const winEl = document.getElementById('win-val');
    const streakEl = document.getElementById('streak-val');

    updateStatsDisplay();

    // ===== Init =====
    function init() {
        targetWord = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
        currentRow = 0;
        currentCol = 0;
        currentGuess = '';
        gameOver = false;
        tiles = [];
        keyEls = {};

        buildBoard();
        buildKeyboard();
        hideMessage();
    }

    // ===== Board =====
    function buildBoard() {
        boardEl.innerHTML = '';
        for (let r = 0; r < MAX_GUESSES; r++) {
            const row = document.createElement('div');
            row.className = 'board-row';
            tiles[r] = [];
            for (let c = 0; c < WORD_LENGTH; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                row.appendChild(tile);
                tiles[r][c] = tile;
            }
            boardEl.appendChild(row);
        }
    }

    // ===== Keyboard =====
    function buildKeyboard() {
        kbEl.innerHTML = '';
        for (const row of KB_ROWS) {
            const rowEl = document.createElement('div');
            rowEl.className = 'kb-row';
            for (const key of row) {
                const keyEl = document.createElement('button');
                keyEl.className = 'kb-key';
                keyEl.textContent = key;
                keyEl.dataset.key = key;
                if (key === 'ENTER' || key === '⌫') keyEl.classList.add('wide');

                keyEl.addEventListener('click', () => handleKey(key));
                rowEl.appendChild(keyEl);

                if (key.length === 1) keyEls[key] = keyEl;
            }
            kbEl.appendChild(rowEl);
        }
    }

    // ===== Input =====
    function handleKey(key) {
        if (gameOver) return;

        if (key === '⌫' || key === 'BACKSPACE') {
            deleteLetter();
        } else if (key === 'ENTER') {
            submitGuess();
        } else if (key.length === 1 && /^[A-Z]$/.test(key)) {
            addLetter(key);
        }
    }

    function addLetter(letter) {
        if (currentCol >= WORD_LENGTH) return;
        currentGuess += letter;
        tiles[currentRow][currentCol].textContent = letter;
        tiles[currentRow][currentCol].classList.add('filled');
        if (window.NeonSFX) NeonSFX.click();
        currentCol++;
    }

    function deleteLetter() {
        if (currentCol <= 0) return;
        currentCol--;
        currentGuess = currentGuess.slice(0, -1);
        tiles[currentRow][currentCol].textContent = '';
        tiles[currentRow][currentCol].classList.remove('filled');
    }

    function submitGuess() {
        if (currentGuess.length !== WORD_LENGTH) {
            showMessage('Not enough letters');
            shakeRow(currentRow);
            return;
        }

        if (!VALID_WORDS.has(currentGuess.toLowerCase())) {
            showMessage('Not in word list');
            shakeRow(currentRow);
            return;
        }

        // Evaluate guess
        const result = evaluateGuess(currentGuess, targetWord);
        revealRow(currentRow, result);

        // Update keyboard
        for (let i = 0; i < WORD_LENGTH; i++) {
            const letter = currentGuess[i];
            const keyEl = keyEls[letter];
            if (!keyEl) continue;

            // Correct > Present > Absent priority
            if (result[i] === 'correct') {
                keyEl.className = 'kb-key correct';
            } else if (result[i] === 'present' && !keyEl.classList.contains('correct')) {
                keyEl.className = 'kb-key present';
            } else if (result[i] === 'absent' && !keyEl.classList.contains('correct') && !keyEl.classList.contains('present')) {
                keyEl.className = 'kb-key absent';
            }
        }

        // Check win
        if (currentGuess === targetWord) {
            setTimeout(() => {
                showMessage(['Genius! 🧠', 'Brilliant! ✨', 'Great! 🎉', 'Nice! 👍', 'Close one! 😅', 'Phew! 😰'][currentRow]);
                if (window.NeonSFX) NeonSFX.win();
                gameOver = true;
                stats.played++;
                stats.wins++;
                stats.streak++;
                stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
                saveStats();
                updateStatsDisplay();

                // New game button after delay
                setTimeout(() => {
                    showMessage('🎉 You got it! Tap any key for a new game');
                    gameOver = 'won';
                }, 2000);
            }, WORD_LENGTH * 300 + 200);
            return;
        }

        currentRow++;
        currentCol = 0;
        currentGuess = '';

        // Check loss
        if (currentRow >= MAX_GUESSES) {
            setTimeout(() => {
                showMessage(`The word was: ${targetWord}`);
                if (window.NeonSFX) NeonSFX.gameOver();
                gameOver = true;
                stats.played++;
                stats.streak = 0;
                saveStats();
                updateStatsDisplay();

                setTimeout(() => {
                    showMessage(`${targetWord} — Tap any key for a new game`);
                    gameOver = 'lost';
                }, 2000);
            }, WORD_LENGTH * 300 + 200);
        }
    }

    function evaluateGuess(guess, target) {
        const result = new Array(WORD_LENGTH).fill('absent');
        const targetArr = target.split('');
        const guessArr = guess.split('');

        // First pass: exact matches
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i] = 'correct';
                targetArr[i] = null;
                guessArr[i] = null;
            }
        }

        // Second pass: present (wrong position)
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (guessArr[i] === null) continue;
            const idx = targetArr.indexOf(guessArr[i]);
            if (idx !== -1) {
                result[i] = 'present';
                targetArr[idx] = null;
            }
        }

        return result;
    }

    function revealRow(row, result) {
        for (let i = 0; i < WORD_LENGTH; i++) {
            setTimeout(() => {
                tiles[row][i].classList.add(result[i]);
            }, i * 300);
        }
        if (window.NeonSFX) setTimeout(() => NeonSFX.score(), WORD_LENGTH * 300);
    }

    function shakeRow(row) {
        for (let i = 0; i < WORD_LENGTH; i++) {
            tiles[row][i].classList.add('shake');
            setTimeout(() => tiles[row][i].classList.remove('shake'), 500);
        }
        if (window.NeonSFX) NeonSFX.wallBounce();
    }

    // ===== Messages =====
    function showMessage(text) {
        messageEl.textContent = text;
        messageEl.classList.remove('hidden');
    }

    function hideMessage() {
        messageEl.classList.add('hidden');
    }

    // ===== Stats =====
    function saveStats() {
        localStorage.setItem('wordle-stats', JSON.stringify(stats));
    }

    function updateStatsDisplay() {
        playedEl.textContent = stats.played;
        winEl.textContent = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        streakEl.textContent = stats.streak;
    }

    // ===== Physical Keyboard =====
    document.addEventListener('keydown', (e) => {
        if (gameOver === 'won' || gameOver === 'lost') {
            init();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 'Enter') {
            handleKey('ENTER');
        } else if (e.key === 'Backspace') {
            handleKey('⌫');
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            handleKey(e.key.toUpperCase());
        }
    });

    // Allow restarting from keyboard on end
    kbEl.addEventListener('click', (e) => {
        if (gameOver === 'won' || gameOver === 'lost') {
            init();
        }
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

    // Bootstrap
    init();
})();
