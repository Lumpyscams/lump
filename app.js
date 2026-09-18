/**
 * Main Application Orchestrator
 * Location: /app.js
 * Purpose: The entry point. Imports modules and wires up the event listeners 
 * between the UI, Bluetooth, and the Data Processor.
 */

import * as Bluetooth from './bluetoothManager.js';
import * as Timer from './timerManager.js';
import * as Processor from './dataProcessor.js';
import * as UI from './uiManager.js';
import { niceLog, initLogger } from './logger.js';

let wakeLock = null;
let latestBpm = null;
let selectedAge = 35;
let selectedGender = 'M'; // Default to Male
let selectedWeightUnit = 'kg'; // Default to Kilograms
let selectedWeight = 70; // Default weight in kg
let selectedZoneMode = 'maf'; // 'age' or 'maf'
let lastAnnouncedZone = null;
let lastPromptAt = 0;
const audioPromptIntervalsMs = [0, 30000, 60000, 120000, 180000, 240000, 300000];
const audioPromptIntervalLabels = ['Changes only', '30 seconds', '1 minute', '2 minutes', '3 minutes', '4 minutes', '5 minutes'];


/** 
 * Requests Screen Wake Lock to prevent the phone screen from dimming 
 * during a workout.
 */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      niceLog('Wake Lock active');
    }
  } catch (err) {
    console.error('Wake Lock error:', err);
  }
}

/** Releases the wake lock to save battery when the workout is over. */
function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null;
      niceLog('Wake Lock released');
    });
  }
}

