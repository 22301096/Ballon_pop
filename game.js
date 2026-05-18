// game.js - Main game functionality for Balloon Pop Challenge
// This module implements the entire game logic including balloon creation,
// collision detection, scoring, and game state management

/**
 * BalloonPopGame Class
 
 */
class BalloonPopGame {
    constructor() {
        // Load game settings passed from launcher page
        this.settings = this.loadSettings();
        
        // Game state variables
        this.gameActive = false;           // Whether game is currently running
        this.gamePaused = false;           // Whether game is paused
        this.score = 0;                    // Current game score
        this.popped = 0;                   // Number of balloons popped
        this.escaped = 0;                  // Number of balloons that escaped
        this.timeLeft = this.settings.gameLength;  // Remaining game time in seconds
        
        // Array to manage balloon objects currently in play
        this.balloons = [];
        
        // Interval references for cleanup
        this.timerInterval = null;         // Game timer interval
        this.spawnInterval = null;         // Balloon spawn interval
        
        // Balloon ID counter for tracking
        this.balloonId = 0;
        
        // Score history array to track all game sessions
        this.scoreHistory = this.loadScoreHistory();
        
        // Best score loaded from cookie
        this.bestScore = this.getBestScoreCookie();
        
        this.setupElements();
        this.setupEventListeners();
        this.updateDisplay();
        this.pauseBtn.disabled = true;
    }

    // ============================================
    // COOKIE MANAGEMENT FUNCTIONS
    // ============================================

