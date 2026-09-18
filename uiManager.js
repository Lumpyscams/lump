/**
 * UI Manager Module
 * Location: /uiManager.js
 * Purpose: Single point of contact for DOM manipulation. 
 * All HTML element updates should pass through here to keep the rest of the app "logic-only".
 */
export const connectBtn = document.getElementById('connectBtn');
export const startTimerBtn = document.getElementById('startTimer');
export const pauseTimerBtn = document.getElementById('pauseTimer');
export const resetTimerBtn = document.getElementById('resetTimer');
export const themeToggleBtn = document.getElementById('themeToggle');
export const ageSelectBtn = document.getElementById('ageSelectBtn');
export const ageSelectMenu = document.getElementById('ageSelectMenu');
export const genderToggleBtn = document.getElementById('genderToggleBtn');
export const unitToggleBtn = document.getElementById('unitToggleBtn');
export const weightSelectBtn = document.getElementById('weightSelectBtn');
export const weightDisplay = document.getElementById('weightDisplay');
export const zoneModeToggleBtn = document.getElementById('zoneModeToggleBtn');
export const audioPromptToggle = document.getElementById('audioPromptToggle');
export const audioPromptOptions = document.getElementById('audioPromptOptions');
export const audioPromptInterval = document.getElementById('audioPromptInterval');
export const audioPromptIntervalValue = document.getElementById('audioPromptIntervalValue');
export const weightSelectMenu = document.getElementById('weightSelectMenu');
export const zoneIndicatorEl = document.getElementById('zoneIndicator');
export const zoneIndicatorTip = document.getElementById('zoneIndicatorTip');
export const zoneSegments = {
  zone1: document.querySelector('.zone-segment-1'),
  zone2: document.querySelector('.zone-segment-2'),
  zone3: document.querySelector('.zone-segment-3'),
  zone4: document.querySelector('.zone-segment-4'),
  zone5: document.querySelector('.zone-segment-5')
};
export const zoneLabelEls = {
  zone1: document.getElementById('zone1'),
  zone2: document.getElementById('zone2'),
  zone3: document.getElementById('zone3'),
  zone4: document.getElementById('zone4'),
  zone5: document.getElementById('zone5')
};

/** Theme Initialization & Logic */
const savedTheme = localStorage.getItem('theme');
// The app defaults to dark-mode (set in index.html).
// Button shows the icon for the action the user can take (moon -> switch to dark, sun -> switch to light)
if (savedTheme === 'light') {
  document.body.classList.remove('dark-mode');
  themeToggleBtn.textContent = '🌙';
} else {
  // Default dark mode
  document.body.classList.add('dark-mode');
  themeToggleBtn.textContent = '☀️';
}

themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggleBtn.textContent = isDark ? '☀️' : '🌙';

  // Optional: Vibrate on toggle for a more native PWA feel
  if (navigator.vibrate) navigator.vibrate(10);
});

const statusEl = document.getElementById('status');
const bpmEl = document.getElementById('bpm');
const batteryEl = document.getElementById('battery');
const rollAvgBpmEl = document.getElementById('rollAvgBpm');
const totalAvgBpmEl = document.getElementById('totalAvgBpm');
const stdDevBpmEl = document.getElementById('stdDevBpm');
const driftEl = document.getElementById('drift');
const maxBpmEl = document.getElementById('maxBpm');
const elapsedEl = document.getElementById('elapsed');
const q1AvgEl = document.getElementById('q1Avg');
const q2AvgEl = document.getElementById('q2Avg');
const q3AvgEl = document.getElementById('q3Avg');
const q4AvgEl = document.getElementById('q4Avg');
const caloriesEl = document.getElementById('calories');
const qDriftEl = document.getElementById('qDrift');

const zoneMaxDisplayEl = document.getElementById('zoneMaxDisplay');


/** Updates the connection status text (e.g., "Connected", "Searching") */
export function setStatus(t) { 
  if (statusEl.textContent !== t) statusEl.textContent = t; 
}

/** Updates the main large BPM display */
export function setBPM(v) { 
  const text = v === null ? '—' : v;
  if (bpmEl.textContent !== String(text)) bpmEl.textContent = text; 
}

/** Updates the 30-second rolling average display */
export function setRollAvgBPM(v) { 
  const text = v === null ? '—' : v;
  if (rollAvgBpmEl.textContent !== String(text)) rollAvgBpmEl.textContent = text;
}