// Re-request wake lock if the user leaves the tab and comes back
document.addEventListener('visibilitychange', async () => {
  // If we had a wake lock and are becoming visible again, re-acquire it
  if (Bluetooth.isConnected() && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

// Connect/Disconnect Bluetooth Toggle
UI.connectBtn.addEventListener('click', async () => {
  if (Bluetooth.isConnected()) {
    Bluetooth.disconnect();
    releaseWakeLock();
  } else {
    const success = await Bluetooth.connect((bpm) => {
      try {
        latestBpm = bpm > 0 ? bpm : null;
        UI.setBPM(latestBpm);
        updateCaloriesDisplay(); // Update calories with new BPM
        updateActiveZone(latestBpm);
        Processor.processHeartRate(bpm, Timer.isRunning);
      } catch (err) {
        console.error('Data processing error:', err);
      }
    }, () => {
        // Callback for unexpected drops
        releaseWakeLock();
    });
    
    if (success) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }
});

// Timer Control Listeners
UI.startTimerBtn.addEventListener('click', () => Timer.start(UI.setTimerState));
UI.pauseTimerBtn.addEventListener('click', () => Timer.pause(UI.setTimerState));
UI.resetTimerBtn.addEventListener('click', () => {
  Timer.reset(UI.setTimerState); // Clear Clock
  Processor.resetData();         // Clear Stats
  latestBpm = null;
  UI.setCalories(null);          // Clear Calories
  UI.setBPM(null);               // Reset Display
  updateActiveZone(null);
  resetAudioPromptState();
  releaseWakeLock();
});

const zoneConfig = [
  { key: 'zone1', min: 0.50, max: 0.60 },
  { key: 'zone2', min: 0.60, max: 0.70 },
  { key: 'zone3', min: 0.70, max: 0.80 },
  { key: 'zone4', min: 0.80, max: 0.90 },
  { key: 'zone5', min: 0.90, max: 1.00 }
];

function normalizeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getMAFValue() {
  const age = normalizeNumber(selectedAge);
  if (!age || age < 10 || age > 100) return null;
  return 180 - age;
}

function getActiveMaxHR() {
  const age = normalizeNumber(selectedAge);
  // Simple age-based formula: 220 - age
  // More advanced formulas exist (e.g., Tanaka, Gulati), but 220-age is common.
  // Ensure a reasonable range for Max HR.
  // The original code already had this logic.
  if (!age || age < 10 || age > 100) return null;
  return Math.max(120, Math.min(220, 220 - age));
}

function formatZoneText(zone, maxHr) {
  if (!maxHr) return { percent: '—', bpm: '' };
  const low = Math.round(zone.min * maxHr);
  const high = Math.round(zone.max * maxHr);
  return {
    percent: `${Math.round(zone.min * 100)}-${Math.round(zone.max * 100)}%`,
    bpm: `${low}-${high} bpm`
  };
}

function getZoneIndex(bpm, maxHr) {
  if (!bpm) return null;
  if (selectedZoneMode === 'maf') {
    const maf = getMAFValue();
    return (maf && bpm <= maf) ? 0 : 1;
  }
  if (!maxHr) return null;
  const ratio = bpm / maxHr;
  // Respect configured zone minima/maxima instead of hard-coded thresholds
  for (let i = 0; i < zoneConfig.length; i++) {
    const z = zoneConfig[i];
    if (ratio >= z.min && ratio < z.max) return i;
  }
  if (ratio >= zoneConfig[zoneConfig.length - 1].max) return zoneConfig.length - 1;
  // Below the minimum configured zone
  return null;
}

function getZonePosition(bpm, maxHr) {
  if (!bpm) return null;
  if (selectedZoneMode === 'maf') {
    const maf = getMAFValue();
    if (!maf) return null;
    const maxScale = 220; // assumed max for visual scaling
    if (bpm <= maf) {
      return (bpm / maf) * 50; // First half is 0 to MAF
    } else {
      const range = maxScale - maf;
      const offset = Math.min(bpm - maf, range);
      return 50 + (offset / range) * 50; // Second half is above MAF
    }
  }
  if (!maxHr) return null;
  const ratio = bpm / maxHr;
  // If below first zone minimum, don't position indicator
  if (ratio < zoneConfig[0].min) return null;
  if (ratio >= 1.00) return 100;

  const zone = zoneConfig.find((z) => ratio <= z.max) || zoneConfig[zoneConfig.length - 1];
  const index = zoneConfig.indexOf(zone);
  const zoneStart = zone.min;
  const zoneWidth = zone.max - zone.min;
  const fraction = Math.min(1, Math.max(0, (ratio - zoneStart) / zoneWidth));
  return Math.min(100, Math.max(0, index * (100 / zoneConfig.length) + fraction * (100 / zoneConfig.length)));
}

function updateZones() {
  const isMaf = selectedZoneMode === 'maf';
  UI.setZoneMode(isMaf);

  if (isMaf) {
    const maf = getMAFValue();
    UI.setZoneMaxDisplay(maf, 'MAF Number');
    UI.setZoneRanges({
      zone1: { percent: 'MAF Zone', bpm: `≤ ${maf} bpm` },
      zone2: { percent: 'Above MAF', bpm: `> ${maf} bpm` }
    });
  } else {
    const maxHr = getActiveMaxHR();
    UI.setZoneMaxDisplay(maxHr, 'Max HR');
    const values = {};
    zoneConfig.forEach((zone) => {
      values[zone.key] = formatZoneText(zone, maxHr);
    });
    UI.setZoneRanges(values);
  }
}

function updateCaloriesDisplay() {
  const age = normalizeNumber(selectedAge);
  const weight = normalizeNumber(selectedWeight);
  const metrics = Processor.getMetrics();
  const avgHr = metrics ? metrics.totalAvgBpm : 0;
  const elapsedTimeMs = Timer.getElapsedTimeMs();

  if (age && weight && avgHr > 0 && elapsedTimeMs > 0) {
    const calories = Processor.calculateCalories(selectedGender, age, weight, avgHr, elapsedTimeMs / 60000);
    UI.setCalories(calories);
  }
}

function updateActiveZone(bpm) {
  if (bpm === null || bpm === undefined || bpm <= 0) {
    UI.setZoneActive(null, null);
    return;
  }
  const maxHr = getActiveMaxHR();
  const activeZone = getZoneIndex(bpm, maxHr);
  const position = getZonePosition(bpm, maxHr);
  UI.setZoneActive(activeZone, position);
  maybeAnnounceZone(activeZone, bpm);
}

function resetAudioPromptState() {
  lastAnnouncedZone = null;
  lastPromptAt = 0;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function getAudioPromptIntervalMs() {
  const index = Number(UI.audioPromptInterval?.value || 0);
  return audioPromptIntervalsMs[index] || 0;
}

function maybeAnnounceZone(zone, bpm) {
  if (!UI.audioPromptToggle?.checked || zone === null || !('speechSynthesis' in window)) return;
  const now = Date.now();
  const zoneChanged = zone !== lastAnnouncedZone;
  const intervalMs = getAudioPromptIntervalMs();
  if (!zoneChanged && (!intervalMs || now - lastPromptAt < intervalMs)) return;

  const zoneText = selectedZoneMode === 'maf'
    ? (zone === 0 ? 'MAF zone' : 'above MAF')
    : `zone ${zone + 1}`;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${zoneText}, ${Math.round(bpm)}`));
  lastAnnouncedZone = zone;
  lastPromptAt = now;
}

function updateAudioPromptIntervalLabel() {
  const index = Number(UI.audioPromptInterval?.value || 0);
  UI.setAudioPromptIntervalText(audioPromptIntervalLabels[index] || audioPromptIntervalLabels[0]);
}

UI.audioPromptToggle.addEventListener('change', () => {
  const enabled = UI.audioPromptToggle.checked;
  localStorage.setItem('audioPromptsEnabled', String(enabled));
  UI.setAudioPromptOptionsVisible(enabled);
  resetAudioPromptState();
  if (enabled && latestBpm) updateActiveZone(latestBpm);
});

UI.audioPromptInterval.addEventListener('input', () => {
  updateAudioPromptIntervalLabel();
  localStorage.setItem('audioPromptInterval', UI.audioPromptInterval.value);
  lastPromptAt = Date.now();
});

UI.zoneModeToggleBtn.addEventListener('click', () => {
  selectedZoneMode = selectedZoneMode === 'age' ? 'maf' : 'age';
  updateZones();
  resetAudioPromptState();
  updateActiveZone(latestBpm);
});

function setSelectedAge(age) {
  selectedAge = age;
  UI.setAgeButtonText(age);
  updateZones();
  updateCaloriesDisplay();
  updateActiveZone(latestBpm);
  UI.closeAgeMenu();
}

function populateAgeMenu() {
  if (!UI.ageSelectMenu) return;
  UI.ageSelectMenu.innerHTML = '';
  for (let age = 10; age <= 100; age += 1) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'age-option';
    option.dataset.age = age;
    option.textContent = age;
    option.addEventListener('click', () => setSelectedAge(age));
    UI.ageSelectMenu.appendChild(option);
  }
}

UI.ageSelectBtn.addEventListener('click', () => {
  UI.toggleAgeMenu(selectedAge);
});

// Gender Toggle
UI.genderToggleBtn.addEventListener('click', () => {
  setSelectedGender(selectedGender === 'M' ? 'F' : 'M');
});

function setSelectedGender(gender) {
  selectedGender = gender;
  UI.setGenderDisplay(gender);
  updateCaloriesDisplay();
}

// Weight Unit Toggle
UI.unitToggleBtn.addEventListener('click', () => {
  setSelectedWeightUnit(selectedWeightUnit === 'kg' ? 'lbs' : 'kg');
});

function setSelectedWeightUnit(unit) {
  selectedWeightUnit = unit;
  UI.setUnitDisplay(unit);
  UI.setWeightDisplay(selectedWeight, selectedWeightUnit); // Update display with current weight and new unit
  populateWeightMenu();
  updateCaloriesDisplay();
}

// Weight Selector
function setSelectedWeight(weight) {
  selectedWeight = weight;
  UI.setWeightDisplay(weight, selectedWeightUnit);
  updateCaloriesDisplay();
  UI.closeWeightMenu();
}

function populateWeightMenu() {
  if (!UI.weightSelectMenu) return;
  UI.weightSelectMenu.innerHTML = '';
  // Range from 30kg (66lbs) to 200kg (440lbs)
  for (let w = 30; w <= 200; w += 1) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'age-option'; // Re-use age-option styling
    option.dataset.weight = w;
    const displayVal = selectedWeightUnit === 'lbs' ? Math.round(w * 2.20462) : w;
    option.textContent = displayVal;
    option.addEventListener('click', () => setSelectedWeight(w));
    UI.weightSelectMenu.appendChild(option);
  }
}

UI.weightSelectBtn.addEventListener('click', () => {
  UI.toggleWeightMenu(selectedWeight);
});

// Consolidated click-outside handler for all menus
document.addEventListener('click', (event) => {
  // Handle Age Menu
  if (UI.ageSelectMenu && !UI.ageSelectBtn.contains(event.target) && !UI.ageSelectMenu.contains(event.target)) {
    UI.closeAgeMenu();
  }
  // Handle Weight Menu
  if (UI.weightSelectMenu && !UI.weightSelectBtn.contains(event.target) && !UI.weightSelectMenu.contains(event.target)) {
    UI.closeWeightMenu();
  }
});

populateAgeMenu();
setSelectedAge(selectedAge);

const savedAudioPrompts = localStorage.getItem('audioPromptsEnabled') === 'true';
const savedAudioInterval = localStorage.getItem('audioPromptInterval');
UI.audioPromptToggle.checked = savedAudioPrompts;
if (savedAudioInterval !== null && Number.isInteger(Number(savedAudioInterval))) {
  UI.audioPromptInterval.value = Math.max(0, Math.min(6, Number(savedAudioInterval)));
}
UI.setAudioPromptOptionsVisible(savedAudioPrompts);
updateAudioPromptIntervalLabel();

// Register the PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=14')
    .then(() => niceLog('Service worker active'))
    .catch(e => niceLog('SW failed: ' + e));
}

// Initialize new controls
populateWeightMenu();
setSelectedWeight(selectedWeight); // Set initial display for weight

initLogger();
Timer.initTimer();
