// styles.js
const styles = `
/* Variables CSS */
:root {
    --bg-primary: #0a0504;
    --bg-secondary: #1a0f0a;
    --bg-tertiary: #2a1614;
    --accent-primary: #d4753a;
    --accent-secondary: #8b4513;
    --accent-hover: #ff8c42;
    --text-primary: #e8d5c4;
    --text-secondary: #b89b86;
    --border-color: #3a2420;
    --error-color: #d64545;
    --success-color: #4a7c59;
    --shadow-color: rgba(0, 0, 0, 0.5);
}

/* Reset et base */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
    background-image: 
        radial-gradient(ellipse at top left, rgba(212, 117, 58, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse at bottom right, rgba(139, 69, 19, 0.1) 0%, transparent 50%);
}

/* Container principal */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header */
header {
    text-align: center;
    padding: 2rem 0;
    border-bottom: 2px solid var(--border-color);
    margin-bottom: 2rem;
}

h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    color: var(--accent-primary);
    text-shadow: 2px 2px 4px var(--shadow-color);
    margin-bottom: 0.5rem;
    letter-spacing: 0.05em;
}

.subtitle {
    color: var(--text-secondary);
    font-size: clamp(0.9rem, 2vw, 1.1rem);
}

/* Main content */
main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

/* Section input */
.input-section {
    background-color: var(--bg-secondary);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px var(--shadow-color);
}

.input-group {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.url-input {
    flex: 1;
    min-width: 200px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.url-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(212, 117, 58, 0.2);
}

.fetch-button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    background-color: var(--accent-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
    overflow: hidden;
}

.fetch-button:hover:not(:disabled) {
    background-color: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(212, 117, 58, 0.3);
}

.fetch-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.fetch-button.loading .button-text {
    visibility: hidden;
}

.spinner {
    display: none;
    width: 20px;
    height: 20px;
    border: 3px solid var(--bg-primary);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
}

.fetch-button.loading .spinner {
    display: block;
}

@keyframes spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Messages d'erreur */
.error-message {
    color: var(--error-color);
    font-size: 0.9rem;
    margin-top: 0.5rem;
    display: none;
}

.error-message.show {
    display: block;
    animation: fadeIn 0.3s ease;
}

/* Section output */
.output-section {
    background-color: var(--bg-secondary);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px var(--shadow-color);
    flex: 1;
    display: flex;
    flex-direction: column;
}

.output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
}

h2 {
    font-size: 1.5rem;
    color: var(--accent-primary);
}

.output-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.char-count {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.action-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.action-button:hover {
    background-color: var(--accent-secondary);
    border-color: var(--accent-secondary);
}

.output-content {
    flex: 1;
    min-height: 300px;
    padding: 1rem;
    font-size: 0.95rem;
    font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    resize: vertical;
    transition: border-color 0.3s ease;
}

.output-content:focus {
    outline: none;
    border-color: var(--accent-primary);
}

/* Footer */
footer {
    text-align: center;
    padding: 2rem 0 1rem;
    border-top: 1px solid var(--border-color);
    margin-top: 2rem;
    color: var(--text-secondary);
}

/* Toast notifications */
.toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border-radius: 8px;
    box-shadow: 0 4px 12px var(--shadow-color);
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 1000;
    max-width: 300px;
}

.toast.show {
    transform: translateX(0);
}

.toast.success {
    border-left: 4px solid var(--success-color);
}

.toast.error {
    border-left: 4px solid var(--error-color);
}

/* Animations */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .container {
        padding: 0.5rem;
    }
    
    header {
        padding: 1.5rem 0;
    }
    
    .input-section, .output-section {
        padding: 1.5rem;
    }
    
    .input-group {
        flex-direction: column;
    }
    
    .url-input {
        min-width: 100%;
    }
    
    .fetch-button {
        width: 100%;
        justify-content: center;
    }
    
    .output-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .output-actions {
        width: 100%;
        justify-content: space-between;
    }
    
    .toast {
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
        transform: translateY(100px);
    }
    
    .toast.show {
        transform: translateY(0);
    }
}

@media (max-width: 480px) {
    h1 {
        font-size: 1.8rem;
    }
    
    .subtitle {
        font-size: 0.9rem;
    }
    
    .action-button {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
    }
}
`;

// Inject styles into the page
document.getElementById('styles').textContent = styles;