/** Updates the session-wide average BPM */
export function setTotalAvgBPM(v) { 
  const text = v === null ? '—' : v;
  if (totalAvgBpmEl.textContent !== String(text)) totalAvgBpmEl.textContent = text;
}

/** Updates the session standard deviation */
export function setStdDev(v) { 
  const text = v === null ? '—' : v;
  if (stdDevBpmEl && stdDevBpmEl.textContent !== String(text)) stdDevBpmEl.textContent = text;
}

/** 
 * Updates the workout quartile statistics.
 * Points to: Quartile section in index.html
 * @param {Object|null} data - The calculated quartile averages and drift
 */
export function setQuartiles(data) {
  // Guard clause: Exit if HTML elements aren't found to prevent crashes
  if (!q1AvgEl) return;

  if (!data) {
    q1AvgEl.textContent = '—';
    q2AvgEl.textContent = '—';
    q3AvgEl.textContent = '—';
    q4AvgEl.textContent = '—';
    qDriftEl.textContent = '—';
    qDriftEl.style.color = ''; // Revert to CSS default
    return;
  }
  q1AvgEl.textContent = data.q1;
  q2AvgEl.textContent = data.q2;
  q3AvgEl.textContent = data.q3;
  q4AvgEl.textContent = data.q4;
  qDriftEl.textContent = (data.qDrift > 0 ? '+' : '') + data.qDrift + '%';
  qDriftEl.style.color = data.qDrift >= 5 ? '#dc2626' : '';
}

/** Updates the cardiovascular drift percentage display */
export function setDrift(v) {
  if (v === null) {
    driftEl.textContent = '—';
    driftEl.style.color = ''; 
    return;
  }
  driftEl.textContent = (v > 0 ? '+' : '') + v + '%';
  driftEl.style.color = v >= 5 ? '#dc2626' : '';
}

export function setMaxBPM(v) { 
  const text = v === null ? '—' : v;
  if (maxBpmEl.textContent !== String(text)) maxBpmEl.textContent = text;
}
export function setBattery(v) { batteryEl.textContent = v === null ? '—' : v + '%'; }
export function setElapsed(text) { elapsedEl.textContent = text; }

export function setCalories(v) {
  const text = v === null ? '—' : Math.round(v);
  if (caloriesEl.textContent !== String(text)) caloriesEl.textContent = text;
}

/** Sets the UI state for workout controls (Start/Stop/Reset) */
export function setTimerState(state) {
  switch (state) {
    case 'running':
      startTimerBtn.disabled = true;
      pauseTimerBtn.disabled = false;
      resetTimerBtn.disabled = true;
      break;
    case 'paused':
      startTimerBtn.disabled = false;
      pauseTimerBtn.disabled = true;
      resetTimerBtn.disabled = false;
      break;
    case 'reset':
      startTimerBtn.disabled = false;
      pauseTimerBtn.disabled = true;
      resetTimerBtn.disabled = true;
      break;
  }
}

/** Updates the main connection button text and disabled state based on Bluetooth status */
export function updateConnectButton(state) {
  switch (state) {
    case 'idle':
      connectBtn.disabled = false;
      connectBtn.classList.remove('ghost');
      connectBtn.classList.add('primary');
      connectBtn.textContent = 'Connect';
      statusEl.style.color = ''; // Reset status text color
      break;
    case 'connected':
      connectBtn.disabled = false;
      connectBtn.classList.remove('primary');
      connectBtn.classList.add('ghost');
      connectBtn.textContent = 'Disconnect';
      statusEl.style.color = '#10b981'; // Green status text
      break;
    case 'requesting':
      connectBtn.disabled = true;
      connectBtn.textContent = 'Waiting for Pair...';
      statusEl.style.color = '';
      break;
    case 'connecting':
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connecting...';
      break;
  }
}

export function setAgeButtonText(age) {
  if (!ageSelectBtn) return;
  ageSelectBtn.textContent = `Age ${age} ▾`;
}

export function setZoneMode(isMaf) {
  const zonePanel = document.querySelector('.zone-panel');
  if (!zonePanel || !zoneModeToggleBtn) return;
  zonePanel.classList.toggle('maf-mode', isMaf);
  zoneModeToggleBtn.textContent = isMaf ? 'MAF-Based Zones' : 'Age-Based Zones';
}

