// launcher.js - Launcher page functionality for Balloon Pop Challenge
// This module handles game settings, form input validation, and game initialization

// Cookies-related functionality
// Function to set a cookie with player name and best score
function setCookie(name, value, daysToExpire = 30) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysToExpire);
    const cookieString = encodeURIComponent(name) + '=' + encodeURIComponent(value) + 
                         '; expires=' + expirationDate.toUTCString() + '; path=/';
    document.cookie = cookieString;
}

// Function to retrieve a cookie value by name
function getCookie(name) {
    const cookieArray = document.cookie.split(';');
    for (let cookie of cookieArray) {
        const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim());
        if (decodeURIComponent(cookieName) === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null;
}

// Function to delete a cookie
function deleteCookie(name) {
    setCookie(name, '', -1);
}

// Session storage key for current game state
const SETTINGS_KEY = 'balloonPopSettings';

// Initialize page when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load saved player name from cookie if available
    const savedPlayerName = getCookie('playerName');
    if (savedPlayerName) {
        document.getElementById('playerName').value = decodeURIComponent(savedPlayerName);
    }
    
    // Load other settings from session storage
    loadSettings();
    
    // Setup all event listeners for form interactions
    setupEventListeners();
    
    // Update preview when form changes
    updatePreview();
});

// Setup event listeners for form inputs and buttons
function setupEventListeners() {
    // Click events for buttons
    document.getElementById('openGameBtn').addEventListener('click', openGameWindow);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('loadSettingsBtn').addEventListener('click', loadSettings);
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
    
    // Change events for dropdowns and radio buttons
    document.getElementById('difficulty').addEventListener('change', updatePreview);
    document.getElementById('gameLength').addEventListener('change', updatePreview);
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', updatePreview);
    });
    
    // Input events for text input
    document.getElementById('playerName').addEventListener('input', updatePreview);
    
    // Change events for checkboxes
    document.getElementById('soundEnabled').addEventListener('change', updatePreview);
    document.getElementById('doublePoints').addEventListener('change', updatePreview);
    document.getElementById('bonusBalloons').addEventListener('change', updatePreview);
    
    // Form submit event
    const setupForm = document.getElementById('setupForm');
    if (setupForm) {
        setupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            openGameWindow();
        });
    }
}

// Get current form values as an object
function getFormValues() {
    return {
        playerName: document.getElementById('playerName').value || 'Player',
        difficulty: document.getElementById('difficulty').value,
        gameLength: parseInt(document.getElementById('gameLength').value),
        theme: document.querySelector('input[name="theme"]:checked').value,
        soundEnabled: document.getElementById('soundEnabled').checked,
        doublePoints: document.getElementById('doublePoints').checked,
        bonusBalloons: document.getElementById('bonusBalloons').checked
    };
}

// Set form values from settings object
function setFormValues(settings) {
    if (settings.playerName) {
        document.getElementById('playerName').value = settings.playerName;
    }
    if (settings.difficulty) {
        document.getElementById('difficulty').value = settings.difficulty;
    }
    if (settings.gameLength) {
        document.getElementById('gameLength').value = settings.gameLength;
    }
    
    const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme || 'classic'}"]`);
    if (themeRadio) {
        themeRadio.checked = true;
    }
    
    document.getElementById('soundEnabled').checked = settings.soundEnabled !== false;
    document.getElementById('doublePoints').checked = settings.doublePoints || false;
    document.getElementById('bonusBalloons').checked = settings.bonusBalloons !== false;
}

// Update live preview of settings
function updatePreview() {
    const settings = getFormValues();
    const previewText = `Player: ${settings.playerName} | Difficulty: ${settings.difficulty.toUpperCase()} | ` +
                        `Time: ${settings.gameLength}s | Theme: ${settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}`;
    
    const previewElement = document.getElementById('previewText');
    if (previewElement) {
        previewElement.textContent = previewText;
    }
}

// Save settings to session storage and player name to cookie
function saveSettings() {
    const settings = getFormValues();
    
    // Save player name to cookie
    setCookie('playerName', settings.playerName, 30);
    
    // Save all settings to session storage
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    
    alert('✓ Settings saved! Player name stored in cookie.');
}

// Load settings from session storage
function loadSettings() {
    const saved = sessionStorage.getItem(SETTINGS_KEY);
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            setFormValues(settings);
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
}

// Reset settings to defaults with confirmation
function resetSettings() {
    // Use confirm() dialog to verify user wants to reset
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
        return;
    }
    
    const defaults = {
        playerName: '',
        difficulty: 'medium',
        gameLength: '30',
        theme: 'classic',
        soundEnabled: true,
        doublePoints: false,
        bonusBalloons: true
    };
    
    setFormValues(defaults);
    sessionStorage.removeItem(SETTINGS_KEY);
    deleteCookie('playerName');
    updatePreview();
    alert('Settings reset to defaults!');
}

// Open game window with current settings
function openGameWindow() {
    const settings = getFormValues();
    
    // Validate player name - use prompt if not entered
    let playerName = settings.playerName.trim();
    
    if (!playerName) {
        playerName = prompt('Please enter your player name:', 'Player');
        if (!playerName) {
            alert('Game requires a player name to proceed.');
            return;
        }
        settings.playerName = playerName;
        document.getElementById('playerName').value = playerName;
    }
    
    // Save player name to cookie
    setCookie('playerName', settings.playerName, 30);
    
    // Store all settings in session storage for game window to access
    sessionStorage.setItem('gameSettings', JSON.stringify(settings));
    
    // Open game window with specified dimensions
    window.open('game.html', 'gameWindow', 'width=1200,height=900');
}
