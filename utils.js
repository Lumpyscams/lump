/**
 * Utilities Module
 * Location: /utils.js
 * Purpose: "Pure" functions that don't depend on app state or the DOM.
 */

/**
 * Formats milliseconds into HH:MM:SS format
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600).toString().padStart(2, '0');
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}