export function setAudioPromptOptionsVisible(isVisible) {
  if (audioPromptOptions) audioPromptOptions.classList.toggle('hidden', !isVisible);
}

export function setAudioPromptIntervalText(text) {
  if (audioPromptIntervalValue) audioPromptIntervalValue.textContent = text;
}

export function setZoneMaxDisplay(value, label = 'Max HR') {
  if (!zoneMaxDisplayEl) return;
  zoneMaxDisplayEl.textContent = value ? `${label} ${value}` : `${label} —`;
}

export function setZoneRanges(values) {
  if (!values) return;
  // Reset all to clear stale data when switching modes
  Object.values(zoneLabelEls).forEach(el => {
    if (!el) return;
    const p = el.querySelector('.zone-value-percent');
    const b = el.querySelector('.zone-value-bpm');
    if (p) p.textContent = '—'; if (b) b.textContent = '';
  });
  Object.entries(values).forEach(([key, data]) => {
    const element = zoneLabelEls[key];
    if (!element) return;
    const percentEl = element.querySelector('.zone-value-percent');
    const bpmEl = element.querySelector('.zone-value-bpm');
    if (percentEl) percentEl.textContent = data.percent;
    if (bpmEl) bpmEl.textContent = data.bpm;
  });
}

export function toggleAgeMenu(currentValue) {
  if (!ageSelectMenu || !ageSelectBtn) return;
  const isClosed = ageSelectMenu.classList.contains('hidden');
  ageSelectMenu.classList.toggle('hidden', !isClosed);
  ageSelectBtn.setAttribute('aria-expanded', String(isClosed));

  if (isClosed && currentValue) {
    const target = ageSelectMenu.querySelector(`[data-age="${currentValue}"]`);
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
    }
  }
}

export function closeAgeMenu() {
  if (!ageSelectMenu || !ageSelectBtn) return;
  ageSelectMenu.classList.add('hidden');
  ageSelectBtn.setAttribute('aria-expanded', 'false');
}

export function setGenderDisplay(gender) {
  if (genderToggleBtn) genderToggleBtn.textContent = gender;
}

export function setUnitDisplay(unit) {
  if (unitToggleBtn) unitToggleBtn.textContent = unit;
}

export function setWeightDisplay(weight, unit) {
  if (!weightDisplay) return;
  const displayValue = unit === 'lbs' ? Math.round(weight * 2.20462) : weight;
  weightDisplay.textContent = displayValue;
}

export function toggleWeightMenu(currentValue) {
  if (!weightSelectMenu || !weightSelectBtn) return;
  const isClosed = weightSelectMenu.classList.contains('hidden');
  weightSelectMenu.classList.toggle('hidden', !isClosed);
  weightSelectBtn.setAttribute('aria-expanded', String(isClosed));

  if (isClosed && currentValue) {
    const target = weightSelectMenu.querySelector(`[data-weight="${currentValue}"]`);
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
    }
  }
}

export function closeWeightMenu() {
  if (!weightSelectMenu || !weightSelectBtn) return;
  weightSelectMenu.classList.add('hidden');
  weightSelectBtn.setAttribute('aria-expanded', 'false');
}

const zoneColors = ['#22c55e', '#38bdf8', '#facc15', '#fb7185', '#f43f5e'];
const mafColors = ['#22c55e', '#f43f5e'];

export function setZoneActive(index, position) {
  if (!zoneIndicatorEl) return;
  
  const isPositionValid = typeof position === 'number' && Number.isFinite(position);

  Object.values(zoneSegments).forEach((segment, idx) => {
    if (!segment) return;
    // Only make active if the index matches AND there's an actual position (i.e., BPM is valid)
    // This prevents a zone from staying active if BPM drops to null
    if (isPositionValid) {
      segment.classList.toggle('active', idx === index);
    } else {
      segment.classList.remove('active');
    }
  });

  if (!isPositionValid) {
    zoneIndicatorEl.style.opacity = '0';
    if (zoneIndicatorTip) zoneIndicatorTip.style.color = '';
    return;
  }

  zoneIndicatorEl.style.left = `${position}%`;
  zoneIndicatorEl.style.opacity = '1';
  if (zoneIndicatorTip) {
    const isMaf = document.querySelector('.zone-panel')?.classList.contains('maf-mode');
    const colors = isMaf ? mafColors : zoneColors;
    zoneIndicatorTip.style.color = colors[index] || 'var(--muted)';
  }
}
