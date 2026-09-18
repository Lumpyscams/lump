/**
 * Timer Manager Module
 * Location: /timerManager.js
 * Purpose: Manages the workout stopwatch logic independently of the UI.
 */
import { formatTime } from './utils.js';
import { setElapsed } from './uiManager.js';
import { niceLog } from './logger.js';

let timerInterval = null;
let timerStart = null;
let pausedAccum = 0; // Accumulated time from previous segments
export let isRunning = false;
let hasStopped = false;

function updateUI() {
  let elapsed = pausedAccum;
  if (isRunning && timerStart) {
    elapsed += Date.now() - timerStart;
  }
  setElapsed(formatTime(elapsed));
}

/**
 * Starts the timer. 
 * Calls back to UI to disable/enable buttons accordingly.
 * @param {Function} onStateChange - Callback to notify UI of state changes
 */
export function start(onStateChange) {
  if (isRunning) return;
  isRunning = true;
  hasStopped = false;
  timerStart = Date.now();
  timerInterval = setInterval(updateUI, 250);
  if (onStateChange) onStateChange('running');
  niceLog('Timer started');
}

/** Pauses the clock and calculates the total accumulated time so far. */
export function pause(onStateChange) {
  if (!isRunning) return;
  isRunning = false;
  pausedAccum += Date.now() - timerStart;
  timerStart = null;
  clearInterval(timerInterval);
  timerInterval = null;
  updateUI();
  hasStopped = true;
  if (onStateChange) onStateChange('paused');
  niceLog('Timer paused');
}

/** Resets the clock to zero. Can only be called if the timer is stopped. */
export function reset(onStateChange) {
  if (!hasStopped) return;
  isRunning = false;
  timerStart = null;
  pausedAccum = 0;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateUI();
  hasStopped = false;
  if (onStateChange) onStateChange('reset');
  niceLog('Timer reset');
}

export function getElapsedTimeMs() {
  return pausedAccum + (isRunning && timerStart ? Date.now() - timerStart : 0);
}

export function initTimer() {
  updateUI();
}