/**
 * Logger Module
 * Location: /logger.js
 * Purpose: Manages the scrolling activity feed at the bottom of the UI.
 */

const logEl = document.getElementById('log');
const toggleLogBtn = document.getElementById('toggleLog');

/**
 * Adds a log message to the activity log with timestamp
 * @param {string} msg - Message to log
 */
export function niceLog(msg) {
  const d = new Date().toLocaleTimeString();
  const el = document.createElement('div');
  el.textContent = `[${d}] ${msg}`;
  logEl.prepend(el);
  
  // Trim log to keep only last 40 entries
  while (logEl.children.length > 40) {
    logEl.removeChild(logEl.lastChild);
  }
}

/** Sets initial visibility and wires up the "Show/Hide Log" toggle. */
export function initLogger() {
  // Initialize UI state
  logEl.classList.add('hidden');
  toggleLogBtn.textContent = 'Show Log';

  toggleLogBtn.addEventListener('click', () => {
    const isHidden = logEl.classList.toggle('hidden');
    toggleLogBtn.textContent = isHidden ? 'Show Log' : 'Hide Log';
  });
}