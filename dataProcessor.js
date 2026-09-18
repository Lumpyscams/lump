/**
 * Data Processor Module
 * Location: /dataProcessor.js
 * Purpose: Handles all heart rate mathematics, including rolling averages, 
 * cardiovascular drift, and quartile analysis.
 */
import { setRollAvgBPM, setTotalAvgBPM, setStdDev, setDrift, setMaxBPM, setQuartiles } from './uiManager.js';

// Rolling window variables (for short-term trends)
let rollAvg = 0;
const rollBuffer = [];
const ROLLING_WINDOW_SIZE = 30; // 30-second rolling window

// Session-wide variables (for workout stats)
let totalSampleCount = 0;
let totalAvg = 0;
let m2 = 0; // For Welford's algorithm to calculate standard deviation

const workoutHistory = []; // Stores every BPM sample during a workout
const hrBuffer = [];       // Small buffer for median filtering
const HR_BUFFER_SIZE = 5;  // Use 5 samples to find a median (filters out noise)
let maxHrMedian = 0;

/**
 * Core math engine: Process each incoming HR sample.
 * @param {number} bpm - The raw heart rate from the sensor
 * @param {boolean} isTimerRunning - Whether the workout timer is active
 */
export function processHeartRate(bpm, isTimerRunning) {
  // Ignore "searching" pulses (0) to keep averages clean
  if (!bpm || bpm <= 0) return;

  // 1. Rolling Window Average (Last 30 samples)
  rollBuffer.push(bpm);
  if (rollBuffer.length > ROLLING_WINDOW_SIZE) {
    rollBuffer.shift();
  }
  rollAvg = rollBuffer.reduce((a, b) => a + b, 0) / rollBuffer.length;
  setRollAvgBPM(Math.round(rollAvg));

  // 2. Total Average (Starts at workout start)
  if (isTimerRunning) {
    totalSampleCount++;
    workoutHistory.push(bpm);
    
    // Incremental Running Average formula (Welford's algorithm)
    const delta = bpm - totalAvg;
    totalAvg += delta / totalSampleCount;
    const delta2 = bpm - totalAvg;
    m2 += delta * delta2;

    setTotalAvgBPM(Math.round(totalAvg));
    
    if (totalSampleCount > 1) {
      const variance = m2 / (totalSampleCount - 1);
      const stdDev = Math.sqrt(variance);
      setStdDev(Math.round(stdDev));
    }

    if (totalAvg > 0 && totalSampleCount > 1 && rollAvg > 0) {
      const drift = ((rollAvg - totalAvg) / totalAvg) * 100;
      setDrift(Math.round(drift));
    }

    // Calculate Quartiles every 60 samples (approx. 1 minute)
    if (totalSampleCount % 60 === 0) {
      calculateQuartiles();
    }
  }

  // Max Median Tracking
  hrBuffer.push(bpm);
  if (hrBuffer.length > HR_BUFFER_SIZE) {
    hrBuffer.shift();
  }

  // Max Median Tracking: Only update Max HR if the median of the last 5 samples 
  // is higher. This prevents a single "glitch" or spike from ruining your stats.
  if (hrBuffer.length === HR_BUFFER_SIZE) {
    const sorted = [...hrBuffer].sort((a, b) => a - b);
    const median = sorted[2];
    if (median > maxHrMedian) {
      maxHrMedian = median;
      setMaxBPM(maxHrMedian);
    }
  }
}

/** Splits the workout into 4 equal time blocks to calculate cardiovascular drift. */
function calculateQuartiles() {
  const len = workoutHistory.length;
  if (len < 4) return;

  const qSize = Math.floor(len / 4);
  const getAvg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const q1 = getAvg(workoutHistory.slice(0, qSize));
  const q2 = getAvg(workoutHistory.slice(qSize, qSize * 2));
  const q3 = getAvg(workoutHistory.slice(qSize * 2, qSize * 3));
  const q4 = getAvg(workoutHistory.slice(qSize * 3));

  const firstHalfAvg = (q1 + q2) / 2;
  const secondHalfAvg = (q3 + q4) / 2;
  
  // Guard against division by zero if the first half average is somehow 0
  if (firstHalfAvg === 0) return;

  const qDrift = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  setQuartiles({
    q1: Math.round(q1), q2: Math.round(q2),
    q3: Math.round(q3), q4: Math.round(q4),
    qDrift: Math.round(qDrift)
  });
}

/**
 * Returns the session-wide metrics needed by the UI.
 */
export function getMetrics() {
  return {
    totalAvgBpm: totalAvg
  };
}

/**
 * Calculates calories burned based on the Keytel et al. (2005) formula.
 * @param {string} gender - 'M' or 'F'
 */
export function calculateCalories(gender, age, weightKg, avgHr, durationMin) {
  const genderFactor = gender === 'M' 
    ? ((-55.0969 + (0.6309 * avgHr) + (0.1988 * weightKg) + (0.2017 * age)) / 4.184)
    : ((-20.4022 + (0.4472 * avgHr) - (0.1263 * weightKg) + (0.0740 * age)) / 4.184);
  return Math.max(0, genderFactor * durationMin);
}

/** Resets all internal math counters for a new workout. */
export function resetData() {
  resetRollAvg();
  totalSampleCount = 0;
  totalAvg = 0;
  m2 = 0;
  workoutHistory.length = 0;
  hrBuffer.length = 0;
  maxHrMedian = 0;
  setTotalAvgBPM(null);
  setStdDev(null);
  setQuartiles(null);
  setDrift(null);
  setMaxBPM(null);
}

function resetRollAvg() {
  rollAvg = 0;
  rollBuffer.length = 0;
  setRollAvgBPM(null);
}