    /**
     * Retrieve best score from browser cookie
     * Cookies persist across browser sessions for multiple days
     * @returns {number} Best score or 0 if no cookie exists
     */
    getBestScoreCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.split('=').map(c => c.trim());
            if (decodeURIComponent(name) === 'bestScore') {
                return parseInt(decodeURIComponent(value)) || 0;
            }
        }
        return 0;
    }

    /**
     * Save best score to browser cookie
     * Cookies are stored on client machine and persist across sessions
     * @param {number} score - The score to save
     */
    setBestScoreCookie(score) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 365); // 1 year expiration
        const cookieString = 'bestScore=' + encodeURIComponent(score) + 
                           '; expires=' + expirationDate.toUTCString() + '; path=/';
        document.cookie = cookieString;
    }

    // ============================================
    // SESSION STORAGE & DATA PERSISTENCE
    // ============================================

    /**
     * Load game score history from session storage
     * Score history is an array of objects containing score data
     * Session storage data persists only for current browser tab/window
     * @returns {Array} Array of score history objects
     */
    loadScoreHistory() {
        const saved = sessionStorage.getItem('scoreHistory');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading score history:', e);
                return [];
            }
        }
        return [];
    }

    /**
     * Save score to history array in session storage
     * Creates an object with timestamp and game details
     * @param {number} finalScore - The final score to record
     */
    addScoreToHistory(finalScore) {
        const timestamp = new Date().toLocaleString();
        const scoreEntry = {
            score: finalScore,
            playerName: this.settings.playerName,
            difficulty: this.settings.difficulty,
            timestamp: timestamp,
            popped: this.popped,
            escaped: this.escaped
        };
        this.scoreHistory.push(scoreEntry);
        sessionStorage.setItem('scoreHistory', JSON.stringify(this.scoreHistory));
    }

    /**
     * Load game settings from session storage (passed from launcher)
     * Session storage is used for single-session data sharing between windows
     * @returns {Object} Settings object or default settings
     */
    loadSettings() {
        const saved = sessionStorage.getItem('gameSettings');
        if (saved) {
            return JSON.parse(saved);
        }
        // Default settings if none provided
        return {
            playerName: 'Player',
            difficulty: 'medium',
            gameLength: 30,
            theme: 'classic',
            soundEnabled: true,
            doublePoints: false,
            bonusBalloons: true
        };
    }

    // ============================================
    // DOM SETUP & EVENT HANDLING
    // ============================================

    /**
     * Cache DOM element references for efficient access throughout game
     * Reduces repeated querySelectorAll calls
     */
    setupElements() {
        // Display elements for game stats
        this.playerDisplay = document.getElementById('displayPlayer');
        this.scoreDisplay = document.getElementById('displayScore');
        this.poppedDisplay = document.getElementById('displayPopped');
        this.escapedDisplay = document.getElementById('displayEscaped');
        this.timeDisplay = document.getElementById('displayTimeLeft');
        this.difficultyDisplay = document.getElementById('displayDifficulty');
        
        // Game area elements
        this.skyArea = document.getElementById('skyArea');
        this.messageArea = document.getElementById('messageArea');
        this.logArea = document.getElementById('logArea');
        
        // Board info elements
        this.gameLengthDisplay = document.getElementById('displayGameLength');
        this.themeDisplay = document.getElementById('displayTheme');
        this.bestScoreDisplay = document.getElementById('displayBestScore');

        // Button elements for event handling
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.loadBtn = document.getElementById('loadBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.backBtn = document.getElementById('backBtn');
    }

    /**
     * Setup click event listeners for all game buttons
     * Demonstrates event handling requirement
     */
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.saveBtn.addEventListener('click', () => this.saveSession());
        this.loadBtn.addEventListener('click', () => this.loadSession());
        this.resetBtn.addEventListener('click', () => this.resetGameWithConfirm());
        this.backBtn.addEventListener('click', () => this.backToSettings());
    }

    // ============================================
    // GAME FLOW CONTROL
    // ============================================

    /**
     * Start a new game session
     * Initializes all game variables and starts timers
     */
    startGame() {
        if (this.gameActive) {
            this.addLog('Game already running!');
            return;
        }

        this.gameActive = true;
        this.gamePaused = false;
        this.score = 0;
        this.popped = 0;
        this.escaped = 0;
        this.timeLeft = this.settings.gameLength;
        this.balloons = [];
        this.skyArea.innerHTML = '';

        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.messageArea.textContent = 'Game started! Pop the balloons!';

        this.updateDisplay();
        this.addLog(`Game started - Difficulty: ${this.settings.difficulty}, Time: ${this.settings.gameLength}s`);

        // Start timer that decrements every 1000ms
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);

        // Start spawning balloons based on difficulty
        this.spawnBalloons();
    }

    /**
     * Spawn balloons at intervals based on difficulty level
     * More difficult = faster spawn rate
     * Uses setInterval to create balloons at regular intervals
     */
    spawnBalloons() {
        // Spawn rates (in milliseconds) for each difficulty
        const spawnRates = {
            easy: 1500,    // 1.5 second intervals
            medium: 1000,  // 1 second intervals
            hard: 600      // 0.6 second intervals
        };

        this.spawnInterval = setInterval(() => {
            if (this.gameActive && !this.gamePaused) {
                this.createBalloon();
            }
        }, spawnRates[this.settings.difficulty]);
    }

    /**
     * Create a new balloon object and add to game
     * Each balloon is an object containing position, speed, points, and DOM element
     * Demonstrates use of JavaScript objects and arrays
     */
    createBalloon() {
        // Create DOM element for balloon
        const balloon = document.createElement('div');
        
        // Create balloon object with initial properties
        // This demonstrates JavaScript object literal syntax
        const balloonObj = {
            id: this.balloonId++,                                              // Unique ID
            element: balloon,                                                  // DOM reference
            x: Math.random() * (this.skyArea.offsetWidth - 80),               // Random X position using Math
            y: this.skyArea.offsetHeight,                                      // Start at bottom
            isBonus: this.settings.bonusBalloons && Math.random() < 0.15,     // 15% chance for bonus
            popped: false                                                      // Not yet popped
        };

        // Apply difficulty-based properties
        const difficultySettings = this.getDifficultySettings();
        balloonObj.speed = difficultySettings.speed;
        balloonObj.size = difficultySettings.size;
        balloonObj.points = balloonObj.isBonus ? difficultySettings.points * 2 : difficultySettings.points;

        // Set up balloon styling using CSS classes and inline styles
        balloon.className = `balloon ${this.settings.theme}`;
        if (balloonObj.isBonus) {
            balloon.classList.add('bonus');
        }

        // Set balloon dimensions
        balloon.style.width = balloonObj.size + 'px';
        balloon.style.height = (balloonObj.size * 1.28) + 'px';
        balloon.style.left = balloonObj.x + 'px';
        balloon.style.top = balloonObj.y + 'px';
        
        // Display "BONUS" text on bonus balloons
        balloon.textContent = balloonObj.isBonus ? 'BONUS' : '';

        // Add click handler for popping - demonstrates event handling
        balloon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.popBalloon(balloonObj);
        });

        // Add balloon to DOM and tracking array (demonstrates array usage)
        this.skyArea.appendChild(balloon);
        this.balloons.push(balloonObj);

        // Start animation for this balloon
        this.animateBalloon(balloonObj);
    }

    /**
     * Get difficulty-specific settings for balloon behavior
     * Returns object with properties for speed, size, and points
     * @returns {Object} Settings containing speed, size, and points using Math properties
     */
    getDifficultySettings() {
        const settings = {
            easy: { speed: 0.5, size: 70, points: 10 },          // Slow, large, low points
            medium: { speed: 1, size: 60, points: 15 },          // Moderate
            hard: { speed: 1.5, size: 50, points: 20 }           // Fast, small, high points
        };
        return settings[this.settings.difficulty];
    }

    /**
     * Animate a balloon floating upward
     * Checks for escape condition at top of screen
     * @param {Object} balloonObj - The balloon object to animate with parameters
     */
    animateBalloon(balloonObj) {
        const interval = setInterval(() => {
            if (!this.gameActive) {
                clearInterval(interval);
                return;
            }

            if (!this.gamePaused && !balloonObj.popped) {
                // Move balloon up by subtracting speed each frame
                balloonObj.y -= balloonObj.speed;
                balloonObj.element.style.top = balloonObj.y + 'px';

                // Check if balloon escaped the top of the screen
                if (balloonObj.y < -100) {
                    this.escaped++;
                    this.addLog('Balloon escaped!');
                    balloonObj.popped = true;
                    balloonObj.element.remove();
                    // Remove from tracking array using filter method
                    this.balloons = this.balloons.filter(b => b.id !== balloonObj.id);
                    this.updateDisplay();
                    clearInterval(interval);
                }
            }

            // Clean up interval if balloon was popped
            if (balloonObj.popped) {
                clearInterval(interval);
            }
        }, 30);
    }

    /**
     * Handle balloon pop event when user clicks
     * Calculate points, update score, play sound, remove balloon
     * Demonstrates functions with parameters
     * @param {Object} balloonObj - The balloon that was clicked
     */
    popBalloon(balloonObj) {
        // Validation checks
        if (balloonObj.popped || !this.gameActive || this.gamePaused) {
            return;
        }

        balloonObj.popped = true;

        // Add pop animation class (scales up and fades out)
        balloonObj.element.classList.add('pop-animation');

        // Calculate points (apply double points multiplier if enabled)
        let points = balloonObj.points;
        if (this.settings.doublePoints) {
            points *= 2;
        }

        // Update game statistics
        this.score += points;
        this.popped++;

        // Log the event with proper string formatting using String methods
        const bonusText = balloonObj.isBonus ? ' (BONUS)' : '';
        this.addLog(`Popped balloon! +${points} points${bonusText}`);

        // Play sound effect if enabled
        if (this.settings.soundEnabled) {
            this.playPopSound();
        }

        // Remove balloon from DOM after animation completes
        setTimeout(() => {
            balloonObj.element.remove();
            // Filter out popped balloon from tracking array
            this.balloons = this.balloons.filter(b => b.id !== balloonObj.id);
        }, 150);

        this.updateDisplay();
    }

    /**
     * Play a pop sound using Web Audio API
     * Creates a brief sine wave beep for audio feedback
     */
    playPopSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;      // 800 Hz frequency
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);  // 100ms duration
        } catch (e) {
            // Silently fail if audio context not available
            console.warn('Audio playback not available:', e);
        }
    }

    /**
     * Toggle pause/resume state
     * Demonstrates dynamic game state management
     */
    togglePause() {
        if (!this.gameActive) {
            return;
        }

        this.gamePaused = !this.gamePaused;
        this.pauseBtn.textContent = this.gamePaused ? 'Resume' : 'Pause / Resume';
        this.messageArea.textContent = this.gamePaused ? 
            'Game paused. Click Resume to continue.' : 'Game resumed!';
        this.addLog(this.gamePaused ? 'Game paused' : 'Game resumed');
    }

    /**
     * Update game timer - called every 1 second
     * Ends game when time reaches zero
     */
    updateTimer() {
        if (!this.gameActive || this.gamePaused) {
            return;
        }

        this.timeLeft--;
        this.updateDisplay();

        if (this.timeLeft <= 0) {
            this.endGame();
        }
    }

    /**
     * End the current game session
     * Updates best score cookie, records score history
     * Demonstrates use of cookies for persistent data storage
     */
    endGame() {
        this.gameActive = false;
        clearInterval(this.timerInterval);
        clearInterval(this.spawnInterval);

        // Save score to history array
        this.addScoreToHistory(this.score);

        // Check if new best score and update cookie
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.setBestScoreCookie(this.bestScore);
            
            // Use string concatenation for message formatting
            this.messageArea.textContent = '🎉 Game Over! New Best Score: ' + this.score + '! 🎉';
            this.addLog('NEW BEST SCORE!');
        } else {
            this.messageArea.textContent = 'Game Over! Final Score: ' + this.score;
        }

        // Log game summary statistics using String methods
        const summary = `Game ended - Score: ${this.score}, Popped: ${this.popped}, Escaped: ${this.escaped}`;
        this.addLog(summary);

        // Re-enable start button, disable pause button
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = 'Pause / Resume';

        // Remove all remaining balloons from DOM and array
        this.balloons.forEach(b => {
            if (!b.popped) {
                b.element.remove();
            }
        });
        this.balloons = [];

        this.updateDisplay();
    }

    /**
     * Reset game with user confirmation using confirm() dialog
     * Demonstrates use of confirm() for user interaction
     */
    resetGameWithConfirm() {
        if (this.gameActive) {
            if (!confirm('Reset the current game?')) {
                return;
            }
        }
        this.resetGame();
    }

    /**
     * Reset game to initial state
     */
    resetGame() {
        this.gameActive = false;
        this.gamePaused = false;
        clearInterval(this.timerInterval);
        clearInterval(this.spawnInterval);

        this.score = 0;
        this.popped = 0;
        this.escaped = 0;
        this.timeLeft = this.settings.gameLength;
        this.balloons = [];
        this.skyArea.innerHTML = '';

        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = 'Pause / Resume';
        this.messageArea.textContent = 'Game reset. Click Start Game when ready.';

        this.addLog('Game reset');
        this.updateDisplay();
    }

    /**
     * Save current game session to session storage
     * Session storage data persists for the current browser tab
     */
    saveSession() {
        const sessionData = {
            score: this.score,
            popped: this.popped,
            escaped: this.escaped,
            timeLeft: this.timeLeft,
            gameActive: this.gameActive,
            gamePaused: this.gamePaused,
            balloonCount: this.balloons.length
        };
        sessionStorage.setItem('gameSession', JSON.stringify(sessionData));
        this.addLog('Session saved!');
        alert('✓ Session saved to browser storage!');
    }

    /**
     * Load previously saved game session from session storage
     * Demonstrates JSON parsing from storage
     */
    loadSession() {
        const saved = sessionStorage.getItem('gameSession');
        if (saved) {
            try {
                const sessionData = JSON.parse(saved);
                this.score = sessionData.score || 0;
                this.popped = sessionData.popped || 0;
                this.escaped = sessionData.escaped || 0;
                this.timeLeft = sessionData.timeLeft || this.settings.gameLength;
                this.gameActive = sessionData.gameActive || false;
                this.gamePaused = sessionData.gamePaused || false;

                if (this.gameActive && this.timeLeft > 0) {
                    this.startBtn.disabled = true;
                    this.pauseBtn.disabled = false;
                    this.pauseBtn.textContent = this.gamePaused ? 'Resume' : 'Pause / Resume';
                    this.messageArea.textContent = this.gamePaused ?
                        'Loaded paused game. Click Resume to continue.' : 'Loaded active game. Click Resume to continue.';

                    clearInterval(this.timerInterval);
                    clearInterval(this.spawnInterval);
                    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
                    this.spawnBalloons();
                } else {
                    this.startBtn.disabled = false;
                    this.pauseBtn.disabled = true;
                    this.pauseBtn.textContent = 'Pause / Resume';
                    this.messageArea.textContent = 'Loaded saved game state. Click Start Game when ready.';
                }

                this.updateDisplay();
                this.addLog('Session loaded!');
                alert('✓ Session loaded from browser storage!');
            } catch (e) {
                alert('Error loading session');
                console.error('Session load error:', e);
            }
        } else {
            alert('No saved session found in browser storage.');
        }
    }

    /**
     * Return to settings/launcher page
     * Closes game window
     */
    backToSettings() {
        if (this.gameActive) {
            if (!confirm('Close game and return to settings?')) {
                return;
            }
            this.gameActive = false;
            clearInterval(this.timerInterval);
            clearInterval(this.spawnInterval);
        }
        window.close();
    }

    /**
     * Update all display elements with current game state
     * Uses String methods for formatting and capitalization
     * Demonstrates all display updates at once
     */
    updateDisplay() {
        this.playerDisplay.textContent = this.settings.playerName;
        this.scoreDisplay.textContent = this.score;
        this.poppedDisplay.textContent = this.popped;
        this.escapedDisplay.textContent = this.escaped;
        this.timeDisplay.textContent = this.timeLeft + ' s';
        
        // Capitalize difficulty using String methods: charAt() and slice()
        const capitalizedDifficulty = this.settings.difficulty.charAt(0).toUpperCase() + 
                                     this.settings.difficulty.slice(1);
        this.difficultyDisplay.textContent = capitalizedDifficulty;
        
        this.gameLengthDisplay.textContent = this.settings.gameLength + ' s';
        
        // Capitalize theme using String methods
        const capitalizedTheme = this.settings.theme.charAt(0).toUpperCase() + 
                               this.settings.theme.slice(1);
        this.themeDisplay.textContent = capitalizedTheme;
        
        this.bestScoreDisplay.textContent = this.bestScore;
    }

    /**
     * Add entry to game log with timestamp
     * Demonstrates string formatting and DOM manipulation
     * @param {string} message - The message to log
     */
    addLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '6px';
        logEntry.style.fontSize = '0.9rem';
        logEntry.style.color = '#555';
        
        // Format log message with timestamp using string concatenation
        logEntry.textContent = '[' + timestamp + '] ' + message;
        this.logArea.appendChild(logEntry);
        
        // Scroll log to show latest entry
        this.logArea.scrollTop = this.logArea.scrollHeight;
    }
}

/**
 * Initialize game when page loads
 * Waits for DOM to be fully ready before creating game instance
 */
document.addEventListener('DOMContentLoaded', function() {
    const game = new BalloonPopGame();
    window.balloonGame = game; // Make global for debugging purposes
});
